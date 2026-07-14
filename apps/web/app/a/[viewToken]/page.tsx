"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResultView } from "@toksai/api";
import { getAnalysis, getResult, loadAdminToken, startAnalysis } from "../../../lib/api";
import { AffinityChart } from "../../../components/result/AffinityChart";
import { AiComment } from "../../../components/result/AiComment";
import { AnalyzingState } from "../../../components/result/AnalyzingState";
import { DeleteButton } from "../../../components/result/DeleteButton";
import { FailedState } from "../../../components/result/FailedState";
import { FunFacts } from "../../../components/result/FunFacts";
import { Habits } from "../../../components/result/Habits";
import { Headline } from "../../../components/result/Headline";
import { Highlights } from "../../../components/result/Highlights";
import { InsideJokes } from "../../../components/result/InsideJokes";
import { Keywords } from "../../../components/result/Keywords";
import { MoodStrip } from "../../../components/result/MoodStrip";
import { MovieCard } from "../../../components/result/MovieCard";
import { NewAnalysisCta } from "../../../components/result/NewAnalysisCta";
import { PersonaCards } from "../../../components/result/PersonaCards";
import { PrivacyNote } from "../../../components/result/PrivacyNote";
import { ShareBar } from "../../../components/result/ShareBar";
import { Timeline } from "../../../components/result/Timeline";
import { TopicSuggestion } from "../../../components/result/TopicSuggestion";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 40;

type PageStatus = "loading" | "identifying" | "analyzing" | "done" | "failed" | "timeout";
// tRPC 응답 그대로의 타입(Date 필드는 문자열로 직렬화됨)을 사용한다.
type ViewData = NonNullable<Awaited<ReturnType<typeof getAnalysis>>>;

export default function ResultPage({ params }: { params: Promise<{ viewToken: string }> }) {
  const { viewToken } = use(params);
  const router = useRouter();
  const [view, setView] = useState<ViewData | null>(null);
  const [result, setResult] = useState<AnalysisResultView | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const [adminToken, setAdminToken] = useState("");

  useEffect(() => {
    setAdminToken(loadAdminToken(viewToken));
  }, [viewToken]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let polls = 0;

    async function tick() {
      try {
        const a = await getAnalysis(viewToken);
        if (cancelled) return;
        if (!a) {
          setStatus("failed");
          return;
        }
        setView(a);
        if (a.status === "IDENTIFYING") {
          setStatus("identifying");
        } else if (a.status === "DONE") {
          const r = await getResult(viewToken);
          if (cancelled) return;
          if (!r) {
            // DONE인데 결과가 없으면(예: 삭제된 경우) 무한 대기 대신 실패로 처리
            setStatus("failed");
            return;
          }
          setResult(r);
          setStatus("done");
        } else if (a.status === "FAILED") {
          setStatus("failed");
        } else {
          // ANALYZING: 2.5초 간격으로 최대 40회 폴링
          setStatus("analyzing");
          polls += 1;
          if (polls < MAX_POLLS) {
            timer = setTimeout(tick, POLL_INTERVAL_MS);
          } else {
            // 서버는 계속 분석 중일 수 있으므로 실패가 아니라 "오래 걸림"으로 안내한다.
            setStatus("timeout");
          }
        }
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [viewToken, attempt]);

  async function handleRetry() {
    if (!adminToken) return;
    try {
      await startAnalysis(adminToken);
    } catch {
      // 재시작 실패는 이어지는 폴링에서 FAILED로 다시 드러난다.
    }
    setStatus("loading");
    setAttempt((n) => n + 1);
  }

  /** 타임아웃 시 분석을 다시 돌리지 않고 폴링만 이어서 재개한다. */
  function handleResume() {
    setStatus("loading");
    setAttempt((n) => n + 1);
  }

  if (status === "loading" || status === "analyzing") return <AnalyzingState />;

  if (status === "identifying") {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#FFFBF3] px-6 dark:bg-[#171310]">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-sm dark:bg-[#241d17]">
          <span className="text-4xl" aria-hidden>
            💬
          </span>
          <p className="mt-3 text-lg font-bold text-neutral-800 dark:text-neutral-100">아직 분석 전이에요</p>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            두 사람을 뭐라고 부를지 정하면 바로 분석을 시작해요.
          </p>
          <button
            onClick={() => router.push(`/a/${viewToken}/identify`)}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#F5B301] to-[#FB7185] py-3 text-base font-extrabold text-white shadow-md shadow-amber-300/30 transition active:scale-[0.99] dark:shadow-none"
          >
            닉네임 정하러 가기
          </button>
        </div>
      </main>
    );
  }

  if (status === "timeout") {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#FFFBF3] px-6 dark:bg-[#171310]">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-sm dark:bg-[#241d17]">
          <span className="text-4xl" aria-hidden>
            ⏳
          </span>
          <p className="mt-3 text-lg font-bold text-neutral-800 dark:text-neutral-100">
            생각보다 오래 걸리고 있어요
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            대화가 길면 분석에 시간이 더 걸릴 수 있어요. 조금 뒤에 이어서 확인해 보세요.
          </p>
          <button
            onClick={handleResume}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#F5B301] to-[#FB7185] py-3 text-base font-extrabold text-white shadow-md shadow-amber-300/30 transition active:scale-[0.99] dark:shadow-none"
          >
            이어서 확인하기
          </button>
        </div>
      </main>
    );
  }

  if (status === "failed") {
    return <FailedState onRetry={adminToken ? handleRetry : undefined} />;
  }

  if (status === "done" && view && result) {
    return <ResultView view={view} result={result} viewToken={viewToken} />;
  }

  return <AnalyzingState />;
}

function ResultView({
  view,
  result,
  viewToken,
}: {
  view: ViewData;
  result: AnalysisResultView;
  viewToken: string;
}) {
  return (
    <main className="min-h-screen bg-[#FFFBF3] pb-12 dark:bg-[#171310]">
      <div className="mx-auto max-w-[480px] space-y-6 px-4 py-8">
        <Headline view={view} result={result} />
        <AiComment result={result} />
        <AffinityChart view={view} result={result} />
        <MoodStrip result={result} />
        <Timeline events={result.timeline} />
        <Habits result={result} view={view} />
        <FunFacts view={view} result={result} />
        <Keywords keywords={result.keywords} />
        <InsideJokes result={result} />
        <MovieCard result={result} />
        <PersonaCards view={view} result={result} />
        <Highlights highlights={result.highlights} />
        <TopicSuggestion result={result} />
        <ShareBar viewToken={viewToken} />
        <NewAnalysisCta />
        <PrivacyNote />
        <DeleteButton viewToken={viewToken} />
      </div>
    </main>
  );
}
