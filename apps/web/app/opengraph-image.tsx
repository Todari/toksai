import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "톡사이 — 카카오톡 대화 속 우리 사이의 관심 신호와 케미를 분석해요";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const bold = readFileSync(join(process.cwd(), "app", "NotoSansKR-Bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#171310",
          color: "#FFF9EE",
          fontFamily: "Noto Sans KR",
          padding: "54px 60px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -230,
            right: -120,
            width: 620,
            height: 620,
            display: "flex",
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(255,100,124,0.46) 0%, rgba(255,100,124,0) 68%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -330,
            left: 220,
            width: 720,
            height: 720,
            display: "flex",
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(255,189,26,0.22) 0%, rgba(255,189,26,0) 68%)",
          }}
        />

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 630,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 62,
                  height: 62,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #FFCD38 0%, #FF647C 100%)",
                  color: "#171310",
                  fontSize: 31,
                }}
              >
                ♥
              </div>
              <div
                style={{
                  marginLeft: 18,
                  display: "flex",
                  flexDirection: "column",
                  lineHeight: 1,
                }}
              >
                <div style={{ display: "flex", fontSize: 38, letterSpacing: -2 }}>톡사이</div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 10,
                    color: "#C9BEB5",
                    fontSize: 18,
                    letterSpacing: -0.5,
                  }}
                >
                  카톡 대화로 보는 우리 사이
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 999,
                  padding: "9px 15px",
                  color: "#FFCD38",
                  fontSize: 17,
                  letterSpacing: 1.4,
                }}
              >
                KAKAO CHAT INSIGHT
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 22,
                  fontSize: 70,
                  lineHeight: 1.13,
                  letterSpacing: -4.2,
                }}
              >
                <div style={{ display: "flex" }}>대화 사이에</div>
                <div style={{ display: "flex", color: "#FFCD38" }}>숨어 있던 신호</div>
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 22,
                  color: "#D7CEC7",
                  fontSize: 23,
                  letterSpacing: -0.7,
                }}
              >
                관심 신호 · 케미 지수 · 관계 타임라인
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  padding: "10px 16px",
                  color: "#FFF9EE",
                  fontSize: 17,
                }}
              >
                무료 · 로그인 없이
              </div>
              <div style={{ display: "flex", marginLeft: 16, color: "#9F948C", fontSize: 17 }}>
                toksai.todari.dev
              </div>
            </div>
          </div>

          <div
            style={{
              width: 430,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -20,
                bottom: 24,
                width: 110,
                height: 110,
                display: "flex",
                borderRadius: 32,
                background: "#FFCD38",
                transform: "rotate(-11deg)",
              }}
            />
            <div
              style={{
                width: 400,
                height: 492,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                borderRadius: 38,
                background: "#FFF9EE",
                color: "#211B17",
                padding: "30px",
                transform: "rotate(2.5deg)",
                boxShadow: "0 28px 70px rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.6)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", color: "#84786F", fontSize: 15, letterSpacing: 1.2 }}>
                    TODAY&apos;S SIGNAL
                  </div>
                  <div style={{ display: "flex", marginTop: 6, fontSize: 25 }}>대화 분석 완료</div>
                </div>
                <div
                  style={{
                    display: "flex",
                    borderRadius: 999,
                    background: "#EAF8E9",
                    color: "#287A3D",
                    padding: "8px 12px",
                    fontSize: 14,
                  }}
                >
                  SIGNAL ON
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 28,
                  borderRadius: 26,
                  background: "#F4EEE5",
                  padding: "22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignSelf: "flex-start",
                    borderRadius: "18px 18px 18px 5px",
                    background: "#FFFFFF",
                    padding: "13px 16px",
                    fontSize: 18,
                  }}
                >
                  오늘도 재밌었어
                </div>
                <div
                  style={{
                    display: "flex",
                    alignSelf: "flex-end",
                    marginTop: 12,
                    borderRadius: "18px 18px 5px 18px",
                    background: "#FFCD38",
                    padding: "13px 16px",
                    fontSize: 18,
                  }}
                >
                  나도, 다음에 또 보자!
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 25,
                  borderTop: "1px solid #E8DED5",
                  paddingTop: 22,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", fontSize: 19 }}>관심 신호</div>
                  <div style={{ display: "flex", color: "#FF647C", fontSize: 17 }}>상승 중 ↗</div>
                </div>
                <div style={{ display: "flex", marginTop: 14, gap: 8 }}>
                  {[20, 34, 47, 63, 78, 92].map((height, index) => (
                    <div
                      key={height}
                      style={{
                        width: 44,
                        height: 52,
                        display: "flex",
                        alignItems: "flex-end",
                        borderRadius: 9,
                        overflow: "hidden",
                        background: "#EAE1D8",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: `${height}%`,
                          display: "flex",
                          borderRadius: 9,
                          background:
                            index > 3
                              ? "linear-gradient(180deg, #FF647C, #FF8D70)"
                              : "linear-gradient(180deg, #FFCD38, #F3A80E)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Noto Sans KR", data: bold, weight: 800, style: "normal" }],
    },
  );
}
