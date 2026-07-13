# 톡사이 Result & Share (Plan 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. UI tasks additionally invoke `frontend-design` (component quality) and `dataviz` (charts). Steps use checkbox (`- [ ]`) syntax.

**Goal:** 식별 후 분석을 시작(`analysis.start`)하고, 결과 페이지 `/a/[viewToken]`가 상태를 폴링하다 `DONE`이 되면 `analysis.result`를 렌더한다: 케미지수·관계유형·호감곡선·타임라인·대화습관(히트맵/선톡밸런스)·키워드·성향/뱃지·하이라이트. 비공개 링크 공유와 관리 토큰 삭제, 프라이버시 고지를 제공한다.

**Architecture:** 서버/계약에 `delete(adminToken)`를 추가한다(cascade). 웹은 식별 완료 시 `start`를 호출하고 결과 페이지로 이동한다. 결과 페이지는 client 컴포넌트로, `analysis.get`(status) 폴링 → `DONE`에 `analysis.result`를 조회 → 섹션 컴포넌트로 렌더. 차트는 외부 차트 라이브러리 없이 **인라인 SVG/CSS**(dataviz 가이드)로 구현해 의존성을 최소화한다. 원본 대화는 이미 암호화 저장돼 있고 이 계획은 파생 결과만 렌더한다.

**Tech Stack:** 기존 스택(Next.js 16 App Router, React 19, Tailwind v4, tRPC client). 신규 런타임 의존성 없음.

## Global Constraints

- **모듈 규약:** 웹 tsconfig `@toksai/tsconfig/nextjs.json`, extension-LESS imports. `AnalysisResultView`/`ChatStats` 등은 `@toksai/shared`(웹 dep 이미 추가됨)에서 타입 import.
- **차트:** 외부 차트 라이브러리 도입 금지. 인라인 SVG + Tailwind. dataviz 스킬의 색/접근성/라이트·다크 가이드를 따른다.
- **톤/카피:** 한국어. 호감도는 "재미로 보는 관심 신호"로 표기(단정 금지). 결과 상단·하단에 "원본 대화는 암호화 저장되며, 분석을 위해 대화 내용이 Google Gemini로 전송됩니다. 관리 링크로 언제든 삭제할 수 있습니다." 고지.
- **토큰:** 결과 페이지는 `viewToken`으로만 조회한다. 삭제는 `adminToken` 소지자만(localStorage). adminToken은 URL에 절대 넣지 않는다.
- **상태 머신:** `IDENTIFYING`(분석 전) → `ANALYZING`(진행) → `DONE`(결과) | `FAILED`(재시도 안내). 폴링 간격 2.5s, 상한 있음.
- **삭제:** `analysis.delete(adminToken)` → `prisma.analysis.delete`(cascade로 participants/rawChat/result 제거). 성공 후 홈으로.
- **접근성/반응형:** 모바일 우선(공유 대상이 폰). 가로 스크롤 유발 금지, 차트는 컨테이너 안에서 반응.

## File Structure

- `packages/api/src/context.ts` — `AnalysisContract`에 `deleteByAdminToken(adminToken): Promise<{ok:true}>`.
- `packages/api/src/router/analysis.router.ts` — `delete` mutation.
- `apps/server/src/analysis/analysis.service.ts` — `deleteByAdminToken` 구현.
- `apps/web/lib/api.ts` — `start`/`result`/`delete`/`getStatus` 래퍼 + `loadAdminToken`(존재).
- `apps/web/app/a/[viewToken]/identify/page.tsx` — 제출 시 `start` 호출 후 결과로 이동.
- `apps/web/app/a/[viewToken]/page.tsx` — 결과 페이지(폴링·조회·렌더).
- `apps/web/components/result/*` — 섹션 컴포넌트:
  - `AnalyzingState.tsx`, `FailedState.tsx`
  - `Headline.tsx`(닉네임·D+n·총메시지·ChemiScore·RelationType)
  - `AffinityChart.tsx`(인라인 SVG 라인 2개 + 이벤트 마커)
  - `Timeline.tsx`(이벤트 카드)
  - `Habits.tsx`(Heatmap 7×24 + InitiationBalance + 통계 타일)
  - `Keywords.tsx`(칩)
  - `PersonaCards.tsx`(성향 한줄평 + 획득 뱃지)
  - `Highlights.tsx`(인용 카드)
  - `ShareBar.tsx`(링크 복사) · `DeleteButton.tsx` · `PrivacyNote.tsx`
- `apps/web/components/result/format.ts` — 표시용 헬퍼(닉네임 조회, 날짜 포맷, 히트맵 정규화 등, 순수 + 단위 테스트).

의존성: api/server(delete) → web(전 컴포넌트). shared 타입 재사용.

---

## Task 1: 삭제 엔드포인트 (api + server)

**Files:**
- Modify: `packages/api/src/context.ts`, `packages/api/src/router/analysis.router.ts`, `apps/server/src/analysis/analysis.service.ts`

**Interfaces:**
- `AnalysisContract.deleteByAdminToken(adminToken: string): Promise<{ ok: true }>`
- router `delete` mutation `{ adminToken }`.
- server: adminToken으로 찾고 없으면 `NOT_FOUND`, 있으면 `prisma.analysis.delete({ where: { id } })`(cascade).

- [ ] **Step 1: 계약 확장**

`packages/api/src/context.ts`의 `AnalysisContract`에 추가:
```ts
  deleteByAdminToken(adminToken: string): Promise<{ ok: true }>;
```

`packages/api/src/router/analysis.router.ts`에 추가:
```ts
  delete: publicProcedure
    .input(z.object({ adminToken: z.string() }))
    .mutation(({ input, ctx }) => ctx.analysis.deleteByAdminToken(input.adminToken)),
```

- [ ] **Step 2: 서버 구현**

`apps/server/src/analysis/analysis.service.ts`에 메서드 추가:
```ts
async deleteByAdminToken(adminToken: string): Promise<{ ok: true }> {
  const a = await this.prisma.analysis.findUnique({ where: { adminToken } });
  if (!a) throw new Error("NOT_FOUND");
  await this.prisma.analysis.delete({ where: { id: a.id } });
  return { ok: true };
}
```
(Prisma 관계가 `onDelete: Cascade`이므로 participants/rawChat/result 자동 삭제.)

- [ ] **Step 3: 검증**

Run: `pnpm --filter @toksai/api build && pnpm --filter @toksai/api typecheck`
Expected: PASS.
Run: `pnpm --filter @toksai/server test && pnpm --filter @toksai/server typecheck`
Expected: PASS (기존 17 유지).

수동(로컬 PG + env 프리로드 서버): 업로드로 만든 analysis를 `analysis.delete`(adminToken)로 삭제 후 `analysis.get`(viewToken)이 null 반환 확인.

- [ ] **Step 4: Commit**

```bash
git add packages/api apps/server/src/analysis/analysis.service.ts
git commit -m "feat(api,server): delete analysis by admin token (cascade)"
```

---

## Task 2: 웹 API 래퍼 + 식별→분석시작 연결

**Files:**
- Modify: `apps/web/lib/api.ts`, `apps/web/app/a/[viewToken]/identify/page.tsx`

**Interfaces:**
- `lib/api.ts` add: `startAnalysis(adminToken)`, `getAnalysis(viewToken)`(=get), `getResult(viewToken)`, `deleteAnalysis(adminToken)` — 모두 tRPC client 래퍼.
- identify 제출: `identify.mutate(...)` 성공 후 `start.mutate({adminToken})` 호출 → `/a/${viewToken}`로 이동.

- [ ] **Step 1: API 래퍼 추가**

`apps/web/lib/api.ts`에 추가:
```ts
export const startAnalysis = (adminToken: string) => trpc.analysis.start.mutate({ adminToken });
export const getAnalysis = (viewToken: string) => trpc.analysis.get.query({ viewToken });
export const getResult = (viewToken: string) => trpc.analysis.result.query({ viewToken });
export const deleteAnalysis = (adminToken: string) => trpc.analysis.delete.mutate({ adminToken });
```

- [ ] **Step 2: 식별 페이지 제출 로직**

`identify/page.tsx`의 `submit()`을 수정:
```ts
async function submit() {
  await trpc.analysis.identify.mutate({ adminToken, ownerRawName: owner, nicknames: nick });
  await startAnalysis(adminToken); // 분석 시작(fire-and-forget 서버측)
  router.push(`/a/${viewToken}`);
}
```
(에러 처리: try/catch로 실패 시 사용자 안내 문구 표시.)

- [ ] **Step 3: 검증**

Run: `pnpm --filter @toksai/web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/api.ts apps/web/app/a/[viewToken]/identify/page.tsx
git commit -m "feat(web): api wrappers + trigger analysis on identify submit"
```

---

## Task 3: 표시용 헬퍼 (TDD)

**Files:**
- Create: `apps/web/components/result/format.ts`, `apps/web/components/result/format.test.ts`
- (web에 vitest 설정이 없으면 `apps/web/vitest.config.ts` 추가 + `package.json`에 `"test": "vitest run"`, devDep `vitest`.)

**Interfaces (순수 함수):**
- `nicknameOf(view: AnalysisView, rawName): string` — participant nickname ?? rawName.
- `formatDuration(days: number): string` — `"D+123"`.
- `heatmapMax(heatmap: number[][]): number` — 최대 셀 값(색 스케일용).
- `pickOwnerOther(view): { owner: Participant; other: Participant }` — isOwner 기준(없으면 배열 순서).
- `badgeById(id): Badge | undefined` — `BADGES`에서 조회.

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/components/result/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatDuration, heatmapMax, badgeById } from "./format";

describe("format helpers", () => {
  it("formatDuration → D+n", () => {
    expect(formatDuration(0)).toBe("D+0");
    expect(formatDuration(123)).toBe("D+123");
  });
  it("heatmapMax → 최대 셀", () => {
    expect(heatmapMax([[0, 2], [5, 1]])).toBe(5);
    expect(heatmapMax([])).toBe(0);
  });
  it("badgeById → 카탈로그 조회", () => {
    expect(badgeById("first_texter")?.name).toBe("선톡왕");
    expect(badgeById("nope")).toBeUndefined();
  });
});
```

- [ ] **Step 2: RED**

Run: `pnpm --filter @toksai/web test format`
Expected: FAIL — 미존재.

- [ ] **Step 3: 구현**

`apps/web/components/result/format.ts`:
```ts
import { BADGES } from "@toksai/shared";
import type { Badge } from "@toksai/shared";

export function formatDuration(days: number): string {
  return `D+${days}`;
}

export function heatmapMax(heatmap: number[][]): number {
  let max = 0;
  for (const row of heatmap) for (const v of row) if (v > max) max = v;
  return max;
}

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
```
(nicknameOf/pickOwnerOther는 결과 페이지에서 view 형태 확정 후 함께 추가 — Step 3에 포함해 구현하고 테스트는 위 3개로 게이트.)

- [ ] **Step 4: GREEN**

Run: `pnpm --filter @toksai/web test format`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/result/format.ts apps/web/components/result/format.test.ts apps/web/vitest.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): result display helpers (TDD)"
```

---

## Task 4: 결과 페이지 셸 — 폴링·상태·조회

**Files:**
- Create: `apps/web/app/a/[viewToken]/page.tsx`, `apps/web/components/result/AnalyzingState.tsx`, `apps/web/components/result/FailedState.tsx`

**Interfaces:**
- 결과 페이지(client): `use(params)`로 viewToken → `getAnalysis`(status/participants) 최초 로드 → status가 `ANALYZING`이면 2.5s 폴링(최대 ~40회) → `DONE`이면 `getResult` 조회 후 `<ResultView>` 렌더 → `FAILED`면 `<FailedState>` → `IDENTIFYING`이면 식별로 유도.
- `AnalyzingState`: 진행 스피너 + "둘 사이를 분석하는 중… (수십 초 걸릴 수 있어요)".
- `FailedState`: "분석에 실패했어요" + 다시 시도(adminToken 있으면 `startAnalysis` 재호출) 버튼.

- [ ] **Step 1: 상태 컴포넌트**

`AnalyzingState.tsx`, `FailedState.tsx` (frontend-design로 간결·따뜻한 톤). 로딩은 CSS 스피너/스켈레톤.

- [ ] **Step 2: 결과 페이지 폴링 셸**

`app/a/[viewToken]/page.tsx` (client): 상태 머신 + 폴링 + 조회. 결과 데이터가 준비되면 다음 태스크들의 섹션 컴포넌트(`<Headline/>` 등)를 조립하는 `ResultView`를 렌더(이 태스크에선 헤드라인만 임시로, 이후 태스크에서 섹션 채움). 폴링은 `useEffect` + `setTimeout` 재귀, 언마운트 시 클리어.

- [ ] **Step 3: 검증**

Run: `pnpm --filter @toksai/web typecheck && pnpm --filter @toksai/web build`
Expected: PASS (동적 라우트 컴파일).

**시각 확인용 시드(선택, 권장):** 로컬 PG에 가짜 `AnalysisResult`를 심어 렌더 확인 — `apps/server/scripts/seed-fake-result.ts`(비커밋 or scripts에 두되 gitignore 불필요, 개발 도구)로 특정 analysis에 status=DONE + 샘플 AnalysisResultView JSON 삽입. 이 스크립트로 만든 viewToken으로 결과 페이지를 브라우저에서 확인. (실제 Gemini 키가 없어도 렌더링을 시각 검증 가능.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/a/[viewToken]/page.tsx apps/web/components/result/AnalyzingState.tsx apps/web/components/result/FailedState.tsx
git commit -m "feat(web): result page shell with status polling"
```

---

## Task 5: 헤드라인 — 케미지수 · 관계유형 · 관계 통계

**Files:**
- Create: `apps/web/components/result/Headline.tsx`, `apps/web/components/result/ChemiGauge.tsx`, `apps/web/components/result/format.ts`(nicknameOf/pickOwnerOther 추가)

**Interfaces:**
- `<Headline view result />`: 두 닉네임, D+n(`result.stats.durationDays`), 총 메시지, **ChemiGauge**(0~100 대형, 원형/온도계형), 관계유형 배지(`result.relationType.label` + description).
- `<ChemiGauge score />`: 인라인 SVG 원형 게이지(0~100), 점수·라벨.

- [ ] **Step 1: frontend-design 스킬로 헤드라인/게이지 구현**

케미지수는 페이지의 히어로. dataviz의 스탯타일/게이지 가이드 + frontend-design로 시선을 끄는 카드. 색은 케미 점수에 따라 그라데이션(낮음→높음). 라이트/다크 대응.

- [ ] **Step 2: format 헬퍼 보강 + 조립**

`format.ts`에 `nicknameOf`, `pickOwnerOther` 추가하고 결과 페이지 `ResultView`에 `<Headline>` 연결.

- [ ] **Step 3: 검증**

Run: `pnpm --filter @toksai/web typecheck && pnpm --filter @toksai/web build` → PASS.
시드 데이터로 브라우저 시각 확인(헤드라인이 케미/유형/통계를 보여줌).

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/result/Headline.tsx apps/web/components/result/ChemiGauge.tsx apps/web/components/result/format.ts apps/web/app/a/[viewToken]/page.tsx
git commit -m "feat(web): headline with chemi gauge and relation type"
```

---

## Task 6: 호감 신호 곡선 + 관계 타임라인 (dataviz)

**Files:**
- Create: `apps/web/components/result/AffinityChart.tsx`, `apps/web/components/result/Timeline.tsx`

**Interfaces:**
- `<AffinityChart series result />`: `result.affinitySeries`(월별 `{month, scores:{rawA,rawB}}`)를 인라인 SVG 라인 2개(각자→상대, 0~100)로. x=월, y=점수. `result.timeline` 이벤트를 x축 위 마커로 오버레이(hover/tap 시 제목). 범례=닉네임 2명.
- `<Timeline events />`: 날짜·제목·요약·인용 카드 리스트(세로).

- [ ] **Step 1: dataviz 스킬 로드 후 차트 구현**

dataviz 가이드(색 팔레트·축·범례·접근성·라이트/다크)를 따르는 인라인 SVG 라인차트. 두 시리즈는 팔레트의 구분 가능한 2색. 데이터 1개월뿐일 때/빈 배열일 때 방어.

- [ ] **Step 2: 타임라인 카드**

frontend-design로 이벤트 카드(날짜 pill + 제목 + 요약 + 인용 blockquote).

- [ ] **Step 3: 검증**

Run: `pnpm --filter @toksai/web typecheck && pnpm --filter @toksai/web build` → PASS. 시드로 시각 확인.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/result/AffinityChart.tsx apps/web/components/result/Timeline.tsx apps/web/app/a/[viewToken]/page.tsx
git commit -m "feat(web): affinity line chart + relationship timeline"
```

---

## Task 7: 대화 습관 — 히트맵 · 선톡 밸런스 · 통계 타일 (dataviz)

**Files:**
- Create: `apps/web/components/result/Habits.tsx`, `apps/web/components/result/Heatmap.tsx`, `apps/web/components/result/InitiationBalance.tsx`

**Interfaces:**
- `<Heatmap heatmap />`: `stats.heatmap`(7×24)을 색 농도 그리드로(요일×시간). 최댓값 기준 정규화(`heatmapMax`), 접근성(색+수치 title).
- `<InitiationBalance stats owner other />`: 선톡 비율을 좌우 밸런스 바로(누가 더 선톡). 답장텀 중앙값·평균 메시지 길이·이모지/ㅋㅎ/물음표/느낌표를 각자 통계 타일로.
- `<Habits result view />`: 위를 묶는 섹션.

- [ ] **Step 1: dataviz로 히트맵/밸런스/타일 구현**

히트맵은 순차 색 스케일(dataviz sequential 팔레트). 밸런스 바는 두 사람 색 사용(AffinityChart와 동일 팔레트로 일관). 타일은 KPI 카드.

- [ ] **Step 2: 검증**

Run: `pnpm --filter @toksai/web typecheck && pnpm --filter @toksai/web build` → PASS. 시드로 시각 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/result/Habits.tsx apps/web/components/result/Heatmap.tsx apps/web/components/result/InitiationBalance.tsx apps/web/app/a/[viewToken]/page.tsx
git commit -m "feat(web): conversation habits (heatmap, initiation balance, stat tiles)"
```

---

## Task 8: 키워드 · 성향/뱃지 · 하이라이트

**Files:**
- Create: `apps/web/components/result/Keywords.tsx`, `apps/web/components/result/PersonaCards.tsx`, `apps/web/components/result/Highlights.tsx`

**Interfaces:**
- `<Keywords keywords />`: 칩 목록.
- `<PersonaCards result view />`: 각자 카드 = 닉네임 + 성향 한줄평(`personas`) + 획득 뱃지(`badges`→`badgeById` 아이콘/이름/근거).
- `<Highlights highlights />`: 설렘/웃김/감동 인용 카드(kind별 색/아이콘).

- [ ] **Step 1: frontend-design로 구현**

뱃지는 아이콘 강조. 하이라이트는 kind별 감성 색(flutter/funny/touching). 키워드 칩은 절제된 스타일.

- [ ] **Step 2: 검증**

Run: `pnpm --filter @toksai/web typecheck && pnpm --filter @toksai/web build` → PASS. 시드로 시각 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/result/Keywords.tsx apps/web/components/result/PersonaCards.tsx apps/web/components/result/Highlights.tsx apps/web/app/a/[viewToken]/page.tsx
git commit -m "feat(web): keywords, persona/badges, highlights sections"
```

---

## Task 9: 공유 바 · 삭제 · 프라이버시 고지 + 마감

**Files:**
- Create: `apps/web/components/result/ShareBar.tsx`, `apps/web/components/result/DeleteButton.tsx`, `apps/web/components/result/PrivacyNote.tsx`

**Interfaces:**
- `<ShareBar viewToken />`: 현재 결과 URL 복사 버튼(`navigator.clipboard`) + 안내("이 링크로 상대와 함께 보세요").
- `<DeleteButton viewToken />`: `loadAdminToken(viewToken)`이 있을 때만 노출. 확인 다이얼로그 후 `deleteAnalysis(adminToken)` → 성공 시 홈(`/`)으로. localStorage 관리 토큰도 제거.
- `<PrivacyNote />`: 암호화 저장 + Gemini 전송 + 삭제 가능 고지.

- [ ] **Step 1: 구현 + 결과 페이지 최종 조립**

`ResultView`에 모든 섹션 순서대로 배치(헤드라인→호감곡선→타임라인→습관→키워드→성향/뱃지→하이라이트→공유바→프라이버시→삭제). 모바일 우선 레이아웃, 섹션 간 여백.

- [ ] **Step 2: 검증**

Run: `pnpm --filter @toksai/web typecheck && pnpm --filter @toksai/web build` → PASS.
Run: `pnpm build && pnpm test` → 전체 그린(web 헬퍼 테스트 포함).
시드 데이터로 전체 결과 페이지를 브라우저에서 훑어 시각/반응형(모바일 폭) 확인. 삭제 버튼(adminToken 있을 때) 동작 확인 → 홈 이동 + DB에서 제거 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/result/ShareBar.tsx apps/web/components/result/DeleteButton.tsx apps/web/components/result/PrivacyNote.tsx apps/web/app/a/[viewToken]/page.tsx
git commit -m "feat(web): share bar, delete, privacy note; assemble result page"
```

---

## Self-Review

**Spec coverage(스펙 §8 결과 페이지 대비):**
- §8.1 헤드라인(닉네임/기간/총메시지/케미/유형) → Task 5 ✅
- §8.2 호감 곡선 + 이벤트 마커 → Task 6 ✅
- §8.3 타임라인 → Task 6 ✅
- §8.4 대화습관(선톡밸런스/히트맵/답장텀/길이·이모지) → Task 7 ✅
- §8.5 키워드 → Task 8 ✅
- §8.6 성향+뱃지 → Task 8 ✅
- §8.7 하이라이트 → Task 8 ✅
- §8.8 공유바 → Task 9 ✅ (OG 이미지는 phase 2 — 범위 밖)
- §8.9 삭제(관리 토큰) → Task 1(엔드포인트)+Task 9(UI) ✅
- §9 프라이버시 고지 → Task 9 ✅
- 분석 트리거(start) + 폴링 → Task 2·4 ✅

**Placeholder scan:** 결정적 코드(엔드포인트/래퍼/폴링/헬퍼)는 완전. UI 컴포넌트는 frontend-design/dataviz 스킬로 실행 단계에서 품질 확보(플랜은 데이터 계약·책임·디자인 방향을 명시).

**남은 리스크:**
- 실제 Gemini 없이 렌더 검증은 **시드된 가짜 AnalysisResult**로 수행(스크립트). 실제 데이터 형태는 이미 `AnalysisResultView` 타입으로 고정.
- 폴링은 in-process 러너가 status를 갱신한다는 전제(Plan 2). start 직후 잠깐 IDENTIFYING이 보일 수 있어 최초 폴에 관대하게.
- OG 공유 이미지·연말정산 리캡은 phase 2.
