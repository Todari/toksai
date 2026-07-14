import type { AnalysisResultView } from "@toksai/api";

interface MovieCardProps {
  result: AnalysisResultView;
}

/** 둘의 관계를 영화/드라마/노래에 비유한 포스터 느낌 카드. extras 없으면(구버전) 렌더 생략. */
export function MovieCard({ result }: MovieCardProps) {
  const movie = result.extras?.movie;
  if (!movie?.title) return null;

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-[#241d17]">
      <div className="bg-gradient-to-br from-[#2b1a0d] via-[#241708] to-[#1a1008] px-5 py-7 text-center">
        <p className="text-[11px] font-bold tracking-wide text-amber-300">
          🎬 둘의 관계를 영화로 만든다면
        </p>
        <p className="mt-3 text-2xl leading-snug font-black text-white">《{movie.title}》</p>
      </div>
      <p className="p-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{movie.reason}</p>
    </section>
  );
}
