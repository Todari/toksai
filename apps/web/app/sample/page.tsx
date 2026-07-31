import type { Metadata } from "next";
import { ResultView } from "../../components/result/ResultView";
import { SAMPLE_RESULT, SAMPLE_VIEW } from "../../lib/sample-data";

export const metadata: Metadata = {
  title: "샘플 리포트",
  description: "톡사이 분석 결과가 어떻게 보이는지 예시 데이터로 미리 확인해 보세요.",
  alternates: { canonical: "/sample" },
};

export default function SamplePage() {
  return <ResultView view={SAMPLE_VIEW} result={SAMPLE_RESULT} isSample />;
}
