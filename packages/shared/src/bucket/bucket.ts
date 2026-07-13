import type { Message } from "../types";

export interface Bucket {
  month: string;
  startedAt: string;
  endedAt: string;
  messages: Message[];
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function bucketByMonth(messages: Message[]): Bucket[] {
  const map = new Map<string, Message[]>();
  for (const msg of messages) {
    const k = monthKey(msg.at);
    const arr = map.get(k) ?? [];
    arr.push(msg);
    map.set(k, arr);
  }
  return [...map.entries()].map(([month, msgs]) => ({
    month,
    startedAt: msgs[0].at.toISOString(),
    endedAt: msgs[msgs.length - 1].at.toISOString(),
    messages: msgs,
  }));
}

const DEFAULT_MAX = 40000;

export function renderBucketText(bucket: Bucket, maxChars = DEFAULT_MAX): string {
  const lines = bucket.messages.map((m) => `${m.author}: ${m.text}`);
  const full = lines.join("\n");
  if (full.length <= maxChars) return full;

  // 예산 초과 시: 시간축을 따라 메시지를 균등 샘플링(처음/끝 포함)해 전 구간을 대표하게 한다.
  // (head/tail만 남기면 바쁜 달의 가운데 대화가 통째로 유실되어 분석 품질이 떨어짐)
  const n = lines.length;
  const header = "…(대화량이 많아 일부만 발췌)…";
  const avgLine = full.length / n + 1; // +1 = 개행
  let keep = Math.max(2, Math.floor((maxChars - header.length - 1) / avgLine));
  keep = Math.min(keep, n);
  const idxs =
    keep >= n
      ? lines.map((_, i) => i)
      : Array.from({ length: keep }, (_, k) => Math.round((k * (n - 1)) / (keep - 1)));
  const uniq = [...new Set(idxs)];
  return [header, ...uniq.map((i) => lines[i])].join("\n");
}
