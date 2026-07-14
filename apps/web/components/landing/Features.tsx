const FEATURES = [
  { emoji: "💯", title: "케미 지수", desc: "0~100점으로 보는 우리 둘의 궁합 점수" },
  { emoji: "📈", title: "호감 신호 곡선", desc: "대화 흐름 속 관심도 변화를 그래프로" },
  { emoji: "🗓️", title: "관계 타임라인", desc: "우리 사이 주요 이벤트를 시간순으로" },
  { emoji: "🔥", title: "시간대 히트맵", desc: "요일·시간별로 대화가 몰리는 순간" },
  { emoji: "⚖️", title: "선톡 밸런스", desc: "누가 먼저 말 거는지 균형을 한눈에" },
  { emoji: "🔑", title: "관심 키워드", desc: "자주 나온 단어로 보는 서로의 관심사" },
  { emoji: "🎭", title: "성향 & 뱃지", desc: "대화 스타일로 보는 나의 캐릭터" },
  { emoji: "✨", title: "하이라이트", desc: "대화 중 가장 인상적이었던 순간 모음" },
] as const;

/** 분석 결과에서 볼 수 있는 항목을 소개하는 카드 그리드. */
export function Features() {
  return (
    <section aria-labelledby="features-heading">
      <h2
        id="features-heading"
        className="px-1 text-base font-bold text-neutral-800 dark:text-neutral-100"
      >
        무엇을 알 수 있나요?
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#241d17]"
          >
            <span aria-hidden className="text-2xl">
              {f.emoji}
            </span>
            <p className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">
              {f.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
