import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const runtime = "edge";
export const alt = "Quiz : trouve ton exchange crypto idéal en 60 sec";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 70,
          backgroundColor: "#05060A",
          backgroundImage:
            "radial-gradient(ellipse at 15% 10%, #1a1f3a 0%, transparent 60%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,.3) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #F5A524 0%, #FCD34D 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              color: "#05060A",
            }}
          >
            ₿
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            {BRAND.name}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 700,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(99,102,241,.15)",
              border: "1px solid rgba(99,102,241,.4)",
              color: "#A5B4FC",
              alignSelf: "flex-start",
            }}
          >
            QUIZ — 6 QUESTIONS, 60 SECONDES
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            Trouve ton exchange crypto
          </div>
          <div
            style={{
              fontSize: 32,
              color: "rgba(255,255,255,.75)",
              lineHeight: 1.3,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            Recommandation personnalisée selon ton profil — Coinbase, Binance, Bitpanda…
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "rgba(255,255,255,.6)",
          }}
        >
          <div style={{ display: "flex" }}>{BRAND.domain}/quiz</div>
          <div
            style={{
              display: "flex",
              gap: 18,
              alignItems: "center",
            }}
          >
            <span style={{ display: "flex" }}>Conforme MiCA</span>
            <span style={{ display: "flex", color: "#F5A524" }}>•</span>
            <span style={{ display: "flex" }}>0 inscription</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
