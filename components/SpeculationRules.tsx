/**
 * SpeculationRules — Native Chrome/Edge prerender hints (innovation 2026).
 *
 * Doc : https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API
 *
 * Comment ça marche :
 *  - Le navigateur Chrome 121+ / Edge 121+ lit les règles JSON injectées via
 *    <script type="speculationrules"> et PRÉ-RENDRA des pages cibles dans
 *    une vue cachée AVANT que l'utilisateur ne clique.
 *  - Quand l'utilisateur clique sur le lien, le pre-render est instantanément
 *    promu en navigation visible — TTFB ~0ms, LCP ~0ms perçu.
 *  - Cela transforme l'expérience en "native app feel" sans framework lourd.
 *
 * Stratégie :
 *  - eagerness: "moderate" → prerender quand l'utilisateur survole le lien
 *    pendant 200ms (signal d'intention fort). Évite de prerender tous les
 *    liens visibles (coût CPU/RAM).
 *  - Whitelist d'URLs internes uniquement (jamais d'externes pour éviter
 *    pollution analytics + sécurité).
 *  - Combiné avec View Transitions API (déjà actif via @view-transition
 *    navigation: auto dans globals.css) pour un morph cross-document
 *    quand on clique.
 *
 * Sécurité :
 *  - Speculation Rules ne charge JAMAIS de pages cross-origin.
 *  - Les pages prerendered exécutent leur JS dans un contexte caché ; les
 *    side-effects (analytics, tracking) sont différés au moment de la
 *    promotion (cf. Document.prerendering API).
 *
 * Coût :
 *  - 0 KB JS. Le navigateur parse le JSON inline.
 *  - Fallback gracieux : Safari/Firefox ignorent silencieusement.
 *
 * Server Component pur — pas d'hydration.
 */

/**
 * MAJ BATCH 19 (audit perf P0 #2 + Axe 3 user "Fais tout") :
 * - Suppression de "eagerness: immediate" sur 6 hubs (provoquait 6
 *   navigations préchargées en parallèle pendant le LCP du visiteur =
 *   vol de bandwidth/CPU mobile).
 * - TOUTES les règles sont maintenant en "moderate" (hover 200ms) ou
 *   "conservative" (hover/focus immédiat, prefetch HTTP only).
 * - Bonus combo killer : ajout explicite de /avis/* et /cryptos/* en
 *   moderate pour activer le morph view-transition sur les logos
 *   plateformes/crypto cross-document (BATCH 14 + 16).
 */
const SPECULATION_RULES = {
  prerender: [
    {
      // Hubs principaux (Hero CTA, Navbar, Footer) : prerender intent-based
      // au hover 200ms. Plus économe que immediate.
      urls: [
        "/",
        "/comparatif",
        "/avis",
        "/cryptos",
        "/outils",
        "/pro-plus",
      ],
      eagerness: "moderate",
    },
    {
      // Toutes les fiches /avis/{platform} et /cryptos/{slug} : intent-based.
      // Combiné avec view-transition-name sur les logos (BATCH 14 + 16),
      // produit le morph cross-document Linear-tier au click.
      // BATCH 20 — exclusions élargies : pages auth/account/checkout/portefeuille
      // sont privées + sensibles, prerender = pollution analytics + bandwidth
      // gâché. /labs est noindex (page interne dev). /portefeuille = privé.
      where: {
        and: [
          { href_matches: "/*" },
          { not: { href_matches: "/api/*" } },
          { not: { href_matches: "/admin/*" } },
          { not: { href_matches: "/account/*" } },
          { not: { href_matches: "/mon-compte/*" } },
          { not: { href_matches: "/portefeuille/*" } },
          { not: { href_matches: "/checkout/*" } },
          { not: { href_matches: "/connexion" } },
          { not: { href_matches: "/inscription" } },
          { not: { href_matches: "/labs" } },
        ],
      },
      eagerness: "moderate",
    },
  ],
  prefetch: [
    {
      // Prefetch (HTTP cache uniquement, pas de prerender) sur tous les
      // liens internes au survol/focus immédiat. Encore moins coûteux.
      where: { href_matches: "/*" },
      eagerness: "conservative",
    },
  ],
};

export default function SpeculationRules() {
  // BATCH 20 — escape `<` dans le JSON inline pour prévenir une éventuelle
  // injection via un futur dynamic content (defense-in-depth, aujourd'hui
  // SPECULATION_RULES est statique donc pas de risque réel).
  const safeJson = JSON.stringify(SPECULATION_RULES).replace(
    /</g,
    "\\u003c",
  );
  return (
    <script
      type="speculationrules"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}
