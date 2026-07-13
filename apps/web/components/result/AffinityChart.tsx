"use client";

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { AnalysisResultView } from "@toksai/api";
import type { TimelineEvent } from "@toksai/shared";
import { nicknameOf, OTHER_COLOR, OWNER_COLOR, pickOwnerOther, type AnalysisView } from "./format";

const WIDTH = 328;
const HEIGHT = 220;
const MARGIN = { top: 16, right: 26, bottom: 46, left: 30 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const AXIS_Y = HEIGHT - MARGIN.bottom;

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  if (!y || !m) return month;
  return `${y.slice(2)}.${m}`;
}

function xAt(index: number, count: number): number {
  if (count <= 1) return MARGIN.left + PLOT_W / 2;
  return MARGIN.left + (index / (count - 1)) * PLOT_W;
}

function yAt(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  return MARGIN.top + (1 - clamped / 100) * PLOT_H;
}

function buildLinePath(values: number[]): string {
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i, values.length).toFixed(1)} ${yAt(v).toFixed(1)}`)
    .join(" ");
}

interface AffinityChartProps {
  view: AnalysisView;
  result: AnalysisResultView;
}

/** 월별 호감 신호 추이(각자→상대, 0~100) 인라인 SVG 라인차트 + 타임라인 이벤트 마커. */
export function AffinityChart({ view, result }: AffinityChartProps) {
  const { owner, other } = pickOwnerOther(view);
  const ownerName = nicknameOf(view, owner.rawName);
  const otherName = nicknameOf(view, other.rawName);

  const series = useMemo(
    () => [...result.affinitySeries].sort((a, b) => a.month.localeCompare(b.month)),
    [result.affinitySeries],
  );

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null);

  if (series.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]">
        <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">호감 신호 곡선</h2>
        <p className="mt-3 text-sm text-neutral-400 dark:text-neutral-500">
          아직 달마다 흐름을 그릴 만큼 대화가 쌓이지 않았어요.
        </p>
      </section>
    );
  }

  const ownerValues = series.map((p) => p.scores[owner.rawName] ?? 0);
  const otherValues = series.map((p) => p.scores[other.rawName] ?? 0);
  const monthIndex = new Map(series.map((p, i) => [p.month, i]));
  const hasLine = series.length >= 2;
  const labelStep = Math.max(1, Math.ceil(series.length / 5));

  const events = result.timeline
    .map((event) => ({ event, index: monthIndex.get(event.date.slice(0, 7)) }))
    .filter((e): e is { event: TimelineEvent; index: number } => e.index !== undefined);

  function handlePointerMove(e: ReactPointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    series.forEach((_, i) => {
      const dist = Math.abs(xAt(i, series.length) - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setActiveIndex(nearest);
  }

  const active = activeIndex !== null ? series[activeIndex] : null;
  const activeX = activeIndex !== null ? xAt(activeIndex, series.length) : null;
  const activeEvent = activeEventIndex !== null ? events[activeEventIndex] : null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]">
      <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">호감 신호 곡선</h2>

      <div className="mt-1 flex gap-4 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: OWNER_COLOR }} />
          {ownerName}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: OTHER_COLOR }} />
          {otherName}
        </span>
      </div>

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={`${ownerName}, ${otherName}의 월별 호감 신호 추이`}
        >
          <title>{`${ownerName}·${otherName} 월별 호감 신호`}</title>

          {[0, 50, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={yAt(tick)}
                y2={yAt(tick)}
                strokeWidth={1}
                className="stroke-neutral-200 dark:stroke-white/10"
              />
              <text
                x={MARGIN.left - 6}
                y={yAt(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-neutral-400 text-[9px] dark:fill-neutral-500"
              >
                {tick}
              </text>
            </g>
          ))}

          {series.map((p, i) =>
            i % labelStep === 0 || i === series.length - 1 ? (
              <text
                key={p.month}
                x={xAt(i, series.length)}
                y={AXIS_Y + 14}
                textAnchor="middle"
                className="fill-neutral-400 text-[9px] dark:fill-neutral-500"
              >
                {formatMonthLabel(p.month)}
              </text>
            ) : null,
          )}

          {activeX !== null && (
            <line
              x1={activeX}
              x2={activeX}
              y1={MARGIN.top}
              y2={AXIS_Y}
              strokeWidth={1}
              className="stroke-neutral-300 dark:stroke-white/20"
            />
          )}

          {hasLine ? (
            <>
              <path
                d={buildLinePath(ownerValues)}
                fill="none"
                stroke={OWNER_COLOR}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={buildLinePath(otherValues)}
                fill="none"
                stroke={OTHER_COLOR}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={xAt(series.length - 1, series.length)}
                cy={yAt(ownerValues[ownerValues.length - 1] ?? 0)}
                r={4}
                fill={OWNER_COLOR}
                strokeWidth={2}
                className="stroke-white dark:stroke-[#241d17]"
              />
              <circle
                cx={xAt(series.length - 1, series.length)}
                cy={yAt(otherValues[otherValues.length - 1] ?? 0)}
                r={4}
                fill={OTHER_COLOR}
                strokeWidth={2}
                className="stroke-white dark:stroke-[#241d17]"
              />
              <text
                x={xAt(series.length - 1, series.length) + 7}
                y={yAt(ownerValues[ownerValues.length - 1] ?? 0)}
                dominantBaseline="middle"
                className="fill-neutral-600 text-[10px] font-semibold dark:fill-neutral-300"
              >
                {ownerValues[ownerValues.length - 1]}
              </text>
              <text
                x={xAt(series.length - 1, series.length) + 7}
                y={yAt(otherValues[otherValues.length - 1] ?? 0)}
                dominantBaseline="middle"
                className="fill-neutral-600 text-[10px] font-semibold dark:fill-neutral-300"
              >
                {otherValues[otherValues.length - 1]}
              </text>
            </>
          ) : (
            <>
              <circle
                cx={xAt(0, 1)}
                cy={yAt(ownerValues[0] ?? 0)}
                r={5}
                fill={OWNER_COLOR}
                strokeWidth={2}
                className="stroke-white dark:stroke-[#241d17]"
              />
              <circle
                cx={xAt(0, 1)}
                cy={yAt(otherValues[0] ?? 0)}
                r={5}
                fill={OTHER_COLOR}
                strokeWidth={2}
                className="stroke-white dark:stroke-[#241d17]"
              />
            </>
          )}

          {events.map(({ event, index }, i) => (
            <g
              key={`${event.date}-${i}`}
              transform={`translate(${xAt(index, series.length)}, ${AXIS_Y + 26})`}
              onPointerEnter={() => setActiveEventIndex(i)}
              onPointerLeave={() => setActiveEventIndex(null)}
              onClick={() => setActiveEventIndex((cur) => (cur === i ? null : i))}
              className="cursor-pointer"
            >
              <title>{event.title}</title>
              <circle r={9} fill="transparent" />
              <path d="M0,-4 L4,0 L0,4 L-4,0 Z" className="fill-neutral-400 dark:fill-neutral-500" />
            </g>
          ))}

          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={PLOT_W}
            height={PLOT_H}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setActiveIndex(null)}
          />
        </svg>

        {active && activeX !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-xl bg-neutral-900/90 px-2.5 py-1.5 text-[11px] whitespace-nowrap text-white shadow-lg dark:bg-black/90"
            style={{
              left: `${(activeX / WIDTH) * 100}%`,
              transform: activeX < WIDTH / 2 ? "translateX(8px)" : "translateX(calc(-100% - 8px))",
            }}
          >
            <p className="font-semibold">{formatMonthLabel(active.month)}</p>
            <p style={{ color: OWNER_COLOR }}>
              {ownerName} {active.scores[owner.rawName] ?? 0}
            </p>
            <p style={{ color: OTHER_COLOR }}>
              {otherName} {active.scores[other.rawName] ?? 0}
            </p>
          </div>
        )}

        {activeEvent && (
          <div className="pointer-events-none absolute inset-x-2 bottom-0 rounded-lg bg-neutral-900/90 px-2 py-1 text-center text-[11px] text-white dark:bg-black/90">
            {activeEvent.event.title}
          </div>
        )}
      </div>

      <details className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
        <summary className="cursor-pointer select-none">표로 보기</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[240px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-white/10">
                <th className="py-1 font-medium">월</th>
                <th className="py-1 font-medium">{ownerName}</th>
                <th className="py-1 font-medium">{otherName}</th>
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.month} className="border-b border-neutral-100 dark:border-white/5">
                  <td className="py-1 tabular-nums">{formatMonthLabel(p.month)}</td>
                  <td className="py-1 tabular-nums">{p.scores[owner.rawName] ?? "–"}</td>
                  <td className="py-1 tabular-nums">{p.scores[other.rawName] ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
