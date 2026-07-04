import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Programmatic apple-touch icon: the gradient "KS" brand mark.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2a78d6, #4a3aa7)",
          color: "#ffffff",
          fontSize: 92,
          fontWeight: 700,
          letterSpacing: -3,
        }}
      >
        KS
      </div>
    ),
    { ...size }
  );
}
