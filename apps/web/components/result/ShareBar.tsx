"use client";
import { useEffect, useState } from "react";
import { trackEvent } from "../../lib/analytics";

interface ShareBarProps {
  viewToken: string;
  chemiScore: number;
  relationLabel: string;
}

/**
 * 결과 페이지 링크 공유 바. 모바일 등 Web Share 지원 환경에서는 네이티브
 * 공유 시트를 띄우고, 그 외에는 클립보드 복사로 동작한다. 클립보드마저
 * 막힌 환경에서는 URL을 직접 보여줘 수동 복사할 수 있게 한다.
 */
export function ShareBar({ viewToken, chemiScore, relationLabel }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function handleShare() {
    const url = `${window.location.origin}/a/${viewToken}`;
    const text = `우리 톡사이 결과는 ${chemiScore}점 · ${relationLabel}!`;

    if (canShare) {
      try {
        trackEvent("share_clicked", { method: "native" });
        await navigator.share({ title: "톡사이 — 카톡 대화로 보는 우리 사이", text, url });
        trackEvent("share_completed", { method: "native" });
      } catch {
        // 사용자가 공유 시트를 닫은 경우 등은 조용히 무시한다.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      trackEvent("share_completed", { method: "clipboard" });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      trackEvent("share_failed", { method: "clipboard" });
      // 클립보드 권한이 없는 환경: URL을 직접 노출해 수동 복사를 돕는다.
      setFallbackUrl(url);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-5 text-center shadow-sm dark:bg-[#241d17]">
      <div className="mx-auto mb-4 grid max-w-[260px] grid-cols-2 overflow-hidden rounded-2xl border border-amber-100 dark:border-amber-400/10">
        <div className="bg-amber-50 px-3 py-3 dark:bg-amber-400/10">
          <p className="text-[10px] text-amber-700/70 dark:text-amber-300/70">케미 지수</p>
          <p className="mt-0.5 text-xl font-black text-amber-700 dark:text-amber-300">{chemiScore}</p>
        </div>
        <div className="bg-rose-50 px-3 py-3 dark:bg-rose-400/10">
          <p className="text-[10px] text-rose-600/70 dark:text-rose-300/70">관계 유형</p>
          <p className="mt-1 truncate text-sm font-black text-rose-600 dark:text-rose-300">
            {relationLabel}
          </p>
        </div>
      </div>
      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
        이 링크로 상대와 함께 보세요
      </p>
      <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
        링크를 아는 사람은 누구나 결과를 볼 수 있어요.
      </p>
      <button
        onClick={handleShare}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95 dark:bg-amber-500"
      >
        {copied ? "복사 완료! 🎉" : canShare ? "📤 결과 공유하기" : "🔗 링크 복사하기"}
      </button>
      {fallbackUrl && (
        <div className="mt-3">
          <input
            readOnly
            value={fallbackUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-center text-xs text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300"
            aria-label="결과 페이지 링크"
          />
          <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
            길게 눌러(또는 전체 선택해) 복사해 주세요.
          </p>
        </div>
      )}
    </section>
  );
}
