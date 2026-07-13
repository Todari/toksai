interface KeywordsProps {
  keywords: string[];
}

/** 대화에서 자주 등장한 단어 · 표현을 절제된 칩 목록으로 보여준다. */
export function Keywords({ keywords }: KeywordsProps) {
  if (keywords.length === 0) return null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]">
      <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">
        우리 대화 속 키워드
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {keywords.map((keyword, i) => (
          <span
            key={`${keyword}-${i}`}
            className="rounded-full bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-600 dark:bg-white/5 dark:text-neutral-300"
          >
            #{keyword}
          </span>
        ))}
      </div>
    </section>
  );
}
