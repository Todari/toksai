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

  // 앞/뒤 절반씩 보존하고 가운데를 생략 표시
  const half = Math.floor(maxChars / 2);
  const head = full.slice(0, half);
  const tail = full.slice(full.length - half);
  return `${head}\n…(중략)…\n${tail}`;
}
