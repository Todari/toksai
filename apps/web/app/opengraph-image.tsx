import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const runtime = "nodejs";
export const alt = "톡사이 — 카톡 대화로 보는 우리 사이";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const bold = readFileSync(join(process.cwd(), "app", "NotoSansKR-Bold.ttf"));
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
    { ...size, fonts: [{ name: "Noto Sans KR", data: bold, weight: 800, style: "normal" }] },
  );
}
