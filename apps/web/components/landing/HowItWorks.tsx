const STEPS = [
  {
    emoji: "📤",
    title: "카톡 대화 내보내기",
    desc: "카카오톡 채팅방 설정에서 대화 내보내기(텍스트)로 파일을 저장하세요.",
  },
  {
    emoji: "📎",
    title: "직접 올리거나 메일로 보내기",
    desc: "파일을 바로 선택하거나, 화면에 나온 분석 전용 주소로 메일을 보내세요.",
  },
  {
    emoji: "🔗",
    title: "비공개 링크로 함께 보기",
    desc: "분석이 끝나면 나만 아는 링크가 생겨요. 상대에게 공유해서 같이 확인해보세요.",
  },
] as const;

/** 3단계 이용 흐름을 보여주는 섹션. */
export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]"
    >
      <h2
        id="how-it-works-heading"
        className="text-base font-bold text-neutral-800 dark:text-neutral-100"
      >
        3단계면 충분해요
      </h2>
      <ol className="mt-4 space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-lg dark:bg-amber-400/10"
            >
              {step.emoji}
            </span>
            <div>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                <span className="mr-1 text-amber-500">{i + 1}.</span>
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {step.desc}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
