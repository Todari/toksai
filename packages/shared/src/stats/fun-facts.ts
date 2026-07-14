import type { Message } from "../types";
import type { FunFacts } from "../analysis-types";
import { GAP_HOURS } from "../constants";

const GAP_MS = GAP_HOURS * 3600 * 1000;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeFunFacts(messages: Message[]): FunFacts {
  if (messages.length === 0) {
    return {
      goldenHour: { weekday: 0, hour: 0, count: 0 },
      busiestDay: { date: "", count: 0 },
      longestSilence: null,
      lateNightCount: 0,
      firstMessage: { at: new Date(0).toISOString(), author: "", text: "" },
      topEmoji: {},
      conversationEnder: {},
    };
  }

  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const dayCounts = new Map<string, number>();
  let lateNightCount = 0;
  const emojiCounts: Record<string, Map<string, number>> = {};
  const conversationEnder: Record<string, number> = {};

  let maxGap = -1;
  let silenceIndex = -1; // index of the message that broke the longest silence

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const weekday = msg.at.getDay();
    const hour = msg.at.getHours();

    heatmap[weekday][hour]++;

    const dk = dateKey(msg.at);
    dayCounts.set(dk, (dayCounts.get(dk) ?? 0) + 1);

    if (hour >= 0 && hour < 5) lateNightCount++;

    for (const ch of msg.text.match(EMOJI_RE) ?? []) {
      const map = (emojiCounts[msg.author] ??= new Map());
      map.set(ch, (map.get(ch) ?? 0) + 1);
    }

    if (i > 0) {
      const gap = msg.at.getTime() - messages[i - 1].at.getTime();
      if (gap > maxGap) {
        maxGap = gap;
        silenceIndex = i;
      }
    }

    const nextGap = i < messages.length - 1 ? messages[i + 1].at.getTime() - msg.at.getTime() : Infinity;
    if (nextGap >= GAP_MS) {
      conversationEnder[msg.author] = (conversationEnder[msg.author] ?? 0) + 1;
    }
  }

  // goldenHour: heatmap argmax
  let goldenHour = { weekday: 0, hour: 0, count: 0 };
  for (let w = 0; w < 7; w++) {
    for (let h = 0; h < 24; h++) {
      if (heatmap[w][h] > goldenHour.count) {
        goldenHour = { weekday: w, hour: h, count: heatmap[w][h] };
      }
    }
  }

  // busiestDay
  let busiestDay = { date: "", count: 0 };
  for (const [date, count] of dayCounts) {
    if (count > busiestDay.count) busiestDay = { date, count };
  }

  // longestSilence
  const longestSilence =
    silenceIndex >= 0 && maxGap >= GAP_MS
      ? {
          gapHours: Math.round((maxGap / 3600000) * 10) / 10,
          brokenBy: messages[silenceIndex].author,
          brokenAt: messages[silenceIndex].at.toISOString(),
          message: messages[silenceIndex].text,
        }
      : null;

  // firstMessage
  const first = messages[0];
  const firstMessage = { at: first.at.toISOString(), author: first.author, text: first.text };

  // topEmoji
  const topEmoji: Record<string, string | null> = {};
  for (const author of new Set(messages.map((m) => m.author))) {
    const counts = emojiCounts[author];
    let best: string | null = null;
    let bestCount = 0;
    if (counts) {
      for (const [ch, count] of counts) {
        if (count > bestCount) {
          best = ch;
          bestCount = count;
        }
      }
    }
    topEmoji[author] = best;
  }

  return {
    goldenHour,
    busiestDay,
    longestSilence,
    lateNightCount,
    firstMessage,
    topEmoji,
    conversationEnder,
  };
}
