import type { AnalysisResultView } from "@toksai/api";
import type { AnalysisView } from "../components/result/format";

function sampleHeatmap(): number[][] {
  return Array.from({ length: 7 }, (_, weekday) =>
    Array.from({ length: 24 }, (_, hour) => {
      const evening = hour >= 20 && hour <= 23 ? 18 : 2;
      const weekend = weekday === 0 || weekday === 6 ? 7 : 0;
      return Math.max(0, evening + weekend - Math.abs(22 - hour) * 2);
    }),
  );
}

export const SAMPLE_VIEW: AnalysisView = {
  participants: [
    { id: "sample-a", rawName: "민준", nickname: "민준", isOwner: true },
    { id: "sample-b", rawName: "서연", nickname: "서연", isOwner: false },
  ],
};

export const SAMPLE_RESULT: AnalysisResultView = {
  chemiScore: 82,
  relationType: {
    code: "WARM",
    label: "편안한 티키타카",
    description: "장난을 주고받다가도 필요한 순간엔 다정하게 챙겨주는, 온도가 잘 맞는 사이예요.",
  },
  stats: {
    totalMessages: 18_642,
    startedAt: "2025-02-14T11:20:00.000Z",
    endedAt: "2026-07-24T14:42:00.000Z",
    durationDays: 525,
    perPerson: {
      민준: {
        rawName: "민준",
        messageCount: 9_812,
        charCount: 97_531,
        avgMessageLength: 9.94,
        initiationCount: 284,
        replyLatencyMedianSec: 168,
        emojiCount: 342,
        laughCount: 2_814,
        questionCount: 904,
        exclamationCount: 288,
      },
      서연: {
        rawName: "서연",
        messageCount: 8_830,
        charCount: 103_744,
        avgMessageLength: 11.75,
        initiationCount: 247,
        replyLatencyMedianSec: 214,
        emojiCount: 619,
        laughCount: 2_206,
        questionCount: 736,
        exclamationCount: 421,
      },
    },
    heatmap: sampleHeatmap(),
    monthly: [
      { month: "2026-02", total: 2_641, perPerson: { 민준: 1_392, 서연: 1_249 } },
      { month: "2026-03", total: 2_984, perPerson: { 민준: 1_532, 서연: 1_452 } },
      { month: "2026-04", total: 3_102, perPerson: { 민준: 1_670, 서연: 1_432 } },
      { month: "2026-05", total: 3_488, perPerson: { 민준: 1_798, 서연: 1_690 } },
      { month: "2026-06", total: 3_246, perPerson: { 민준: 1_642, 서연: 1_604 } },
      { month: "2026-07", total: 3_181, perPerson: { 민준: 1_778, 서연: 1_403 } },
    ],
    funFacts: {
      goldenHour: { weekday: 5, hour: 22, count: 846 },
      busiestDay: { date: "2026-05-17", count: 614 },
      longestSilence: {
        gapHours: 76.5,
        brokenBy: "서연",
        brokenAt: "2026-04-09T11:02:00.000Z",
        message: "우리 너무 오래 조용했던 거 아냐?",
      },
      lateNightCount: 1_284,
      firstMessage: {
        at: "2025-02-14T11:20:00.000Z",
        author: "민준",
        text: "오늘 커피 고마웠어!",
      },
      topEmoji: { 민준: "😂", 서연: "🥹" },
      conversationEnder: { 민준: 194, 서연: 172 },
    },
  },
  affinitySeries: [
    { month: "2026-02", scores: { 민준: 62, 서연: 59 } },
    { month: "2026-03", scores: { 민준: 68, 서연: 65 } },
    { month: "2026-04", scores: { 민준: 64, 서연: 61 } },
    { month: "2026-05", scores: { 민준: 78, 서연: 76 } },
    { month: "2026-06", scores: { 민준: 81, 서연: 79 } },
    { month: "2026-07", scores: { 민준: 86, 서연: 83 } },
  ],
  timeline: [
    {
      date: "2026-02-14",
      title: "커피 한 잔에서 시작",
      summary: "짧은 감사 인사가 매일 이어지는 대화의 시작이 됐어요.",
      quote: "오늘 커피 고마웠어!",
    },
    {
      date: "2026-03-22",
      title: "둘만의 주말 루틴",
      summary: "토요일마다 맛집 후보를 주고받는 루틴이 생겼어요.",
      quote: "이번 주 후보는 세 군데야. 골라봐",
    },
    {
      date: "2026-04-09",
      title: "긴 침묵을 먼저 깬 날",
      summary: "며칠간 조용했던 흐름을 서연이 솔직한 한마디로 다시 열었어요.",
      quote: "우리 너무 오래 조용했던 거 아냐?",
    },
    {
      date: "2026-05-17",
      title: "비 오는 날의 폭풍 수다",
      summary: "하루 동안 600개 넘는 메시지를 주고받으며 가장 오래 이야기했어요.",
      quote: "비 오니까 그냥 계속 얘기하자",
    },
    {
      date: "2026-07-03",
      title: "다음 계절 약속",
      summary: "가을에 함께 가고 싶은 곳을 구체적으로 정하기 시작했어요.",
      quote: "단풍 들면 진짜 같이 가는 거다?",
    },
  ],
  keywords: ["맛집", "산책", "출근", "고양이", "여행", "사진", "주말", "커피"],
  personas: [
    { rawName: "민준", oneLiner: "먼저 문을 열고 장난으로 분위기를 살리는 선톡형" },
    { rawName: "서연", oneLiner: "세심하게 기억했다가 필요한 순간을 챙기는 다정형" },
  ],
  badges: [
    { rawName: "민준", badgeId: "first_texter", reason: "대화가 뜸해진 뒤 먼저 말을 건 횟수가 더 많아요." },
    { rawName: "민준", badgeId: "laugh_machine", reason: "둘의 웃음 중 절반 이상을 책임졌어요." },
    { rawName: "서연", badgeId: "reply_fairy", reason: "상대의 질문에 빠르고 안정적으로 답했어요." },
    { rawName: "서연", badgeId: "emoji_bomber", reason: "말보다 이모지 하나로 감정을 정확히 전해요." },
  ],
  highlights: [
    {
      quote: "비 오니까 그냥 계속 얘기하자",
      caption: "약속이 없어도 함께 시간을 보내는 방법을 찾은 순간",
      kind: "flutter",
      at: "2026-05-17",
    },
    {
      quote: "그건 칭찬이야 공격이야 ㅋㅋ",
      caption: "서로의 장난을 가장 잘 받아치는 둘",
      kind: "banter",
      at: "2026-06-02",
    },
    {
      quote: "우리 너무 오래 조용했던 거 아냐?",
      caption: "어색함을 숨기지 않고 먼저 꺼내 관계를 다시 이은 말",
      kind: "touching",
      at: "2026-04-09",
    },
  ],
  extras: {
    movie: {
      title: "매일의 대화가 장면이 될 때",
      reason: "큰 사건보다 퇴근, 식사, 날씨 같은 일상을 꾸준히 나누며 천천히 가까워지는 이야기예요.",
    },
    aiComment:
      "확 불타오르기보다 편안함을 차곡차곡 쌓은 사이예요. 장난 뒤에 챙김이 따라와서 오래 이야기할 힘이 보여요.",
    insideJokes: ["후보는 세 군데", "그건 반칙이지", "일단 커피부터"],
    moodSeries: [
      { month: "2026-02", mood: "호기심", note: "서로를 알아가는 질문이 많았어요." },
      { month: "2026-03", mood: "티키타카", note: "장난과 답장이 빨라졌어요." },
      { month: "2026-04", mood: "잠깐 서먹", note: "긴 공백 뒤 솔직하게 다시 이었어요." },
      { month: "2026-05", mood: "다정", note: "일상을 가장 많이 나눈 달이에요." },
      { month: "2026-06", mood: "편안", note: "설명 없이도 통하는 말이 늘었어요." },
      { month: "2026-07", mood: "설렘", note: "함께할 다음 계획이 생겼어요." },
    ],
    topicSuggestion: "둘이 아직 함께 가보지 않은 동네에서 하루 코스를 하나씩 골라보세요.",
    quality: {
      analyzedBuckets: 6,
      totalBuckets: 6,
      coveragePercent: 100,
      ungroundedQuotesRemoved: 0,
    },
  },
};
