import type { AnalysisResultView } from "@toksai/api";
import { ChemiGauge } from "./ChemiGauge";
import {
  formatDuration,
  nicknameOf,
  OTHER_COLOR,
  OWNER_COLOR,
  pickOwnerOther,
  type AnalysisView,
} from "./format";

interface HeadlineProps {
  view: AnalysisView;
  result: AnalysisResultView;
}

/** 결과 페이지 최상단 히어로: 케미 게이지 + 관계유형 + 핵심 통계. */
export function Headline({ view, result }: HeadlineProps) {
  const { owner, other } = pickOwnerOther(view);
  const ownerName = nicknameOf(view, owner.rawName);
  const otherName = nicknameOf(view, other.rawName);
  const totalMessages = result.stats.totalMessages.toLocaleString("ko-KR");

  return (
    <section className="rounded-3xl bg-white p-5 text-center shadow-sm dark:bg-[#241d17]">
      <p className="text-xs font-medium tracking-wide text-neutral-400 dark:text-neutral-500">
        재미로 보는 관심 신호예요
      </p>

      <div className="mt-2 flex items-center justify-center gap-1.5 text-base font-semibold">
        <span style={{ color: OWNER_COLOR }}>{ownerName}</span>
        <span className="text-neutral-300 dark:text-neutral-600">×</span>
        <span style={{ color: OTHER_COLOR }}>{otherName}</span>
      </div>

      <div className="mt-4">
        <ChemiGauge score={result.chemiScore} />
      </div>

      <div className="mt-4">
        <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
          {result.relationType.label}
        </span>
        <p className="mx-auto mt-2 max-w-[34ch] text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {result.relationType.description}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 dark:border-white/10">
        <div>
          <dt className="text-xs text-neutral-400 dark:text-neutral-500">함께한 시간</dt>
          <dd className="mt-1 text-lg font-bold text-neutral-800 dark:text-neutral-100">
            {formatDuration(result.stats.durationDays)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-400 dark:text-neutral-500">주고받은 메시지</dt>
          <dd className="mt-1 text-lg font-bold text-neutral-800 dark:text-neutral-100">
            {totalMessages}
            <span className="ml-0.5 text-xs font-normal text-neutral-400">개</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
