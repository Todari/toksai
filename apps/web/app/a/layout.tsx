import type { Metadata } from "next";
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null },
};
export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
