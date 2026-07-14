# 톡사이 소개형 랜딩 (Plan 5) — Implementation Plan

> subagent-driven, 1개 구현자 + frontend-design + 스크린샷 검증. 단일 페이지(`app/page.tsx`) 리디자인.

**Goal:** 현재 업로드 박스만 있는 랜딩(`/`)을 소개형 페이지로 확장한다 — 히어로 + 업로드 CTA(기존 로직 유지) + 사용법 3단계 + 기능 소개 + 프라이버시 안심 + FAQ(GEO용 자연어 Q&A) + 푸터. 따뜻·톡스타일 유지.

**핵심 제약(반드시):**
- **기존 업로드 기능 100% 보존**: 현 `app/page.tsx`의 `uploadFile`→`saveAdminToken`→`router.push(/a/${viewToken}/identify)` 흐름과 에러 표시, `accept=".zip,.txt"`, busy 상태를 그대로 유지(히어로의 CTA로 재배치만).
- 따뜻·톡스타일: cream 배경, amber `#F5B301`/rose `#FB7185`, rounded-3xl 카드, 모바일 우선 `max-w-[560px]~[640px]`, 라이트/다크 대응. 결과 페이지 컴포넌트들과 톤 일치.
- 카피 톤: "재미로 보는 관심 신호"(단정 금지), 한국어, 친근·설레는 느낌.
- **GEO**: FAQ와 본문을 자연어로 충실히(무엇을·어떻게·안전한지·무료인지) 써서 AI/검색 인용 가치를 높인다. 시맨틱 헤딩(h1/h2), 접근성.
- 신규 의존성 없음. 확장자 없는 import.
- 랜딩 콘텐츠는 도메인/env에 의존하지 않음(SITE_URL은 이미 메타데이터에서 처리).

## Task 1: 소개형 랜딩 페이지

**Files:**
- Modify: `apps/web/app/page.tsx` (히어로+업로드 CTA로 재구성)
- Create (선택, 가독성 위해 분리 권장): `apps/web/components/landing/{Hero.tsx,HowItWorks.tsx,Features.tsx,PrivacyStrip.tsx,Faq.tsx,Footer.tsx}` + `apps/web/components/landing/UploadCta.tsx`(기존 업로드 로직 이관)

**Interfaces:** 없음(페이지 조립). 업로드 로직은 client.

- [ ] **Step 1: frontend-design 스킬 로드** 후 아래 구조로 구현.

- [ ] **Step 2: 기존 업로드 로직을 `UploadCta`로 이관(동작 보존)**
  현 `app/page.tsx`를 읽고 `uploadFile`/`saveAdminToken`/`router.push`/에러/busy 로직을 `components/landing/UploadCta.tsx`(`"use client"`)로 옮긴다. 드롭존은 히어로 안 큰 CTA. 동작·문구·accept 유지.

- [ ] **Step 3: 섹션 구현**
  - `Hero`: 큰 타이틀(톡사이) + 한 줄 소개 + 서브카피("카톡 대화 올리면 둘 사이를 재미로 분석") + `<UploadCta/>`.
  - `HowItWorks`: 3단계 — ① 카톡 대화 내보내기(텍스트) ② 업로드하고 "둘 중 나" 선택 ③ 비공개 링크로 결과 함께 보기. 아이콘/이모지.
  - `Features`: 케미 지수·호감 신호 곡선·관계 타임라인·시간대 히트맵·선톡 밸런스·관심 키워드·성향&뱃지·하이라이트 — 카드 그리드.
  - `PrivacyStrip`: "원본은 암호화 저장 · 결과는 검색에 안 잡히는 비공개 링크 · 언제든 삭제" 안심 배너 + Gemini 전송 고지.
  - `Faq`: 자연어 Q&A 5~7개 — 예) 어떤 대화가 되나요?(1:1 카톡 텍스트 내보내기) / 안전한가요?(암호화·비공개·삭제) / 무료인가요? / 상대도 봐도 되나요?(비공개 링크 공유) / 결과가 정확한가요?(재미로 보는 해석) / 안드로이드/PC도 되나요?(현재 iOS 내보내기 포맷) — GEO 가치.
  - `Footer`: 서비스명 + 간단 링크(프라이버시 문구) + 저작권.
  - `app/page.tsx`: 위 섹션을 순서대로 조립(서버 컴포넌트 가능, UploadCta만 client).

- [ ] **Step 4: 검증**
  `pnpm --filter @toksai/web typecheck && pnpm --filter @toksai/web build` → PASS. `pnpm --filter @toksai/web test` 3/3.

- [ ] **Step 5: Commit** — `feat(web): marketing landing (hero, how-it-works, features, FAQ) preserving upload`.

## Self-Review
- 업로드 기능 보존(회귀 금지) ✅ / 따뜻·톡스타일 일관 ✅ / GEO FAQ·시맨틱·자연어 ✅ / 프라이버시 고지 ✅ / 신규 의존성 없음 ✅
- 리스크: 업로드 로직 이관 시 회귀 — 구현자가 기존 파일 먼저 읽고 동작 보존. 시각검증은 스크린샷.
