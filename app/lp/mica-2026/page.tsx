import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import NewsletterInline from "@/components/NewsletterInline";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /lp/mica-2026 — landing DÉDIÉE aux campagnes payantes "MiCA juillet 2026".
 *
 * Plan pub payante (PLAN-PUB-PAYANTE-TRAFIC.md) — campagne #2 (Reddit Ads
 * juin) + campagne #6 (Google Ads long-tail comparateur). Cette page cible
 * spécifiquement les utilisateurs anxieux de la deadline MiCA juillet 2026
 * (peur de voir leur exchange disparaître/bloqué).
 *
 * Conversion path : Hero → Comparatif sécurité (avec UTM tracking).
 * noindex : éviter duplicate content avec /comparatif/securite.
 */

const TITLE = "MiCA juillet 2026 : 12 plateformes crypto qui vont disparaître";
const DESCRIPTION =
  "Liste à jour des 33 plateformes crypto disponibles en France classées par conformité MiCA + AMF. Quelles vont être bloquées en juillet 2026 ? Quelles plateformes sécurisées choisir ?";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}/lp/mica-2026`),
  openGraph: {
    title: "MiCA juillet 2026 — quelle plateforme crypto choisir avant la deadline",
    description: DESCRIPTION,
    url: `${BRAND.url}/lp/mica-2026`,
    type: "website",
  },
  robots: { index: false, follow: true },
};

const STATS = [
  {
    Icon: ShieldCheck,
    value: "22",
    label: "plateformes MiCA-compliant",
    color: "text-emerald-400",
  },
  {
    Icon: AlertTriangle,
    value: "12",
    label: "plateformes à risque juillet 2026",
    color: "text-amber-400",
  },
  {
    Icon: Calendar,
    value: "30 juin",
    label: "fin transition MiCA UE",
    color: "text-cyan-400",
  },
];

const COMPLIANT = [
  { name: "Coinbase", note: "Agrément CASP Irlande passporté UE" },
  { name: "Bitpanda", note: "Agrément CASP Autriche, accepte FR" },
  { name: "Kraken", note: "Agrément CASP Irlande passporté FR" },
  { name: "Binance France", note: "PSAN AMF E2022-037 + CASP en cours" },
  { name: "OKX", note: "Agrément CASP Malte" },
  { name: "Bitstack", note: "PSAN FR + CASP en cours" },
];

const AT_RISK = [
  { name: "MEXC", note: "Pas d’agrément CASP UE annoncé" },
  { name: "KuCoin", note: "Bloqué en Italie depuis 2024, FR à risque" },
  { name: "ByBit", note: "Pas de roadmap CASP UE confirmée" },
  { name: "Crypto.com", note: "CASP partiel — vérifier avant le 30 juin" },
];

const FAQ = [
  {
    q: "Que se passe-t-il concrètement le 1er juillet 2026 ?",
    a: "La période transitoire MiCA prend fin. Toute plateforme qui n’a pas obtenu son agrément CASP (Crypto-Asset Service Provider) auprès d’un régulateur UE devra cesser ses activités auprès des résidents UE. Concrètement : retraits possibles, mais plus de dépôts, plus de trading, plus de nouveaux comptes.",
  },
  {
    q: "Mes cryptos sur une plateforme non-conforme sont-elles perdues ?",
    a: "Non, mais vous devez agir. Les plateformes annoncent généralement 30 à 90 jours pour retirer vos fonds avant fermeture des accès. Le mieux est d’anticiper : transfère vos cryptos vers un wallet personnel (Ledger, Trezor) ou vers une plateforme conforme MiCA AVANT mai 2026.",
  },
  {
    q: "Quelle plateforme choisir si je suis débutant ?",
    a: "Pour un débutant FR en 2026, on recommande d’abord Coinbase (UX simple, MiCA compliant via Irlande, support FR), Bitstack (DCA automatisé, 100 % FR) ou Bitpanda (offre étoffée, MiCA Autriche). Le comparatif complet avec scores sécurité + frais + support FR est sur cryptoreflex.fr/comparatif/securite.",
  },
  {
    q: "USDT (Tether) est-il MiCA-compliant ?",
    a: "Pas en l’état. Tether n’a pas demandé d’agrément MiCA et risque le délistage progressif des plateformes UE conformes (Coinbase Europe a déjà commencé). Les alternatives MiCA-compliant : USDC (Circle), EURC, EUROC, EURCV. À surveiller en juillet 2026.",
  },
  {
    q: "D’où viennent ces données ? Sont-elles fiables ?",
    a: "Compilation Cryptoreflex à partir des registres officiels AMF (PSAN), ESMA (CASP UE), BaFin (DE), CNMV (ES), MFSA (Malta), CSSF (LU). Mise à jour mensuelle. Toutes les sources publiques sont citées sur la page /api-publique (open data CC-BY 4.0). Si une plateforme conteste son classement, on corrige sous 24h.",
  },
];

export default function MicaLandingPage() {
  const target = "/comparatif/securite?from=lp-mica-2026";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060A] text-slate-100">
      {/* Background grid + halo amber (urgence) */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HERO */}
      <section className="relative px-4 pt-16 sm:pt-24 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Deadline réglementaire — fin transition MiCA juillet 2026
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-red-300 bg-clip-text text-transparent">
              12 plateformes crypto
            </span>
            <br />
            vont disparaître en juillet 2026
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            33 plateformes auditées, classées par conformité MiCA + agrément
            AMF. Sources officielles. <strong>Liste à jour mensuelle</strong>,
            méthodologie publique.
          </p>

          {/* CTA primaire */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={target}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition"
            >
              Voir la liste complète
              <ArrowRight className="h-5 w-5" />
            </a>
            <Link
              href="/api-publique"
              className="text-sm text-slate-400 hover:text-cyan-300 underline-offset-2 hover:underline"
            >
              Données open data CC-BY 4.0 →
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {STATS.map(({ Icon, value, label, color }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <Icon className={`mx-auto h-5 w-5 ${color}`} aria-hidden />
                <div className="mt-2 text-2xl font-bold">{value}</div>
                <div className="text-xs uppercase tracking-wider text-slate-400">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TWO COLUMNS — compliant vs at-risk */}
      <section className="relative px-4 py-14 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Compliant */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h2 className="text-xl font-bold">
                  Plateformes MiCA-compliant (sélection)
                </h2>
              </div>
              <ul className="mt-5 space-y-3">
                {COMPLIANT.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/20 p-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.note}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* At risk */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-amber-400" />
                <h2 className="text-xl font-bold">
                  Plateformes à risque juillet 2026
                </h2>
              </div>
              <ul className="mt-5 space-y-3">
                {AT_RISK.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/20 p-3"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div>
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.note}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-slate-500 leading-relaxed">
                Cette liste évolue : certaines plateformes peuvent obtenir
                leur CASP avant le 30 juin 2026. Vérifie la liste à jour sur
                /comparatif/securite.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href={target}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
            >
              Voir le comparatif complet (33 plateformes)
              <ArrowRight className="h-4 w-4" />
            </a>
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
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 open:border-amber-500/30"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium text-white">
                  {item.q}
                  <span className="text-amber-300 transition group-open:rotate-45">
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

      {/* Newsletter fallback — récupère les non-clickers */}
      <section className="relative px-4 py-12 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="mx-auto max-w-2xl">
          <NewsletterInline
            source="inline"
            context="regulation"
            variant="default"
            title="Suivez l'évolution MiCA en temps réel"
            subtitle="Newsletter mensuelle qui suit les agréments CASP UE, les délistages et les recommandations de plateformes. 1 envoi par mois, 0 spam."
            ctaLabel="M'abonner à la veille MiCA"
          />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative px-4 py-16 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Anticipe la deadline. Compare avant juin 2026.
          </h2>
          <p className="mt-3 text-slate-300 max-w-xl mx-auto">
            Comparatif sécurité, frais, support FR, conformité MiCA + AMF.
            Méthodologie publique sur /methodologie. Données open data sur{" "}
            <Link
              href="/api-publique"
              className="text-amber-300 underline underline-offset-2"
            >
              /api-publique
            </Link>
            .
          </p>
          <a
            href={target}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition"
          >
            Voir le comparatif complet
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Cryptoreflex ne fournit pas de conseil en investissement. Les
          plateformes citées sont classées selon leur statut réglementaire
          public. Investir dans les crypto-actifs comporte des risques de
          perte en capital.
        </p>
      </section>
    </main>
  );
}
