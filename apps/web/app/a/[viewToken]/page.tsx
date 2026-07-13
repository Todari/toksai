"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResultView } from "@toksai/api";
import { getAnalysis, getResult, loadAdminToken, startAnalysis } from "../../../lib/api";
import { nicknameOf, pickOwnerOther } from "../../../components/result/format";
import { AnalyzingState } from "../../../components/result/AnalyzingState";
import { FailedState } from "../../../components/result/FailedState";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 40;

type PageStatus = "loading" | "identifying" | "analyzing" | "done" | "failed";
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
            setStatus("failed");
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

  if (status === "loading" || status === "analyzing") return <AnalyzingState />;

  if (status === "identifying") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold">아직 분석 전이에요</p>
        <p className="text-sm text-gray-500">먼저 둘 중 누가 나인지 알려주세요.</p>
        <button
          onClick={() => router.push(`/a/${viewToken}/identify`)}
          className="mt-2 rounded-lg bg-black px-6 py-2 text-white"
        >
          식별하러 가기
        </button>
      </main>
    );
  }

  if (status === "failed") {
    return <FailedState onRetry={adminToken ? handleRetry : undefined} />;
  }

  if (status === "done" && view && result) {
    return <ResultView view={view} result={result} />;
  }

  return <AnalyzingState />;
}

function ResultView({ view, result }: { view: ViewData; result: AnalysisResultView }) {
  const { owner, other } = pickOwnerOther(view);
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-bold">
        {nicknameOf(view, owner.rawName)} & {nicknameOf(view, other.rawName)}
      </h1>
      <p className="mt-6 text-5xl font-extrabold">
        {result.chemiScore}
        <span className="ml-1 text-lg font-normal text-gray-400">점</span>
      </p>
      <p className="mt-2 text-lg text-gray-700">{result.relationType.label}</p>
      {/* 상세 섹션(히트맵/타임라인/뱃지 등)은 이후 태스크에서 조립된다. */}
    </main>
  );
}
