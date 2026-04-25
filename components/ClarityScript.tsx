"use client";

import { useEffect, useState } from "react";
import { isCategoryAllowed, onConsentChange } from "@/lib/consent";

/**
 * ClarityScript — chargement consent-aware de Microsoft Clarity.
 *
 * Microsoft Clarity = heatmaps + session recording + click maps, 100% gratuit
 * (illimité, sans cap mensuel) — https://clarity.microsoft.com/
 *
 * Pourquoi pas Hotjar / FullStory ?
 *  - Free tier Hotjar = 35 sessions/jour seulement (insuffisant pour mesurer
 *    réellement un funnel à 480 pages).
 *  - FullStory pas de free tier sérieux.
 *  - Clarity est totalement gratuit (modèle = Microsoft Ads), supporté par
 *    une vraie équipe Microsoft, et conforme RGPD (config centre de données EU).
 *
 * RGPD :
 *  - Clarity pose des cookies (1ère partie) → catégorie "analytics" du bandeau.
 *  - On ne charge le script QUE si l'utilisateur a accepté analytics
 *    (via `lib/consent.ts` → `isCategoryAllowed("analytics")`).
 *  - Si refusé : aucun cookie, aucune session enregistrée. RGPD OK.
 *  - Recommandation : activer "Mask sensitive content" dans le dashboard
 *    Clarity (Settings → Project → Masking) pour exclure les inputs (email
 *    newsletter, formulaires alertes, etc.) — défaut déjà raisonnable mais
 *    à vérifier.
 *
 * Activation prod :
 *  1. Créer un compte gratuit sur https://clarity.microsoft.com (login Microsoft).
 *  2. Créer un projet "Cryptoreflex" → noter le Project ID (ex: "abc123xyz").
 *  3. Vercel → Project Settings → Environment Variables :
 *       NEXT_PUBLIC_CLARITY_PROJECT_ID = abc123xyz
 *     (En "Production" + "Preview" si on veut tracker les previews aussi.)
 *  4. Redéployer. Le script ne se charge que si la var est définie ET que
 *     l'utilisateur a accepté la catégorie "analytics" du bandeau cookies.
 *  5. Vérifier dans le dashboard Clarity (5-10 min de délai pour la 1ère session).
 *
 * Le snippet ci-dessous est la version officielle Microsoft (fetch async,
 * pas de blocking, MutationObserver pour replay).
 */

interface Props {
  /** Project ID Microsoft Clarity (ex: "abc123xyz"). Si vide, no-op total. */
  projectId?: string;
}

export default function ClarityScript({ projectId }: Props) {
  const [allowed, setAllowed] = useState<boolean>(false);
  const [injected, setInjected] = useState<boolean>(false);

  useEffect(() => {
    // État initial après hydratation client.
    setAllowed(isCategoryAllowed("analytics"));
    // Mise à jour live si l'utilisateur change ses préférences.
    return onConsentChange(() => setAllowed(isCategoryAllowed("analytics")));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    if (!allowed) return;
    if (injected) return; // idempotent — on n'injecte qu'une fois par mount.

    // Snippet officiel Microsoft Clarity (https://clarity.microsoft.com/).
    // On l'inline plutôt que d'utiliser <Script> de Next pour 2 raisons :
    //   1. Le snippet officiel est déjà conçu pour être chargé dynamiquement
    //      après consent (pas de SSR, pas de strategy à choisir).
    //   2. On veut UN SEUL appel à clarity("consent") après injection, ce
    //      qui est plus simple à orchestrer en JS pur qu'avec onLoad de Script.
    try {
      const w = window as unknown as {
        clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
      };
      // Stub initial : empile les appels en attendant le chargement réel.
      const queue: unknown[][] = [];
      const stub = (...args: unknown[]) => queue.push(args);
      stub.q = queue;
      w.clarity = w.clarity ?? (stub as unknown as typeof w.clarity);

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
      // Identifier le tag Clarity dans le DOM (utile pour debug/QA).
      script.setAttribute("data-cr-script", "clarity");
      document.head.appendChild(script);

      // Signal explicite à Clarity que l'utilisateur a consenti — Clarity peut
      // alors poser ses cookies non-strictement-nécessaires (sinon il fonctionne
      // en mode "no-cookie", qui est aussi acceptable RGPD).
      // Cf. https://learn.microsoft.com/clarity/setup-and-installation/cookie-consent
      try {
        w.clarity?.("consent");
      } catch {
        /* ignore — sera retenté par le stub queue */
      }

      setInjected(true);
    } catch (err) {
      // Fail-silent : analytics n'altère jamais l'UX.
      console.warn("[clarity] injection failed:", err);
    }
  }, [allowed, projectId, injected]);

  // Composant invisible : tout passe par les useEffect ci-dessus.
  return null;
}
