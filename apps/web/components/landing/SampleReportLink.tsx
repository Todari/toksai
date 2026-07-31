"use client";

import Link from "next/link";
import { trackEvent } from "../../lib/analytics";

export function SampleReportLink() {
  return (
    <Link
      href="/sample"
      onClick={() => trackEvent("sample_report_opened")}
      className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-amber-700 underline decoration-amber-300 underline-offset-4 transition hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
    >
      먼저 샘플 리포트 보기
      <span aria-hidden>→</span>
    </Link>
  );
}
