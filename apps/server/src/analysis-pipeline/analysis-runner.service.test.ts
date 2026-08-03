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
      id: "a1", status: "ANALYZING", heartbeatAt: new Date(), attemptCount: 1,
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
      update: vi.fn(async ({ data }: any) => {
        Object.assign(store.analysis, data);
        return store.analysis;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (where.id && where.id !== store.analysis.id) return { count: 0 };
        if (where.status && where.status !== store.analysis.status) return { count: 0 };
        Object.assign(store.analysis, data);
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => store.analysis),
      findMany: vi.fn(async () => []),
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
  keywords: ["k"],
  highlights: [{ quote: month === "2025-02" ? "자니?" : "뭐해?", caption: "c", kind: "funny" }],
});

const synthesisReturn = () => ({
  timeline: [{ date: "2025-01-01", title: "시작", summary: "s" }],
  keywords: ["게임", "밥"],
  personas: [{ rawName: "김승현", oneLiner: "직진러" }, { rawName: "곽민성", oneLiner: "츤데레" }],
  badges: [{ rawName: "김승현", badgeId: "first_texter", reason: "선톡많음" }],
  chemiScore: 82,
  relationType: { code: "WARM", label: "티키타카", description: "d" },
  highlights: [{ quote: "뭐해?", caption: "c", kind: "flutter" }],
  extras: {
    movie: { title: "너의 이름은", reason: "r" },
    aiComment: "좋아요",
    insideJokes: ["ㄹㅇ"],
    moodSeries: [{ month: "2025-01", mood: "설렘", note: "n" }],
    topicSuggestion: "여행",
  },
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

    expect(prisma.analysis.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "ANALYZING" }) }),
    );
    const saved = prisma.analysisResult.upsert.mock.calls[0][0].create;
    expect(saved.chemiScore).toBe(82);
    expect(saved.stats.totalMessages).toBe(3);
    expect(saved.affinitySeries.length).toBe(2); // 월 2개
    expect(saved.affinitySeries[0].scores["김승현"]).toBe(70);
    expect(saved.extras.quality).toMatchObject({
      analyzedBuckets: 2,
      totalBuckets: 2,
      coveragePercent: 100,
    });
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
    const nickSynthesis = () => ({
      ...synthesisReturn(),
      personas: [
        { rawName: "승현", oneLiner: "직진러" },
        { rawName: "민성", oneLiner: "츤데레" },
      ],
    });
    const fake = new FakeLlmClient([nickBucket("2025-01"), nickBucket("2025-02"), nickSynthesis]);
    const runner = new AnalysisRunnerService(prisma, crypto, fake);
    await runner.run("a1");
    const saved = prisma.analysisResult.upsert.mock.calls[0][0].create;
    expect(saved.affinitySeries[0].scores["김승현"]).toBe(55); // "승현" → rawName
    expect(saved.affinitySeries[0].scores["곽민성"]).toBe(44);
    expect(saved.affinitySeries[0].scores["승현"]).toBeUndefined();
    expect(saved.personas.map((persona: { rawName: string }) => persona.rawName)).toEqual([
      "김승현",
      "곽민성",
    ]);
  });

  it("예전·현재 표시 이름을 확인된 두 사람으로 합친 뒤 통계와 AI 입력을 만든다", async () => {
    const renamedRaw = `2025. 1. 1. 오후 1:00, A : 안녕
2025. 1. 1. 오후 1:01, 나 : 하이
2025. 1. 1. 오후 1:02, B : 이름 바꿨어
2025. 1. 1. 오후 1:03, 나 : 확인`;
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const prisma = makePrisma(crypto.encrypt(renamedRaw));
    prisma._store.analysis.authorAliasMap = { A: "B", B: "B", 나: "나" };
    prisma._store.analysis.participants = [
      { rawName: "B", nickname: "상대", isOwner: false },
      { rawName: "나", nickname: "나", isOwner: false },
    ];
    const aliasBucket = () => ({
      month: "2025-01",
      events: [],
      affinity: [
        { from: "B", to: "나", score: 60, reason: "r" },
        { from: "나", to: "B", score: 55, reason: "r" },
      ],
      keywords: [],
      highlights: [],
    });
    const aliasSynthesis = () => ({
      ...synthesisReturn(),
      personas: [
        { rawName: "B", oneLiner: "상대" },
        { rawName: "나", oneLiner: "나" },
      ],
      badges: [],
    });
    const runner = new AnalysisRunnerService(
      prisma,
      crypto,
      new FakeLlmClient([aliasBucket, aliasSynthesis]),
    );

    await runner.run("a1");

    const saved = prisma.analysisResult.upsert.mock.calls[0][0].create;
    expect(Object.keys(saved.stats.perPerson).sort()).toEqual(["B", "나"].sort());
    expect(saved.stats.perPerson.B.messageCount).toBe(2);
    expect(saved.stats.totalMessages).toBe(4);
  });

  it("솔직 하이라이트 종류(banter/awkward/clash)도 스키마를 통과해 저장된다", async () => {
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const prisma = makePrisma(crypto.encrypt(RAW));
    const honestBucket = (month: string) => () => ({
      ...bucketReturn(month)(),
      highlights: [{ quote: "q", caption: "c", kind: "banter" }],
    });
    const honestSynthesis = () => ({
      ...synthesisReturn(),
      chemiScore: 34,
      relationType: { code: "COLD", label: "서먹한 사이", description: "d" },
      highlights: [
        { quote: "뭐해?", caption: "c1", kind: "awkward" },
        { quote: "그냥 있어 ㅋㅋ", caption: "c2", kind: "clash" },
      ],
    });
    const fake = new FakeLlmClient([honestBucket("2025-01"), honestBucket("2025-02"), honestSynthesis]);
    const runner = new AnalysisRunnerService(prisma, crypto, fake);

    await runner.run("a1");

    const saved = prisma.analysisResult.upsert.mock.calls[0][0].create;
    expect(saved.highlights.map((h: { kind: string }) => h.kind)).toEqual(["awkward", "clash"]);
    expect(saved.chemiScore).toBe(34);
    expect(prisma._store.analysis.status).toBe("DONE");
  });

  it("LLM이 던지면 status FAILED 후 rethrow", async () => {
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const prisma = makePrisma(crypto.encrypt(RAW));
    const throwing = { generateJson: vi.fn(async () => { throw new Error("boom"); }) } as any;
    const runner = new AnalysisRunnerService(prisma, crypto, throwing);
    await expect(runner.run("a1")).rejects.toThrow();
    expect(prisma._store.analysis.status).toBe("FAILED");
  });

  it("원문에 없는 인용은 결과에서 제거하고 품질 메타에 기록한다", async () => {
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const prisma = makePrisma(crypto.encrypt(RAW));
    const fake = new FakeLlmClient([
      bucketReturn("2025-01"),
      bucketReturn("2025-02"),
      () => ({
        ...synthesisReturn(),
        timeline: [{ date: "2025-01-01", title: "시작", summary: "s", quote: "지어낸 말" }],
        highlights: [{ quote: "존재하지 않는 인용", caption: "c", kind: "funny" }],
      }),
    ]);
    const runner = new AnalysisRunnerService(prisma, crypto, fake);

    await runner.run("a1");

    const saved = prisma.analysisResult.upsert.mock.calls[0][0].create;
    expect(saved.timeline[0].quote).toBeUndefined();
    expect(saved.highlights).toEqual([]);
    expect(saved.extras.quality.ungroundedQuotesRemoved).toBe(2);
  });
});

describe("AnalysisRunnerService stale recovery", () => {
  it("서버 시작 시 오래 멈춘 ANALYZING 작업을 다시 실행한다", async () => {
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const prisma = makePrisma(crypto.encrypt(RAW));
    prisma.analysis.findMany.mockResolvedValue([{ id: "a1", heartbeatAt: null }]);
    prisma.analysis.updateMany.mockResolvedValue({ count: 1 });
    const runner = new AnalysisRunnerService(prisma, crypto, new FakeLlmClient([]));
    const run = vi.spyOn(runner, "run").mockResolvedValue();

    await runner.onModuleInit();
    await Promise.resolve();

    expect(run).toHaveBeenCalledWith("a1");
  });
});
