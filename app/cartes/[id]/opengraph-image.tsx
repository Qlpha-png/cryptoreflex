import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { cleanName, getCard, isReflexCardsEnabled, isVisible, oddsText, seasonDay, todayChance } from "@/lib/reflex-cards/data";
import { IMG, PIPS, RC, RNAME, shade } from "@/lib/reflex-cards/render";

/**
 * Image de partage d'une carte Reflex — /cartes/[id]/opengraph-image.
 * Même composition que l'image « Partager » de la maquette (médaillon aux couleurs
 * de la rareté, logo, nom, rareté + symboles), au format 1200 × 630 des réseaux.
 */
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Carte Reflex Cards — Cryptoreflex";

/* logo CoinGecko en data URI : si le téléchargement échoue, l'image reste valide (symbole à la place) */
async function logoData(img: string): Promise<string | null> {
  try {
    const res = await fetch(IMG(img, "large"), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/png";
    if (!/^image\/(png|jpeg|jpg|gif|webp)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: { id: string } }) {
  const day = seasonDay();
  const c = isReflexCardsEnabled() ? getCard(params.id) : undefined;
  /* carte pas encore sortie : rien ne fuite, même pas son image de partage */
  if (!c || !isVisible(c, day)) return new Response("Not found", { status: 404 });
  const col = c.fossil ? "#a8927a" : RC[c.r];
  const name = cleanName(c.name);
  const label = c.fossil ? "FOSSILE" : RNAME[c.r].toUpperCase();
  /* symboles de rareté dessinés (la police des images de partage n'a ni ◆ ni ★) */
  const pips = c.fossil ? "" : PIPS[c.r];
  const STAR = "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z";
  const [fonts, logo] = await Promise.all([loadOgFonts(), logoData(c.img)]);
  const nameSize = name.length > 22 ? 58 : name.length > 14 ? 74 : 92;

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
              <img src={logo} width={220} height={220} style={{ borderRadius: 9999 }} alt="" />
            ) : (
              <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: col }}>{c.sym}</div>
            )}
          </div>
        </div>

        {/* texte */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: "0.18em", color: "#f3d68a" }}>
            REFLEX CARDS · SAISON 1
          </div>
          <div style={{ display: "flex", fontSize: nameSize, fontWeight: 800, lineHeight: 1.02, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
            {name}
          </div>
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
          <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.72)" }}>
            {c.fossil ? `Musée des Fossiles · ${c.fam}` : `${c.fam} · N° ${String(c.num).padStart(3, "0")} · ${oddsText(todayChance(c, day))}`}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.5)", marginTop: 18 }}>
            Jeu gratuit · cryptoreflex.fr/cartes
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
