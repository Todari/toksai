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

function renderMessage(m: Message): string {
  const stamp = [
    m.at.getFullYear(),
    String(m.at.getMonth() + 1).padStart(2, "0"),
    String(m.at.getDate()).padStart(2, "0"),
  ].join("-") + ` ${String(m.at.getHours()).padStart(2, "0")}:${String(m.at.getMinutes()).padStart(2, "0")}`;
  return `[${stamp}] ${m.author}: ${m.text}`;
}

function contextWindowIndexes(total: number, targetLines: number): number[] {
  if (targetLines >= total) return Array.from({ length: total }, (_, i) => i);
  const windowCount = Math.min(8, Math.max(2, Math.floor(Math.sqrt(targetLines))));
  const windowSize = Math.max(1, Math.floor(targetLines / windowCount));
  const indexes = new Set<number>();
  for (let i = 0; i < windowCount; i++) {
    const start =
      windowCount === 1 ? 0 : Math.round((i * (total - windowSize)) / (windowCount - 1));
    for (let j = start; j < Math.min(total, start + windowSize); j++) indexes.add(j);
  }
  return [...indexes].sort((a, b) => a - b);
}

function renderSelected(lines: string[], indexes: number[], header: string): string {
  const out = [header];
  let previous = -1;
  for (const index of indexes) {
    if (previous >= 0 && index > previous + 1) out.push("…(중간 대화 생략)…");
    out.push(lines[index]);
    previous = index;
  }
  return out.join("\n");
}

export function renderBucketText(bucket: Bucket, maxChars = DEFAULT_MAX): string {
  const lines = bucket.messages.map(renderMessage);
  const full = lines.join("\n");
  if (full.length <= maxChars) return full;

  // 예산 초과 시 개별 메시지를 띄엄띄엄 뽑지 않고 연속된 문맥 창을 고른다.
  // 질문과 답변, 장난의 앞뒤 맥락이 함께 남으면서도 월 전체 구간을 대표한다.
  const n = lines.length;
  const header = "…(대화량이 많아 문맥 단위로 일부 발췌)…";
  const avgLine = full.length / n + 1; // +1 = 개행
  let targetLines = Math.min(n, Math.max(2, Math.floor((maxChars - header.length) / avgLine)));
  let rendered = renderSelected(lines, contextWindowIndexes(n, targetLines), header);
  while (rendered.length > maxChars && targetLines > 2) {
    targetLines -= 1;
    rendered = renderSelected(lines, contextWindowIndexes(n, targetLines), header);
  }
  return rendered;
}
