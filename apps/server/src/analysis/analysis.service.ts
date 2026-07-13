import { Injectable } from "@nestjs/common";
import type { PrismaClient } from "@toksai/db";
import type { AnalysisContract, AnalysisResultView, AnalysisView } from "@toksai/api";
import { parseKakao } from "@toksai/shared";
import { FileExtractService } from "../upload/file-extract.service";
import { CryptoService } from "../common/crypto/crypto.service";
import { generateToken } from "../common/token.util";
import { AnalysisRunnerService } from "../analysis-pipeline/analysis-runner.service";

@Injectable()
export class AnalysisService implements AnalysisContract {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly extractor: FileExtractService,
    private readonly crypto: CryptoService,
    private readonly runner: AnalysisRunnerService,
  ) {}

  async createFromUpload(buffer: Buffer, filename: string) {
    const text = this.extractor.extractChatText(buffer, filename);
    const parsed = parseKakao(text); // 1:1 아니면 ParseError

    const viewToken = generateToken();
    const adminToken = generateToken();

    const created = await this.prisma.analysis.create({
      data: {
        viewToken,
        adminToken,
        status: "IDENTIFYING",
        sourceType: "upload",
        participants: {
          create: parsed.participants.map((p) => ({ rawName: p.rawName })),
        },
        rawChat: {
          create: {
            encryptedText: this.crypto.encrypt(text),
            messageCount: parsed.messages.length,
            startedAt: parsed.startedAt,
            endedAt: parsed.endedAt,
          },
        },
      },
    });

    return { id: created.id, viewToken, adminToken };
  }

  async getByViewToken(viewToken: string): Promise<AnalysisView | null> {
    const a = await this.prisma.analysis.findUnique({
      where: { viewToken },
      include: { participants: true },
    });
    if (!a) return null;
    return {
      id: a.id,
      status: a.status,
      createdAt: a.createdAt,
      participants: a.participants.map((p) => ({
        id: p.id, rawName: p.rawName, nickname: p.nickname, isOwner: p.isOwner,
      })),
    };
  }

  async identify(
    adminToken: string,
    ownerRawName: string,
    nicknames: Record<string, string>,
  ): Promise<void> {
    const a = await this.prisma.analysis.findUnique({
      where: { adminToken },
      include: { participants: true },
    });
    if (!a) throw new Error("NOT_FOUND");
    for (const p of a.participants) {
      await this.prisma.participant.update({
        where: { id: p.id },
        data: {
          isOwner: p.rawName === ownerRawName,
          nickname: nicknames[p.rawName] ?? p.nickname,
        },
      });
    }
  }

  async start(adminToken: string): Promise<{ ok: true }> {
    const a = await this.prisma.analysis.findUnique({ where: { adminToken } });
    if (!a) throw new Error("NOT_FOUND");
    // fire-and-forget; 상태는 러너가 ANALYZING/DONE/FAILED로 관리
    void this.runner.run(a.id).catch(() => {});
    return { ok: true };
  }

  async getResult(viewToken: string): Promise<AnalysisResultView | null> {
    const a = await this.prisma.analysis.findUnique({
      where: { viewToken },
      include: { result: true },
    });
    if (!a?.result) return null;
    const r = a.result;
    return {
      stats: r.stats as never, timeline: r.timeline as never,
      affinitySeries: r.affinitySeries as never, keywords: r.keywords as never,
      personas: r.personas as never, badges: r.badges as never,
      chemiScore: r.chemiScore, relationType: r.relationType as never,
      highlights: r.highlights as never,
    };
  }
}
