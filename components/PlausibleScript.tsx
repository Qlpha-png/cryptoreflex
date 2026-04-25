"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { isCategoryAllowed, onConsentChange } from "@/lib/consent";

/**
 * PlausibleScript — chargement consent-aware de Plausible Analytics.
 *
 * Plausible est RGPD-friendly (pas de cookie, pas d'IP en clair, pas de
 * fingerprinting). Mais par souci de transparence et conformité CNIL stricte,
 * on conditionne quand même son chargement à l'acceptation de la catégorie
 * "Mesure d'audience" du bandeau cookies.
 *
 * 2 formats Plausible supportés :
 *  - **v2 / Engagement Goals** (recommandé 2024+) : URL de type
 *    `https://plausible.io/js/pa-XXXXXX.js` + `plausible.init()`.
 *    Active "Engagement Goals" et tracking automatique outbound + tagged-events.
 *  - **Legacy data-domain** : URL `script.outbound-links.tagged-events.js`
 *    + attribut `data-domain="..."`.
 *
 * Si `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL` est défini → format v2 utilisé.
 * Sinon : fallback legacy avec `domain` (env `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`).
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
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    // État initial après hydratation client.
    setAllowed(isCategoryAllowed("analytics"));
    // Mise à jour live si l'utilisateur change ses préférences.
    return onConsentChange(() => setAllowed(isCategoryAllowed("analytics")));
  }, []);

  if (!allowed) return null;

  // Mode v2 (Engagement Goals) — prioritaire si fourni.
  if (scriptUrl) {
    return (
      <>
        <Script
          async
          src={scriptUrl}
          strategy="afterInteractive"
        />
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
      <Script
        defer
        data-domain={domain}
        src={legacySrc}
        strategy="afterInteractive"
      />
      <Script id="plausible-init-legacy" strategy="afterInteractive">
        {`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
      </Script>
    </>
  );
}
