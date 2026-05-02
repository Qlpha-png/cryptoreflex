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

const SPECULATION_RULES = {
  prerender: [
    {
      // Pages les plus susceptibles d'être visitées depuis n'importe quelle
      // page (Hero CTA, Navbar links, Footer top-nav).
      urls: [
        "/",
        "/comparatif",
        "/avis",
        "/cryptos",
        "/outils",
        "/pro-plus",
      ],
      // immediate = prerender dès chargement de la page courante.
      // Coût acceptable car ces 6 URLs sont les hubs principaux.
      eagerness: "immediate",
    },
    {
      // Tous les liens internes : prerender APRÈS hover/focus 200ms (signal
      // d'intention). Évite de prerender quand l'utilisateur balaye les liens
      // de l'œil sans intention de cliquer.
      where: { href_matches: "/*" },
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
  return (
    <script
      type="speculationrules"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(SPECULATION_RULES) }}
    />
  );
}
