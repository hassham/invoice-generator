import { ImageResponse } from "next/og";

/**
 * IG-331: default social-share image for the site. Neutral placeholder artwork until the brand
 * identity (IG-326) is chosen; replace the markup here, not the route, when it is.
 */
export const alt = "Invoice App - fast, professional invoicing for small businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "80px",
          background: "#0f172a",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, color: "#94a3b8", marginBottom: 24 }}>Invoice App</div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
          Fast, professional invoicing for small businesses
        </div>
      </div>
    ),
    { ...size },
  );
}
