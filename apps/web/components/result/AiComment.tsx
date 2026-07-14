import type { AnalysisResultView } from "@toksai/api";

interface AiCommentProps {
  result: AnalysisResultView;
}

/**
 * 톡사이 AI의 총평 히어로 카드. extras가 없는 구버전 결과는 렌더를 생략한다
 * (extras 컬럼은 Wave3에서 추가돼 이전 분석에는 null로 남아있을 수 있다).
 */
export function AiComment({ result }: AiCommentProps) {
  const comment = result.extras?.aiComment;
  if (!comment) return null;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F5B301] to-[#FB7185] p-5 text-white shadow-md shadow-amber-300/20 dark:shadow-none">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-6 -right-6 text-8xl opacity-15"
      >
        🤖
      </span>
      <div className="relative flex items-center gap-1.5 text-xs font-bold text-white/85">
        <span aria-hidden>🤖</span>
        톡사이 AI의 한마디
      </div>
      <p className="relative mt-2.5 text-[15px] leading-relaxed font-semibold">
        <span aria-hidden className="mr-1">💬</span>
        {comment}
      </p>
    </section>
  );
}
