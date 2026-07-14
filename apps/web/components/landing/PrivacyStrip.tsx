const POINTS = [
  { emoji: "🔐", text: "대화 내용은 분석에만 사용하고 저장하지 않아요" },
  { emoji: "🙈", text: "결과는 검색엔진에 노출되지 않는 비공개 링크예요" },
  { emoji: "🗑️", text: "관리 링크로 언제든 삭제할 수 있어요" },
] as const;

/** 프라이버시 안심 배너 + Gemini 전송 고지. */
export function PrivacyStrip() {
  return (
    <section
      aria-labelledby="privacy-heading"
      className="rounded-3xl bg-amber-50 p-5 dark:bg-white/5"
    >
      <h2
        id="privacy-heading"
        className="text-sm font-bold text-neutral-800 dark:text-neutral-100"
      >
        안심하고 올리세요
      </h2>
      <ul className="mt-3 space-y-2">
        {POINTS.map((p) => (
          <li
            key={p.text}
            className="flex items-start gap-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300"
          >
            <span aria-hidden>{p.emoji}</span>
            <span>{p.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-amber-200/60 pt-3 text-[11px] leading-relaxed text-neutral-500 dark:border-white/10 dark:text-neutral-500">
        분석을 위해 대화 내용은 Google Gemini로 전송되어 처리됩니다.
      </p>
    </section>
  );
}
