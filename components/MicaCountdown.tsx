import Link from "next/link";
import { ShieldAlert, CalendarClock, ArrowRight } from "lucide-react";

import {
  MICA_PHASE2_DATE,
  daysUntilMicaPhase2,
  isMicaPhase2Active,
} from "@/lib/legal-disclaimers";

/**
 * MicaCountdown — compte à rebours visuel jusqu'au 1er juillet 2026,
 * date d'entrée en application complète de MiCA Phase 2 (règlement crypto
 * européen 2023/1114, fin de la période transitoire de 18 mois ouverte
 * par l'art. 143 du règlement).
 *
 * Server Component pur — aucun state client. Le rendu est déterministe
 * pour une même heure (resolution = jour entier). On compte sur l'ISR
 * (`revalidate = 3600`) au niveau de la page hôte pour le rafraîchir
 * une fois par heure.
 *
 * Pourquoi sur la home + /comparatif :
 *  - Trust signal : les utilisateurs FR voient que la rédaction suit
 *    activement la régulation et ne diffuse pas d'info périmée.
 *  - SEO : booste le score E-E-A-T sur la requête "MiCA juillet 2026".
 *  - Defensive legal : un site qui affiche explicitement "MiCA dans X
 *    jours" et renvoie vers une checklist de migration peut difficilement
 *    être accusé par la DGCCRF de « pratique commerciale trompeuse par
 *    omission » sur les risques de la fenêtre transitoire.
 *
 * Variants :
 *  - "card"    (défaut) : encart pleine largeur avec CTA — pour la home.
 *  - "badge"   : pastille compacte pour bandeaux ou sidebars.
 *  - "inline"  : ligne de texte sobre pour le pied d'article.
 */

interface Props {
  /** Visuel : "card" (par défaut), "badge" ou "inline". */
  variant?: "card" | "badge" | "inline";
  /** Surcharge la date de référence — pour tests/SSR cohérent. */
  now?: Date;
  /** Classes Tailwind additionnelles. */
  className?: string;
  /** Lien cible pour le CTA (par défaut : article checklist). */
  href?: string;
}

const DEFAULT_HREF = "/blog/mica-juillet-2026-checklist-survie";

/**
 * Format date FR avec ordinal correct pour le 1er du mois.
 * `toLocaleDateString("fr-FR", { day: "numeric" })` rend "1" au lieu de "1er".
 * Ici on remet le "er" pour le jour 1 (regle typographique francaise).
 */
function formatDateWithOrdinal(date: Date): string {
  const day = date.getDate();
  const dayStr = day === 1 ? "1er" : String(day);
  const monthStr = date.toLocaleDateString("fr-FR", { month: "long" });
  const yearStr = date.getFullYear();
  return `${dayStr} ${monthStr} ${yearStr}`;
}

export default function MicaCountdown({
  variant = "card",
  now,
  className = "",
  href = DEFAULT_HREF,
}: Props) {
  const days = daysUntilMicaPhase2(now);
  const active = isMicaPhase2Active(now);

  // BATCH 60#3 (2026-05-04) — fix orthographe FR : toLocaleDateString rend
  // "1 juillet 2026" sans le "er" ordinal. Le reste du site dit partout
  // "1er juillet 2026" (forme correcte FR pour le 1er du mois). Resultat :
  // sur la home, le countdown disait "1 juillet 2026" et la card a cote
  // "1er juillet 2026" -> incoherent + faute typo visible.
  // Fix : formatage manuel avec gestion de l'ordinal "er" sur jour 1.
  const dateFr = formatDateWithOrdinal(MICA_PHASE2_DATE);

  /* ------------------------------------------------------------------ */
  /*  Variant "badge" — pastille compacte                                */
  /* ------------------------------------------------------------------ */
  if (variant === "badge") {
    if (active) {
      return (
        <span
          role="status"
          aria-label="MiCA Phase 2 est désormais en vigueur"
          className={`inline-flex items-center gap-1.5 rounded-full border border-accent-green/40 bg-accent-green/10 px-2.5 py-1 text-[11px] font-semibold text-accent-green ${className}`}
        >
          <ShieldAlert className="h-3 w-3" aria-hidden="true" />
          MiCA Phase 2 en vigueur
        </span>
      );
    }
    return (
      <Link
        href={href}
        aria-label={`MiCA Phase 2 dans ${days} jours — voir la checklist`}
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/15 ${className}`}
      >
        <CalendarClock className="h-3 w-3" aria-hidden="true" />
        MiCA Phase 2 — J-{days}
      </Link>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Variant "inline" — ligne sobre                                     */
  /* ------------------------------------------------------------------ */
  if (variant === "inline") {
    return (
      <p
        role="note"
        className={`text-xs text-muted leading-relaxed ${className}`}
      >
        <CalendarClock
          className="inline h-3.5 w-3.5 -mt-0.5 mr-1 text-amber-300"
          aria-hidden="true"
        />
        {active ? (
          <>
            MiCA Phase 2 est en vigueur depuis le <strong>{dateFr}</strong>.
          </>
        ) : (
          <>
            MiCA Phase 2 entre en application dans <strong>{days} jours</strong>{" "}
            ({dateFr}).{" "}
            <Link
              href={href}
              className="text-primary-soft hover:text-primary underline underline-offset-2"
            >
              Notre checklist de migration
            </Link>
            .
          </>
        )}
      </p>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Variant "card" — encart par défaut                                 */
  /* ------------------------------------------------------------------ */
  return (
    <aside
      role="note"
      aria-label="Compte à rebours MiCA Phase 2"
      className={`rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-4">
        <div className="flex items-center gap-3 sm:flex-1">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 shrink-0">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200/90">
              Échéance réglementaire UE
            </p>
            {active ? (
              <p className="mt-1 text-sm sm:text-base font-semibold text-fg leading-snug">
                MiCA Phase 2 est en vigueur depuis le {dateFr}.
              </p>
            ) : (
              <p className="mt-1 text-sm sm:text-base font-semibold text-fg leading-snug">
                MiCA Phase 2 dans <span className="text-amber-300">{days} jours</span>{" "}
                <span className="text-fg/70 font-normal">— le {dateFr}</span>
              </p>
            )}
            <p className="mt-1 text-xs text-fg/70 leading-relaxed">
              Toute plateforme crypto sans agrément CASP devra cesser ses
              activités en UE. Vérifie le statut MiCA de tes plateformes avant
              cette date.
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 hover:text-amber-100 transition-colors shrink-0"
        >
          Checklist de survie
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
