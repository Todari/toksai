import type { Highlight } from "@toksai/shared";

interface HighlightsProps {
  highlights: Highlight[];
}

const KIND_META: Record<
  Highlight["kind"],
  { emoji: string; label: string; chip: string; card: string }
> = {
  flutter: {
    emoji: "💗",
    label: "설렘",
    chip: "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
    card: "bg-rose-50/60 dark:bg-rose-400/5",
  },
  funny: {
    emoji: "😂",
    label: "웃김",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    card: "bg-amber-50/60 dark:bg-amber-400/5",
  },
  touching: {
    emoji: "🥹",
    label: "감동",
    chip: "bg-orange-50 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300",
    card: "bg-orange-50/60 dark:bg-orange-400/5",
  },
};

function formatHighlightDate(at?: string): string | null {
  if (!at) return null;
  const [y, m, d] = at.split("-");
  if (!y || !m) return at;
  return d ? `${y}.${m}.${d}` : `${y}.${m}`;
}

/** 설렘/웃김/감동 인용을 kind별 색·이모지 카드로 모아 보여준다. */
export function Highlights({ highlights }: HighlightsProps) {
  if (highlights.length === 0) return null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]">
      <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">다시 보는 순간들</h2>
      <div className="mt-4 space-y-3">
        {highlights.map((highlight, i) => {
          const meta = KIND_META[highlight.kind];
          const date = formatHighlightDate(highlight.at);
          return (
            <div key={`${highlight.kind}-${i}`} className={`rounded-2xl p-4 ${meta.card}`}>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chip}`}
                >
                  <span aria-hidden>{meta.emoji}</span>
                  {meta.label}
                </span>
                {date && <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{date}</span>}
              </div>
              <blockquote className="mt-2.5 text-sm leading-relaxed font-medium text-neutral-800 dark:text-neutral-100">
                “{highlight.quote}”
              </blockquote>
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{highlight.caption}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
