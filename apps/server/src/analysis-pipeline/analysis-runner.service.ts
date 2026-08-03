import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "@toksai/db";
import type { AuthorAliasMap } from "@toksai/api";
import {
  parseKakao, computeStats, bucketByMonth, renderBucketText, mapWithConcurrency,
} from "@toksai/shared";
import type { AffinityPoint, AnalysisResultView, BucketAnalysis } from "@toksai/shared";
import type { Message, TimelineEvent, Highlight } from "@toksai/shared";
import { CryptoService } from "../common/crypto/crypto.service";
import type { LlmClient } from "../gemini/llm-client";
import { bucketZod, bucketResponseSchema, synthesisZod, synthesisResponseSchema } from "./schemas";
import { SYSTEM_INSTRUCTION, buildBucketPrompt, buildSynthesisPrompt } from "./prompts";

const BUCKET_CONCURRENCY = 3;
const STALE_JOB_MS = 3 * 60 * 1000;
const MAX_ANALYSIS_ATTEMPTS = 3;
const MIN_BUCKET_COVERAGE = 0.6;

@Injectable()
export class AnalysisRunnerService implements OnModuleInit {
  private readonly logger = new Logger(AnalysisRunnerService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly crypto: CryptoService,
    private readonly llm: LlmClient,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.recoverStaleJobs();
    } catch (e) {
      // 복구 점검 실패가 서버 자체의 기동을 막지는 않게 한다.
      this.logger.error(`stale job recovery failed: ${String(e)}`);
    }
  }

  async run(analysisId: string): Promise<void> {
    try {
      await this.heartbeat(analysisId);
      const analysis = await this.prisma.analysis.findUnique({
        where: { id: analysisId },
        include: { participants: true, rawChat: true },
      });
      if (!analysis || !analysis.rawChat) throw new Error("ANALYSIS_NOT_READY");

      const [pa, pb] = analysis.participants;
      if (!pa || !pb || analysis.participants.length !== 2) {
        throw new Error("ANALYSIS_PARTICIPANTS_NOT_RESOLVED");
      }
      const people = {
        rawA: pa.rawName, rawB: pb.rawName,
        nickA: pa.nickname ?? pa.rawName, nickB: pb.nickname ?? pb.rawName,
        mode: "direct" as "direct" | "group-focus",
      };

      const text = this.crypto.decrypt(analysis.rawChat.encryptedText);
      const parsed = parseKakao(text, { allowMultipleAuthors: true });
      const storedAuthorMap =
        analysis.authorAliasMap &&
        typeof analysis.authorAliasMap === "object" &&
        !Array.isArray(analysis.authorAliasMap)
          ? (analysis.authorAliasMap as AuthorAliasMap)
          : Object.fromEntries(parsed.participants.map((participant) => [
              participant.rawName,
              participant.rawName,
            ]));
      const canonicalNames = new Set([people.rawA, people.rawB]);
      people.mode = Object.values(storedAuthorMap).some((author) => author === null)
        ? "group-focus"
        : "direct";
      const messages: Message[] = [];
      let excludedSinceLastSelected = 0;
      for (const message of parsed.messages) {
        const author = storedAuthorMap[message.author];
        if (author === null) {
          excludedSinceLastSelected += 1;
          continue;
        }
        if (!author || !canonicalNames.has(author)) {
          throw new Error("INVALID_AUTHOR_ALIAS_MAP");
        }
        messages.push({
          ...message,
          author,
          contextBreakBefore: excludedSinceLastSelected || undefined,
        });
        excludedSinceLastSelected = 0;
      }
      if (new Set(messages.map((message) => message.author)).size !== 2) {
        throw new Error("ANALYSIS_PARTICIPANTS_NOT_RESOLVED");
      }

      const stats = computeStats(messages);
      const buckets = bucketByMonth(messages);
      let ungroundedQuotesRemoved = 0;

      const bucketResults = (await mapWithConcurrency(buckets, BUCKET_CONCURRENCY, async (b) => {
        try {
          await this.heartbeat(analysisId);
          const source = renderBucketText(b);
          const generated = await this.llm.generateJson<BucketAnalysis>(
            {
              systemInstruction: SYSTEM_INSTRUCTION,
              prompt: buildBucketPrompt({ ...people, month: b.month, text: source }),
              responseSchema: bucketResponseSchema,
            },
            bucketZod,
          );
          const grounded = this.groundBucketQuotes(generated, b.messages);
          ungroundedQuotesRemoved += grounded.removed;
          await this.heartbeat(analysisId);
          return { ...grounded.value, month: b.month };
        } catch (e) {
          this.logger.warn(`bucket ${b.month} failed: ${String(e)}`);
          return null;
        }
      })).filter((x): x is BucketAnalysis => x !== null);

      const coverage = buckets.length === 0 ? 0 : bucketResults.length / buckets.length;
      if (coverage < MIN_BUCKET_COVERAGE) {
        throw new Error(
          `INSUFFICIENT_BUCKET_COVERAGE:${bucketResults.length}/${buckets.length}`,
        );
      }

      const statsSummary = this.summarizeStats(stats, people);
      await this.heartbeat(analysisId);
      const synthesis = await this.llm.generateJson<Omit<AnalysisResultView, "stats" | "affinitySeries">>(
        {
          systemInstruction: SYSTEM_INSTRUCTION,
          prompt: buildSynthesisPrompt({
            ...people,
            statsSummary,
            buckets: JSON.stringify(bucketResults),
          }),
          responseSchema: synthesisResponseSchema,
        },
        synthesisZod as never,
      );

      // LLM이 from을 닉네임으로 주거나 표기가 흔들려도 rawName으로 정규화(무결성 방어).
      const canon = (name: string): string | null => {
        if (name === people.rawA || name === people.nickA) return people.rawA;
        if (name === people.rawB || name === people.nickB) return people.rawB;
        return null;
      };
      const normalizedSynthesis = {
        ...synthesis,
        personas: synthesis.personas
          .map((persona) => {
            const rawName = canon(persona.rawName);
            return rawName ? { ...persona, rawName } : null;
          })
          .filter((persona): persona is NonNullable<typeof persona> => persona !== null),
        badges: synthesis.badges
          .map((badge) => {
            const rawName = canon(badge.rawName);
            return rawName ? { ...badge, rawName } : null;
          })
          .filter((badge): badge is NonNullable<typeof badge> => badge !== null),
      };
      const affinitySeries: AffinityPoint[] = bucketResults.map((b) => {
        const scores: Record<string, number> = {};
        for (const a of b.affinity) {
          const key = canon(a.from);
          if (key) scores[key] = a.score;
        }
        return { month: b.month, scores };
      });

      const groundedSynthesis = this.groundSynthesisQuotes(normalizedSynthesis, messages);
      ungroundedQuotesRemoved += groundedSynthesis.removed;
      const result: AnalysisResultView = {
        stats,
        affinitySeries,
        ...groundedSynthesis.value,
        extras: {
          ...groundedSynthesis.value.extras,
          quality: {
            analyzedBuckets: bucketResults.length,
            totalBuckets: buckets.length,
            coveragePercent: Math.round(coverage * 100),
            ungroundedQuotesRemoved,
          },
        },
      };

      await this.prisma.analysisResult.upsert({
        where: { analysisId },
        create: { analysisId, ...this.toJsonColumns(result) },
        update: this.toJsonColumns(result),
      });
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { status: "DONE", heartbeatAt: null },
      });
    } catch (e) {
      // FAILED 전이가 다시 실패해도 원본 에러를 가리지 않는다.
      try {
        await this.prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "FAILED", heartbeatAt: null },
        });
      } catch (e2) {
        this.logger.error(`failed to mark ${analysisId} FAILED: ${String(e2)}`);
      }
      this.logger.error(`analysis ${analysisId} failed: ${String(e)}`);
      throw e;
    }
  }

  private async heartbeat(analysisId: string): Promise<void> {
    const touched = await this.prisma.analysis.updateMany({
      where: { id: analysisId, status: "ANALYZING" },
      data: { heartbeatAt: new Date() },
    });
    if (touched.count !== 1) throw new Error("ANALYSIS_JOB_NOT_ACTIVE");
  }

  private async recoverStaleJobs(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_JOB_MS);
    await this.prisma.analysis.updateMany({
      where: {
        status: "ANALYZING",
        attemptCount: { gte: MAX_ANALYSIS_ATTEMPTS },
        OR: [{ heartbeatAt: null }, { heartbeatAt: { lt: staleBefore } }],
      },
      data: { status: "FAILED", heartbeatAt: null },
    });
    const jobs = await this.prisma.analysis.findMany({
      where: {
        status: "ANALYZING",
        attemptCount: { lt: MAX_ANALYSIS_ATTEMPTS },
        OR: [{ heartbeatAt: null }, { heartbeatAt: { lt: staleBefore } }],
      },
      select: { id: true, heartbeatAt: true },
    });

    for (const job of jobs) {
      const now = new Date();
      const claimed = await this.prisma.analysis.updateMany({
        where: {
          id: job.id,
          status: "ANALYZING",
          heartbeatAt: job.heartbeatAt,
        },
        data: {
          jobStartedAt: now,
          heartbeatAt: now,
          attemptCount: { increment: 1 },
        },
      });
      if (claimed.count === 1) void this.run(job.id).catch(() => {});
    }
  }

  private normalizeQuote(value: string): string {
    return value
      .normalize("NFKC")
      .replace(/[“”"'`]/g, "")
      .replace(/\s+/g, "")
      .trim();
  }

  private quoteExists(quote: string, messages: Message[]): boolean {
    const needle = this.normalizeQuote(quote);
    if (needle.length < 2) return false;
    return messages.some((message) => this.normalizeQuote(message.text).includes(needle));
  }

  private groundBucketQuotes(
    value: BucketAnalysis,
    messages: Message[],
  ): { value: BucketAnalysis; removed: number } {
    let removed = 0;
    const events = value.events.map((event) => {
      if (!event.quote || this.quoteExists(event.quote, messages)) return event;
      removed += 1;
      const { quote: _quote, ...withoutQuote } = event;
      return withoutQuote;
    });
    const highlights = value.highlights.filter((highlight) => {
      const grounded = this.quoteExists(highlight.quote, messages);
      if (!grounded) removed += 1;
      return grounded;
    });
    return { value: { ...value, events, highlights }, removed };
  }

  private groundSynthesisQuotes<T extends Omit<AnalysisResultView, "stats" | "affinitySeries">>(
    value: T,
    messages: Message[],
  ): { value: T; removed: number } {
    let removed = 0;
    const timeline: TimelineEvent[] = value.timeline.map((event) => {
      if (!event.quote || this.quoteExists(event.quote, messages)) return event;
      removed += 1;
      const { quote: _quote, ...withoutQuote } = event;
      return withoutQuote;
    });
    const highlights: Highlight[] = value.highlights.filter((highlight) => {
      const grounded = this.quoteExists(highlight.quote, messages);
      if (!grounded) removed += 1;
      return grounded;
    });
    return { value: { ...value, timeline, highlights }, removed };
  }

  private toJsonColumns(r: AnalysisResultView) {
    return {
      stats: r.stats as object, timeline: r.timeline as object,
      affinitySeries: r.affinitySeries as object, keywords: r.keywords as object,
      personas: r.personas as object, badges: r.badges as object,
      chemiScore: Math.round(r.chemiScore), relationType: r.relationType as object,
      highlights: r.highlights as object, extras: r.extras as object,
    };
  }

  private summarizeStats(
    stats: ReturnType<typeof computeStats>,
    p: { rawA: string; rawB: string; mode: "direct" | "group-focus" },
  ): string {
    const a = stats.perPerson[p.rawA]; const b = stats.perPerson[p.rawB];
    return [
      p.mode === "group-focus"
        ? "단체방 관계 집중 모드이며, 제3자 발화 경계를 넘는 답장 추정은 제외했다."
        : "1:1 대화 모드다.",
      `총 ${stats.totalMessages}개, 기간 ${stats.durationDays}일.`,
      `${p.rawA}: 메시지 ${a?.messageCount ?? 0}, 선톡 ${a?.initiationCount ?? 0}, 답장중앙값 ${a?.replyLatencyMedianSec ?? "-"}초.`,
      `${p.rawB}: 메시지 ${b?.messageCount ?? 0}, 선톡 ${b?.initiationCount ?? 0}, 답장중앙값 ${b?.replyLatencyMedianSec ?? "-"}초.`,
    ].join(" ");
  }
}
