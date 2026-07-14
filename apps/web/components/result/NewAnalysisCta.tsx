import Link from "next/link";

/** 공유 링크로 결과를 본 방문자를 새 분석으로 유도하는 마무리 CTA. */
export function NewAnalysisCta() {
  return (
    <section className="rounded-3xl bg-gradient-to-r from-[#F5B301]/10 to-[#FB7185]/10 p-5 text-center dark:from-amber-400/10 dark:to-rose-400/10">
      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">우리 사이도 궁금하다면?</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        카톡 대화 파일만 올리면 1분 안에 결과가 나와요.
      </p>
      <Link
        href="/"
        className="mt-3 inline-block rounded-full bg-gradient-to-r from-[#F5B301] to-[#FB7185] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95"
      >
        내 대화도 분석해보기
      </Link>
    </section>
  );
}
