"use client";

import type { AnalysisResultView } from "@toksai/api";
import { AffinityChart } from "./AffinityChart";
import { AiComment } from "./AiComment";
import { DeleteButton } from "./DeleteButton";
import { FunFacts } from "./FunFacts";
import { Habits } from "./Habits";
import { Headline } from "./Headline";
import { Highlights } from "./Highlights";
import { InsideJokes } from "./InsideJokes";
import { Keywords } from "./Keywords";
import { MoodStrip } from "./MoodStrip";
import { MovieCard } from "./MovieCard";
import { NewAnalysisCta } from "./NewAnalysisCta";
import { PersonaCards } from "./PersonaCards";
import { PrivacyNote } from "./PrivacyNote";
import { ShareBar } from "./ShareBar";
import { Timeline } from "./Timeline";
import { TopicSuggestion } from "./TopicSuggestion";
import type { AnalysisView } from "./format";

function DetailGroup({
  emoji,
  title,
  description,
  children,
}: {
  emoji: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-3xl bg-white p-5 shadow-sm transition active:scale-[0.995] [&::-webkit-details-marker]:hidden dark:bg-[#241d17]">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-xl dark:bg-amber-400/10"
        >
          {emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-neutral-800 dark:text-neutral-100">{title}</span>
          <span className="mt-0.5 block text-xs text-neutral-400 dark:text-neutral-500">{description}</span>
        </span>
        <span
          aria-hidden
          className="text-lg text-neutral-300 transition-transform group-open:rotate-45 dark:text-neutral-600"
        >
          +
        </span>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

function QualityNote({ result }: { result: AnalysisResultView }) {
  const quality = result.extras?.quality;
  if (!quality) return null;
  return (
    <p className="text-center text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
      AI 분석 범위 {quality.analyzedBuckets}/{quality.totalBuckets}개 구간
      {quality.ungroundedQuotesRemoved > 0
        ? ` · 원문에서 확인되지 않은 인용 ${quality.ungroundedQuotesRemoved}개 제외`
        : " · 모든 인용 원문 확인"}
    </p>
  );
}

export function ResultView({
  view,
  result,
  viewToken,
  isSample = false,
}: {
  view: AnalysisView;
  result: AnalysisResultView;
  viewToken?: string;
  isSample?: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#FFFBF3] pb-12 dark:bg-[#171310]">
      <div className="mx-auto max-w-[480px] space-y-6 px-4 py-8">
        {isSample && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center dark:border-amber-400/20 dark:bg-amber-400/10">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">미리 보는 샘플 리포트</p>
            <p className="mt-0.5 text-[11px] text-amber-700/70 dark:text-amber-300/70">
              실제 대화가 아닌 예시 데이터로 만든 화면이에요.
            </p>
          </div>
        )}

        <Headline view={view} result={result} />
        <AiComment result={result} />
        <AffinityChart view={view} result={result} />
        <MoodStrip result={result} />
        <Timeline events={result.timeline} />

        <DetailGroup emoji="📊" title="대화 습관과 기록" description="선톡·시간대·가장 기억에 남는 숫자들">
          <Habits result={result} view={view} />
          <FunFacts view={view} result={result} />
        </DetailGroup>

        <DetailGroup emoji="🎭" title="둘의 취향과 캐릭터" description="키워드·말버릇·관계 영화·성향 뱃지">
          <Keywords keywords={result.keywords} />
          <InsideJokes result={result} />
          <MovieCard result={result} />
          <PersonaCards view={view} result={result} />
        </DetailGroup>

        <DetailGroup emoji="✨" title="다시 보는 순간과 다음 대화" description="하이라이트와 이어가기 좋은 이야기">
          <Highlights highlights={result.highlights} />
          <TopicSuggestion result={result} />
        </DetailGroup>

        {!isSample && viewToken ? (
          <ShareBar
            viewToken={viewToken}
            chemiScore={result.chemiScore}
            relationLabel={result.relationType.label}
          />
        ) : null}
        <NewAnalysisCta isSample={isSample} />
        <QualityNote result={result} />
        <PrivacyNote />
        {!isSample && viewToken ? <DeleteButton viewToken={viewToken} /> : null}
      </div>
    </main>
  );
}
