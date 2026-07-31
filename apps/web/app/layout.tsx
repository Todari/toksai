import "./globals.css";
import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESC, GA_ID } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  category: "lifestyle",
  creator: "Todari",
  publisher: "Todari",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: "톡사이 — 카톡 대화 속 우리 사이의 신호",
    description: SITE_DESC,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "톡사이 — 카톡 대화 속 우리 사이의 신호",
    description: SITE_DESC,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: { canonical: "/" },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: "Toksai",
    url: SITE_URL,
    description: SITE_DESC,
    inLanguage: "ko-KR",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#webapp`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESC,
    image: `${SITE_URL}/opengraph-image`,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    browserRequirements: "JavaScript enabled",
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    featureList: ["카카오톡 대화 분석", "관심 신호와 케미 지수", "대화 습관과 관계 타임라인"],
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
