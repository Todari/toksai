"use client";

import { useId } from "react";
import { OTHER_COLOR, OWNER_COLOR } from "./format";

interface ChemiGaugeProps {
  /** 0~100 케미 점수 */
  score: number;
  /** 지름(px). 기본값은 헤드라인 히어로 사이즈. */
  size?: number;
}

/** 0~100 케미 점수를 인라인 SVG 원형 게이지로 보여주는 히어로 컴포넌트. */
export function ChemiGauge({ score, size = 168 }: ChemiGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const gradientId = useId();
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`케미 지수 100점 만점에 ${clamped}점`}
      >
        <title>{`케미 지수 ${clamped}점`}</title>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={OWNER_COLOR} />
            <stop offset="100%" stopColor={OTHER_COLOR} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-amber-50 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 800ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-6xl font-extrabold leading-none"
          style={{
            backgroundImage: `linear-gradient(90deg, ${OWNER_COLOR}, ${OTHER_COLOR})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {clamped}
        </span>
        <span className="mt-1 text-xs font-semibold text-neutral-400 dark:text-neutral-500">
          케미 지수
        </span>
      </div>
    </div>
  );
}
