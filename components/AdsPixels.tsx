"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  isCategoryAllowed,
  type StoredConsent,
} from "@/lib/consent";

/**
 * AdsPixels — pixels de conversion publicitaires (Reddit, X, Google Ads).
 *
 * Permet de tracker les conversions des campagnes payantes :
 *  - Page vues (auto)
 *  - Newsletter signup (custom event `subscribe_newsletter`)
 *  - Pro / Pro+ checkout (custom event `purchase`)
 *
 * Tous les pixels sont gated par 2 conditions cumulatives :
 *  1. Env var presente (NEXT_PUBLIC_REDDIT_PIXEL_ID, NEXT_PUBLIC_X_PIXEL_ID,
 *     NEXT_PUBLIC_GOOGLE_ADS_ID) — si absente, rien ne se charge.
 *  2. Consentement marketing accorde (CookieBanner → "Tout accepter" ou
 *     "Personnaliser → Marketing/affiliation"). Si l'utilisateur clique
 *     "Tout refuser" ou ignore le bandeau, AUCUN pixel ne se charge.
 *
 * Env vars (a configurer en Coolify Production scope) :
 *   NEXT_PUBLIC_REDDIT_PIXEL_ID    = a2_xxxxxxxxxxxx (depuis Reddit Ads Manager)
 *   NEXT_PUBLIC_X_PIXEL_ID         = oxxxx (depuis X Ads pixel base code)
 *   NEXT_PUBLIC_GOOGLE_ADS_ID      = AW-1234567890 (Google Ads, format AW-)
 *                                    PAS un GA4 measurement ID (G-XXXXXX) !
 *
 * RGPD / consent gating :
 *  - Reddit + X + Google Ads posent des cookies de tracking → pixels
 *    DOIVENT etre gated par consent (CNIL exempt comme Plausible NON valide).
 *  - On lit le consent au mount (useEffect) puis on ecoute `cr-consent-change`
 *    pour activer les pixels juste apres l'acceptation (sans reload).
 *  - SSR garanti : le composant retourne null cote serveur (pas d'hydration
 *    mismatch grace au pattern `mounted` flag).
 *
 * FIX 2026-05-07 — audit Lighthouse mobile (Reddit pixel + GA bloques par
 * CSP, console errors → BP score 73). Cause racine : ce composant chargeait
 * `<Script strategy="beforeInteractive">` SANS verifier le consent, faisant
 * fire les pixels avant meme que le bandeau ne s'affiche.
 *
 * Pour fire un event de conversion depuis le code applicatif :
 *
 *   import { trackAdsConversion } from "@/lib/ads-conversion";
 *   trackAdsConversion("subscribe_newsletter");
 *   trackAdsConversion("purchase", { value: 9.99, currency: "EUR" });
 *
 * Le helper transmet aux 3 reseaux configures. Si les pixels n'ont pas
 * ete charges (consent refuse), `window.rdt`/`twq`/`gtag` sont undefined
 * et le helper no-op silencieusement.
 */

const REDDIT_PIXEL_ID = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID ?? "";
const X_PIXEL_ID = process.env.NEXT_PUBLIC_X_PIXEL_ID ?? "";
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";

const HAS_ANY_PIXEL =
  REDDIT_PIXEL_ID.length > 0 ||
  X_PIXEL_ID.length > 0 ||
  GOOGLE_ADS_ID.length > 0;

export default function AdsPixels() {
  // Hooks AVANT tout return conditionnel (rules-of-hooks).
  const [marketingAllowed, setMarketingAllowed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMarketingAllowed(isCategoryAllowed("marketing"));

    // Active les pixels en live des que le user clique "Tout accepter"
    // ou enregistre ses prefs avec marketing=true. Pas besoin de reload.
    const onConsentChange = (e: Event) => {
      const stored = (e as CustomEvent<StoredConsent | null>).detail;
      const allowed = stored?.state.marketing === true;
      setMarketingAllowed(allowed);
    };
    window.addEventListener(CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_EVENT, onConsentChange);
  }, []);

  // Court-circuits : aucune env var → pas de pixels du tout. Avant hydration
  // → null pour eviter mismatch SSR. Apres hydration → render seulement si
  // consent marketing accorde.
  if (!HAS_ANY_PIXEL) return null;
  if (!mounted || !marketingAllowed) return null;

  return (
    <>
      {/* Reddit Pixel — base code (poste un PageVisit auto) */}
      {REDDIT_PIXEL_ID && (
        <Script id="reddit-pixel" strategy="afterInteractive">
          {`!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
rdt('init','${REDDIT_PIXEL_ID}',{optOut:false,useDecimalCurrencyValues:true});
rdt('track', 'PageVisit');`}
        </Script>
      )}

      {/* X (Twitter) Pixel — base code */}
      {X_PIXEL_ID && (
        <Script id="x-pixel" strategy="afterInteractive">
          {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments)},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${X_PIXEL_ID}');`}
        </Script>
      )}

      {/* Google Ads Tag — gtag.js */}
      {GOOGLE_ADS_ID && (
        <>
          <Script
            id="google-ads-tag"
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-ads-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
          </Script>
        </>
      )}
    </>
  );
}
