"use client";
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
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-lg font-semibold">분석에 실패했어요</p>
      <p className="text-sm text-gray-500">일시적인 문제일 수 있어요. 다시 시도해 주세요.</p>
      {onRetry && (
        <button
          disabled={busy}
          onClick={handleRetry}
          className="mt-2 rounded-lg bg-black px-6 py-2 text-white disabled:opacity-40"
        >
          {busy ? "재시도 중…" : "다시 시도"}
        </button>
      )}
    </main>
  );
}
