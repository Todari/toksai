import type { TimelineEvent } from "@toksai/shared";
import { OTHER_COLOR, OWNER_COLOR } from "./format";

function formatEventDate(date: string): string {
  const [y, m, d] = date.split("-");
  if (!y || !m) return date;
  return d ? `${y}.${m}.${d}` : `${y}.${m}`;
}

interface TimelineProps {
  events: TimelineEvent[];
}

/** 날짜순 관계 타임라인: 날짜 pill + 제목 + 요약 + (선택) 인용. */
export function Timeline({ events }: TimelineProps) {
  if (events.length === 0) return null;

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]">
      <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">우리의 타임라인</h2>
      <ol className="mt-4 space-y-5 border-l-2 border-amber-100 pl-4 dark:border-white/10">
        {sorted.map((event, i) => (
          <li key={`${event.date}-${i}`} className="relative">
            <span
              aria-hidden
              className="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full"
              style={{ backgroundImage: `linear-gradient(135deg, ${OWNER_COLOR}, ${OTHER_COLOR})` }}
            />
            <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-white/5 dark:text-amber-300">
              {formatEventDate(event.date)}
            </span>
            <p className="mt-1.5 text-sm font-bold text-neutral-800 dark:text-neutral-100">{event.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              {event.summary}
            </p>
            {event.quote && (
              <blockquote className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-500 italic dark:bg-white/5 dark:text-neutral-400">
                “{event.quote}”
              </blockquote>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
