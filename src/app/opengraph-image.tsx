import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "KS Dashboard — Claude usage analytics";

// Branded social share card (og:image) generated at build time.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "#0d0d0d",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #3987e5, #9085e9)",
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            KS
          </div>
          <div style={{ fontSize: 34, color: "#c3c2b7" }}>KS Dashboard</div>
        </div>
        <div style={{ marginTop: 44, fontSize: 72, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>
          Claude usage analytics
        </div>
        <div style={{ marginTop: 20, fontSize: 30, color: "#898781" }}>
          Token, chi phí &amp; phiên làm việc — toàn công ty
        </div>
      </div>
    ),
    { ...size }
  );
}
