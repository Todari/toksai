"use client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResultView } from "@toksai/api";
import { getAnalysis, getResult, loadAdminToken, startAnalysis } from "../../../lib/api";
import { AnalyzingState } from "../../../components/result/AnalyzingState";
import { FailedState } from "../../../components/result/FailedState";
import { ResultView } from "../../../components/result/ResultView";
import { trackEvent } from "../../../lib/analytics";

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
  const tracked = useRef(new Set<string>());

  function trackOnce(key: string, eventName: string, params?: Record<string, string | number>) {
    if (tracked.current.has(key)) return;
    tracked.current.add(key);
    trackEvent(eventName, params);
  }

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
          trackOnce("not_found", "result_failed", { reason: "not_found" });
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
          trackOnce("loaded", "result_loaded", {
            analysis_duration_ms: Math.max(0, Date.now() - new Date(a.createdAt).getTime()),
          });
          setStatus("done");
        } else if (a.status === "FAILED") {
          trackOnce("failed", "result_failed", { reason: "analysis_failed" });
          setStatus("failed");
        } else {
          // ANALYZING: 2.5초 간격으로 최대 40회 폴링
          setStatus("analyzing");
          polls += 1;
          if (polls < MAX_POLLS) {
            timer = setTimeout(tick, POLL_INTERVAL_MS);
          } else {
            // 서버는 계속 분석 중일 수 있으므로 실패가 아니라 "오래 걸림"으로 안내한다.
            trackOnce("timeout", "result_timeout");
            setStatus("timeout");
          }
        }
      } catch {
        if (!cancelled) {
          trackOnce("network_error", "result_failed", { reason: "network" });
          setStatus("failed");
        }
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
      trackEvent("analysis_retry_requested");
    } catch {
      // 재시작 실패는 이어지는 폴링에서 FAILED로 다시 드러난다.
    }
    setStatus("loading");
    setAttempt((n) => n + 1);
  }

  /** 타임아웃 시 stale 작업이면 서버가 회수할 기회를 준 뒤 폴링을 재개한다. */
  async function handleResume() {
    if (adminToken) {
      try {
        await startAnalysis(adminToken);
        trackEvent("analysis_recovery_checked");
      } catch {
        // 활성 작업이거나 재시도 상한에 닿은 경우에도 상태 조회는 계속할 수 있다.
      }
    }
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
