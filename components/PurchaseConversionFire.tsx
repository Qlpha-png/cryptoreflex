"use client";

/**
 * PurchaseConversionFire — composant client-only qui fire l'événement
 * `purchase` vers tous les pixels publicitaires (Reddit + X + Google Ads)
 * quand l'utilisateur arrive sur /pro/welcome avec un session_id Stripe
 * (= vrai retour paiement, pas un utilisateur qui revient bookmark).
 *
 * Pourquoi un composant dédié :
 *  - /pro/welcome est un Server Component (metadata, redirects).
 *  - On peut pas appeler trackAdsConversion() directement en SSR.
 *  - On rend ce ClientComponent uniquement quand session_id présent.
 *
 * Idempotence : on stocke `cr_purchase_fired_<sessionId>` en localStorage
 * pour éviter le double-fire si l'utilisateur recharge la page.
 *
 * Si le sessionId est absent (= page accédée sans paiement, ex: bookmark),
 * on ne fire rien.
 */

import { useEffect } from "react";
import { trackAdsConversion } from "@/lib/ads-conversion";

interface Props {
  sessionId?: string;
  /** Plan Stripe résolu serveur (pro_monthly, pro_annual, pro_plus_*). */
  tier?: string;
  /** Valeur monétaire pour ROAS (EUR). */
  value?: number;
}

export default function PurchaseConversionFire({ sessionId, tier, value }: Props) {
  useEffect(() => {
    if (!sessionId) return;

    // Idempotence : ne fire qu'une fois par session_id (anti-double-count si
    // l'utilisateur reload la page de remerciement).
    const storageKey = `cr_purchase_fired_${sessionId}`;
    try {
      if (window.localStorage.getItem(storageKey) === "1") return;
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // localStorage indispo (mode privé Safari) → on continue quand même
      // au risque de double-fire (acceptable pour Reddit/X qui dédupliquent
      // partiellement, et Google Ads ignore les doublons via le tag).
    }

    trackAdsConversion("purchase", {
      value: value ?? 0,
      currency: "EUR",
      tier,
    });
  }, [sessionId, tier, value]);

  return null;
}
