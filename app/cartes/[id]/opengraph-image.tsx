import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { BRAND } from "@/lib/brand";
import { UNIVERS_ON, universById } from "@/lib/reflex-cards/univers";
import { REFLEX_META, cleanName, getCard, isReflexCardsEnabled, isVisible, seasonDay, todayChance } from "@/lib/reflex-cards/data";
import { applyReleases } from "@/lib/reflex-cards/releases";
import { PIPS, RNAME, odds, shade } from "@/lib/reflex-cards/render";
import { logoData } from "@/lib/reflex-cards/og";
import { EMB_SVG, abParts, artColor, cardArtSvg, loadCardFonts, loadGuilloche, mix, type ArtKind } from "@/lib/reflex-cards/og-card";

/**
 * Aperçu du lien d'une carte Reflex — /cartes/[id]/opengraph-image (WhatsApp, X, Facebook, Telegram, Discord…).
 * Kev 03/10 : « le partage, c'est la vitrine du projet ». À gauche, la carte elle-même, dessinée avec les fonctions et
 * les cotes des vraies cartes du site (lib/reflex-cards/og-card.ts), légèrement inclinée dans un halo ; à droite, le
 * nom, la rareté et l'invitation à jouer. Textes posés sur la grille de la vraie carte (240 × 336) agrandie ×1,25.
 * Rien ne fuite : ni la grande note (la carte entière se découvre en l'obtenant, décision Kev 02/10), ni rareté ou
 * numéro d'une carte pas encore sortie. Rien de variable dans le temps (chance du jour…) : l'image reste longtemps en cache.
 */
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Carte Reflex Cards — Cryptoreflex";

const S = 1.25; /* carte de 240 × 336 → 300 × 420 */
const STAR = "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z";
/* rayons de lumière derrière la carte (SVG : le moteur des images ne connaît pas les dégradés coniques) */
const RAYS = `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="620" height="630" viewBox="0 0 620 630"><g transform="translate(310 315)">${Array.from({ length: 24 }, (_, i) => `<polygon points="0,0 -26,-560 26,-560" fill="#ffecbe" fill-opacity="${i % 2 ? 0.05 : 0.025}" transform="rotate(${i * 15})"/>`).join("")}</g></svg>`).toString("base64")}`;

/* La police des images (Inter, jeu latin) n'a ni idéogrammes ni grec : le moteur les charge alors en ligne, ce qui peut
   échouer (cases « NO GLYPH » vues en local), et l'image reste longtemps en cache. D'où : nom latin entre parenthèses quand
   il existe (« 币安人生 (BinanceLife) » → « BinanceLife »), ticker masqué s'il n'est pas latin, flèche dessinée en SVG. */
const NON_LATIN = /[^\u0000-ÿıŒœ -⁯€™]/;
function latinName(s: string): string {
  if (!NON_LATIN.test(s)) return s;
  const m = /\(([^()]+)\)\s*$/.exec(s);
  return m && !NON_LATIN.test(m[1]) ? m[1].trim() : s;
}
const ARROW = (
  <svg width={26} height={26} viewBox="0 0 24 24" style={{ marginLeft: 12 }}>
    <path d="M4 12h15M13 5.5 19.5 12 13 18.5" stroke="#1a1205" strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const COND = "Barlow Condensed", MONO = "JetBrains Mono", BODY = "Space Grotesk";

export default async function OgImage({ params }: { params: { id: string } }) {
  const c = isReflexCardsEnabled() ? getCard(params.id) : undefined;
  if (!c) {
    /* carte de l'Univers (hors jeu d'origine) : image de partage par défaut du site, jamais un 404 sur l'aperçu du lien */
    if (isReflexCardsEnabled() && UNIVERS_ON() && universById(params.id)) {
      const r = await fetch(`${BRAND.url}/og-default.png`, { next: { revalidate: 86400 } });
      if (r.ok) return new Response(await r.arrayBuffer(), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
    }
    return new Response("Not found", { status: 404 });
  }
  await applyReleases();
  const day = seasonDay();
  const out = isVisible(c, day);
  const kind: ArtKind = !out ? "X" : c.fossil ? "F" : c.r;
  const rc = artColor(kind);
  const fossil = kind === "F", upcoming = kind === "X";
  const name = latinName(cleanName(c.name));
  const tick = NON_LATIN.test(c.sym) ? "" : c.sym.toUpperCase();
  const label = upcoming ? "CARTE À VENIR" : fossil ? "FOSSILE" : RNAME[c.r].toUpperCase();
  /* symboles de rareté dessinés (la police des images de partage n'a ni ◆ ni ★) */
  const pips = upcoming || fossil ? "" : PIPS[c.r];
  const ncards = REFLEX_META.ncards;
  const n3 = String(c.num).padStart(3, "0");

  /* rangée de chiffres de la vraie carte, sans la chance du jour (elle change) ; le fossile a une chance fixe */
  const f1c: [string, string] = c.score != null ? ["SCORE CR", String(c.score)] : c.year ? ["LANCÉ", String(c.year)] : ["N° ALBUM", n3];
  const cols: [string, string][] = upcoming
    ? [["RARETÉ", "?"], ["NUMÉRO", "?"], ["SORTIE", "BIENTÔT"]]
    : fossil
      ? [f1c, ["NOTORIÉTÉ", "—"], ["CHANCE", "1/" + odds(todayChance(c, day))]]
      : [f1c, ["NOTORIÉTÉ", `#${c.noto}`], ...(f1c[0] === "SCORE CR" && c.year ? [["LANCÉ", String(c.year)] as [string, string]] : f1c[0] !== "N° ALBUM" ? [["N° ALBUM", n3] as [string, string]] : [])];
  const ab = upcoming ? { b: "Bientôt", t: "Sa rareté, son numéro et sa date de sortie restent secrets jusqu'à sa sortie." } : abParts(c.ab);

  const [inter, cardFonts, logo, guil] = await Promise.all([loadOgFonts(), loadCardFonts(), logoData(c.img), kind === "L" ? loadGuilloche() : Promise.resolve("")]);
  const art = `data:image/svg+xml;base64,${Buffer.from(cardArtSvg({ c, kind, guil, cols: cols.length })).toString("base64")}`;
  /* nom de la carte : tailles mesurées par la maquette avec la vraie police ; repli Inter (plus large) : un cran plus petit */
  const nm = name === cleanName(c.name) ? c.nm : { size: name.length > 18 ? 15 : name.length > 12 ? 20 : 25, two: name.length > 18, html: name };
  const lines = nm.two ? nm.html.split("<br>") : [nm.html.replace(/<br>/g, " ")];
  const nmSize = nm.size * S * (cardFonts.length ? 1 : 0.82);
  const title = name.length > 26 ? 50 : name.length > 16 ? 62 : 78;
  const fg = fossil ? "#efe3cf" : "#eef1f7";

  const Pips = ({ color, s, glow }: { color: string; s: number; glow?: boolean }) => (
    <div style={{ display: "flex", alignItems: "center", gap: s * 0.3 }}>
      {[...pips].map((p, i) =>
        p === "★" ? (
          <svg key={i} width={s} height={s} viewBox="0 0 24 24" style={glow ? { filter: `drop-shadow(0 0 3px ${color})` } : undefined}>
            <path d={STAR} fill={color} />
          </svg>
        ) : (
          <div key={i} style={{ display: "flex", width: s * 0.58, height: s * 0.58, backgroundColor: color, transform: "rotate(45deg)", ...(glow ? { boxShadow: `0 0 4px ${color}` } : {}) }} />
        ),
      )}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#04060b",
          backgroundImage: `radial-gradient(circle at 24% 52%, ${shade(rc, -0.35)} 0%, #0b101c 42%, #04060b 78%)`,
          color: "white",
          border: "6px solid #c99a3b",
          position: "relative",
        }}
      >
        {/* rayons derrière la carte */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={RAYS} width={620} height={630} style={{ position: "absolute", left: 0, top: 0 }} alt="" />

        {/* la carte */}
        <div style={{ display: "flex", width: 560, height: 630, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", position: "relative", width: 300, height: 420, transform: "rotate(-4deg)", boxShadow: `0 0 80px ${shade(rc, -0.2)}` }}>
            {/* décor : cadre métal, motif, filigranes, médaillon, lauriers… (mêmes dessins que le site) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art} width={300} height={420} style={{ position: "absolute", left: 0, top: 0 }} alt="" />

            {/* languette de rareté (.rc-edtag) */}
            <div style={{ position: "absolute", top: 5, left: 0, width: 300, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  display: "flex",
                  padding: "4px 12px 4px 14px",
                  borderRadius: "0 0 9px 9px",
                  fontFamily: COND,
                  fontWeight: 800,
                  fontSize: 9.5 * S,
                  letterSpacing: "0.2em",
                  lineHeight: 1,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
                  ...(fossil
                    ? { backgroundColor: "#2a1f15", color: "#e6d3b3", border: "1px dashed rgba(230,211,179,0.5)", borderTop: "none" }
                    : { backgroundImage: `linear-gradient(90deg, ${mix(rc, "#0b0f17", 0.5)}, ${rc} 50%, ${mix(rc, "#0b0f17", 0.5)})`, color: "#0b0f17" }),
                }}
              >
                {label}
              </div>
            </div>

            {/* ticker à la place de la grande note (.rc-ovr), gemme de rareté (.rc-gem) */}
            {!upcoming && !fossil && tick && (
              <div style={{ position: "absolute", top: 22 * S, left: 16 * S, width: 50 * S, display: "flex", justifyContent: "center", fontFamily: COND, fontWeight: 800, fontSize: (tick.length > 8 ? 10 : tick.length > 6 ? 12 : tick.length > 4 ? 16 : 22) * S, color: rc, lineHeight: 1, whiteSpace: "nowrap", textShadow: `0 2px 0 rgba(0,0,0,0.45), 0 0 16px ${rc}` }}>
                {tick}
              </div>
            )}
            {!upcoming && !fossil && (
              <div style={{ position: "absolute", top: 18 * S, left: 200 * S, width: 24 * S, height: 24 * S, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 600, fontSize: 9 * S, color: "#0a0a0a" }}>{c.r}</div>
            )}

            {/* logo dans le disque du médaillon (.rc-lg, 64 px), teinte sépia du fossile, reflet du dôme (.rc-dome) */}
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={64 * S} height={64 * S} style={{ position: "absolute", left: 88 * S, top: 52 * S, borderRadius: 9999, objectFit: "contain", opacity: upcoming ? 0.85 : 1 }} alt="" />
            )}
            {logo && fossil && <div style={{ position: "absolute", left: 88 * S, top: 52 * S, width: 64 * S, height: 64 * S, borderRadius: 9999, backgroundColor: "rgba(150,98,40,0.38)" }} />}
            <div style={{ position: "absolute", left: 80 * S, top: 44 * S, width: 80 * S, height: 80 * S, borderRadius: 9999, backgroundImage: `radial-gradient(circle at 35% 25%, rgba(255,255,255,${fossil ? 0.5 : 0.3}) 0%, rgba(255,255,255,0) 60%)` }} />

            {/* logo illisible (WebP…) : ticker ou nom dans le disque */}
            {!logo && (
              <div style={{ position: "absolute", top: 44 * S, left: 80 * S, width: 80 * S, height: 80 * S, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: COND, fontWeight: 800, fontSize: (tick || name).length <= 4 ? 30 : (tick || name).length <= 6 ? 23 : (tick || name).length <= 9 ? 17 : 13, color: rc, lineHeight: 1.05 }}>
                {tick || name}
              </div>
            )}

            {/* tampon du fossile (.rc-stamp) */}
            {fossil && (
              <div style={{ position: "absolute", top: 96 * S, left: 0, width: 300, display: "flex", justifyContent: "center" }}>
                <div style={{ display: "flex", transform: "rotate(-10deg)", fontFamily: COND, fontWeight: 800, fontSize: 10 * S, letterSpacing: "0.16em", color: "#e0694f", border: "2px solid #e0694f", padding: "4px 8px", borderRadius: 4, backgroundColor: "rgba(30,18,10,0.82)" }}>HORS CIRCULATION</div>
              </div>
            )}

            {/* nom (.rc-nm) et sous-titre (.rc-sub) */}
            <div style={{ position: "absolute", top: 146 * S, left: 4 * S, width: 232 * S, height: 30 * S, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              {lines.map((l, i) => (
                <div key={i} style={{ display: "flex", fontFamily: COND, fontWeight: 800, fontSize: nmSize, lineHeight: 1, letterSpacing: "0.02em", color: kind === "L" ? "#fbe39a" : fg, textShadow: "0 2px 0 rgba(0,0,0,0.35)", whiteSpace: "nowrap" }}>
                  {l.toUpperCase()}
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", top: 176 * S, left: 4 * S, width: 232 * S, height: 14 * S, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: BODY, fontSize: (upcoming ? 9.5 : c.subSize) * S, color: fossil ? "#cbbba3" : "#9aa4b6", whiteSpace: "nowrap" }}>
              {upcoming ? "Sortie au fil de la saison 1" : `${c.sub}${c.year ? " · " + c.year : ""}`}
            </div>

            {/* chiffres (.rc-stats) */}
            <div style={{ position: "absolute", top: 197 * S, left: 16 * S, width: 208 * S, height: 44 * S, display: "flex" }}>
              {cols.map(([k, v]) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
                  <div style={{ display: "flex", fontFamily: MONO, fontWeight: 600, fontSize: 8 * S, letterSpacing: "0.14em", color: "#8e98ab" }}>{k}</div>
                  <div style={{ display: "flex", fontFamily: COND, fontWeight: 800, fontSize: 18 * S, lineHeight: 1.1, color: fg, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* « Le saviez-vous ? » (.rc-ab) : le même texte que la page publique de la carte */}
            {/* mot à mot dans un bloc qui passe à la ligne (le moteur ne mélange pas gras et normal dans un même texte) */}
            <div style={{ position: "absolute", top: 247 * S, left: 18 * S, width: 204 * S, height: 42 * S, display: "flex", flexWrap: "wrap", justifyContent: "center", alignContent: "flex-start", overflow: "hidden", fontFamily: BODY, fontSize: 9.4 * S, lineHeight: `${13 * S}px`, color: fossil ? "#e3d5bd" : "#cdd4df" }}>
              {[...ab.b.split(/\s+/).filter(Boolean).map((w) => [w, true] as const), ...ab.t.split(/\s+/).filter(Boolean).map((w) => [w, false] as const)].map(([w, b], i) => (
                <div key={i} style={{ display: "flex", marginRight: 3, ...(b ? { fontWeight: 700, color: fg } : {}) }}>{w}</div>
              ))}
            </div>

            {/* pied de carte (.rc-ft) : écusson de la série, numéro, symboles de rareté */}
            <div style={{ position: "absolute", top: 312 * S, left: 0, width: 300, display: "flex", justifyContent: "center", alignItems: "center", gap: 6, fontFamily: MONO, fontWeight: 600, fontSize: 7.5 * S, letterSpacing: "0.14em", color: fossil ? "#a8927a" : "#7d889c" }}>
              {!upcoming && !fossil && (
                <div style={{ display: "flex", position: "relative", width: 9 * S, height: 12.6 * S, alignItems: "center", justifyContent: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={EMB_SVG} width={9 * S} height={12.6 * S} style={{ position: "absolute", left: 0, top: 0 }} alt="" />
                  <div style={{ display: "flex", fontFamily: COND, fontWeight: 800, fontSize: 8, color: "#f2cf72", marginTop: -1 }}>R</div>
                </div>
              )}
              <div style={{ display: "flex" }}>{upcoming ? "S1 · RARETÉ SECRÈTE" : fossil ? "FOSSILE · S1" : `S1 · ${n3}/${ncards}`}</div>
              {pips && <Pips color={rc} s={10} glow />}
            </div>
          </div>
        </div>

        {/* texte */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, paddingRight: 70 }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: "0.2em", color: "#f3d68a" }}>REFLEX CARDS · SAISON 1</div>
          <div style={{ display: "flex", fontSize: title, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.01em" }}>{name}</div>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", padding: "9px 20px", borderRadius: 12, backgroundColor: rc, color: "#0b0f17", fontSize: 26, fontWeight: 800, letterSpacing: "0.12em", alignItems: "center", gap: 12 }}>
              {label}
              {pips && <Pips color="#0b0f17" s={22} />}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "rgba(255,255,255,0.86)", lineHeight: 1.3 }}>
            {upcoming ? "Elle arrive bientôt dans les boosters de la saison 1." : fossil ? "Au Musée des Fossiles de Reflex Cards : son histoire et la leçon à retenir." : `Une des ${ncards} cartes crypto à collectionner. Vous aussi, tentez votre chance !`}
          </div>
          <div style={{ display: "flex", marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 26px", borderRadius: 999, backgroundImage: "linear-gradient(180deg, #f8dd8f, #d9a43f)", color: "#1a1205", fontSize: 26, fontWeight: 800 }}>
              Ouvrez votre premier booster gratuit
              {ARROW}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 21, color: "rgba(255,255,255,0.55)" }}>cryptoreflex.fr/cartes · 100 % gratuit, sans achat</div>
        </div>
      </div>
    ),
    { ...size, fonts: [...inter, ...cardFonts] },
  );
}
