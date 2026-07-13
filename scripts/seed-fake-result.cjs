// 개발용: 실제 Gemini 없이 결과 페이지를 시각 확인하기 위한 가짜 DONE 분석 시드.
// 사용:  set -a; . ./.env; set +a; node scripts/seed-fake-result.cjs
// 또는:  pnpm dlx dotenv-cli -e .env -- node scripts/seed-fake-result.cjs
const { prisma } = require("../packages/db/dist/index.js");
const nodeCrypto = require("node:crypto");

const token = () => nodeCrypto.randomBytes(24).toString("base64url");
const rawA = "김승현";
const rawB = "곽민성";

// 저녁·밤 편중 히트맵 7x24
const heatmap = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) => {
    const evening = h >= 20 || h <= 1 ? 8 : h >= 12 && h <= 18 ? 4 : 1;
    const weekendBoost = d === 0 || d === 6 ? 1.5 : 1;
    return Math.round(evening * weekendBoost * (0.6 + ((d * 7 + h) % 5) / 6));
  }),
);

const perPerson = {
  [rawA]: {
    rawName: rawA, messageCount: 7421, charCount: 62310, avgMessageLength: 8.4,
    initiationCount: 214, replyLatencyMedianSec: 92,
    emojiCount: 1203, laughCount: 3890, questionCount: 640, exclamationCount: 512,
  },
  [rawB]: {
    rawName: rawB, messageCount: 6890, charCount: 71020, avgMessageLength: 10.3,
    initiationCount: 143, replyLatencyMedianSec: 210,
    emojiCount: 640, laughCount: 2110, questionCount: 402, exclamationCount: 388,
  },
};

const months = ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"];
const affinitySeries = months.map((month, i) => ({
  month,
  scores: {
    [rawA]: [62, 68, 74, 71, 83, 88][i],
    [rawB]: [55, 60, 63, 72, 78, 85][i],
  },
}));

const stats = {
  totalMessages: 14311,
  startedAt: new Date("2025-01-03T22:10:00").toISOString(),
  endedAt: new Date("2025-06-28T01:12:00").toISOString(),
  durationDays: 176,
  perPerson,
  heatmap,
  monthly: months.map((month, i) => ({
    month, total: [1900, 2100, 2600, 2400, 2700, 2611][i],
    perPerson: { [rawA]: 1000 + i * 60, [rawB]: 900 + i * 55 },
  })),
};

const result = {
  stats,
  timeline: [
    { date: "2025-01-14", title: "첫 새벽 통화", summary: "처음으로 새벽 2시까지 대화가 이어졌어요.", quote: "안 자? ㅋㅋ 나도 안 와" },
    { date: "2025-03-02", title: "같이 본 전시", summary: "주말에 전시 다녀온 이야기로 하루 종일 톡.", quote: "그 그림 진짜 좋더라" },
    { date: "2025-04-20", title: "작은 다툼과 화해", summary: "잠깐 티격태격했지만 금방 풀렸어요.", quote: "미안 내가 예민했어" },
    { date: "2025-06-10", title: "여행 계획", summary: "여름 여행지를 함께 고르며 설렘 최고조.", quote: "우리 바다 가자!!" },
  ],
  affinitySeries,
  keywords: ["새벽수다", "밥약속", "전시", "여행", "고민상담", "ㅋㅋ", "응원", "노래추천"],
  personas: [
    { rawName: rawA, oneLiner: "먼저 말 거는 걸 두려워 않는 직진 새벽러" },
    { rawName: rawB, oneLiner: "답장은 느긋해도 문장에 진심을 꾹 눌러담는 사람" },
  ],
  badges: [
    { rawName: rawA, badgeId: "first_texter", reason: "선톡 214회로 대화의 물꼬를 자주 텄어요." },
    { rawName: rawA, badgeId: "night_owl", reason: "새벽 시간대 메시지가 유독 많았어요." },
    { rawName: rawB, badgeId: "essay_writer", reason: "평균 문장이 길고 정성이 담겼어요." },
    { rawName: rawB, badgeId: "slow_burner", reason: "답장은 느려도 한 마디 한 마디가 진솔했어요." },
  ],
  chemiScore: 84,
  relationType: {
    code: "WNGT",
    label: "새벽감성 티키타카",
    description: "낮보다 밤에 진해지는 사이. 한 명이 불을 지피면 다른 한 명이 오래 타오르는 조합이에요.",
  },
  highlights: [
    { quote: "너랑 얘기하면 시간 가는 줄 모르겠어", caption: "설렘이 스친 순간", kind: "flutter", at: "2025-02-11" },
    { quote: "ㅋㅋㅋㅋㅋ 아 진짜 미쳤나봐 너", caption: "빵 터진 순간", kind: "funny", at: "2025-03-22" },
    { quote: "힘들 때 네가 있어서 버텼어 고마워", caption: "뭉클했던 순간", kind: "touching", at: "2025-05-05" },
  ],
};

async function main() {
  const viewToken = token();
  const adminToken = token();
  await prisma.analysis.create({
    data: {
      viewToken, adminToken, status: "DONE", sourceType: "upload",
      participants: {
        create: [
          { rawName: rawA, nickname: "승현", isOwner: true },
          { rawName: rawB, nickname: "민성", isOwner: false },
        ],
      },
      rawChat: {
        create: {
          encryptedText: "seed-placeholder", messageCount: stats.totalMessages,
          startedAt: new Date(stats.startedAt), endedAt: new Date(stats.endedAt),
        },
      },
      result: {
        create: {
          stats: result.stats, timeline: result.timeline, affinitySeries: result.affinitySeries,
          keywords: result.keywords, personas: result.personas, badges: result.badges,
          chemiScore: result.chemiScore, relationType: result.relationType, highlights: result.highlights,
        },
      },
    },
  });
  console.log("SEEDED_VIEW_TOKEN=" + viewToken);
  console.log("SEEDED_ADMIN_TOKEN=" + adminToken);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
