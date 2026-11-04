import { ImageResponse } from "next/og";

export const alt = "MangaAI — manga books made for kids";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share image for the site (WhatsApp, social, messaging previews). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#eef2fb",
          backgroundImage: "radial-gradient(#c9d2ea 2px, transparent 2px)",
          backgroundSize: "18px 18px",
          color: "#1c1f4a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 18,
              border: "6px solid #1c1f4a",
              background: "#ffc83d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 48, fontWeight: 800 }}>MangaAI</div>
        </div>
        <div
          style={{
            display: "flex",
            background: "#ffffff",
            border: "6px solid #1c1f4a",
            borderRadius: 48,
            padding: "40px 48px",
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 980,
          }}
        >
          Manga books made for kids. No ads, no chat.
        </div>
        <div style={{ fontSize: 30 }}>Age-right stories · No ads · No chat · Parents stay in charge</div>
      </div>
    ),
    size,
  );
}
