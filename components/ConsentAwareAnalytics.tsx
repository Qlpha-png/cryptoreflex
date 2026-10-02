"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { getConsent, onConsentChange } from "@/lib/consent";

/**
 * Vercel Web Analytics (statistiques anonymes et agrégées, sans cookie) : actif par défaut,
 * coupé dès que le visiteur refuse la « Mesure d'audience » dans le bandeau ou sur /confidentialite.
 *
 * Audit 2026-10-02 : <Analytics /> était chargé sans condition, alors que le bandeau proposait de
 * refuser la mesure d'audience. Rien n'est rendu tant que le choix n'a pas été lu (premier rendu),
 * pour que le script ne s'injecte jamais avant la vérification.
 */
export default function ConsentAwareAnalytics() {
  const [state, setState] = useState<"unknown" | "ok" | "refused">("unknown");

  useEffect(() => {
    const read = () => setState(getConsent()?.state.analytics === false ? "refused" : "ok");
    read();
    return onConsentChange(() => read());
  }, []);

  return state === "ok" ? <Analytics /> : null;
}
