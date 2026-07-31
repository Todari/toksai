const FEATURES = [
  { emoji: "💯", title: "케미 지수", desc: "0~100점으로 보는 우리 둘의 궁합 점수" },
  { emoji: "🤖", title: "AI 한마디", desc: "미화 없이 솔직한 우리 관계 총평" },
  { emoji: "📈", title: "호감 신호 곡선", desc: "대화 흐름 속 관심도 변화를 그래프로" },
  { emoji: "🎬", title: "관계를 영화로", desc: "둘의 관계를 영화 제목에 비유한다면?" },
  { emoji: "🗓️", title: "관계 타임라인", desc: "우리 사이 주요 이벤트를 시간순으로" },
  { emoji: "🌡️", title: "감정 온도", desc: "달마다 달랐던 우리 분위기를 한눈에" },
  { emoji: "⚖️", title: "대화 습관", desc: "선톡 밸런스, 답장 속도, 시간대 히트맵" },
  { emoji: "🕵️", title: "자잘한 기록들", desc: "최장 잠수, 골든타임, 첫 대화, 최애 이모지" },
  { emoji: "🎭", title: "성향 & 뱃지", desc: "대화 스타일로 보는 나의 캐릭터" },
  { emoji: "✨", title: "하이라이트", desc: "설렘부터 투닥까지, 다시 보고 싶은 순간들" },
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
