import { Injectable } from "@nestjs/common";
import type { PrismaClient } from "@toksai/db";
import type {
  AnalysisContract,
  AnalysisResultView,
  AnalysisView,
  AuthorAliasMap,
} from "@toksai/api";
import { MAX_ANALYSIS_MONTHS, MAX_CHAT_MESSAGES, ParseError, parseKakao } from "@toksai/shared";
import { FileExtractService } from "../upload/file-extract.service";
import { CryptoService } from "../common/crypto/crypto.service";
import { generateToken } from "../common/token.util";
import { AnalysisRunnerService } from "../analysis-pipeline/analysis-runner.service";
import { RateLimitService } from "../common/rate-limit.service";

const STALE_JOB_MS = 3 * 60 * 1000;
const MAX_ANALYSIS_ATTEMPTS = 3;

function toAuthorMap(value: unknown, fallbackNames: string[]): AuthorAliasMap {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (
      entries.length > 0 &&
      entries.every((entry) => typeof entry[1] === "string" || entry[1] === null)
    ) {
      return Object.fromEntries(entries) as AuthorAliasMap;
    }
  }
  return Object.fromEntries(fallbackNames.map((name) => [name, name]));
}

@Injectable()
export class AnalysisService implements AnalysisContract {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly extractor: FileExtractService,
    private readonly crypto: CryptoService,
    private readonly runner: AnalysisRunnerService,
    private readonly rateLimit: RateLimitService = new RateLimitService(),
  ) {}

  async createFromUpload(buffer: Buffer, filename: string) {
    return this.createFromFile(buffer, filename, "upload");
  }

  async createFromFile(buffer: Buffer, filename: string, sourceType: "upload" | "email") {
    const text = this.extractor.extractChatText(buffer, filename);
    const parsed = parseKakao(text, { allowMultipleAuthors: true });
    if (parsed.messages.length > MAX_CHAT_MESSAGES) {
      throw new ParseError(
        "CHAT_TOO_LARGE",
        `메시지가 너무 많아요. ${MAX_CHAT_MESSAGES.toLocaleString("ko-KR")}개 이하 대화를 올려주세요.`,
      );
    }
    const monthCount = new Set(
      parsed.messages.map((m) => `${m.at.getFullYear()}-${m.at.getMonth() + 1}`),
    ).size;
    if (monthCount > MAX_ANALYSIS_MONTHS) {
      throw new ParseError(
        "CHAT_TOO_LONG",
        `대화 기간이 너무 길어요. 최근 ${MAX_ANALYSIS_MONTHS}개월 이내 대화를 올려주세요.`,
      );
    }

    const viewToken = generateToken();
    const adminToken = generateToken();

    const created = await this.prisma.analysis.create({
      data: {
        viewToken,
        adminToken,
        status: "IDENTIFYING",
        sourceType,
        authorAliasMap: parsed.suggestedAuthorMap,
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
    const authorAliasMap = toAuthorMap(
      a.authorAliasMap,
      a.participants.map((participant) => participant.rawName),
    );
    return {
      id: a.id,
      status: a.status,
      createdAt: a.createdAt,
      participants: a.participants.map((p) => ({
        id: p.id, rawName: p.rawName, nickname: p.nickname, isOwner: p.isOwner,
      })),
      detectedAuthorNames: Object.keys(authorAliasMap),
      authorAliasMap,
    };
  }

  async identify(
    adminToken: string,
    ownerRawName: string,
    nicknames: Record<string, string>,
    authorAliasMap?: AuthorAliasMap,
  ): Promise<void> {
    const a = await this.prisma.analysis.findUnique({
      where: { adminToken },
      include: { participants: true },
    });
    if (!a) throw new Error("NOT_FOUND");

    const detectedNames = Object.keys(
      toAuthorMap(
        a.authorAliasMap,
        a.participants.map((participant) => participant.rawName),
      ),
    );
    const resolvedMap =
      authorAliasMap ?? Object.fromEntries(detectedNames.map((name) => [name, name]));
    const providedNames = Object.keys(resolvedMap);
    const exactAliases =
      providedNames.length === detectedNames.length &&
      detectedNames.every((name) => providedNames.includes(name));
    const canonicalNames: string[] = [];
    for (const detectedName of detectedNames) {
      const canonical = resolvedMap[detectedName];
      if (canonical === null) continue;
      if (!detectedNames.includes(canonical)) {
        throw new Error("INVALID_AUTHOR_ALIAS_MAP");
      }
      if (!canonicalNames.includes(canonical)) canonicalNames.push(canonical);
    }
    const canonicalNamesAreStable = canonicalNames.every(
      (canonical) => resolvedMap[canonical] === canonical,
    );
    if (!exactAliases || canonicalNames.length !== 2 || !canonicalNamesAreStable) {
      throw new Error("INVALID_AUTHOR_ALIAS_MAP");
    }

    const ownerCanonical = resolvedMap[ownerRawName] ?? "";
    await this.prisma.analysis.update({
      where: { id: a.id },
      data: {
        authorAliasMap: resolvedMap,
        participants: {
          deleteMany: {},
          create: canonicalNames.map((rawName) => ({
            rawName,
            nickname: nicknames[rawName]?.trim() || rawName,
            isOwner: rawName === ownerCanonical,
          })),
        },
      },
    });
  }

  async start(adminToken: string, clientId = "unknown"): Promise<{ ok: true }> {
    this.rateLimit.assert("analysis-start", clientId, 12, 60 * 60 * 1000);
    const a = await this.prisma.analysis.findUnique({
      where: { adminToken },
      include: { participants: true },
    });
    if (!a) throw new Error("NOT_FOUND");
    if (a.participants.length !== 2) throw new Error("PARTICIPANTS_NOT_IDENTIFIED");

    if (a.status === "DONE") return { ok: true };
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_JOB_MS);
    const isActive =
      a.status === "ANALYZING" &&
      a.heartbeatAt !== null &&
      a.heartbeatAt >= staleBefore;
    if (isActive) return { ok: true };

    if (a.attemptCount >= MAX_ANALYSIS_ATTEMPTS && a.status !== "IDENTIFYING") {
      await this.prisma.analysis.updateMany({
        where: { id: a.id, status: "ANALYZING" },
        data: { status: "FAILED", heartbeatAt: null },
      });
      throw new Error("ANALYSIS_RETRY_LIMIT");
    }

    const claimed = await this.prisma.analysis.updateMany({
      where: {
        id: a.id,
        OR: [
          { status: { in: ["IDENTIFYING", "FAILED"] } },
          {
            status: "ANALYZING",
            OR: [{ heartbeatAt: null }, { heartbeatAt: { lt: staleBefore } }],
          },
        ],
      },
      data: {
        status: "ANALYZING",
        jobStartedAt: now,
        heartbeatAt: now,
        attemptCount: { increment: 1 },
      },
    });

    // 이미 다른 요청이 실행 중이면 성공으로 응답해 클라이언트 재시도를 안전하게 만든다.
    if (claimed.count === 0) return { ok: true };
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
      highlights: r.highlights as never, extras: r.extras as never,
    };
  }

  async deleteByAdminToken(adminToken: string): Promise<{ ok: true }> {
    const a = await this.prisma.analysis.findUnique({ where: { adminToken } });
    if (!a) throw new Error("NOT_FOUND");
    await this.prisma.analysis.delete({ where: { id: a.id } });
    return { ok: true };
  }
}
