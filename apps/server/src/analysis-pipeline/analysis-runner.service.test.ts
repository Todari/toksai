import { describe, it, expect, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { AnalysisRunnerService } from "./analysis-runner.service";
import { CryptoService } from "../common/crypto/crypto.service";
import { FakeLlmClient } from "../gemini/fake-llm-client";

const RAW = `2025. 1. 1. 오후 1:00, 김승현 : 뭐해?
2025. 1. 1. 오후 1:02, 곽민성 : 그냥 있어 ㅋㅋ
2025. 2. 1. 오후 9:00, 김승현 : 자니?`;

function makePrisma(encryptedText: string) {
  const store: any = {
    analysis: {
      id: "a1", status: "IDENTIFYING",
      participants: [
        { rawName: "김승현", nickname: "승현", isOwner: true },
        { rawName: "곽민성", nickname: "민성", isOwner: false },
      ],
      rawChat: { encryptedText, messageCount: 3, startedAt: new Date(), endedAt: new Date() },
    },
    result: null as any,
  };
  return {
    _store: store,
    analysis: {
      update: vi.fn(async ({ data }: any) => { store.analysis.status = data.status; return store.analysis; }),
      findUnique: vi.fn(async () => store.analysis),
    },
    analysisResult: {
      upsert: vi.fn(async ({ create }: any) => { store.result = create; return create; }),
    },
  } as any;
}

const bucketReturn = (month: string) => () => ({
  month, events: [{ date: `${month}-01`, title: "t", summary: "s" }],
  affinity: [
    { from: "김승현", to: "곽민성", score: 70, reason: "r" },
    { from: "곽민성", to: "김승현", score: 60, reason: "r" },
  ],
  keywords: ["k"], highlights: [{ quote: "q", caption: "c", kind: "funny" }],
});

const synthesisReturn = () => ({
  timeline: [{ date: "2025-01-01", title: "시작", summary: "s" }],
  keywords: ["게임", "밥"],
  personas: [{ rawName: "김승현", oneLiner: "직진러" }, { rawName: "곽민성", oneLiner: "츤데레" }],
  badges: [{ rawName: "김승현", badgeId: "first_texter", reason: "선톡많음" }],
  chemiScore: 82,
  relationType: { code: "WARM", label: "티키타카", description: "d" },
  highlights: [{ quote: "q", caption: "c", kind: "flutter" }],
});

describe("AnalysisRunnerService.run", () => {
  it("복호화→파싱→통계→버킷LLM→통합→결과저장, status DONE", async () => {
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const enc = crypto.encrypt(RAW);
    const prisma = makePrisma(enc);
    // 버킷 2개(2025-01, 2025-02) + 통합 1콜 = 핸들러 3개
    const fake = new FakeLlmClient([bucketReturn("2025-01"), bucketReturn("2025-02"), synthesisReturn]);
    const runner = new AnalysisRunnerService(prisma, crypto, fake);

    await runner.run("a1");

    expect(prisma.analysis.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ANALYZING" }) }));
    const saved = prisma.analysisResult.upsert.mock.calls[0][0].create;
    expect(saved.chemiScore).toBe(82);
    expect(saved.stats.totalMessages).toBe(3);
    expect(saved.affinitySeries.length).toBe(2); // 월 2개
    expect(saved.affinitySeries[0].scores["김승현"]).toBe(70);
    expect(prisma._store.analysis.status).toBe("DONE");
  });

  it("affinity from이 닉네임으로 와도 rawName으로 정규화한다", async () => {
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const prisma = makePrisma(crypto.encrypt(RAW));
    const nickBucket = (month: string) => () => ({
      month, events: [], keywords: [], highlights: [],
      affinity: [
        { from: "승현", to: "민성", score: 55, reason: "r" }, // 닉네임으로 응답
        { from: "민성", to: "승현", score: 44, reason: "r" },
      ],
    });
    const fake = new FakeLlmClient([nickBucket("2025-01"), nickBucket("2025-02"), synthesisReturn]);
    const runner = new AnalysisRunnerService(prisma, crypto, fake);
    await runner.run("a1");
    const saved = prisma.analysisResult.upsert.mock.calls[0][0].create;
    expect(saved.affinitySeries[0].scores["김승현"]).toBe(55); // "승현" → rawName
    expect(saved.affinitySeries[0].scores["곽민성"]).toBe(44);
    expect(saved.affinitySeries[0].scores["승현"]).toBeUndefined();
  });

  it("LLM이 던지면 status FAILED 후 rethrow", async () => {
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const prisma = makePrisma(crypto.encrypt(RAW));
    const throwing = { generateJson: vi.fn(async () => { throw new Error("boom"); }) } as any;
    const runner = new AnalysisRunnerService(prisma, crypto, throwing);
    await expect(runner.run("a1")).rejects.toThrow();
    expect(prisma._store.analysis.status).toBe("FAILED");
  });
});
