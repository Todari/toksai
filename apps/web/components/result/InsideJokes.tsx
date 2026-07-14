import type { AnalysisResultView } from "@toksai/api";

interface InsideJokesProps {
  result: AnalysisResultView;
}

/** 둘만 아는 말버릇·밈 칩 목록. extras가 없거나(구버전) 빈 배열이면 렌더 생략. */
export function InsideJokes({ result }: InsideJokesProps) {
  const jokes = result.extras?.insideJokes;
  if (!jokes || jokes.length === 0) return null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]">
      <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">우리만 아는 말</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {jokes.map((joke, i) => (
          <span
            key={`${joke}-${i}`}
            className="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"
          >
            😄 {joke}
          </span>
        ))}
      </div>
    </section>
  );
}
