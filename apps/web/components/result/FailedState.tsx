"use client";
import Link from "next/link";
import { useState } from "react";

export function FailedState({ onRetry }: { onRetry?: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);

  async function handleRetry() {
    if (!onRetry) return;
    setBusy(true);
    try {
      await onRetry();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#FFFBF3] px-6 dark:bg-[#171310]">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-sm dark:bg-[#241d17]">
        <span className="text-4xl" aria-hidden>
          😿
        </span>
        <p className="mt-3 text-lg font-bold text-neutral-800 dark:text-neutral-100">분석에 실패했어요</p>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          일시적인 문제일 수 있어요. 다시 시도해 주세요.
        </p>
        {onRetry && (
          <button
            disabled={busy}
            onClick={handleRetry}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#F5B301] to-[#FB7185] py-3 text-base font-extrabold text-white shadow-md shadow-amber-300/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-none"
          >
            {busy ? "재시도 중…" : "다시 시도"}
          </button>
        )}
        <Link
          href="/"
          className="mt-4 inline-block text-xs font-medium text-neutral-400 underline underline-offset-2 dark:text-neutral-500"
        >
          처음으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
