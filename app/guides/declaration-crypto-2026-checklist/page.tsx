import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Calendar,
  CheckSquare,
  Printer,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  howToSchema,
  type JsonLd,
} from "@/lib/schema";
import NewsletterInline from "@/components/NewsletterInline";

/**
 * /guides/declaration-crypto-2026-checklist
 *
 * Guide actionnable mid-funnel : checklist en 8 etapes pour declarer
 * correctement ses cryptos en 2026. Imprimable (CSS @media print).
 *
 * SEO : "checklist declaration crypto 2026", "comment declarer crypto
 * etape par etape", "declaration impots crypto guide pratique".
 *
 * Schema HowTo : rich snippets en SERP (etapes + duree + tools).
 *
 * Distinct de l'etude /etudes/fiscalite-crypto-france-2026-guide-cerfa
 * (academique, sourcee, 22 min) - ici 5 min, action immediate.
 */

const PUBLISHED_DATE = "2026-05-06";

const TITLE =
  "Checklist déclaration crypto 2026 : 8 étapes avant le 31 mai";
const DESCRIPTION =
  "Checklist pas-à-pas pour déclarer correctement tes cryptomonnaies en 2026. 8 étapes à cocher, imprimable, couvre Cerfa 2086 + 3916-bis. Pour t'organiser avant la deadline.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${BRAND.url}/guides/declaration-crypto-2026-checklist`,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}/guides/declaration-crypto-2026-checklist`,
    type: "article",
    publishedTime: PUBLISHED_DATE,
  },
  robots: { index: true, follow: true },
};

interface Step {
  n: number;
  title: string;
  detail: string;
  why: string;
  link?: { href: string; label: string };
}

const STEPS: Step[] = [
  {
    n: 1,
    title: "Liste tous les exchanges utilisés en 2025",
    detail:
      "Note les exchanges (Binance, Kraken, Coinbase, Bitstack, Coinhouse, etc.) où tu as eu un compte ouvert au moins 1 jour en 2025, MÊME sans transaction. Vérifie tes emails (notifications de connexion) et ton gestionnaire de mots de passe.",
    why: "Tout compte ouvert chez un exchange étranger doit être déclaré sur l'annexe 3916-bis, même sans transaction. Oubli = amende 1 500 € par compte.",
  },
  {
    n: 2,
    title: "Exporte les CSV de transactions de chaque exchange",
    detail:
      "Connecte-toi à chaque exchange et télécharge l'historique complet 2025 au format CSV. Sur Binance : Wallet → Transaction History → Export. Sur Coinbase : Settings → Statements → Generate. Sur Kraken : History → Export.",
    why: "Le CSV est la source officielle pour calculer les plus-values. Sans CSV propre, impossible de remplir le Cerfa 2086 correctement.",
    link: { href: "/blog/exporter-csv-binance-kraken-coinbase", label: "Tutoriel export CSV par exchange" },
  },
  {
    n: 3,
    title: "Calcule tes plus-values avec la formule BOFiP",
    detail:
      "Pour chaque cession crypto-vers-fiat, applique la formule §70 : PV = Prix_cession − (Prix_acq_total × Prix_cession / Valeur_globale_portefeuille). Les swaps token-to-token ne sont PAS taxables (loi PACTE 2019).",
    why: "Calcul manuel = risque d'erreur élevé. Un outil qui suit BOFiP à la lettre fait gagner ~3h et évite les redressements pour erreur de calcul.",
    link: { href: "/outils/cerfa-2086-auto", label: "Outil gratuit Cerfa 2086 auto" },
  },
  {
    n: 4,
    title: "Vérifie le seuil d'exonération de 305 €",
    detail:
      "Si la SOMME de tes cessions crypto-fiat 2025 est < 305 €, tu es exonéré d'impôt sur la plus-value. Attention : c'est le PRIX DE CESSION qui compte, pas la plus-value. Au-dessus de 305 €, l'intégralité de la plus-value est imposable au PFU 30 %.",
    why: "Ce seuil est une exonération mais pas une dispense de déclaration. Si tu as des cryptos à l'étranger, tu dois quand même remplir le 3916-bis (qui est indépendant du 2086).",
  },
  {
    n: 5,
    title: "Identifie les cas particuliers : staking, airdrops, NFT, DeFi",
    detail:
      "Si tu as eu des rewards staking, des airdrops gratuits, des NFT achetés/vendus, ou des positions DeFi (Aave, Uniswap, etc.), retiens les principes : token-to-token neutre, cession contre euro = imposable au PFU 30 %, prix d'acquisition zéro pour les rewards reçus gratuitement.",
    why: "Les cas particuliers sont la cause #1 d'erreurs de déclaration. Pour les patrimoines > 50 000 € avec staking ou DeFi, consulter un expert-comptable.",
    link: { href: "/etudes/fiscalite-crypto-france-2026-guide-cerfa#cas-speciaux", label: "Détail des cas particuliers" },
  },
  {
    n: 6,
    title: "Remplis le formulaire 2086 (Cerfa plus-values)",
    detail:
      "Sur impots.gouv.fr, déclaration en ligne → section « Plus-values » → coche « Cessions d'actifs numériques ». Saisis chaque cession (date, prix de cession, frais, prix d'acquisition retenu, plus-value). Le total se reporte automatiquement sur la ligne 3AN du formulaire 2042-C.",
    why: "C'est le formulaire principal. Si tu utilises un outil qui génère le PDF pré-rempli, recopie les valeurs dans la grille en ligne. Sinon télé-déclare directement.",
  },
  {
    n: 7,
    title: "Remplis l'annexe 3916-bis (comptes étrangers)",
    detail:
      "Pour chaque exchange étranger (Binance, Kraken Irlande, Coinbase Europe, Bitpanda Autriche, etc.) : 1 ligne sur 3916-bis avec le nom de l'établissement, adresse, numéro de compte, date d'ouverture (et éventuellement de clôture).",
    why: "C'est l'oubli #1 dans les redressements observés en 2024-2025. Sanctions : 1 500 €/compte (10 000 € si État non coopératif). À déclarer même sans transaction dans l'année.",
    link: { href: "/etudes/fiscalite-crypto-france-2026-guide-cerfa#cerfa-3916", label: "Détail 3916-bis" },
  },
  {
    n: 8,
    title: "Déclare avant la deadline de ton département",
    detail:
      "Dates 2026 (à confirmer par DGFiP en mars) : 25 mai pour départements 1-19 + non-résidents, 1er juin pour 20-54, 8 juin pour 55-976. Déclaration papier : 20 mai 2026 maximum. En cas de retard : majoration 10 % minimum.",
    why: "Le retard de déclaration est le 2ème motif de pénalité après l'oubli. Mieux vaut déclarer un peu approximatif dans les délais qu'attendre la perfection en retard (tu peux toujours faire une déclaration rectificative ensuite).",
  },
];

const baseUrl = BRAND.url;

const breadcrumb = breadcrumbSchema([
  { name: "Accueil", url: baseUrl + "/" },
  { name: "Guides", url: baseUrl + "/guides" },
  {
    name: "Checklist déclaration crypto 2026",
    url: baseUrl + "/guides/declaration-crypto-2026-checklist",
  },
]);

const howTo = howToSchema({
  name: TITLE,
  description: DESCRIPTION,
  totalTime: "PT5M",
  steps: STEPS.map((s) => ({
    name: `Étape ${s.n} — ${s.title}`,
    text: s.detail,
    url: s.link
      ? baseUrl + "/guides/declaration-crypto-2026-checklist#step-" + s.n
      : undefined,
  })),
  tools: [
    { name: "Export CSV de chaque exchange utilisé en 2025" },
    { name: "Outil Cerfa 2086 auto Cryptoreflex (optionnel)" },
    { name: "Compte impots.gouv.fr (numéro fiscal + mot de passe)" },
  ],
});

const jsonLd: JsonLd = graphSchema([breadcrumb, howTo]);

export default function ChecklistPage() {
  return (
    <main className="min-h-screen bg-[#05060A] text-slate-100">
      <StructuredData id="checklist-jsonld" data={jsonLd} />

      {/* Print stylesheet — page imprimable proprement */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              :root { color-scheme: light; }
              html, body { background: #fff !important; color: #0f172a !important; }
              .no-print { display: none !important; }
              .print-card {
                background: #fff !important;
                border: 1px solid #e2e8f0 !important;
                color: #0f172a !important;
                page-break-inside: avoid;
              }
              .print-h1 { color: #0f172a !important; }
              .print-muted { color: #64748b !important; }
              a { color: #0f172a !important; text-decoration: underline; }
              h1, h2, h3 { color: #0f172a !important; }
              header, footer, nav { display: none !important; }
            }
          `,
        }}
      />

      {/* Hero */}
      <section className="border-b border-white/5 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-slate-400 no-print" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-cyan-300">
              Accueil
            </Link>
            <span className="mx-2 text-slate-600">/</span>
            <Link href="/guides" className="hover:text-cyan-300">
              Guides
            </Link>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-slate-300">Checklist déclaration 2026</span>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 no-print">
            <BookOpenCheck className="h-3.5 w-3.5" />
            Guide pratique — checklist imprimable
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl print-h1">
            Checklist déclaration crypto 2026 :<br className="hidden sm:block" /> 8 étapes avant le 31 mai
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-400 print-muted no-print">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Publié le{" "}
              {new Date(PUBLISHED_DATE).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              5 min de lecture
            </span>
          </div>

          <p className="mt-6 text-lg text-slate-300 leading-relaxed print-muted">
            Tu as déjà compris la fiscalité crypto FR (sinon, lis l'
            <Link
              href="/etudes/fiscalite-crypto-france-2026-guide-cerfa"
              className="text-cyan-300 hover:underline"
            >
              étude complète
            </Link>
            ). Passe à l'action avec cette checklist en 8 étapes. Coche au fur
            et à mesure, imprime si tu préfères travailler sur papier.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 no-print">
            <a
              href="/outils/cerfa-2086-auto"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40"
            >
              Lancer l'outil Cerfa 2086
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
              onClick={undefined}
              // Le formatter est purement Server Component — bouton fonctionne via
              // le pattern progressif suivant : on encapsule l'action dans un
              // `data-` attribute lu par un mini-script inline.
              data-print="true"
            >
              <Printer className="h-4 w-4" />
              Imprimer cette checklist
            </button>
          </div>

          <script
            dangerouslySetInnerHTML={{
              __html: `
                document.querySelectorAll('[data-print="true"]').forEach(b => {
                  b.addEventListener('click', () => window.print());
                });
              `,
            }}
          />
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li
              key={s.n}
              id={`step-${s.n}`}
              className="print-card rounded-2xl border border-white/10 bg-white/[0.02] p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 font-bold">
                  {s.n}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold tracking-tight text-white print-h1">
                    <CheckSquare
                      className="mr-2 inline h-4 w-4 align-text-bottom text-emerald-400"
                      aria-hidden="true"
                    />
                    {s.title}
                  </h2>
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed print-muted">
                    {s.detail}
                  </p>
                  <p className="mt-3 inline-flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300 print-muted">
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400"
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="text-amber-300">Pourquoi.</strong>{" "}
                      {s.why}
                    </span>
                  </p>
                  {s.link && (
                    <Link
                      href={s.link.href}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cyan-300 hover:underline no-print"
                    >
                      {s.link.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* CTA primaire */}
        <div className="mt-12 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 p-8 text-center no-print">
          <h2 className="text-2xl font-bold tracking-tight">
            Tu veux automatiser les étapes 2 et 3 ?
          </h2>
          <p className="mt-2 max-w-xl mx-auto text-slate-300">
            L'outil Cryptoreflex prend ton CSV exchange, calcule la
            plus-value selon BOFiP §70, et te sort le PDF Cerfa 2086 +
            3916-bis pré-remplis en 2 min. Gratuit, sans inscription.
          </p>
          <Link
            href="/outils/cerfa-2086-auto"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition"
          >
            Lancer l'outil
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Newsletter capture */}
      <section className="border-t border-white/5 bg-white/[0.02] no-print">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <NewsletterInline
            source="bottom-article"
            context="fiscalite"
            variant="default"
            title="Garde une longueur d'avance sur la prochaine déclaration"
            subtitle="On envoie un rappel personnalisé en mars 2027 + nos analyses fiscales mises à jour BOFiP. 1 envoi par trimestre, 0 spam."
            ctaLabel="M'abonner à la veille fiscale"
          />
        </div>
      </section>

      {/* Cross-links */}
      <section className="border-t border-white/5 no-print">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold tracking-tight">Pour aller plus loin</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <Link
              href="/etudes/fiscalite-crypto-france-2026-guide-cerfa"
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-emerald-500/30 hover:text-emerald-300 transition"
            >
              <div className="font-semibold text-white">
                Étude complète — Fiscalité crypto FR 2026
              </div>
              <div className="mt-1 text-slate-400">
                Le guide académique : 22 min, sources BOFiP, cas particuliers
                staking/NFT/DeFi.
              </div>
            </Link>
            <Link
              href="/etudes/mica-juillet-2026-etat-des-lieux"
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-amber-500/30 hover:text-amber-300 transition"
            >
              <div className="font-semibold text-white">
                Étude — MiCA juillet 2026
              </div>
              <div className="mt-1 text-slate-400">
                Quelles plateformes vont disparaître ? Implications fiscales
                de la migration.
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Print footer */}
      <footer className="hidden print:block border-t border-slate-200 mt-12 pt-6 text-xs text-slate-600">
        <div className="mx-auto max-w-3xl px-4">
          <p>
            Source : Cryptoreflex.fr — checklist déclaration crypto 2026.
            Imprimé le {new Date().toLocaleDateString("fr-FR")}. Méthodologie
            publique : cryptoreflex.fr/methodologie. Cryptoreflex ne fournit
            pas de conseil fiscal personnalisé.
          </p>
        </div>
      </footer>
    </main>
  );
}
