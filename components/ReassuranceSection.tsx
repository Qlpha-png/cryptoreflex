import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  Calendar,
  Award,
  Sparkles,
  Building2,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ReassuranceItem {
  Icon: LucideIcon;
  value: string;
  label: string;
  hint?: string;
}

/**
 * Métriques affichées en bandeau de réassurance.
 *
 * Audit crédibilité 26/04/2026 :
 *  - L'ancienne carte "10 000+ visiteurs/mois" a été supprimée (mensonge :
 *    site lancé le 15/04/2026, audience réelle 0-50 visiteurs/jour).
 *  - "14 marques fiables sélectionnées" (chiffre réel) :
 *    11 exchanges/brokers (data/platforms.json) + 2 hardware wallets
 *    (data/wallets.json : Ledger + Trezor) + 1 SaaS fiscalité (Waltio).
 *  - On garde la 4e carte "Lancement avril 2026" pour transformer la jeunesse
 *    en gage de transparence (+ lien vers /impact pour le dashboard public).
 *  - Toute future remontée d'un chiffre doit s'appuyer sur une donnée
 *    auditable (Plausible public, Beehiiv public, etc.).
 */
const ITEMS: ReassuranceItem[] = [
  {
    Icon: Award,
    value: "14",
    label: "Marques fiables sélectionnées",
    // Fix audit cohérence 30/04/2026 — "toutes MiCA / régulées" était faux :
    // hardware wallets (Ledger, Trezor) ne sont PAS sous MiCA (matériel,
    // pas service), Waltio est SaaS de fiscalité (pas PSAN). Reformulé.
    hint: "Exchanges régulés MiCA + wallets matériels + fiscalité SaaS",
  },
  {
    Icon: Eye,
    value: "100 %",
    label: "Méthodologie publique",
    hint: "Le scoring est ouvert et auditable",
  },
  {
    Icon: Calendar,
    value: "Cible mensuelle",
    label: "Mise à jour des comparatifs",
    // Fix audit cohérence 30/04/2026 — "Statut MiCA suivi en temps réel" est
    // une promesse trop forte (vérification manuelle solo, pas du temps réel).
    hint: "Vérification manuelle des fiches, statut MiCA tracké via AMF/ESMA",
  },
  {
    Icon: Sparkles,
    value: "Avril 2026",
    label: "Site lancé en transparence",
    hint: "Audience en construction — dashboard public sur /impact",
  },
];

interface RegulatorBadge {
  short: string;
  full: string;
  detail: string;
}

const REGULATORS: RegulatorBadge[] = [
  {
    short: "AMF",
    full: "Autorité des Marchés Financiers",
    detail: "Plateformes vérifiées dans le registre PSAN",
  },
  {
    short: "ESMA",
    full: "European Securities and Markets Authority",
    detail: "Recommandations européennes appliquées",
  },
  {
    short: "MiCA",
    full: "Markets in Crypto-Assets Regulation",
    detail: "Conformité au règlement européen 2023/1114",
  },
  {
    short: "TRACFIN",
    full: "Traitement du renseignement et action contre les circuits financiers clandestins",
    detail: "KYC/LCB-FT documentés pour chaque plateforme",
  },
];

/**
 * Sources publiques effectivement citées dans nos comparatifs/articles.
 * Remplace l'ancien bloc "Vu dans (bientôt)" (Les Échos / BFM / Cointribune
 * / JDC) — supprimé le 26/04/2026 car aucune mention presse réelle à ce jour
 * (loi influenceurs n°2023-451 + loyauté CNIL/AMF).
 *
 * Liste à compléter en restant strict : seulement les sources qu'on cite
 * vraiment dans le contenu (jamais d'autorité prêtée).
 */
interface CitedSource {
  short: string;
  full: string;
}

const CITED_SOURCES: CitedSource[] = [
  { short: "ESMA", full: "Autorité européenne des marchés financiers" },
  { short: "AMF", full: "Registre PSAN, communications officielles" },
  { short: "BOFiP", full: "Doctrine fiscale française" },
  { short: "CoinGecko", full: "Données de marché (prix, capitalisations)" },
  { short: "Trustpilot", full: "Avis utilisateurs publics agrégés" },
];

/**
 * Bandeau "pourquoi nous croire" — réassurance critique pour un débutant
 * crypto FR méfiant.
 *
 * Refonte 26/04/2026 (audit crédibilité P0) :
 *  - Métriques honnêtes seulement (chiffres vérifiables dans le repo)
 *  - Logos régulateurs (AMF, ESMA, MiCA, TRACFIN)
 *  - "Sources que nous citons" remplace "Vu dans (bientôt)"
 */
export default function ReassuranceSection() {
  return (
    <section
      aria-label="Pourquoi nous faire confiance"
      className="border-y border-border bg-surface/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
        {/* Métriques principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden">
          {ITEMS.map(({ Icon, value, label, hint }) => (
            <div
              key={label}
              className="bg-surface px-5 py-6 flex flex-col items-start gap-2"
            >
              <Icon className="h-7 w-7 text-primary" strokeWidth={1.75} />
              <div className="font-mono text-2xl font-bold text-fg mt-2">
                {value}
              </div>
              <div className="text-sm font-semibold text-fg">{label}</div>
              {hint && (
                <div className="text-xs text-muted leading-snug">{hint}</div>
              )}
            </div>
          ))}
        </div>

        {/* Logos régulateurs — remplace une vraie image SVG plus tard */}
        <div className="mt-10">
          <div className="flex items-center justify-center gap-2 mb-5">
            <Building2 className="h-4 w-4 text-muted" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Cadre réglementaire respecté
            </p>
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-3">
            {REGULATORS.map(({ short, full, detail }) => (
              <li key={short}>
                <span
                  title={`${full} — ${detail}`}
                  className="inline-flex flex-col items-center gap-0.5 rounded-xl border border-border
                             bg-background px-4 py-3 min-w-[110px]"
                >
                  <span className="font-mono font-bold text-fg text-sm tracking-wide">
                    {short}
                  </span>
                  <span className="text-[10px] text-muted leading-tight text-center max-w-[120px]">
                    {detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* "Sources que nous citons" — remplace l'ancien "Vu dans (bientôt)"
            qui prêtait des mentions presse non vérifiées (Les Échos, BFM,
            Cointribune, JDC). Voir audit crédibilité 26/04/2026. */}
        <div className="mt-10 pt-8 border-t border-border">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-muted" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Sources que nous citons
            </p>
          </div>
          <ul
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
            aria-label="Sources fact-checkées utilisées par Cryptoreflex"
          >
            {CITED_SOURCES.map(({ short, full }) => (
              <li
                key={short}
                title={full}
                className="font-display text-base sm:text-lg font-semibold text-fg/80"
              >
                {short}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-[11px] text-muted/70">
            Sources vérifiées à chaque mise à jour — aucune mention presse
            n&apos;est revendiquée tant qu&apos;elle n&apos;est pas réelle.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          <ShieldCheck className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-primary-soft" />
          Cryptoreflex applique la même méthodologie qu'un comparateur indépendant type UFC-Que
          Choisir, adaptée au marché crypto français post-MiCA.{" "}
          <Link href="/methodologie" className="text-primary-soft hover:underline">
            Lire la méthodologie complète
          </Link>
        </p>
      </div>
    </section>
  );
}
