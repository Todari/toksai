import { UploadCta } from "./UploadCta";

/** 랜딩 최상단 히어로: 워드마크 + 태그라인 + 서브카피 + 업로드 CTA. */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="motion-safe:animate-[blob-drift_14s_ease-in-out_infinite] absolute -left-16 -top-24 h-72 w-72 rounded-full bg-amber-300/40 blur-3xl dark:bg-amber-500/10" />
        <div className="motion-safe:animate-[blob-drift_18s_ease-in-out_infinite_reverse] absolute -right-16 top-4 h-80 w-80 rounded-full bg-rose-300/40 blur-3xl dark:bg-rose-500/10" />
      </div>

      <div className="mx-auto max-w-[600px] px-4 pb-12 pt-16 text-center sm:pt-24">
        <p className="motion-safe:animate-[float_5s_ease-in-out_infinite] text-xs font-medium tracking-wide text-amber-700 dark:text-amber-300">
          <span aria-hidden>💬</span> 재미로 보는 관심 신호예요
        </p>

        <h1 className="mt-3 text-5xl font-extrabold tracking-tight sm:text-6xl">
          <span
            style={{
              backgroundImage: "linear-gradient(90deg, #F5B301, #FB7185)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            톡사이
          </span>
        </h1>

        <p className="mt-3 text-lg font-bold text-neutral-700 dark:text-neutral-200">
          카톡 대화로 보는 우리 사이
        </p>

        <p className="mx-auto mt-3 max-w-[36ch] text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          카카오톡 대화 내보내기(zip/txt)를 올리면 둘 사이를 분석해 드려요. 재미로 보는 관심 신호예요.
        </p>

        <UploadCta />
      </div>
    </section>
  );
}
