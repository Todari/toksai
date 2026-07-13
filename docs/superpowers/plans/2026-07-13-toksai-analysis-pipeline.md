# 톡사이 Analysis Pipeline (Plan 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 식별이 끝난 분석에 대해 하이브리드 분석(코드 정량통계 + Gemini 월버킷 의미분석 → 통합)을 실행해 `AnalysisResult`를 채우고 status를 `ANALYZING`→`DONE`(실패 시 `FAILED`)로 전이한다. tRPC로 분석 시작(`start`)과 결과 조회(`result`)를 노출한다.

**Architecture:** 결정적 지표(선톡·답장텀·시간대·이모지 등)는 `packages/shared`의 순수 함수로 계산(TDD). 의미 분석은 `apps/server`의 `AnalysisRunnerService`가 대화를 월 버킷으로 나눠 각 버킷을 LLM으로 분석하고, 버킷 결과들을 상위 통합 콜로 합쳐 최종 결과를 만든다. LLM 접근은 `LlmClient` 인터페이스로 추상화해 `GeminiService`(@google/genai)가 구현하고, 러너 테스트는 `FakeLlmClient`로 실제 API 없이 검증한다. 도메인 결과 타입은 `packages/shared`에 두어 shared·api·web이 공유한다.

**Tech Stack:** 기존 스택 + `@google/genai`(GEMINI_API_KEY), Zod 검증, tRPC 11 확장.

## Global Constraints

- **모듈 규약(Plan 1과 동일):** 내부 패키지는 CJS `dist` 빌드(`build: tsc`, `main: dist/index.js`, `types: src/index.ts`, `type:module` 없음), **import 확장자 없음**, tsconfig는 `@toksai/tsconfig/nestjs.json`(웹은 `nextjs.json`).
- **LLM 추상화:** 러너는 `LlmClient` 인터페이스에만 의존한다. 실제 Gemini 호출은 `GeminiService`가 담당하고, 단위 테스트는 `FakeLlmClient`를 주입한다. 유닛 테스트에서 실제 네트워크 호출 금지.
- **Gemini:** `@google/genai`, `process.env.GEMINI_API_KEY`. 모델 id는 `packages/shared`의 `GEMINI_MODEL` 상수(`'gemini-3.1-flash-lite'`)로 중앙화. JSON 모드(`responseMimeType: application/json` + `responseSchema`) + Zod 재검증. 키 부재 시 명확한 에러.
- **결과 도메인 타입은 `packages/shared`에 단일 소스**로 두고 api·server·web이 재사용한다. `packages/api`는 `@toksai/shared`를 타입 의존으로 추가할 수 있다(shared는 leaf).
- **상태 전이:** `IDENTIFYING` → (start) `ANALYZING` → `DONE` | `FAILED`. 러너는 비동기(fire-and-forget)로 실행되고, 웹은 `analysis.get`의 status로 폴링한다.
- **호감도 톤:** "재미로 보는 관심 신호" — 프롬프트는 단정적 심리진단이 아니라 놀이적 해석을 요구한다(스펙 §7 포지셔닝).
- **선톡 정의:** 직전 메시지와의 간격이 `GAP_HOURS`(기본 6시간) 이상 벌어진 뒤 먼저 보낸 메시지를 그 작성자의 "선톡"으로 카운트(첫 메시지 포함). 답장 텀은 화자가 바뀌고 간격이 `GAP` 미만인 경우만 표본에 포함.
- **TZ 주의:** 파서/통계의 시각은 로컬 타임(`getHours`/`getDay`)에 의존한다. 프로덕션은 `TZ=Asia/Seoul`로 정합. 테스트는 동일 환경에서 상대값을 단정하므로 무관.

---

## File Structure

- `packages/shared/src/constants.ts` — `GEMINI_MODEL`, `GAP_HOURS`.
- `packages/shared/src/analysis-types.ts` — `PersonStat`, `ChatStats`, `MonthlyVolume`, `BucketAnalysis`, `TimelineEvent`, `AffinityPoint`, `Persona`, `AwardedBadge`, `Highlight`, `RelationType`, `AnalysisResultView`.
- `packages/shared/src/badges.ts` — `Badge` + `BADGES` 카탈로그.
- `packages/shared/src/stats/compute-stats.ts` (+ test) — 정량 통계.
- `packages/shared/src/bucket/bucket.ts` (+ test) — 월 버킷팅 + 버킷 텍스트 렌더.
- `packages/shared/src/concurrency.ts` (+ test) — `mapWithConcurrency`.
- `packages/shared/src/index.ts` — 위 모듈 re-export.
- `apps/server/src/gemini/llm-client.ts` — `LlmClient` 인터페이스.
- `apps/server/src/gemini/gemini.service.ts` (+ light test) — `GeminiService implements LlmClient`.
- `apps/server/src/gemini/fake-llm-client.ts` — 테스트용 페이크(러너 테스트에서 사용).
- `apps/server/src/analysis-pipeline/schemas.ts` — Zod + responseSchema (bucket/synthesis).
- `apps/server/src/analysis-pipeline/prompts.ts` — 프롬프트 빌더.
- `apps/server/src/analysis-pipeline/analysis-runner.service.ts` (+ test) — 오케스트레이션.
- `packages/api/src/context.ts` — `AnalysisContract`에 `start`/`getResult` 추가, `AnalysisResultView` 재노출.
- `packages/api/src/router/analysis.router.ts` — `start` mutation, `result` query.
- `apps/server/src/analysis/analysis.service.ts` — `start`/`getResult` 구현, 러너 주입.
- `apps/server/src/app.module.ts` — 새 provider 와이어링.

의존성: `shared`(신규 모듈) → `api`(타입) / `server`(러너·gemini) → 모두 사용.

---

## Task 1: 상수 · 도메인 타입 · 뱃지 카탈로그 (shared)

**Files:**
- Create: `packages/shared/src/constants.ts`, `packages/shared/src/analysis-types.ts`, `packages/shared/src/badges.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:** Produces the shared domain types below; no logic.

- [ ] **Step 1: 상수**

`packages/shared/src/constants.ts`:
```ts
export const GEMINI_MODEL = "gemini-3.1-flash-lite";
export const GAP_HOURS = 6;
```

- [ ] **Step 2: 도메인 타입**

`packages/shared/src/analysis-types.ts`:
```ts
export interface PersonStat {
  rawName: string;
  messageCount: number;
  charCount: number;
  avgMessageLength: number;
  initiationCount: number;
  replyLatencyMedianSec: number | null;
  emojiCount: number;
  laughCount: number;
  questionCount: number;
  exclamationCount: number;
}

export interface MonthlyVolume {
  month: string; // "YYYY-MM"
  total: number;
  perPerson: Record<string, number>;
}

export interface ChatStats {
  totalMessages: number;
  startedAt: string; // ISO
  endedAt: string;   // ISO
  durationDays: number;
  perPerson: Record<string, PersonStat>;
  heatmap: number[][]; // [weekday 0-6 (0=Sun)][hour 0-23]
  monthly: MonthlyVolume[];
}

export interface TimelineEvent {
  date: string;   // "YYYY-MM-DD" or "YYYY-MM"
  title: string;
  summary: string;
  quote?: string;
}

export interface AffinityPoint {
  month: string; // "YYYY-MM"
  scores: Record<string, number>; // rawName -> 0..100 (toward the other)
}

export interface Persona {
  rawName: string;
  oneLiner: string;
}

export interface AwardedBadge {
  rawName: string;
  badgeId: string;
  reason: string;
}

export interface Highlight {
  quote: string;
  caption: string;
  kind: "flutter" | "funny" | "touching";
  at?: string;
}

export interface RelationType {
  code: string;
  label: string;
  description: string;
}

export interface AnalysisResultView {
  stats: ChatStats;
  timeline: TimelineEvent[];
  affinitySeries: AffinityPoint[];
  keywords: string[];
  personas: Persona[];
  badges: AwardedBadge[];
  chemiScore: number; // 0..100
  relationType: RelationType;
  highlights: Highlight[];
}

// Gemini 중간 산출물 (버킷별)
export interface BucketAnalysis {
  month: string;
  events: { date: string; title: string; summary: string; quote?: string }[];
  affinity: { from: string; to: string; score: number; reason: string }[];
  keywords: string[];
  highlights: { quote: string; caption: string; kind: "flutter" | "funny" | "touching" }[];
}
```

- [ ] **Step 3: 뱃지 카탈로그**

`packages/shared/src/badges.ts`:
```ts
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: Badge[] = [
  { id: "first_texter", name: "선톡왕", description: "먼저 말 거는 걸 두려워하지 않는 사람", icon: "📣" },
  { id: "night_owl", name: "새벽감성", description: "늦은 밤 대화가 유독 많은 사람", icon: "🌙" },
  { id: "reply_fairy", name: "답장요정", description: "답장이 빛의 속도인 사람", icon: "⚡" },
  { id: "emoji_bomber", name: "이모지 폭격기", description: "이모지로 감정을 표현하는 사람", icon: "💥" },
  { id: "essay_writer", name: "장문파", description: "한 번 보내면 소설을 쓰는 사람", icon: "📜" },
  { id: "laugh_machine", name: "ㅋㅋ제조기", description: "ㅋ과 ㅎ이 끊이지 않는 사람", icon: "😆" },
  { id: "slow_burner", name: "느림의미학", description: "답장은 느려도 진심인 사람", icon: "🐢" },
  { id: "question_master", name: "궁금이", description: "질문으로 대화를 이어가는 사람", icon: "❓" },
];

export const BADGE_IDS = BADGES.map((b) => b.id);
```

- [ ] **Step 4: index re-export**

`packages/shared/src/index.ts`에 추가:
```ts
export * from "./constants";
export * from "./analysis-types";
export * from "./badges";
export * from "./stats/compute-stats";
export * from "./bucket/bucket";
export * from "./concurrency";
```
(뒤 3개는 다음 태스크에서 생성되므로, 이 태스크 커밋 시점엔 typecheck가 실패할 수 있음 — Task 2~4 완료 후 통과. 커밋은 진행하되, 이 태스크 검증은 "파일 생성/타입 정의"까지.)

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/constants.ts packages/shared/src/analysis-types.ts packages/shared/src/badges.ts packages/shared/src/index.ts
git commit -m "feat(shared): analysis domain types, badges, constants"
```

---

## Task 2: 정량 통계 계산 (TDD, shared)

**Files:**
- Create: `packages/shared/src/stats/compute-stats.ts`, `packages/shared/src/stats/compute-stats.test.ts`

**Interfaces:**
- Consumes: `Message`(../types), `ChatStats`/`PersonStat`(../analysis-types), `GAP_HOURS`(../constants).
- Produces: `function computeStats(messages: Message[]): ChatStats`.

규칙(요약): 메시지는 시간순 정렬 가정. GAP = GAP_HOURS시간. 선톡 = i===0 또는 직전과 간격≥GAP인 메시지의 작성자. 답장텀 표본 = 화자 전환 && 간격<GAP인 경우 (later.at - prev.at)초, 응답자에 귀속. 이모지 = `\p{Extended_Pictographic}` 개수, laugh = `[ㅋㅎ]` 문자 개수, question = `?` 개수. hourHeatmap[getHours], weekday[getDay]. monthly = `YYYY-MM` 그룹.

- [ ] **Step 1: 실패 테스트 작성**

`packages/shared/src/stats/compute-stats.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeStats } from "./compute-stats";
import type { Message } from "../types";

function m(author: string, iso: string, text: string): Message {
  return { author, at: new Date(iso), text };
}

describe("computeStats", () => {
  it("총 메시지/기간/사람별 카운트를 센다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "안녕"),
      m("B", "2025-01-01T10:01:00", "ㅎㅇ"),
      m("A", "2025-01-03T10:00:00", "자니?"),
    ];
    const s = computeStats(msgs);
    expect(s.totalMessages).toBe(3);
    expect(s.perPerson["A"].messageCount).toBe(2);
    expect(s.perPerson["B"].messageCount).toBe(1);
    expect(s.durationDays).toBe(2);
  });

  it("6시간 이상 벌어진 뒤 먼저 보낸 메시지를 선톡으로 센다(첫 메시지 포함)", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "첫톡"),          // 선톡(A) - 첫 메시지
      m("B", "2025-01-01T10:05:00", "답"),            // 답장(B)
      m("A", "2025-01-01T20:00:00", "다시 선톡"),      // gap ~10h → 선톡(A)
      m("A", "2025-01-01T20:01:00", "연속"),          // gap 1m → 선톡 아님
    ];
    const s = computeStats(msgs);
    expect(s.perPerson["A"].initiationCount).toBe(2);
    expect(s.perPerson["B"].initiationCount).toBe(0);
  });

  it("답장 텀은 화자 전환 && 간격<GAP인 경우만 표본에 넣고 중앙값을 낸다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "질문1"),
      m("B", "2025-01-01T10:00:20", "답1"),   // 20s
      m("A", "2025-01-01T10:01:00", "질문2"),
      m("B", "2025-01-01T10:01:40", "답2"),   // 40s
      m("A", "2025-01-02T10:00:00", "다음날"), // gap>6h → 표본 제외
    ];
    const s = computeStats(msgs);
    expect(s.perPerson["B"].replyLatencyMedianSec).toBe(30); // median(20,40)
    expect(s.perPerson["A"].replyLatencyMedianSec).toBe(40); // A도 화자전환 후 응답 표본 1개(40s)
  });

  it("이모지/ㅋㅎ/물음표를 센다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "좋아😀😀 ㅋㅋㅋ 진짜?!"),
    ];
    const s = computeStats(msgs);
    expect(s.perPerson["A"].emojiCount).toBe(2);
    expect(s.perPerson["A"].laughCount).toBe(3);
    expect(s.perPerson["A"].questionCount).toBe(1);
    expect(s.perPerson["A"].exclamationCount).toBe(1);
  });

  it("시간대/요일 히트맵과 월별 볼륨을 만든다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "x"), // 수요일(3), 10시
      m("B", "2025-02-01T22:00:00", "y"), // 토요일(6), 22시
    ];
    const s = computeStats(msgs);
    expect(s.heatmap).toHaveLength(7);
    expect(s.heatmap[0]).toHaveLength(24);
    expect(s.heatmap[3][10]).toBe(1); // 2025-01-01 수요일(3) 10시
    expect(s.heatmap[6][22]).toBe(1); // 2025-02-01 토요일(6) 22시
    expect(s.monthly.map((mo) => mo.month)).toEqual(["2025-01", "2025-02"]);
    expect(s.monthly[0].perPerson["A"]).toBe(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @toksai/shared test compute-stats`
Expected: FAIL — `compute-stats` 미존재.

- [ ] **Step 3: 구현**

`packages/shared/src/stats/compute-stats.ts`:
```ts
import type { Message } from "../types";
import type { ChatStats, PersonStat, MonthlyVolume } from "../analysis-types";
import { GAP_HOURS } from "../constants";

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
    } else if (messages[i - 1].author !== msg.author) {
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
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @toksai/shared test compute-stats`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/stats
git commit -m "feat(shared): deterministic chat stats (TDD)"
```

---

## Task 3: 월 버킷팅 + 버킷 텍스트 렌더 (TDD, shared)

**Files:**
- Create: `packages/shared/src/bucket/bucket.ts`, `packages/shared/src/bucket/bucket.test.ts`

**Interfaces:**
- Consumes: `Message`(../types).
- Produces:
  - `interface Bucket { month: string; startedAt: string; endedAt: string; messages: Message[] }`
  - `function bucketByMonth(messages: Message[]): Bucket[]`
  - `function renderBucketText(bucket: Bucket, maxChars?: number): string` — `이름: 내용` 줄들, `maxChars`(기본 40000) 초과 시 균등 샘플링(처음/끝 보존).

- [ ] **Step 1: 실패 테스트 작성**

`packages/shared/src/bucket/bucket.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { bucketByMonth, renderBucketText } from "./bucket";
import type { Message } from "../types";

const m = (a: string, iso: string, t: string): Message => ({ author: a, at: new Date(iso), text: t });

describe("bucketByMonth", () => {
  it("메시지를 월 단위로 그룹핑하고 시간순 유지", () => {
    const msgs = [
      m("A", "2025-01-05T10:00:00", "1월"),
      m("B", "2025-01-20T10:00:00", "1월2"),
      m("A", "2025-02-02T10:00:00", "2월"),
    ];
    const b = bucketByMonth(msgs);
    expect(b.map((x) => x.month)).toEqual(["2025-01", "2025-02"]);
    expect(b[0].messages).toHaveLength(2);
    expect(b[0].startedAt).toBe(msgs[0].at.toISOString());
    expect(b[0].endedAt).toBe(msgs[1].at.toISOString());
  });

  it("빈 입력은 빈 배열", () => {
    expect(bucketByMonth([])).toEqual([]);
  });
});

describe("renderBucketText", () => {
  it("이름: 내용 줄로 렌더", () => {
    const b = bucketByMonth([m("김", "2025-01-01T10:00:00", "안녕"), m("이", "2025-01-01T10:01:00", "하이")])[0];
    expect(renderBucketText(b)).toBe("김: 안녕\n이: 하이");
  });

  it("maxChars 초과 시 앞뒤를 보존하며 잘라낸다", () => {
    const many: Message[] = Array.from({ length: 500 }, (_, i) =>
      m(i % 2 ? "A" : "B", `2025-01-01T10:00:${String(i % 60).padStart(2, "0")}`, `msg${i}`));
    const b = bucketByMonth(many)[0];
    const out = renderBucketText(b, 200);
    expect(out.length).toBeLessThanOrEqual(200 + 40); // 여유(생략 표시 포함)
    expect(out).toContain("msg0");                    // 앞 보존
    expect(out).toContain("msg499");                  // 끝 보존
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @toksai/shared test bucket`
Expected: FAIL — 미존재.

- [ ] **Step 3: 구현**

`packages/shared/src/bucket/bucket.ts`:
```ts
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
  const n = lines.length;
  const header = "…(대화량이 많아 일부만 발췌)…";
  const avgLine = full.length / n + 1;
  let keep = Math.max(2, Math.floor((maxChars - header.length - 1) / avgLine));
  keep = Math.min(keep, n);
  const idxs =
    keep >= n
      ? lines.map((_, i) => i)
      : Array.from({ length: keep }, (_, k) => Math.round((k * (n - 1)) / (keep - 1)));
  const uniq = [...new Set(idxs)];
  return [header, ...uniq.map((i) => lines[i])].join("\n");
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @toksai/shared test bucket`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/bucket
git commit -m "feat(shared): monthly bucketing + bucket text render (TDD)"
```

---

## Task 4: 동시성 유틸 (TDD, shared)

**Files:**
- Create: `packages/shared/src/concurrency.ts`, `packages/shared/src/concurrency.test.ts`

**Interfaces:**
- Produces: `function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]>` — 결과 순서는 입력 순서 보존, 동시 실행은 `limit` 이하.

- [ ] **Step 1: 실패 테스트 작성**

`packages/shared/src/concurrency.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("결과를 입력 순서대로 반환한다", async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(out).toEqual([10, 20, 30, 40]);
  });

  it("동시 실행 수가 limit을 넘지 않는다", async () => {
    let active = 0, peak = 0;
    await mapWithConcurrency(Array.from({ length: 8 }, (_, i) => i), 3, async () => {
      active++; peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @toksai/shared test concurrency`
Expected: FAIL.

- [ ] **Step 3: 구현**

`packages/shared/src/concurrency.ts`:
```ts
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
```

- [ ] **Step 4: 통과 확인 + shared 빌드**

Run: `pnpm --filter @toksai/shared test`
Expected: PASS (parser 11 + stats 5 + bucket 4 + concurrency 2 = 22).
Run: `pnpm --filter @toksai/shared typecheck && pnpm --filter @toksai/shared build`
Expected: PASS, `packages/shared/dist/index.js` 갱신(신규 모듈 포함).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/concurrency.ts packages/shared/src/concurrency.test.ts
git commit -m "feat(shared): mapWithConcurrency util (TDD)"
```

---

## Task 5: LLM 클라이언트 추상화 · Gemini 서비스 · 페이크

**Files:**
- Create: `apps/server/src/gemini/llm-client.ts`, `apps/server/src/gemini/gemini.service.ts`, `apps/server/src/gemini/fake-llm-client.ts`, `apps/server/src/gemini/gemini.service.test.ts`
- Modify: `apps/server/package.json` (add `@google/genai`)

**Interfaces:**
- Produces:
  - `interface LlmJsonRequest { systemInstruction: string; prompt: string; responseSchema: unknown }`
  - `interface LlmClient { generateJson<T>(req: LlmJsonRequest, zodSchema: import("zod").ZodType<T>): Promise<T> }`
  - `class GeminiService implements LlmClient` — `@google/genai`, model `GEMINI_MODEL`, JSON 모드; 키 없으면 throw. Zod 재검증(실패 시 1회 재시도 후 throw).
  - `class FakeLlmClient implements LlmClient` — 생성자에 큐/핸들러를 받아 정해진 객체 반환(테스트용).

- [ ] **Step 1: 의존성 추가 + 인터페이스**

`apps/server/package.json` dependencies에 `"@google/genai": "^2.6.0"` 추가 후 `pnpm install`.

`apps/server/src/gemini/llm-client.ts`:
```ts
import type { ZodType } from "zod";

export interface LlmJsonRequest {
  systemInstruction: string;
  prompt: string;
  responseSchema: unknown;
}

export interface LlmClient {
  generateJson<T>(req: LlmJsonRequest, zodSchema: ZodType<T>): Promise<T>;
}
```

- [ ] **Step 2: 페이크 구현**

`apps/server/src/gemini/fake-llm-client.ts`:
```ts
import type { ZodType } from "zod";
import type { LlmClient, LlmJsonRequest } from "./llm-client";

// 각 호출마다 handler를 순서대로 소비. handler는 prompt를 받아 임의 객체 반환.
export class FakeLlmClient implements LlmClient {
  private calls = 0;
  constructor(private readonly handlers: Array<(req: LlmJsonRequest) => unknown>) {}

  async generateJson<T>(req: LlmJsonRequest, zodSchema: ZodType<T>): Promise<T> {
    const h = this.handlers[Math.min(this.calls, this.handlers.length - 1)];
    this.calls++;
    return zodSchema.parse(h(req));
  }
}
```

- [ ] **Step 3: Gemini 서비스 구현**

`apps/server/src/gemini/gemini.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { GEMINI_MODEL } from "@toksai/shared";
import type { LlmClient, LlmJsonRequest } from "./llm-client";

@Injectable()
export class GeminiService implements LlmClient {
  private client: GoogleGenAI | null = null;

  private get genAI(): GoogleGenAI {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this.client;
  }

  async generateJson<T>(req: LlmJsonRequest, zodSchema: ZodType<T>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: req.prompt,
        config: {
          systemInstruction: req.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: req.responseSchema as object,
          temperature: 0.4,
        },
      });
      try {
        return zodSchema.parse(JSON.parse(res.text ?? "null"));
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(`Gemini JSON validation failed: ${String(lastErr)}`);
  }
}
```

- [ ] **Step 4: 라이트 테스트(키 없을 때 throw)**

`apps/server/src/gemini/gemini.service.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { GeminiService } from "./gemini.service";
import { FakeLlmClient } from "./fake-llm-client";

describe("GeminiService", () => {
  it("GEMINI_API_KEY 없으면 호출 시 throw", async () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const svc = new GeminiService();
    await expect(
      svc.generateJson({ systemInstruction: "s", prompt: "p", responseSchema: {} }, z.any()),
    ).rejects.toThrow(/GEMINI_API_KEY/);
    if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
  });
});

describe("FakeLlmClient", () => {
  it("핸들러 반환을 zod로 검증해 돌려준다", async () => {
    const fake = new FakeLlmClient([() => ({ n: 1 })]);
    const out = await fake.generateJson(
      { systemInstruction: "", prompt: "", responseSchema: {} },
      z.object({ n: z.number() }),
    );
    expect(out).toEqual({ n: 1 });
  });
});
```

- [ ] **Step 5: 실행 확인**

Run: `pnpm --filter @toksai/server test gemini`
Expected: PASS (2 tests). (RED은 서비스 미존재 상태에서 먼저 확인.)

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/gemini apps/server/package.json pnpm-lock.yaml
git commit -m "feat(server): LlmClient abstraction + GeminiService + FakeLlmClient"
```

---

## Task 6: 분석 스키마 · 프롬프트

**Files:**
- Create: `apps/server/src/analysis-pipeline/schemas.ts`, `apps/server/src/analysis-pipeline/prompts.ts`

**Interfaces:**
- Produces:
  - `bucketZod`, `bucketResponseSchema` (Zod + Gemini responseSchema for `BucketAnalysis`)
  - `synthesisZod`, `synthesisResponseSchema` (for the synthesis output = `Omit<AnalysisResultView, 'stats'>` shape)
  - `buildBucketPrompt({ nickA, nickB, rawA, rawB, month, text })`, `buildSynthesisPrompt({ nickA, nickB, rawA, rawB, statsSummary, buckets })`, `SYSTEM_INSTRUCTION`.

- [ ] **Step 1: 스키마 작성**

`apps/server/src/analysis-pipeline/schemas.ts`:
```ts
import { z } from "zod";
import { BADGE_IDS } from "@toksai/shared";

const kindEnum = z.enum(["flutter", "funny", "touching"]);

export const bucketZod = z.object({
  month: z.string(),
  events: z.array(z.object({
    date: z.string(), title: z.string(), summary: z.string(), quote: z.string().optional(),
  })),
  affinity: z.array(z.object({
    from: z.string(), to: z.string(), score: z.number().min(0).max(100), reason: z.string(),
  })),
  keywords: z.array(z.string()),
  highlights: z.array(z.object({
    quote: z.string(), caption: z.string(), kind: kindEnum,
  })),
});

export const synthesisZod = z.object({
  timeline: z.array(z.object({
    date: z.string(), title: z.string(), summary: z.string(), quote: z.string().optional(),
  })),
  keywords: z.array(z.string()),
  personas: z.array(z.object({ rawName: z.string(), oneLiner: z.string() })),
  badges: z.array(z.object({
    rawName: z.string(), badgeId: z.enum(BADGE_IDS as [string, ...string[]]), reason: z.string(),
  })),
  chemiScore: z.number().min(0).max(100),
  relationType: z.object({ code: z.string(), label: z.string(), description: z.string() }),
  highlights: z.array(z.object({
    quote: z.string(), caption: z.string(), kind: kindEnum, at: z.string().optional(),
  })),
});

// Gemini responseSchema (JSON Schema subset). 필드는 Zod와 일치.
export const bucketResponseSchema = {
  type: "object",
  properties: {
    month: { type: "string" },
    events: { type: "array", items: { type: "object", properties: {
      date: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, quote: { type: "string" },
    }, required: ["date", "title", "summary"] } },
    affinity: { type: "array", items: { type: "object", properties: {
      from: { type: "string" }, to: { type: "string" }, score: { type: "number", minimum: 0, maximum: 100 }, reason: { type: "string" },
    }, required: ["from", "to", "score", "reason"] } },
    keywords: { type: "array", items: { type: "string" } },
    highlights: { type: "array", items: { type: "object", properties: {
      quote: { type: "string" }, caption: { type: "string" },
      kind: { type: "string", enum: ["flutter", "funny", "touching"] },
    }, required: ["quote", "caption", "kind"] } },
  },
  required: ["month", "events", "affinity", "keywords", "highlights"],
} as const;

export const synthesisResponseSchema = {
  type: "object",
  properties: {
    timeline: { type: "array", items: { type: "object", properties: {
      date: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, quote: { type: "string" },
    }, required: ["date", "title", "summary"] } },
    keywords: { type: "array", items: { type: "string" } },
    personas: { type: "array", items: { type: "object", properties: {
      rawName: { type: "string" }, oneLiner: { type: "string" },
    }, required: ["rawName", "oneLiner"] } },
    badges: { type: "array", items: { type: "object", properties: {
      rawName: { type: "string" }, badgeId: { type: "string", enum: BADGE_IDS },
      reason: { type: "string" },
    }, required: ["rawName", "badgeId", "reason"] } },
    chemiScore: { type: "number", minimum: 0, maximum: 100 },
    relationType: { type: "object", properties: {
      code: { type: "string" }, label: { type: "string" }, description: { type: "string" },
    }, required: ["code", "label", "description"] },
    highlights: { type: "array", items: { type: "object", properties: {
      quote: { type: "string" }, caption: { type: "string" },
      kind: { type: "string", enum: ["flutter", "funny", "touching"] }, at: { type: "string" },
    }, required: ["quote", "caption", "kind"] } },
  },
  required: ["timeline", "keywords", "personas", "badges", "chemiScore", "relationType", "highlights"],
} as const;
```

- [ ] **Step 2: 프롬프트 작성**

`apps/server/src/analysis-pipeline/prompts.ts`:
```ts
import { BADGES } from "@toksai/shared";

export const SYSTEM_INSTRUCTION =
  "너는 두 사람의 카카오톡 대화를 '재미로 보는 관심 신호'로 해석하는 분석가다. " +
  "심리 진단이나 단정적 평가가 아니라, 애정 어린 유머와 따뜻한 시선으로 해석한다. " +
  "모든 출력은 한국어로, 반드시 지정된 JSON 스키마에 맞춘다. 근거 인용은 실제 대화에서 발췌한다.";

interface People { nickA: string; nickB: string; rawA: string; rawB: string; }

export function buildBucketPrompt(
  p: People & { month: string; text: string },
): string {
  return [
    `아래는 ${p.nickA}(${p.rawA})와 ${p.nickB}(${p.rawB})의 ${p.month} 한 달 대화다.`,
    `이 구간에서:`,
    `- 큼직한 이벤트/사건 (events): 날짜(YYYY-MM-DD), 제목, 한 줄 요약, 가능하면 실제 인용.`,
    `- 관심 신호 (affinity): 각자가 상대에게 보인 관심의 강도(0~100)와 근거. from/to는 실제 이름(${p.rawA}, ${p.rawB})을 쓴다. 두 방향 모두.`,
    `- 키워드 (keywords): 이 구간의 주요 화제 5개 이내.`,
    `- 인상적 순간 (highlights): 설렘(flutter)/웃김(funny)/감동(touching) 중 하나로 분류.`,
    ``,
    `대화:`,
    p.text,
  ].join("\n");
}

export function buildSynthesisPrompt(
  p: People & { statsSummary: string; buckets: string },
): string {
  const badgeList = BADGES.map((b) => `- ${b.id}: ${b.name} (${b.description})`).join("\n");
  return [
    `${p.nickA}(${p.rawA})와 ${p.nickB}(${p.rawB})의 전체 관계를 아래 재료로 종합한다.`,
    ``,
    `[정량 통계 요약]`,
    p.statsSummary,
    ``,
    `[월별 버킷 분석(JSON 배열)]`,
    p.buckets,
    ``,
    `다음을 JSON으로 만든다:`,
    `- timeline: 버킷 이벤트들을 병합/중복제거한 핵심 관계 타임라인.`,
    `- keywords: 전체 관심사/키워드 Top 8.`,
    `- personas: 각자 성향 한 줄평(rawName은 ${p.rawA}, ${p.rawB}).`,
    `- badges: 각자에게 어울리는 뱃지를 아래 카탈로그의 id에서 골라 근거와 함께. 사람당 1~2개.`,
    badgeList,
    `- chemiScore: 0~100 케미 지수(정량+정성 종합).`,
    `- relationType: 관계 유형 코드(영문 4자 내외)/라벨(한국어)/설명. MBTI풍의 재미있는 분류.`,
    `- highlights: 전체에서 가장 인상적인 순간 3~5개(인용+캡션+kind).`,
  ].join("\n");
}
```

- [ ] **Step 3: 타입체크**

Run: `pnpm --filter @toksai/server typecheck`
Expected: PASS (schemas/prompts 컴파일). 별도 단위 테스트 없음(다음 태스크 러너 테스트가 스키마를 실사용).

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/analysis-pipeline/schemas.ts apps/server/src/analysis-pipeline/prompts.ts
git commit -m "feat(server): analysis Zod/response schemas and prompts"
```

---

## Task 7: 분석 러너 (TDD with FakeLlmClient)

**Files:**
- Create: `apps/server/src/analysis-pipeline/analysis-runner.service.ts`, `apps/server/src/analysis-pipeline/analysis-runner.service.test.ts`

**Interfaces:**
- Consumes: `PrismaClient`, `CryptoService`, `LlmClient`, `parseKakao`, `computeStats`, `bucketByMonth`, `renderBucketText`, `mapWithConcurrency`, schemas, prompts, `AnalysisResultView`.
- Produces: `class AnalysisRunnerService` with `run(analysisId: string): Promise<void>` — 상태 ANALYZING→(성공)DONE/(실패)FAILED, `AnalysisResult` upsert. 생성자 주입: `(prisma, crypto, llm)`.

동작:
1. `prisma.analysis.update` status=ANALYZING.
2. load analysis(include participants, rawChat). 없으면 throw.
3. `crypto.decrypt(rawChat.encryptedText)` → `parseKakao` → messages. (rawName→nickname 매핑 확보)
4. `computeStats(messages)`.
5. `bucketByMonth(messages)`; 각 버킷 → `llm.generateJson(buildBucketPrompt, bucketResponseSchema, bucketZod)` (동시성 3, 버킷 실패 시 1회 재시도는 GeminiService 내부; 여기선 실패 버킷 제외하고 계속).
6. statsSummary 문자열 구성(총계·선톡·답장텀 등 요약).
7. `llm.generateJson(buildSynthesisPrompt, synthesisResponseSchema, synthesisZod)`.
8. `affinitySeries` = 버킷별 affinity를 `{month, scores:{rawName:score}}`로 환산(각 from→to 점수를 from 기준으로).
9. `AnalysisResultView` 조립(stats + synthesis + affinitySeries). `prisma.analysisResult.upsert`. status=DONE.
10. 예외 시 status=FAILED 후 rethrow(로깅).

- [ ] **Step 1: 실패 테스트 작성**

`apps/server/src/analysis-pipeline/analysis-runner.service.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { AnalysisRunnerService } from "./analysis-runner.service";
import { CryptoService } from "../common/crypto/crypto.service";
import { FakeLlmClient } from "../gemini/fake-llm-client";

const RAW = `2025. 1. 1. 오후 1:00, 김승현 : 뭐해?
2025. 1. 1. 오후 1:02, 곽민성 : 그냥 있어 ㅋㅋ
2025. 2. 1. 오후 9:00, 김승현 : 자니?`;

function makePrisma(encryptedText: string) {
  const store: any = {
    analysis: {
      id: "a1", status: "IDENTIFYING",
      participants: [
        { rawName: "김승현", nickname: "승현", isOwner: true },
        { rawName: "곽민성", nickname: "민성", isOwner: false },
      ],
      rawChat: { encryptedText, messageCount: 3, startedAt: new Date(), endedAt: new Date() },
    },
    result: null as any,
  };
  return {
    _store: store,
    analysis: {
      update: vi.fn(async ({ data }: any) => { store.analysis.status = data.status; return store.analysis; }),
      findUnique: vi.fn(async () => store.analysis),
    },
    analysisResult: {
      upsert: vi.fn(async ({ create }: any) => { store.result = create; return create; }),
    },
  } as any;
}

const bucketReturn = (month: string) => () => ({
  month, events: [{ date: `${month}-01`, title: "t", summary: "s" }],
  affinity: [
    { from: "김승현", to: "곽민성", score: 70, reason: "r" },
    { from: "곽민성", to: "김승현", score: 60, reason: "r" },
  ],
  keywords: ["k"], highlights: [{ quote: "q", caption: "c", kind: "funny" }],
});

const synthesisReturn = () => ({
  timeline: [{ date: "2025-01-01", title: "시작", summary: "s" }],
  keywords: ["게임", "밥"],
  personas: [{ rawName: "김승현", oneLiner: "직진러" }, { rawName: "곽민성", oneLiner: "츤데레" }],
  badges: [{ rawName: "김승현", badgeId: "first_texter", reason: "선톡많음" }],
  chemiScore: 82,
  relationType: { code: "WARM", label: "티키타카", description: "d" },
  highlights: [{ quote: "q", caption: "c", kind: "flutter" }],
});

describe("AnalysisRunnerService.run", () => {
  it("복호화→파싱→통계→버킷LLM→통합→결과저장, status DONE", async () => {
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const enc = crypto.encrypt(RAW);
    const prisma = makePrisma(enc);
    // 버킷 2개(2025-01, 2025-02) + 통합 1콜 = 핸들러 3개
    const fake = new FakeLlmClient([bucketReturn("2025-01"), bucketReturn("2025-02"), synthesisReturn]);
    const runner = new AnalysisRunnerService(prisma, crypto, fake);

    await runner.run("a1");

    expect(prisma.analysis.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ANALYZING" }) }));
    const saved = prisma.analysisResult.upsert.mock.calls[0][0].create;
    expect(saved.chemiScore).toBe(82);
    expect(saved.stats.totalMessages).toBe(3);
    expect(saved.affinitySeries.length).toBe(2); // 월 2개
    expect(saved.affinitySeries[0].scores["김승현"]).toBe(70);
    expect(prisma._store.analysis.status).toBe("DONE");
  });

  it("LLM이 던지면 status FAILED 후 rethrow", async () => {
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const prisma = makePrisma(crypto.encrypt(RAW));
    const throwing = { generateJson: vi.fn(async () => { throw new Error("boom"); }) } as any;
    const runner = new AnalysisRunnerService(prisma, crypto, throwing);
    await expect(runner.run("a1")).rejects.toThrow();
    expect(prisma._store.analysis.status).toBe("FAILED");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @toksai/server test analysis-runner`
Expected: FAIL — 미존재.

- [ ] **Step 3: 구현**

`apps/server/src/analysis-pipeline/analysis-runner.service.ts`:
```ts
import { Injectable, Logger } from "@nestjs/common";
import type { PrismaClient } from "@toksai/db";
import {
  parseKakao, computeStats, bucketByMonth, renderBucketText, mapWithConcurrency,
} from "@toksai/shared";
import type { AffinityPoint, AnalysisResultView, BucketAnalysis } from "@toksai/shared";
import { CryptoService } from "../common/crypto/crypto.service";
import type { LlmClient } from "../gemini/llm-client";
import { bucketZod, bucketResponseSchema, synthesisZod, synthesisResponseSchema } from "./schemas";
import { SYSTEM_INSTRUCTION, buildBucketPrompt, buildSynthesisPrompt } from "./prompts";

const BUCKET_CONCURRENCY = 3;

@Injectable()
export class AnalysisRunnerService {
  private readonly logger = new Logger(AnalysisRunnerService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly crypto: CryptoService,
    private readonly llm: LlmClient,
  ) {}

  async run(analysisId: string): Promise<void> {
    try {
      await this.prisma.analysis.update({ where: { id: analysisId }, data: { status: "ANALYZING" } });
      const analysis = await this.prisma.analysis.findUnique({
        where: { id: analysisId },
        include: { participants: true, rawChat: true },
      });
      if (!analysis || !analysis.rawChat) throw new Error("ANALYSIS_NOT_READY");

      const [pa, pb] = analysis.participants;
      const people = {
        rawA: pa.rawName, rawB: pb.rawName,
        nickA: pa.nickname ?? pa.rawName, nickB: pb.nickname ?? pb.rawName,
      };

      const text = this.crypto.decrypt(analysis.rawChat.encryptedText);
      const parsed = parseKakao(text);
      const stats = computeStats(parsed.messages);
      const buckets = bucketByMonth(parsed.messages);

      const bucketResults = (await mapWithConcurrency(buckets, BUCKET_CONCURRENCY, async (b) => {
        try {
          return await this.llm.generateJson<BucketAnalysis>(
            {
              systemInstruction: SYSTEM_INSTRUCTION,
              prompt: buildBucketPrompt({ ...people, month: b.month, text: renderBucketText(b) }),
              responseSchema: bucketResponseSchema,
            },
            bucketZod,
          );
        } catch (e) {
          this.logger.warn(`bucket ${b.month} failed: ${String(e)}`);
          return null;
        }
      })).filter((x): x is BucketAnalysis => x !== null);

      const statsSummary = this.summarizeStats(stats, people);
      const synthesis = await this.llm.generateJson<Omit<AnalysisResultView, "stats" | "affinitySeries">>(
        {
          systemInstruction: SYSTEM_INSTRUCTION,
          prompt: buildSynthesisPrompt({
            ...people,
            statsSummary,
            buckets: JSON.stringify(bucketResults),
          }),
          responseSchema: synthesisResponseSchema,
        },
        synthesisZod as never,
      );

      const affinitySeries: AffinityPoint[] = bucketResults.map((b) => {
        const scores: Record<string, number> = {};
        for (const a of b.affinity) scores[a.from] = a.score;
        return { month: b.month, scores };
      });

      const result: AnalysisResultView = { stats, affinitySeries, ...synthesis };

      await this.prisma.analysisResult.upsert({
        where: { analysisId },
        create: { analysisId, ...this.toJsonColumns(result) },
        update: this.toJsonColumns(result),
      });
      await this.prisma.analysis.update({ where: { id: analysisId }, data: { status: "DONE" } });
    } catch (e) {
      await this.prisma.analysis.update({ where: { id: analysisId }, data: { status: "FAILED" } });
      this.logger.error(`analysis ${analysisId} failed: ${String(e)}`);
      throw e;
    }
  }

  private toJsonColumns(r: AnalysisResultView) {
    return {
      stats: r.stats as object, timeline: r.timeline as object,
      affinitySeries: r.affinitySeries as object, keywords: r.keywords as object,
      personas: r.personas as object, badges: r.badges as object,
      chemiScore: Math.round(r.chemiScore), relationType: r.relationType as object,
      highlights: r.highlights as object,
    };
  }

  private summarizeStats(stats: ReturnType<typeof computeStats>, p: { rawA: string; rawB: string }): string {
    const a = stats.perPerson[p.rawA]; const b = stats.perPerson[p.rawB];
    return [
      `총 ${stats.totalMessages}개, 기간 ${stats.durationDays}일.`,
      `${p.rawA}: 메시지 ${a?.messageCount ?? 0}, 선톡 ${a?.initiationCount ?? 0}, 답장중앙값 ${a?.replyLatencyMedianSec ?? "-"}초.`,
      `${p.rawB}: 메시지 ${b?.messageCount ?? 0}, 선톡 ${b?.initiationCount ?? 0}, 답장중앙값 ${b?.replyLatencyMedianSec ?? "-"}초.`,
    ].join(" ");
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @toksai/server test analysis-runner`
Expected: PASS (2 tests). 이어 `pnpm --filter @toksai/server typecheck` PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/analysis-pipeline/analysis-runner.service.ts apps/server/src/analysis-pipeline/analysis-runner.service.test.ts
git commit -m "feat(server): analysis runner orchestration (TDD with fake LLM)"
```

---

## Task 8: tRPC 계약 확장 (start / result) + 서버 와이어링

**Files:**
- Modify: `packages/api/src/context.ts`, `packages/api/src/router/analysis.router.ts`, `packages/api/package.json`(add `@toksai/shared`)
- Modify: `apps/server/src/analysis/analysis.service.ts`, `apps/server/src/app.module.ts`

**Interfaces:**
- api `AnalysisContract`에 추가: `start(adminToken: string): Promise<{ ok: true }>`, `getResult(viewToken: string): Promise<AnalysisResultView | null>`.
- api가 `@toksai/shared`의 `AnalysisResultView`를 재노출.
- server `AnalysisService`가 위 둘을 구현: `start`는 adminToken 검증 후 `runner.run(id)`를 fire-and-forget, `getResult`는 `analysisResult` 조회. 러너/서비스는 `GeminiService`를 `LlmClient`로 주입.

- [ ] **Step 1: api 계약 확장**

`packages/api/package.json` dependencies에 `"@toksai/shared": "workspace:*"` 추가. 또한 `apps/web/package.json` dependencies에도 `"@toksai/shared": "workspace:*"`를 추가한다(웹이 `analysis.result` 출력의 `AnalysisResultView`를 안정적으로 해석하도록; Plan 3에서도 필요). 이후 `pnpm install`.

`packages/api/src/context.ts`에 추가/수정:
```ts
import type { AnalysisResultView } from "@toksai/shared";
export type { AnalysisResultView } from "@toksai/shared";

// AnalysisContract에 메서드 2개 추가:
export interface AnalysisContract {
  getByViewToken(viewToken: string): Promise<AnalysisView | null>;
  identify(adminToken: string, ownerRawName: string, nicknames: Record<string, string>): Promise<void>;
  start(adminToken: string): Promise<{ ok: true }>;
  getResult(viewToken: string): Promise<AnalysisResultView | null>;
}
```

`packages/api/src/router/analysis.router.ts`에 추가:
```ts
  start: publicProcedure
    .input(z.object({ adminToken: z.string() }))
    .mutation(({ input, ctx }) => ctx.analysis.start(input.adminToken)),
  result: publicProcedure
    .input(z.object({ viewToken: z.string() }))
    .query(({ input, ctx }) => ctx.analysis.getResult(input.viewToken)),
```

- [ ] **Step 2: 서버 구현**

`apps/server/src/analysis/analysis.service.ts`에 러너 주입 + 메서드 추가:
```ts
// 생성자에 runner 추가
constructor(
  private readonly prisma: PrismaClient,
  private readonly extractor: FileExtractService,
  private readonly crypto: CryptoService,
  private readonly runner: AnalysisRunnerService,
) {}

async start(adminToken: string): Promise<{ ok: true }> {
  const a = await this.prisma.analysis.findUnique({ where: { adminToken } });
  if (!a) throw new Error("NOT_FOUND");
  // fire-and-forget; 상태는 러너가 ANALYZING/DONE/FAILED로 관리
  void this.runner.run(a.id).catch(() => {});
  return { ok: true };
}

async getResult(viewToken: string): Promise<AnalysisResultView | null> {
  const a = await this.prisma.analysis.findUnique({
    where: { viewToken }, include: { result: true },
  });
  if (!a?.result) return null;
  const r = a.result;
  return {
    stats: r.stats as never, timeline: r.timeline as never,
    affinitySeries: r.affinitySeries as never, keywords: r.keywords as never,
    personas: r.personas as never, badges: r.badges as never,
    chemiScore: r.chemiScore, relationType: r.relationType as never,
    highlights: r.highlights as never,
  };
}
```
(상단 import 추가: `import type { AnalysisResultView } from "@toksai/api";` 및 `import { AnalysisRunnerService } from "../analysis-pipeline/analysis-runner.service";`)

- [ ] **Step 3: 모듈 와이어링**

`apps/server/src/app.module.ts` providers에 추가:
```ts
GeminiService,
{
  provide: AnalysisRunnerService,
  useFactory: (crypto: CryptoService, gemini: GeminiService) =>
    new AnalysisRunnerService(prisma, crypto, gemini),
  inject: [CryptoService, GeminiService],
},
```
그리고 `AnalysisService` 팩토리에 runner를 주입하도록 수정:
```ts
{
  provide: AnalysisService,
  useFactory: (extractor: FileExtractService, crypto: CryptoService, runner: AnalysisRunnerService) =>
    new AnalysisService(prisma, extractor, crypto, runner),
  inject: [FileExtractService, CryptoService, AnalysisRunnerService],
},
```
(import: `GeminiService`, `AnalysisRunnerService`.)

- [ ] **Step 4: 기존 테스트 갱신**

`analysis.service.test.ts`는 `AnalysisService` 생성자에 4번째 인자(runner)가 생겼으므로, `createFromUpload` 테스트에 더미 러너를 넘긴다:
```ts
const runner = { run: async () => {} } as any;
const svc = new AnalysisService(prisma, new FileExtractService(), crypto, runner);
```
(두 군데 생성 지점 모두 수정.)

- [ ] **Step 5: 검증**

Run: `pnpm --filter @toksai/api build && pnpm --filter @toksai/api typecheck`
Expected: PASS (start/result + AnalysisResultView 재노출).
Run: `pnpm --filter @toksai/server test && pnpm --filter @toksai/server typecheck`
Expected: PASS (기존 12 + gemini 2 + runner 2, 생성자 시그니처 갱신 반영).

- [ ] **Step 6: Commit**

```bash
git add packages/api apps/server/src/analysis/analysis.service.ts apps/server/src/analysis/analysis.service.test.ts apps/server/src/app.module.ts pnpm-lock.yaml
git commit -m "feat(api,server): start/result endpoints + runner wiring"
```

---

## Task 9: 런타임 검증 (FakeLLM 경로 + 선택적 실제 Gemini 스모크)

**Files:** (없음 — 검증/문서화 태스크. 필요 시 `apps/server/src/app.module.ts`에 임시 토글은 두지 않는다.)

**Interfaces:** 없음. 통합 동작 확인.

- [ ] **Step 1: 서버 빌드 + 전체 유닛 스위트**

Run: `pnpm build` (turbo 전체) — shared/db/api/server/web 빌드 성공.
Run: `pnpm test` — 전 패키지 그린(shared 22 + server 16).

- [ ] **Step 2: 실제 Gemini 스모크 (GEMINI_API_KEY 있을 때만)**

`.env`에 유효한 `GEMINI_API_KEY`가 있으면(사용자 제공), env 프리로드로 서버 기동 후:
1. `POST /upload` (sample.txt) → viewToken/adminToken
2. tRPC `analysis.start`({adminToken}) 호출 → `{ok:true}`
3. `analysis.get`({viewToken}) status가 ANALYZING→DONE로 바뀌는지 폴링(수 초~수십 초)
4. `analysis.result`({viewToken}) → `chemiScore`/`relationType`/`timeline`/`badges` 채워진 JSON 확인

키가 없으면 이 스텝은 **SKIP**하고 리포트에 "GEMINI_API_KEY 미제공으로 실제 Gemini 스모크 생략, 러너 로직은 FakeLlmClient 유닛 테스트로 검증됨"이라 명시한다. (러너/스키마/통계/버킷은 유닛으로 이미 커버.)

- [ ] **Step 3: 최종 커밋 없음(코드 변경 시에만)**

검증만 수행. 변경이 없으면 커밋하지 않는다.

---

## Self-Review

**Spec coverage(스펙 §6/§7 대비):**
- §6.1 코드 정량통계(선톡/답장텀/시간대/이모지/월별) → Task 2 ✅
- §6.2 월버킷 Gemini + 상위 통합(이벤트/호감곡선/키워드/성향/뱃지/케미/유형/하이라이트) → Task 3,5,6,7 ✅
- §6.3 AI 자동 뱃지(카탈로그에서 선택) → Task 1(카탈로그) + Task 6/7(선택) ✅
- 상태/비동기 잡 → Task 7(러너) + Task 8(start/result, fire-and-forget) ✅
- 결과 페이지 렌더 → **Plan 3**(범위 밖) ✅

**Placeholder scan:** 프롬프트/스키마/코드 모두 실제 내용 포함. 프롬프트 문구는 구체적(추후 튜닝 가능하나 동작에 충분).

**Type consistency:**
- `computeStats`/`bucketByMonth`/`renderBucketText`/`mapWithConcurrency`(Task 2~4) ↔ 러너(Task 7) 사용 일치.
- `BucketAnalysis`/`AnalysisResultView`(Task 1) ↔ 스키마(Task 6) ↔ 러너 조립(Task 7) ↔ api 재노출(Task 8) 일치.
- `LlmClient`(Task 5) ↔ 러너 주입(Task 7) ↔ GeminiService/FakeLlmClient(Task 5) 일치.
- `AnalysisContract` 확장(Task 8) ↔ `AnalysisService` 구현(Task 8) 일치. 생성자 시그니처 변경은 기존 테스트에서 함께 갱신.

**남은 리스크(실행 중 확인):**
- `@google/genai` 실제 API 형태(`models.generateContent` 시그니처/`res.text`)는 make-minjun-minju 관례 기반 — 실제 스모크에서 미세 조정 가능.
- `synthesisZod as never` 캐스팅: `Omit<AnalysisResultView,'stats'|'affinitySeries'>`와 synthesisZod 출력 형태 정합을 러너 테스트가 검증. 형 불일치 시 러너에서 매핑 보정.
- 결과 도메인 타입을 `@toksai/shared`에 두어 api가 shared를 타입 의존 — leaf 의존이라 순환 없음(빌드 순서 shared→api 유지).
