import type { Message } from "../types";
import type { ChatStats, PersonStat, MonthlyVolume } from "../analysis-types";
import { GAP_HOURS } from "../constants";
import { computeFunFacts } from "./fun-facts";

const GAP_MS = GAP_HOURS * 3600 * 1000;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const LAUGH_RE = /[ㅋㅎ]/g;

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

export function computeStats(messages: Message[]): ChatStats {
  const perPerson: Record<string, PersonStat> = {};
  const latency: Record<string, number[]> = {};
  const ensure = (name: string) => {
    if (!perPerson[name]) {
      perPerson[name] = {
        rawName: name, messageCount: 0, charCount: 0, avgMessageLength: 0,
        initiationCount: 0, replyLatencyMedianSec: null,
        emojiCount: 0, laughCount: 0, questionCount: 0, exclamationCount: 0,
      };
      latency[name] = [];
    }
  };

  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const monthlyMap = new Map<string, MonthlyVolume>();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    ensure(msg.author);
    const p = perPerson[msg.author];
    p.messageCount++;
    p.charCount += msg.text.length;
    p.emojiCount += countMatches(msg.text, EMOJI_RE);
    p.laughCount += countMatches(msg.text, LAUGH_RE);
    p.questionCount += countMatches(msg.text, /\?/g);
    p.exclamationCount += countMatches(msg.text, /!/g);

    const gap = i === 0 ? Infinity : msg.at.getTime() - messages[i - 1].at.getTime();
    if (i === 0 || gap >= GAP_MS) {
      p.initiationCount++;
    } else if (!msg.contextBreakBefore && messages[i - 1].author !== msg.author) {
      latency[msg.author].push(gap / 1000);
    }

    heatmap[msg.at.getDay()][msg.at.getHours()]++;

    const mk = monthKey(msg.at);
    let mv = monthlyMap.get(mk);
    if (!mv) { mv = { month: mk, total: 0, perPerson: {} }; monthlyMap.set(mk, mv); }
    mv.total++;
    mv.perPerson[msg.author] = (mv.perPerson[msg.author] ?? 0) + 1;
  }

  for (const name of Object.keys(perPerson)) {
    const p = perPerson[name];
    p.avgMessageLength = p.messageCount ? p.charCount / p.messageCount : 0;
    p.replyLatencyMedianSec = median(latency[name]);
  }

  const startedAt = messages[0]?.at ?? new Date(0);
  const endedAt = messages[messages.length - 1]?.at ?? new Date(0);
  const durationDays = Math.round((endedAt.getTime() - startedAt.getTime()) / 86400000);

  return {
    totalMessages: messages.length,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationDays,
    perPerson,
    heatmap,
    monthly: [...monthlyMap.values()],
    funFacts: computeFunFacts(messages),
  };
}
