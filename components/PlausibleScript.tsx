import Script from "next/script";

/**
 * PlausibleScript — chargement Server-side (sans consent gating).
 *
 * Pourquoi PAS de gating consent sur Plausible ?
 *
 * Plausible Analytics est explicitement reconnu par la CNIL FR (2022) comme
 * relevant de l'exemption de l'article 82 de la loi Informatique et Libertés
 * lorsque sa configuration respecte ces critères :
 *  - Aucun cookie côté visiteur (vérifié : Plausible n'en pose aucun)
 *  - Aucune adresse IP en clair (Plausible hash et drop l'IP en mémoire)
 *  - Aucun fingerprinting cross-site (pas de device-id persistant)
 *  - Données agrégées, pas de profil individuel
 *  - Pas de transmission à des tiers (auto-hébergé en UE par Plausible BV)
 *
 * → Plausible peut être chargé sans bandeau cookie en France.
 *
 * Référence CNIL : "Mesure d'audience exemptées de consentement" (sept 2022).
 * https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience
 *
 * Pour les analytics qui NÉCESSITENT consent (Microsoft Clarity, Hotjar, GA),
 * voir <ClarityScript /> qui est gated correctement.
 *
 * Avantage technique du non-gating : le snippet est rendu en SSR, ce qui
 * permet au bot Plausible de vérifier l'installation + à Google de connaître
 * le tracker (utile pour les analytics standards des Search Tools).
 *
 * 2 formats Plausible supportés :
 *  - **v2 / Engagement Goals** (recommandé 2024+) : URL `pa-XXXX.js`.
 *  - **Legacy data-domain** : URL `script.outbound-links.tagged-events.js`.
 */

interface Props {
  /** Domaine déclaré dans Plausible (legacy, ex: "cryptoreflex.fr"). */
  domain?: string;
  /**
   * URL complète du script Plausible v2 (ex:
   * "https://plausible.io/js/pa-LRfevfPE8Z2yHav-Yu9-6.js"). Si fourni, prend
   * priorité sur `domain` (mode v2 / Engagement Goals).
   */
  scriptUrl?: string;
  /**
   * Override de l'URL du script legacy. Par défaut : Plausible Cloud.
   * Pour une instance self-hosted, passer
   * `https://analytics.example.com/js/script.outbound-links.tagged-events.js`.
   */
  legacySrc?: string;
}

export default function PlausibleScript({
  domain,
  scriptUrl,
  legacySrc = "https://plausible.io/js/script.outbound-links.tagged-events.js",
}: Props) {
  // Mode v2 (Engagement Goals) — prioritaire si fourni.
  if (scriptUrl) {
    return (
      <>
        <Script async src={scriptUrl} strategy="afterInteractive" />
        <Script id="plausible-init-v2" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
        </Script>
      </>
    );
  }

  // Mode legacy data-domain.
  if (!domain) return null;
  return (
    <>
      <Script defer data-domain={domain} src={legacySrc} strategy="afterInteractive" />
      <Script id="plausible-init-legacy" strategy="afterInteractive">
        {`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
      </Script>
    </>
  );
}
