# 톡사이 SEO / GEO / GA 베이스라인 (Plan 4) — Implementation Plan

> **For agentic workers:** 단일 앱(`apps/web`)에 표준 Next App Router 메타데이터/디스커버리/애널리틱스를 추가하는 저위험·가산 작업. subagent-driven로 1개 구현자 + 리뷰 + 빌드/렌더 검증.

**Goal:** 랜딩(`/`)은 검색·AI 엔진에 잘 노출되도록 메타데이터/OG/구조화데이터/사이트맵/GA를 붙이고, **사적 데이터가 있는 결과·식별 페이지(`/a/*`)는 `noindex`로 확실히 차단**한다. 도메인·GA ID는 env 플레이스홀더(`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`)로 두어 배포 때 채운다.

**Architecture:** Next 16 App Router 파일 컨벤션(`robots.ts`/`sitemap.ts`/`manifest.ts`/`icon.svg`/`opengraph-image.tsx`) + 루트 `metadata` 강화 + `/a` 하위 서버 레이아웃으로 noindex 상속 + `@next/third-parties`의 GoogleAnalytics + JSON-LD + `public/llms.txt`(GEO).

## Global Constraints

- **프라이버시 최우선:** `/a/[viewToken]`, `/a/[viewToken]/identify`는 절대 인덱싱 금지 — `app/a/layout.tsx`(서버 컴포넌트)에서 `robots:{index:false,follow:false}` 상속 + `robots.ts`에서 `disallow:"/a/"`. 랜딩만 인덱싱.
- **env 구동:** 도메인은 `NEXT_PUBLIC_SITE_URL`(dev fallback `http://localhost:3100`), GA는 `NEXT_PUBLIC_GA_ID`(없으면 GA 미렌더). 하드코딩 도메인 금지.
- **톤/브랜드:** 따뜻·톡스타일. OG/아이콘/매니페스트 색 = amber `#F5B301` / cream `#FFFBF3` / rose `#FB7185`. 한국어.
- 결과 페이지·식별 페이지는 `"use client"`라 자체 `metadata` export 불가 → 반드시 상위 서버 레이아웃으로 noindex 처리.
- 신규 런타임 의존성은 `@next/third-parties`(GA)만. 차트/기타 라이브러리 추가 금지.
- 확장자 없는 import, Next 파일 컨벤션 준수.

## Files

- Modify: `.env.example`, `.env.production.example` — `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID` 추가.
- Create: `apps/web/lib/site.ts` — SITE_URL/SITE_NAME/SITE_DESC 상수.
- Modify: `apps/web/app/layout.tsx` — metadataBase·title template·openGraph·twitter·robots·JSON-LD·GA.
- Create: `apps/web/app/a/layout.tsx` — `/a/*` noindex 서버 레이아웃.
- Create: `apps/web/app/robots.ts`, `apps/web/app/sitemap.ts`, `apps/web/app/manifest.ts`.
- Create: `apps/web/app/icon.svg` — 파비콘(톡+하트).
- Create: `apps/web/app/opengraph-image.tsx` + `apps/web/app/twitter-image.tsx` — 공유 미리보기(1200×630).
- Create: `apps/web/public/llms.txt` — GEO(AI 크롤러용 설명).
- Modify: `apps/web/package.json` — `@next/third-parties` dep.

---

## Task 1: env + site 상수 + 루트 메타데이터/GA/JSON-LD

**Files:** `.env.example`, `.env.production.example`, `apps/web/lib/site.ts`, `apps/web/app/layout.tsx`, `apps/web/package.json`

- [ ] **Step 1: env 플레이스홀더**

`.env.example`에 추가:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3100
NEXT_PUBLIC_GA_ID=
```
`.env.production.example`에 추가:
```
NEXT_PUBLIC_SITE_URL=https://toksai.example
NEXT_PUBLIC_GA_ID=
```

- [ ] **Step 2: site 상수**

`apps/web/lib/site.ts`:
```ts
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
export const SITE_NAME = "톡사이";
export const SITE_DESC =
  "카카오톡 대화를 올리면 둘 사이의 관심 신호·이벤트 타임라인·케미 지수를 재미로 분석해 비공개 링크로 함께 보는 서비스.";
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
```

- [ ] **Step 3: `@next/third-parties` 추가**

`apps/web/package.json` dependencies에 `"@next/third-parties": "^16.0.0"` 추가 후 `pnpm install`. (next 메이저와 맞춤; 설치 실패 시 next와 동일 메이저 최신으로.)

- [ ] **Step 4: 루트 레이아웃 강화**

`apps/web/app/layout.tsx`:
```tsx
import "./globals.css";
import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_URL, SITE_NAME, SITE_DESC, GA_ID } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — 카톡 대화로 보는 우리 사이`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: ["카카오톡 대화 분석", "호감도 테스트", "케미 지수", "관계 분석", "톡 분석", "썸 판별"],
  openGraph: {
    type: "website", locale: "ko_KR", siteName: SITE_NAME,
    title: `${SITE_NAME} — 카톡 대화로 보는 우리 사이`, description: SITE_DESC, url: SITE_URL,
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESC },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESC,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  inLanguage: "ko",
  offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: 검증 + 커밋**

Run: `pnpm --filter @toksai/web typecheck && pnpm --filter @toksai/web build` → PASS.
Commit: `feat(web): root metadata, JSON-LD, GA4 (env-driven)`.

---

## Task 2: robots·sitemap·manifest·아이콘·OG 이미지·noindex·llms.txt

**Files:** `apps/web/app/{robots.ts,sitemap.ts,manifest.ts,icon.svg,opengraph-image.tsx,twitter-image.tsx,a/layout.tsx}`, `apps/web/public/llms.txt`

- [ ] **Step 1: `/a/*` noindex 레이아웃**

`apps/web/app/a/layout.tsx`:
```tsx
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: robots / sitemap / manifest**

`apps/web/app/robots.ts`:
```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/a/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
```

`apps/web/app/sitemap.ts`:
```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL, changeFrequency: "monthly", priority: 1 }];
}
```

`apps/web/app/manifest.ts`:
```ts
import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESC } from "../lib/site";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — 카톡 대화로 보는 우리 사이`,
    short_name: SITE_NAME,
    description: SITE_DESC,
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF3",
    theme_color: "#F5B301",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
```

- [ ] **Step 3: 파비콘(icon.svg)**

`apps/web/app/icon.svg` — 따뜻한 톡 버블 + 하트(amber 배경, rose 하트). 간단한 정적 SVG(브랜드 색). 예:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#F5B301"/>
  <path d="M32 14c-11 0-20 6.7-20 15 0 4.8 3 9 7.7 11.8-.5 2.2-1.7 4.6-3.5 6.6 3.6-.5 6.6-2 8.9-3.6 2.1.5 4.4.8 6.9.8 11 0 20-6.7 20-15S43 14 32 14z" fill="#fff"/>
  <path d="M32 38.5l-6.2-6.1a3.6 3.6 0 015.1-5.1l1.1 1 1.1-1a3.6 3.6 0 115.1 5.1L32 38.5z" fill="#FB7185"/>
</svg>
```

- [ ] **Step 4: OG/트위터 공유 이미지 (1200×630)**

`apps/web/app/opengraph-image.tsx` — `next/og` `ImageResponse`로 따뜻한 공유 카드. **한글 렌더용 폰트 필요**: satori 기본 폰트는 한글을 못 그리므로, 오픈 폰트(예: Pretendard 또는 Noto Sans KR)의 `.ttf`/`.otf`를 `apps/web/app/`(또는 `apps/web/assets/`)에 두고 `fs.readFileSync`로 읽어 `fonts`에 전달한다. 폰트 파일은 실행자가 확보(공개 라이선스, 예: Pretendard). 디자인: amber→rose 그라데이션 배경, `톡사이` 큰 타이틀 + `카톡 대화로 보는 우리 사이` + 하트/이모지. `alt`/`size`/`contentType` export.
```tsx
import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const runtime = "nodejs";
export const alt = "톡사이 — 카톡 대화로 보는 우리 사이";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const bold = readFileSync(join(process.cwd(), "app", "Pretendard-Bold.ttf")); // 실행자가 파일 배치
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 24,
        background: "linear-gradient(135deg,#FFE7A3 0%,#F5B301 45%,#FB7185 100%)", color: "#3b1f14" }}>
        <div style={{ fontSize: 120, fontWeight: 800 }}>톡사이 💛</div>
        <div style={{ fontSize: 44, fontWeight: 800 }}>카톡 대화로 보는 우리 사이</div>
        <div style={{ fontSize: 30, opacity: 0.85 }}>관심 신호 · 케미 지수 · 관계 유형</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Pretendard", data: bold, weight: 800, style: "normal" }] },
  );
}
```
`apps/web/app/twitter-image.tsx` — OG 재사용:
```ts
export { default, alt, size, contentType, runtime } from "./opengraph-image";
```
> 폰트 파일을 확보 못 하면(네트워크 등) BLOCKED로 보고. 폰트 없이 한글을 넣으면 두부(□)로 렌더됨.

- [ ] **Step 5: llms.txt (GEO)**

`apps/web/public/llms.txt`:
```
# 톡사이 (toksai)

> 카카오톡 1:1 대화를 업로드하면 두 사람 사이의 관심 신호, 이벤트 타임라인, 대화 습관(선톡·답장 속도·시간대), 관심 키워드, 관계 유형, 케미 지수, 뱃지를 재미로 분석해 비공개 링크로 함께 보는 웹 서비스입니다. 심리 진단이 아니라 놀이형 해석입니다.

## 핵심
- 사용법: 카카오톡에서 대화 내보내기(텍스트) → 업로드 → "둘 중 나" 선택·닉네임 → 분석 결과를 비공개 링크로 공유
- 프라이버시: 원본 대화는 암호화 저장, 분석 결과 페이지는 검색 비노출(비공개 링크), 언제든 삭제 가능
- 분석 항목: 케미 지수, 관계 유형, 호감 신호 곡선, 관계 타임라인, 시간대 히트맵, 선톡 밸런스, 키워드, 성향, 뱃지, 하이라이트

## 페이지
- / : 서비스 소개 및 업로드
```

- [ ] **Step 6: 검증 + 커밋**

Run: `pnpm --filter @toksai/web typecheck && pnpm --filter @toksai/web build` → PASS(‑ robots/sitemap/manifest/icon/og 라우트가 빌드 출력에 나타나는지 확인).
Commit: `feat(web): robots/sitemap/manifest/icon/OG image, noindex for /a, llms.txt`.

---

## Self-Review

- SEO: metadataBase·title template·description·keywords·openGraph·twitter·canonical·robots·sitemap·manifest·favicon·OG이미지 ✅
- GEO: JSON-LD(WebApplication)·llms.txt·시맨틱 메타 ✅ (랜딩 콘텐츠 강화는 "제대로 된 랜딩" 범위로 별도)
- GA: `@next/third-parties` GoogleAnalytics, `NEXT_PUBLIC_GA_ID` 있을 때만 렌더 ✅
- **프라이버시**: `/a/*` noindex(서버 레이아웃) + robots disallow ✅ — 결과/식별 페이지 검색 비노출
- env 구동(도메인/GA 하드코딩 없음) ✅
- 리스크: OG 이미지 한글 폰트 확보(실행자), `@next/third-parties` 버전 정합. 실제 GA 수집·검색 노출은 배포 + env 값 채운 뒤 확인 가능.
