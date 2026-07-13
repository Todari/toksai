import type { AnalysisResultView } from "@toksai/api";
import { Heatmap } from "./Heatmap";
import { InitiationBalance } from "./InitiationBalance";
import { nicknameOf, OTHER_COLOR, OWNER_COLOR, pickOwnerOther, type AnalysisView } from "./format";

interface HabitsProps {
  view: AnalysisView;
  result: AnalysisResultView;
}

/** 대화 습관 섹션: 요일×시간 히트맵 + 선톡 밸런스 바 + 1인당 통계 타일을 묶는다. */
export function Habits({ view, result }: HabitsProps) {
  const { owner, other } = pickOwnerOther(view);
  const ownerRef = { rawName: owner.rawName, name: nicknameOf(view, owner.rawName), color: OWNER_COLOR };
  const otherRef = { rawName: other.rawName, name: nicknameOf(view, other.rawName), color: OTHER_COLOR };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]">
      <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">우리의 대화 습관</h2>

      <div className="mt-4">
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
          언제 가장 많이 대화했을까?
        </h3>
        <Heatmap heatmap={result.stats.heatmap} />
      </div>

      <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-white/10">
        <InitiationBalance stats={result.stats} owner={ownerRef} other={otherRef} />
      </div>
    </section>
  );
}
