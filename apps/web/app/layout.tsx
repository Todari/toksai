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
