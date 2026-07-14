"use client";
import { useEffect, useState } from "react";

/** 대기 중 지루함을 덜기 위해 순환 표시하는 진행 단계 문구. */
const STEPS = [
  "대화를 읽고 있어요",
  "관심 신호를 세고 있어요",
  "월별 흐름을 살피고 있어요",
  "리포트를 쓰고 있어요",
] as const;

const STEP_INTERVAL_MS = 3500;

export function AnalyzingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % STEPS.length), STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#FFFBF3] px-6 dark:bg-[#171310]">
      <div className="text-center">
        <div className="relative mx-auto h-16 w-16">
          <div
            aria-hidden
            className="absolute inset-0 animate-spin rounded-full border-4 border-amber-100 border-t-amber-400 dark:border-white/10 dark:border-t-amber-400"
          />
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center text-2xl motion-safe:animate-[float_3s_ease-in-out_infinite]"
          >
            💬
          </span>
        </div>
        <p aria-live="polite" className="mt-5 text-base font-bold text-neutral-800 dark:text-neutral-100">
          {STEPS[step]}…
        </p>
        <p className="mt-1.5 text-sm text-neutral-400 dark:text-neutral-500">
          둘 사이를 분석하는 중 · 수십 초 걸릴 수 있어요
        </p>
      </div>
    </main>
  );
}
