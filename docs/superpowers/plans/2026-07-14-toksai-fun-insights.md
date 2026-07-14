# 톡사이 재미 인사이트 확장 (Plan 7) — Implementation Plan

> subagent-driven, 웨이브별 구현+리뷰. 분석 산출물을 대폭 확장하고 **솔직·유머** 방향으로 튜닝한다(무조건 긍정 X — 어색·티격태격·서먹함도 반영).

**Goal:** 분석 결과에 "더 알수록 재밌는" 요소를 대거 추가한다. 코드로 뽑는 팩트 8종 + Gemini 의미 확장 6종 + 게이미피케이션. 톤은 **정직하게**: 케미가 낮으면 낮게, 관계가 서먹하면 서먹하다고, 하이라이트에 어색/다툼도 포함.

## 방향(핵심)
- **솔직 분석:** 하이라이트 종류를 `flutter|funny|touching` + **`banter`(티키타카/장난)·`awkward`(어색)·`clash`(티격태격)** 로 확장. `relationType`은 낮은 케미 시 "서먹한 사이/애매한 사이" 등 정직하게. 프롬프트가 미화하지 말고 실제 역학을 반영하도록 지시. (러너 테스트에 이미 `banter/awkward/clash`+chemi 34 케이스가 추가돼 있음 — 스키마가 이를 통과시켜야 함.)
- 데이터로 확정 가능한 건 코드로(무비용·정확), 해석은 Gemini로.
- 기존 톤(따뜻·톡스타일) 유지, 모바일 우선.

## 추가 항목
**코드 팩트(`stats.funFacts`, 무비용):** ① 골든타임(요일×시 최다) ② 폭풍수다데이(하루 최다+날짜) ③ 잠수이력(최장 무응답 간격+깬 사람/메시지) ④ 밤샘 메시지 수(00~05시) ⑤ 첫 대화(시각·작성자·내용) ⑥ 최애 이모지(사람별 최빈) ⑦ 대화 마무리 담당(세션 종료 메시지 수, 사람별) ⑧ 밀당지수(선톡+답장텀 합성, UI 계산).
**Gemini 확장(`result.extras`):** ⑨ 영화/노래 제목("둘의 관계를 영화로") ⑩ AI 한마디(정직한 총평/응원) ⑪ 둘만의 유행어·밈 ⑫ 감정온도(월별 무드) ⑬ 대화주제 추천 ⑭ (하이라이트 kind 확장은 위 솔직 분석).
**게이미피케이션:** ⑮ 뱃지 레어도(common/rare/epic) + 신규 뱃지(밤샘러/잠수왕/골든타임지기 등) ⑯ 재미 점괘(장난 예측) ⑰ 결과별 OG 공유 이미지(케미·유형·영화 박힌 동적 OG).

## Global Constraints
- 모듈 규약(CJS dist, 확장자 없는 import, 프리셋) 유지. TDD(코드 로직).
- DB: `AnalysisResult`에 **`extras Json` 컬럼 1개** 추가(⑨~⑬ 담음). `funFacts`는 `stats` Json에 중첩(컬럼 불변). 하이라이트/relationType은 Json이라 스키마 불변. Prisma `db push`.
- Gemini: Zod ↔ responseSchema **정합 필수**(수치 min/max, enum). 하이라이트 kind enum 6종 동기화. 프롬프트에 정직성 지시.
- `AnalysisResultView`(shared) 확장 → api 재노출 → server 조립/getResult → web 렌더 일관.
- 실제 Gemini 스모크는 키로 확인(현재 `.env`에 키 있음).

---

## Wave 1 — 코드 팩트 `funFacts` (shared, TDD)

**Files:** `packages/shared/src/stats/fun-facts.ts` (+test), `packages/shared/src/analysis-types.ts`(FunFacts 타입 + ChatStats.funFacts), `packages/shared/src/stats/compute-stats.ts`(funFacts 결합), `index.ts`.

**타입:**
```ts
export interface FunFacts {
  goldenHour: { weekday: number; hour: number; count: number };
  busiestDay: { date: string; count: number };            // "YYYY-MM-DD"
  longestSilence: { gapHours: number; brokenBy: string; brokenAt: string; message: string } | null;
  lateNightCount: number;                                  // hour 0~4
  firstMessage: { at: string; author: string; text: string };
  topEmoji: Record<string, string | null>;                // rawName -> 최빈 이모지
  conversationEnder: Record<string, number>;              // rawName -> 세션 종료 메시지 수
}
```
`ChatStats`에 `funFacts: FunFacts` 추가.

규칙(TDD): goldenHour=heatmap argmax. busiestDay=YYYY-MM-DD 그룹 최다. longestSilence=최대 인접 간격, 그 다음 메시지가 brokenBy/at/message(간격<GAP이면 null 가능 — 최장이 GAP 미만이면 "잠수 없음"으로 null). lateNightCount=hour∈[0,5). firstMessage=messages[0]. topEmoji=사람별 `\p{Extended_Pictographic}` 최빈(없으면 null). conversationEnder=다음 메시지 간격≥GAP(or 마지막)인 메시지의 작성자별 카운트.

- [ ] 실패테스트(각 규칙 케이스) → RED → `computeFunFacts(messages): FunFacts` 구현 + `computeStats`에 `funFacts: computeFunFacts(messages)` 결합 → GREEN → `pnpm --filter @toksai/shared test`(기존+신규 통과) → build. Commit `feat(shared): funFacts (golden time, busiest day, silence, night owl, first msg, top emoji, enders)`.

---

## Wave 2 — Gemini 스키마·프롬프트 확장 + 솔직 튜닝 (server)

**Files:** `apps/server/src/analysis-pipeline/schemas.ts`, `prompts.ts`.

- 하이라이트 kind enum: `["flutter","funny","touching","banter","awkward","clash"]` (Zod+responseSchema+`analysis-types.ts`의 Highlight/BucketAnalysis kind).
- 통합 출력에 추가(`synthesisZod`+responseSchema+`AnalysisResultView.extras`):
```ts
extras: {
  movie: { title: string; reason: string };
  aiComment: string;
  insideJokes: string[];
  moodSeries: { month: string; mood: string; note: string }[];  // mood 자유 라벨(설렘/편안/티키타카/서먹/다툼…)
  topicSuggestion: string;
}
```
- 프롬프트: **정직성 명시** — "미화하지 말 것. 서먹하거나 어색하거나 티격태격하면 그대로. chemiScore는 실제 친밀도, relationType은 낮으면 '서먹한 사이/애매한 사이' 등. 하이라이트에 banter/awkward/clash도 적극 사용." 영화/노래·AI한마디·유행어·무드·주제추천 지시.
- [ ] 스키마/프롬프트 작성 → `pnpm --filter @toksai/server typecheck`. Commit `feat(server): honest highlight kinds + extras (movie, ai comment, inside jokes, mood, topic)`.

---

## Wave 3 — DB extras 컬럼 + 러너 조립 + 타입/계약 (db, shared, server, api)

**Files:** `packages/db/prisma/schema.prisma`(AnalysisResult `extras Json`), `analysis-types.ts`(AnalysisResultView에 `extras` 추가), `analysis-runner.service.ts`(synthesis에서 extras 분리 조립 + funFacts는 stats에 이미 포함), `analysis.service.ts`(getResult가 extras 매핑), api 재노출.

- Prisma: `extras Json` 추가 → `db push`.
- 러너: synthesis 결과에서 `{movie,aiComment,insideJokes,moodSeries,topicSuggestion}`를 `extras`로, 나머지는 기존대로. `toJsonColumns`에 extras 추가.
- getResult가 `extras` 반환. `AnalysisResultView` = 기존 + `extras`.
- [ ] `pnpm --filter @toksai/db push` → 전 패키지 typecheck → **러너 테스트(추가된 banter/awkward/clash+chemi34 케이스 포함) 통과** → 전체 test. Commit `feat(db,server): extras column + runner assembly + honest-kind schema`.
- [ ] **실제 Gemini 스모크**(키 존재): 업로드→분석→result에 movie/aiComment/moodSeries/honest highlights 채워지는지 확인.

---

## Wave 4 — 결과 페이지 UI 확장 (web, frontend-design/dataviz)

**Files:** `apps/web/components/result/*` 신규 — `FunFacts.tsx`(골든타임/폭풍수다/잠수/밤샘/첫대화/최애이모지/마무리담당 카드), `AiComment.tsx`, `MovieCard.tsx`, `MoodStrip.tsx`(감정온도), `InsideJokes.tsx`, `MillDang.tsx`(밀당지수 게이지), + `Highlights.tsx`/`Highlights` kind 확장(banter 🤪/awkward 😬/clash ⚡ 색·이모지), `format.ts`(요일/이모지 헬퍼). `page.tsx` 조립 순서에 삽입.

- 따뜻·톡스타일 일관. AI 한마디는 눈에 띄는 히어로 카드. 영화 카드는 포스터 느낌. FunFacts는 아이콘+숫자 타일. 밀당지수는 좌우 게이지.
- [ ] typecheck+build → **시드 갱신**(`scripts/seed-fake-result.cjs`에 extras/funFacts 채워 시각검증) → 스크린샷. Commit(섹션별 1~2커밋).

---

## Wave 5 — 게이미피케이션 (badges, OG, 점괘)

**Files:** `packages/shared/src/badges.ts`(rarity + 신규 뱃지), `apps/web/components/result/PersonaCards.tsx`(레어도 표시), `apps/web/app/a/[viewToken]/opengraph-image.tsx`(결과별 동적 OG: 케미·유형·영화), `FortuneCard.tsx`(재미 점괘 — 코드 또는 extras).

- Badge에 `rarity: "common"|"rare"|"epic"`, 신규 뱃지(night_owl 확장, ghost(잠수왕), golden_keeper 등). Gemini가 rarity 힌트와 함께 선택하거나 코드로 규칙 부여.
- 결과별 OG: `/a/[viewToken]/opengraph-image.tsx`가 result를 읽어 케미·유형·영화 박힌 카드 생성(폰트=Noto Sans KR 재사용). **주의:** 결과 페이지는 noindex지만 OG 이미지는 공유 미리보기용으로 필요 — 크롤 차단과 무관하게 og:image 메타로 노출.
- [ ] typecheck+build → 시각확인 → Commit.

---

## Self-Review
- 코드 팩트 8·Gemini 6·게이미 3 커버 ✅ / 솔직 방향(kind 6종·정직 프롬프트·낮은 케미 허용) ✅ / 러너 테스트(추가분) 통과 목표 ✅ / DB는 extras 컬럼 1개 + stats 중첩(최소 변경) ✅
- 리스크: Gemini 출력 증가 → 토큰↑(비용), Zod↔responseSchema 정합(수치/enum) — Wave2에서 정밀. 결과별 OG는 result 조회 필요(런타임). moodSeries/extras null 방어(구버전 결과) — UI에서 옵셔널 처리.
