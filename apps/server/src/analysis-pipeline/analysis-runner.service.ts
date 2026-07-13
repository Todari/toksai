import { Injectable, Logger } from "@nestjs/common";
import type { PrismaClient } from "@toksai/db";
import {
  parseKakao, computeStats, bucketByMonth, renderBucketText, mapWithConcurrency,
} from "@toksai/shared";
import type { AffinityPoint, AnalysisResultView, BucketAnalysis } from "@toksai/shared";
import { CryptoService } from "../common/crypto/crypto.service";
import type { LlmClient } from "../gemini/llm-client";
import { bucketZod, bucketResponseSchema, synthesisZod, synthesisResponseSchema } from "./schemas";
import { SYSTEM_INSTRUCTION, buildBucketPrompt, buildSynthesisPrompt } from "./prompts";

const BUCKET_CONCURRENCY = 3;

@Injectable()
export class AnalysisRunnerService {
  private readonly logger = new Logger(AnalysisRunnerService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly crypto: CryptoService,
    private readonly llm: LlmClient,
  ) {}

  async run(analysisId: string): Promise<void> {
    try {
      await this.prisma.analysis.update({ where: { id: analysisId }, data: { status: "ANALYZING" } });
      const analysis = await this.prisma.analysis.findUnique({
        where: { id: analysisId },
        include: { participants: true, rawChat: true },
      });
      if (!analysis || !analysis.rawChat) throw new Error("ANALYSIS_NOT_READY");

      const [pa, pb] = analysis.participants;
      const people = {
        rawA: pa.rawName, rawB: pb.rawName,
        nickA: pa.nickname ?? pa.rawName, nickB: pb.nickname ?? pb.rawName,
      };

      const text = this.crypto.decrypt(analysis.rawChat.encryptedText);
      const parsed = parseKakao(text);
      const stats = computeStats(parsed.messages);
      const buckets = bucketByMonth(parsed.messages);

      const bucketResults = (await mapWithConcurrency(buckets, BUCKET_CONCURRENCY, async (b) => {
        try {
          return await this.llm.generateJson<BucketAnalysis>(
            {
              systemInstruction: SYSTEM_INSTRUCTION,
              prompt: buildBucketPrompt({ ...people, month: b.month, text: renderBucketText(b) }),
              responseSchema: bucketResponseSchema,
            },
            bucketZod,
          );
        } catch (e) {
          this.logger.warn(`bucket ${b.month} failed: ${String(e)}`);
          return null;
        }
      })).filter((x): x is BucketAnalysis => x !== null);

      const statsSummary = this.summarizeStats(stats, people);
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

      const affinitySeries: AffinityPoint[] = bucketResults.map((b) => {
        const scores: Record<string, number> = {};
        for (const a of b.affinity) scores[a.from] = a.score;
        return { month: b.month, scores };
      });

      const result: AnalysisResultView = { stats, affinitySeries, ...synthesis };

      await this.prisma.analysisResult.upsert({
        where: { analysisId },
        create: { analysisId, ...this.toJsonColumns(result) },
        update: this.toJsonColumns(result),
      });
      await this.prisma.analysis.update({ where: { id: analysisId }, data: { status: "DONE" } });
    } catch (e) {
      // FAILED 전이가 다시 실패해도 원본 에러를 가리지 않는다.
      try {
        await this.prisma.analysis.update({ where: { id: analysisId }, data: { status: "FAILED" } });
      } catch (e2) {
        this.logger.error(`failed to mark ${analysisId} FAILED: ${String(e2)}`);
      }
      this.logger.error(`analysis ${analysisId} failed: ${String(e)}`);
      throw e;
    }
  }

  private toJsonColumns(r: AnalysisResultView) {
    return {
      stats: r.stats as object, timeline: r.timeline as object,
      affinitySeries: r.affinitySeries as object, keywords: r.keywords as object,
      personas: r.personas as object, badges: r.badges as object,
      chemiScore: Math.round(r.chemiScore), relationType: r.relationType as object,
      highlights: r.highlights as object,
    };
  }

  private summarizeStats(stats: ReturnType<typeof computeStats>, p: { rawA: string; rawB: string }): string {
    const a = stats.perPerson[p.rawA]; const b = stats.perPerson[p.rawB];
    return [
      `총 ${stats.totalMessages}개, 기간 ${stats.durationDays}일.`,
      `${p.rawA}: 메시지 ${a?.messageCount ?? 0}, 선톡 ${a?.initiationCount ?? 0}, 답장중앙값 ${a?.replyLatencyMedianSec ?? "-"}초.`,
      `${p.rawB}: 메시지 ${b?.messageCount ?? 0}, 선톡 ${b?.initiationCount ?? 0}, 답장중앙값 ${b?.replyLatencyMedianSec ?? "-"}초.`,
    ].join(" ");
  }
}
