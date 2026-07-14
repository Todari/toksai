import type { AnalysisResultView } from "@toksai/api";

interface MoodStripProps {
  result: AnalysisResultView;
}

function formatMonthDot(month: string): string {
  const [y, m] = month.split("-");
  if (!y || !m) return month;
  return `${y.slice(2)}.${m}`;
}

const MOOD_EMOJI: [string, string][] = [
  ["설렘", "💗"],
  ["다정", "🥰"],
  ["편안", "🌤️"],
  ["즐거", "😄"],
  ["티키타카", "🏓"],
  ["서먹", "🧊"],
  ["다툼", "💢"],
  ["갈등", "⚡"],
  ["화해", "🤝"],
];

/** mood 문자열에 자유 라벨이 섞여 있어도 대략 어울리는 이모지를 골라준다. */
function moodEmoji(mood: string): string {
  for (const [key, emoji] of MOOD_EMOJI) {
    if (mood.includes(key)) return emoji;
  }
  return "💬";
}

/** 월별 감정 온도(무드) 가로 스트립. extras.moodSeries가 없으면(구버전) 렌더 생략. */
export function MoodStrip({ result }: MoodStripProps) {
  const moodSeries = result.extras?.moodSeries;
  if (!moodSeries || moodSeries.length === 0) return null;

  const sorted = [...moodSeries].sort((a, b) => a.month.localeCompare(b.month));

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]">
      <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">달마다 달랐던 우리 온도</h2>
      <div className="mt-4 -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {sorted.map((point, i) => (
          <div
            key={`${point.month}-${i}`}
            className="w-[108px] shrink-0 rounded-2xl bg-neutral-50 p-3 dark:bg-white/5"
          >
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
              {formatMonthDot(point.month)}
            </p>
            <p className="mt-1 text-xl" aria-hidden>
              {moodEmoji(point.mood)}
            </p>
            <p className="mt-0.5 text-xs font-bold text-neutral-800 dark:text-neutral-100">{point.mood}</p>
            <p className="mt-1 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">{point.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
