import { Injectable } from "@nestjs/common";
import type { PrismaClient } from "@toksai/db";
import type { AnalysisContract, AnalysisView } from "@toksai/api";
import { parseKakao } from "@toksai/shared";
import { FileExtractService } from "../upload/file-extract.service";
import { CryptoService } from "../common/crypto/crypto.service";
import { generateToken } from "../common/token.util";

@Injectable()
export class AnalysisService implements AnalysisContract {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly extractor: FileExtractService,
    private readonly crypto: CryptoService,
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
}
