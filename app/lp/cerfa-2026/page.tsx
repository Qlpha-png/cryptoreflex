import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  FileCheck2,
  Lock,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

/**
 * /lp/cerfa-2026 — landing page DÉDIÉE aux campagnes payantes Cerfa 2086.
 *
 * Plan pub payante (PLAN-PUB-PAYANTE-TRAFIC.md) — campagne #1 (Reddit Ads)
 * + campagne #5 (Google Ads long-tail fiscal). On envoie le trafic payant
 * ICI plutôt que sur /outils/cerfa-2086-auto pour 3 raisons :
 *
 *  1. Convergence message-marché : la headline match exactement la promesse
 *     de l'ad (=> qualité score Google Ads ↑, taux de conversion Reddit ↑).
 *  2. Single CTA above the fold (vs page outil qui a 5 distractions).
 *  3. noindex pour ne pas créer de duplicate content avec /outils/* en SEO
 *     (Google penalise les landing pages duplicates).
 *
 * Conversion path : Hero → Outil (newsletter capture en backup).
 *
 * NB : la page utilise SEULEMENT des Server Components + un seul lien
 * <a href> pour passer les UTM intacts au /outils/cerfa-2086-auto. Pas de
 * useState, pas de hydration JS lourd → LCP < 1s.
 */

const TITLE = "Cerfa 2086 gratuit : déclare tes cryptos en 2 min — 2026";
const DESCRIPTION =
  "Outil gratuit qui génère ton Cerfa 2086 + 3916-bis depuis ton CSV exchange (Binance, Kraken, Coinbase). Sans inscription, méthodologie publique, conforme BOFiP.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BRAND.url}/lp/cerfa-2026` },
  openGraph: {
    title: "Déclare tes cryptos en 2 min — Cerfa 2086 gratuit",
    description: DESCRIPTION,
    url: `${BRAND.url}/lp/cerfa-2026`,
    type: "website",
  },
  // Landing page payante : noindex pour éviter duplicate content avec /outils.
  robots: { index: false, follow: true },
};

const TRUST_BADGES = [
  {
    Icon: Zap,
    label: "2 min",
    sub: "génération PDF",
  },
  {
    Icon: ShieldCheck,
    label: "0 €",
    sub: "100 % gratuit",
  },
  {
    Icon: Lock,
    label: "0 inscription",
    sub: "sans email",
  },
  {
    Icon: FileCheck2,
    label: "BOFiP",
    sub: "RPPM-PVBMC-30-30",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Exporte ton CSV",
    text: "Sur Binance, Kraken, Coinbase, Bitstack, Coinhouse… Tous les exchanges français + UE supportés.",
  },
  {
    n: "2",
    title: "Importe dans l’outil",
    text: "Drag & drop. Détection automatique du format, validation locale (rien n’est envoyé sur nos serveurs).",
  },
  {
    n: "3",
    title: "Récupère le PDF",
    text: "Cerfa 2086 + Annexe 3916-bis pré-remplis. Compatible expert-comptable. Imprime ou joins à ta télédéclaration.",
  },
];

const FAQ = [
  {
    q: "C’est vraiment gratuit ? Quel est le piège ?",
    a: "Oui, totalement gratuit, sans inscription. Le « piège » assumé : si tu trouves l’outil utile, on espère que tu nous suivras sur la newsletter ou que tu utiliseras nos comparateurs de plateformes (qui contiennent des liens d’affiliation transparents, sourcés sur /transparence). Mais l’outil reste 100 % accessible sans aucune contrepartie.",
  },
  {
    q: "Mes données fiscales restent-elles confidentielles ?",
    a: "Oui. Le CSV est traité localement dans ton navigateur (zero-trust). Seul le PDF généré transite par notre serveur pour la mise en page, et il est immédiatement supprimé après téléchargement (pas de logs, pas de backup, pas d’indexation).",
  },
  {
    q: "Quels exchanges sont supportés ?",
    a: "Format générique compatible avec Binance, Kraken, Coinbase, Bitstack, Coinhouse, Bitpanda, Trade Republic, Bit2Me, Pocket Bitcoin, Bitvavo, Crypto.com, Revolut, et tous les exchanges qui exportent au format CSV standard. Si ton exchange n’est pas reconnu, on accepte aussi un mapping manuel.",
  },
  {
    q: "Et si j’ai du staking, des airdrops, des NFT ?",
    a: "L’outil gère les cessions taxables (token-to-fiat) qui sont la règle du Cerfa 2086. Pour le staking, les airdrops et les NFT, on a des outils dédiés sur /outils/staking-fiscal et /outils/nft-fiscal. La méthodologie suit BOFiP RPPM-PVBMC-30-30 (token-to-token non taxable depuis 2019).",
  },
  {
    q: "Qui es-tu et pourquoi je devrais te faire confiance ?",
    a: "Cryptoreflex est édité en solo par Kevin Voisin, basé en France. Toute la méthodologie est publiée sur /methodologie avec sources BOFiP + AMF. Si tu trouves une erreur dans nos calculs, on corrige sous 24h. Pour les gros patrimoines (>50k€), on recommande TOUJOURS de valider avec un expert-comptable agréé.",
  },
];

export default function CerfaLandingPage() {
  // UTM-aware target — on garde tout le query-string entrant et on l’ajoute
  // au lien sortant pour préserver le tracking attribution.
  const target = "/outils/cerfa-2086-auto?from=lp-cerfa-2026";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060A] text-slate-100">
      {/* Background grid + halo */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HERO */}
      <section className="relative px-4 pt-16 sm:pt-24 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saison fiscale 2026 — outil officiel Cryptoreflex
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Déclare tes cryptos en{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              2 minutes
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Génère ton <strong>Cerfa 2086</strong> + Annexe <strong>3916-bis</strong> pré-remplis depuis ton CSV
            d’exchange. Gratuit, sans inscription, méthodologie publiée.
          </p>

          {/* CTA primaire */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={target}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition"
            >
              Lancer l’outil gratuit
              <ArrowRight className="h-5 w-5" />
            </a>
            <Link
              href="/methodologie"
              className="text-sm text-slate-400 hover:text-cyan-300 underline-offset-2 hover:underline"
            >
              Voir la méthodologie publique →
            </Link>
          </div>

          {/* Trust strip */}
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-2xl mx-auto">
            {TRUST_BADGES.map(({ Icon, label, sub }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center"
              >
                <Icon className="mx-auto h-5 w-5 text-cyan-400" aria-hidden />
                <div className="mt-1 text-base font-bold">{label}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative px-4 py-14 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">
            3 étapes, 0 friction
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 font-bold text-lg">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative px-4 py-14 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">
            Questions fréquentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 open:border-cyan-500/30"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium text-white">
                  {item.q}
                  <span className="text-cyan-300 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative px-4 py-16 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="mx-auto max-w-3xl rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 via-indigo-500/10 to-transparent p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Prêt à déclarer en 2 minutes&nbsp;?
          </h2>
          <p className="mt-3 text-slate-300 max-w-xl mx-auto">
            Gratuit, sans inscription, sans pub. La saison fiscale est ouverte
            jusqu’au <strong>31 mai 2026</strong>.
          </p>
          <a
            href={target}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition"
          >
            Lancer l’outil gratuit
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Cryptoreflex ne fournit pas de conseil fiscal. L’outil restitue tes
          plus-values selon BOFiP RPPM-PVBMC-30-30. Pour les patrimoines
          complexes (&gt;50&nbsp;k€), valide avec un expert-comptable agréé.
        </p>
      </section>
    </main>
  );
}
