/**
 * <AdSlot /> — Slot publicitaire configurable Cryptoreflex.
 *
 * Plan E (audit business 2026-05-05) — display ads via Mediavine, AdThrive,
 * Ezoic ou Google AdSense activables seulement quand le trafic atteint le
 * seuil minimum requis par chaque régie (Mediavine 50k sessions/mois,
 * AdThrive 100k pageviews/mois, AdSense aucun seuil mais CPM faible).
 *
 * Pattern :
 *  - Le composant ne RENDU rien tant que NEXT_PUBLIC_ADS_ENABLED ≠ "true".
 *  - Pas d'import de scripts tiers tant que le flag est désactivé (pas
 *    d'impact LCP/CLS sur les pages quand les pubs sont éteintes).
 *  - Quand activé : un slot HTML semantique avec aria-label "publicité",
 *    masqué pour les abonnés Pro/Pro+ (cohérent avec promesse "site allégé"
 *    pour les abonnés payants).
 *  - Variant `inline` (entre 2 paragraphes) ou `sidebar` (colonne latérale)
 *    ou `footer` (au-dessus du footer) — chacun avec un slot ID distinct
 *    pour que la régie pub puisse cibler les emplacements.
 *
 * Env vars :
 *  NEXT_PUBLIC_ADS_ENABLED         = "true"  → active le rendu
 *  NEXT_PUBLIC_ADS_NETWORK         = "mediavine" | "adsense" | "ezoic"
 *  NEXT_PUBLIC_ADS_SLOT_INLINE     = ID du slot inline (ex: ca-pub-xxx/yyy)
 *  NEXT_PUBLIC_ADS_SLOT_SIDEBAR    = ID du slot sidebar
 *  NEXT_PUBLIC_ADS_SLOT_FOOTER     = ID du slot footer
 *
 * Activation production (mois 6+ quand seuil régie atteint) :
 *  1. Inscription régie (Mediavine recommandée FR : CPM 8-15 € vs AdSense 1-3 €).
 *  2. Récupérer les IDs de slots fournis par la régie.
 *  3. Coolify env vars (Production scope) :
 *       NEXT_PUBLIC_ADS_ENABLED=true
 *       NEXT_PUBLIC_ADS_NETWORK=mediavine
 *       NEXT_PUBLIC_ADS_SLOT_INLINE=...
 *       NEXT_PUBLIC_ADS_SLOT_SIDEBAR=...
 *       NEXT_PUBLIC_ADS_SLOT_FOOTER=...
 *  4. Redeploy. Les slots apparaissent automatiquement sur les pages où
 *     <AdSlot /> est intégré.
 *
 * Pourquoi ne pas activer dès le mois 0 :
 *  - AdSense sans seuil mais CPM trop faible (1-3 €) pour rentabiliser le
 *    coût d'opportunité (pubs = -10% conversion newsletter + Pro).
 *  - Mediavine / Ezoic / AdThrive demandent du volume avant de t'accepter.
 *  - Pour 5k visites/mois (mois 6 cible), AdSense rapporterait ~10-30 €/mois,
 *    largement battu par les affiliations Binance/Bitstack/Ledger.
 *
 * Anti-policy : pas de display ads sur les pages /outils (les outils restent
 * pristine pour la conversion). Activer uniquement sur :
 *  - /blog/[slug]
 *  - /cryptos/[id]
 *  - /vs/[a]/[b]
 *  - /comparatif/*
 */

"use client";

import { useEffect, useRef } from "react";
import { useUserPlan } from "@/lib/use-user-plan";

type AdVariant = "inline" | "sidebar" | "footer";

interface AdSlotProps {
  variant: AdVariant;
  /** Hauteur réservée pour éviter le CLS (Cumulative Layout Shift). */
  reservedHeightPx?: number;
  /** Classe utilitaire optionnelle (ex: "my-8 max-w-3xl"). */
  className?: string;
}

const ADS_ENABLED =
  (process.env.NEXT_PUBLIC_ADS_ENABLED ?? "").toLowerCase() === "true";
const ADS_NETWORK = process.env.NEXT_PUBLIC_ADS_NETWORK ?? "adsense";

function getSlotId(variant: AdVariant): string {
  switch (variant) {
    case "inline":
      return process.env.NEXT_PUBLIC_ADS_SLOT_INLINE ?? "";
    case "sidebar":
      return process.env.NEXT_PUBLIC_ADS_SLOT_SIDEBAR ?? "";
    case "footer":
      return process.env.NEXT_PUBLIC_ADS_SLOT_FOOTER ?? "";
  }
}

function defaultHeight(variant: AdVariant): number {
  switch (variant) {
    case "inline":
      return 250; // 970x250 ou 728x90 selon viewport
    case "sidebar":
      return 600; // 300x600 standard
    case "footer":
      return 90; // 728x90 leaderboard
  }
}

/**
 * AdSlot — composant client-only.
 *
 * Renvoie `null` si :
 *  - les pubs sont désactivées (env flag),
 *  - aucun slot ID configuré pour cette variante,
 *  - l'utilisateur est Pro / Pro+ (pas de pubs pour les payants).
 *
 * Sinon : rend un placeholder réservé en hauteur pour éviter le CLS, puis
 * pousse le slot dans la queue de la régie via une API spécifique au
 * réseau (adsbygoogle pour AdSense, mediavine_ad_unit pour Mediavine, etc.).
 */
export default function AdSlot({
  variant,
  reservedHeightPx,
  className,
}: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isPro, loading } = useUserPlan();

  const slotId = getSlotId(variant);
  const enabled = ADS_ENABLED && slotId.length > 0;
  const height = reservedHeightPx ?? defaultHeight(variant);

  useEffect(() => {
    if (!enabled) return;
    if (loading) return; // attendre le check Pro avant de pousser le slot
    if (isPro) return; // pas de pubs pour les abonnés Pro/Pro+
    if (!containerRef.current) return;

    // Push le slot vers la queue de la régie. Implémentation basique pour
    // AdSense ; adapter au réseau choisi.
    if (ADS_NETWORK === "adsense") {
      try {
        const w = window as unknown as { adsbygoogle?: unknown[] };
        w.adsbygoogle = w.adsbygoogle ?? [];
        w.adsbygoogle.push({});
      } catch {
        // ignore — les pubs sont best-effort, jamais bloquantes
      }
    }
    // Mediavine / Ezoic injectent leur tag globalement via _layout.tsx,
    // pas besoin de push manuel ici. Le simple rendu du slot suffit.
  }, [enabled, isPro, loading]);

  if (!enabled) return null;
  if (loading) return null; // évite un flash de pub avant le check Pro
  if (isPro) return null; // pas de pubs pour les abonnés payants

  // Slot inline (mode AdSense) — adapter selon ton réseau pub.
  if (ADS_NETWORK === "adsense") {
    const [pubId, slot] = slotId.split("/");
    return (
      <aside
        ref={containerRef}
        aria-label="Publicité"
        className={className}
        style={{ minHeight: height }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: height }}
          data-ad-client={pubId ?? ""}
          data-ad-slot={slot ?? ""}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  // Mediavine / Ezoic — div placeholder, le tag global remplit le contenu.
  return (
    <aside
      ref={containerRef}
      aria-label="Publicité"
      className={className}
      style={{ minHeight: height }}
      data-ad-slot={slotId}
      data-ad-variant={variant}
    />
  );
}
