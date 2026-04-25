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
 * Variantes du script Plausible utilisées :
 *  - `script.outbound-links.js` : tracking automatique des liens externes,
 *    ce qui complète AffiliateLink pour mesurer les sorties non-affiliées.
 *  - `script.tagged-events.js`  : tracking des éléments avec `class="plausible-event-name=..."`.
 *  - `script.manual.js` partiel : on déclenche aussi des events custom via
 *    `window.plausible(...)` (cf. lib/analytics.ts).
 *
 * On combine les variantes en utilisant `script.outbound-links.tagged-events.js`.
 *
 * Le `data-domain` doit correspondre EXACTEMENT au domaine déclaré dans
 * Plausible (sans http://, sans trailing slash, en minuscules).
 */

interface Props {
  /** Domaine déclaré dans Plausible (ex: "cryptoreflex.fr"). */
  domain: string;
  /**
   * URL du script. Par défaut : Plausible Cloud (plausible.io).
   * Pour une instance self-hosted, passer `https://analytics.example.com/js/script.outbound-links.tagged-events.js`.
   */
  src?: string;
}

export default function PlausibleScript({
  domain,
  src = "https://plausible.io/js/script.outbound-links.tagged-events.js",
}: Props) {
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    // État initial après hydratation client.
    setAllowed(isCategoryAllowed("analytics"));
    // Mise à jour live si l'utilisateur change ses préférences.
    return onConsentChange(() => setAllowed(isCategoryAllowed("analytics")));
  }, []);

  if (!domain) return null;
  if (!allowed) return null;

  return (
    <>
      <Script
        defer
        data-domain={domain}
        src={src}
        strategy="afterInteractive"
      />
      {/*
        Stub pour la fonction `window.plausible(...)` :
        permet de fire des events AVANT que le script ne soit complètement chargé.
        Recommandé par la doc officielle Plausible (custom events).
      */}
      <Script id="plausible-init" strategy="afterInteractive">
        {`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
      </Script>
    </>
  );
}
