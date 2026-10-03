import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { cleanName, getCard, isReflexCardsEnabled, isVisible, seasonDay } from "@/lib/reflex-cards/data";
import { applyReleases } from "@/lib/reflex-cards/releases";
import { PIPS, RC, RNAME, shade } from "@/lib/reflex-cards/render";
import { logoData } from "@/lib/reflex-cards/og";

/**
 * Image de partage d'une carte Reflex — /cartes/[id]/opengraph-image.
 * Même composition que l'image « Partager » de la maquette (médaillon aux couleurs
 * de la rareté, logo, nom, rareté + symboles), au format 1200 × 630 des réseaux.
 * Carte pas encore sortie : visuel neutre doré « carte à venir », sans rareté ni numéro.
 * Rien de variable dans le temps (chance du jour…) : Next met cette image en cache un an.
 */
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Carte Reflex Cards — Cryptoreflex";

const GOLD = "#e9b949";
const STAR = "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z";

export default async function OgImage({ params }: { params: { id: string } }) {
  const c = isReflexCardsEnabled() ? getCard(params.id) : undefined;
  if (!c) return new Response("Not found", { status: 404 });
  await applyReleases();
  const out = isVisible(c, seasonDay());
  const col = !out ? GOLD : c.fossil ? "#a8927a" : RC[c.r];
  const name = cleanName(c.name);
  const label = !out ? "CARTE À VENIR" : c.fossil ? "FOSSILE" : RNAME[c.r].toUpperCase();
  /* symboles de rareté dessinés (la police des images de partage n'a ni ◆ ni ★) */
  const pips = !out || c.fossil ? "" : PIPS[c.r];
  const [fonts, logo] = await Promise.all([loadOgFonts(), logoData(c.img)]);
  const nameSize = name.length > 22 ? 58 : name.length > 14 ? 74 : 92;
  const line = !out ? "Sortie au fil de la saison 1 · rareté secrète" : c.fossil ? `Musée des Fossiles · ${c.fam}` : `${c.fam} · N° ${String(c.num).padStart(3, "0")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 80px",
          gap: 70,
          backgroundColor: "#04060b",
          backgroundImage: `radial-gradient(circle at 26% 50%, ${shade(col, -0.45)} 0%, #0b101c 45%, #04060b 80%)`,
          color: "white",
          border: "6px solid #c99a3b",
        }}
      >
        {/* médaillon */}
        <div
          style={{
            width: 380,
            height: 380,
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: `linear-gradient(135deg, ${shade(col, 0.45)} 0%, ${col} 50%, ${shade(col, -0.45)} 100%)`,
            boxShadow: `0 0 70px ${col}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 330,
              height: 330,
              borderRadius: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: "radial-gradient(circle at 36% 30%, #26324c 0%, #06080f 75%)",
            }}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={220} height={220} style={{ borderRadius: 9999, opacity: out ? 1 : 0.85 }} alt="" />
            ) : (
              <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: col }}>{c.sym}</div>
            )}
          </div>
        </div>

        {/* texte */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: "0.18em", color: "#f3d68a" }}>REFLEX CARDS · SAISON 1</div>
          <div style={{ display: "flex", fontSize: nameSize, fontWeight: 800, lineHeight: 1.02, textTransform: "uppercase", letterSpacing: "-0.01em" }}>{name}</div>
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 12,
                backgroundColor: col,
                color: "#0b0f17",
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "0.12em",
                alignItems: "center",
                gap: 14,
              }}
            >
              {label}
              {[...pips].map((p, i) =>
                p === "★" ? (
                  <svg key={i} width="26" height="26" viewBox="0 0 24 24">
                    <path d={STAR} fill="#0b0f17" />
                  </svg>
                ) : (
                  <div key={i} style={{ display: "flex", width: 16, height: 16, backgroundColor: "#0b0f17", transform: "rotate(45deg)" }} />
                ),
              )}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.72)" }}>{line}</div>
          <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.5)", marginTop: 18 }}>Jeu gratuit · cryptoreflex.fr/cartes</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
