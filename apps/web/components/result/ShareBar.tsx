"use client";
import { useState } from "react";

interface ShareBarProps {
  viewToken: string;
}

/** 현재 결과 페이지 링크를 클립보드로 복사하는 공유 바. */
export function ShareBar({ viewToken }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/a/${viewToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없는 브라우저 환경 등은 조용히 무시한다.
    }
  }

  return (
    <section className="rounded-3xl bg-white p-5 text-center shadow-sm dark:bg-[#241d17]">
      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
        이 링크로 상대와 함께 보세요
      </p>
      <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
        링크를 아는 사람은 누구나 결과를 볼 수 있어요.
      </p>
      <button
        onClick={handleCopy}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95 dark:bg-amber-500"
      >
        {copied ? "복사 완료! 🎉" : "🔗 링크 복사하기"}
      </button>
    </section>
  );
}
