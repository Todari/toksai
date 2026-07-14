import type { AnalysisResultView } from "@toksai/api";

interface TopicSuggestionProps {
  result: AnalysisResultView;
}

/** 다음 대화 주제 제안 카드. extras가 없으면(구버전) 렌더 생략. */
export function TopicSuggestion({ result }: TopicSuggestionProps) {
  const topic = result.extras?.topicSuggestion;
  if (!topic) return null;

  return (
    <section className="rounded-3xl bg-amber-50/60 p-5 dark:bg-amber-400/5">
      <p className="text-xs font-bold text-amber-700 dark:text-amber-300">💡 다음엔 이런 얘기 어때요?</p>
      <p className="mt-1.5 text-sm leading-relaxed font-medium text-neutral-700 dark:text-neutral-200">
        {topic}
      </p>
    </section>
  );
}
