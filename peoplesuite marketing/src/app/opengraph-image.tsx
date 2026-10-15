import { ImageResponse } from "next/og";

export const alt = "PeopleSuite HRMS and TalentFlow ATS by Innovyx Tech Labs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "white",
          background: "linear-gradient(135deg, #141834 0%, #1E1AB8 60%, #4A6CFF 100%)",
        }}
      >
        <div style={{ fontSize: 30, opacity: 0.8 }}>Innovyx Tech Labs</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>People operations. Hiring.</div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: "#7DC8FF" }}>Engineered for how India works.</div>
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 30 }}>
          <div style={{ padding: "12px 28px", borderRadius: 999, background: "rgba(255,255,255,0.15)" }}>PeopleSuite · HRMS</div>
          <div style={{ padding: "12px 28px", borderRadius: 999, background: "rgba(255,255,255,0.15)" }}>TalentFlow · ATS</div>
        </div>
      </div>
    ),
    size,
  );
}
