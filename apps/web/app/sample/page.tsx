import type { Metadata } from "next";
import { ResultView } from "../../components/result/ResultView";
import { SAMPLE_RESULT, SAMPLE_VIEW } from "../../lib/sample-data";

const SAMPLE_TITLE = "카카오톡 대화 분석 샘플 리포트";
const SAMPLE_DESC =
  "케미 지수, 관심 신호 곡선, 대화 습관과 관계 타임라인이 어떻게 분석되는지 톡사이 샘플 리포트로 미리 확인해 보세요.";

export const metadata: Metadata = {
  title: SAMPLE_TITLE,
  description: SAMPLE_DESC,
  alternates: { canonical: "/sample" },
  openGraph: {
    title: `${SAMPLE_TITLE} | 톡사이`,
    description: SAMPLE_DESC,
    url: "/sample",
    images: [
      {
        url: "/opengraph-image?share=20260731",
        width: 1200,
        height: 630,
        alt: "톡사이 카카오톡 대화 분석 서비스",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SAMPLE_TITLE} | 톡사이`,
    description: SAMPLE_DESC,
    images: [
      {
        url: "/twitter-image?share=20260731",
        alt: "톡사이 카카오톡 대화 분석 서비스",
      },
    ],
  },
};

export default function SamplePage() {
  return <ResultView view={SAMPLE_VIEW} result={SAMPLE_RESULT} isSample />;
}
