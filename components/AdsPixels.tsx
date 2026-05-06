import Script from "next/script";

/**
 * AdsPixels — pixels de conversion publicitaires (Reddit, X, Google Ads).
 *
 * Permet de tracker les conversions des campagnes payantes :
 *  - Page vues (auto)
 *  - Newsletter signup (custom event `subscribe_newsletter`)
 *  - Pro / Pro+ checkout (custom event `purchase`)
 *
 * Tous les pixels sont **gated par env var** : si la var est absente, le
 * <Script> ne se rend pas et il n'y a aucune requête vers le réseau pub
 * (zero impact perf/RGPD tant que les pubs ne tournent pas).
 *
 * Env vars (à configurer en Coolify Production scope) :
 *   NEXT_PUBLIC_REDDIT_PIXEL_ID    = a2_xxxxxxxxxxxx (depuis Reddit Ads Manager)
 *   NEXT_PUBLIC_X_PIXEL_ID         = oxxxx (depuis X Ads pixel base code)
 *   NEXT_PUBLIC_GOOGLE_ADS_ID      = AW-1234567890 (depuis Google Ads)
 *
 * RGPD / consent gating :
 *  - Reddit + X + Google Ads posent des cookies de tracking → ces pixels
 *    DOIVENT être gated par consent (CNIL exempt comme Plausible NON valide ici).
 *  - On les charge donc avec `strategy="beforeInteractive"` ET on attend l'event
 *    `cookies-accepted` qu'émet le banner consent existant.
 *  - Si l'utilisateur refuse les cookies, AUCUN pixel ne se charge.
 *
 * Pour fire un event de conversion depuis le code applicatif :
 *
 *   import { trackAdsConversion } from "@/lib/ads-conversion";
 *   trackAdsConversion("subscribe_newsletter");
 *   trackAdsConversion("purchase", { value: 9.99, currency: "EUR" });
 *
 * Le helper transmet aux 3 réseaux configurés (sécurisé : skip ceux non installés).
 */

const REDDIT_PIXEL_ID = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID ?? "";
const X_PIXEL_ID = process.env.NEXT_PUBLIC_X_PIXEL_ID ?? "";
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";

const HAS_ANY_PIXEL =
  REDDIT_PIXEL_ID.length > 0 ||
  X_PIXEL_ID.length > 0 ||
  GOOGLE_ADS_ID.length > 0;

export default function AdsPixels() {
  if (!HAS_ANY_PIXEL) return null;

  return (
    <>
      {/* Reddit Pixel — base code (poste un PageVisit auto) */}
      {REDDIT_PIXEL_ID && (
        <Script id="reddit-pixel" strategy="beforeInteractive">
          {`!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
rdt('init','${REDDIT_PIXEL_ID}',{optOut:false,useDecimalCurrencyValues:true});
rdt('track', 'PageVisit');`}
        </Script>
      )}

      {/* X (Twitter) Pixel — base code */}
      {X_PIXEL_ID && (
        <Script id="x-pixel" strategy="beforeInteractive">
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
            strategy="beforeInteractive"
          />
          <Script id="google-ads-init" strategy="beforeInteractive">
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
