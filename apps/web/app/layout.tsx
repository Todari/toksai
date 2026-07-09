import "./globals.css";
export const metadata = { title: "톡사이", description: "카톡 대화로 보는 우리 사이" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
