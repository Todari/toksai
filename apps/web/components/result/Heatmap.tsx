import { heatmapMax } from "./format";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const HOUR_TICKS = new Set([0, 3, 6, 9, 12, 15, 18, 21]);

/** 순차(sequential) 앰버 5단계 + 빈 칸(0건) — heatmapMax 대비 비율로 버킷화. */
const LEVEL_CLASS = [
  "bg-neutral-100 dark:bg-white/5",
  "bg-amber-100 dark:bg-amber-900/40",
  "bg-amber-200 dark:bg-amber-800/50",
  "bg-amber-300 dark:bg-amber-700/70",
  "bg-amber-400 dark:bg-amber-500/80",
  "bg-amber-500 dark:bg-amber-400",
];

function levelOf(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  const ratio = value / max;
  if (ratio > 0.8) return 5;
  if (ratio > 0.6) return 4;
  if (ratio > 0.4) return 3;
  if (ratio > 0.2) return 2;
  return 1;
}

interface HeatmapProps {
  heatmap: number[][];
}

/** 요일×시간 메시지 개수 히트맵. 순차 앰버 스케일 + 셀 title/aria로 색+수치를 함께 전달한다. */
export function Heatmap({ heatmap }: HeatmapProps) {
  const max = heatmapMax(heatmap);

  let busiest: { day: number; hour: number; count: number } | null = null;
  for (let d = 0; d < heatmap.length; d++) {
    const row = heatmap[d] ?? [];
    for (let h = 0; h < row.length; h++) {
      const count = row[h] ?? 0;
      if (!busiest || count > busiest.count) busiest = { day: d, hour: h, count };
    }
  }

  return (
    <div className="mt-3">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full flex-col gap-[3px]">
          <div className="flex gap-[2px] pl-6">
            {Array.from({ length: 24 }, (_, h) => (
              <span
                key={h}
                className="w-3.5 shrink-0 text-center text-[8px] leading-none text-neutral-400 dark:text-neutral-500"
              >
                {HOUR_TICKS.has(h) ? h : ""}
              </span>
            ))}
          </div>
          {WEEKDAYS.map((label, day) => (
            <div key={label} className="flex items-center gap-[2px]">
              <span className="w-5 shrink-0 text-right text-[9px] text-neutral-400 dark:text-neutral-500">
                {label}
              </span>
              {Array.from({ length: 24 }, (_, hour) => {
                const value = heatmap[day]?.[hour] ?? 0;
                const level = levelOf(value, max);
                return (
                  <div
                    key={hour}
                    title={`${label}요일 ${hour}시 · ${value.toLocaleString("ko-KR")}건`}
                    aria-label={`${label}요일 ${hour}시 ${value}건`}
                    className={`h-3.5 w-3.5 shrink-0 rounded-[3px] ${LEVEL_CLASS[level]}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1">
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">적음</span>
        {LEVEL_CLASS.map((cls, i) => (
          <span key={i} aria-hidden className={`h-2.5 w-2.5 rounded-[2px] ${cls}`} />
        ))}
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">많음</span>
      </div>

      {busiest && busiest.count > 0 && (
        <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
          가장 대화가 많았던 시간: {WEEKDAYS[busiest.day]}요일 {busiest.hour}시 ·{" "}
          {busiest.count.toLocaleString("ko-KR")}건
        </p>
      )}
    </div>
  );
}
