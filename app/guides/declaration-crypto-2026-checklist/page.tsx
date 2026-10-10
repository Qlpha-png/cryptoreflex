import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,

  Printer,

} from "lucide-react";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { graphSchema, howToSchema, type JsonLd } from "@/lib/schema";
import NewsletterInline from "@/components/NewsletterInline";
import PackCTABlock from "@/components/fiscalite/PackCTABlock";
import FiscalCornerstoneCard from "@/components/fiscalite/FiscalCornerstoneCard";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import Breadcrumbs from "@/components/Breadcrumbs";
import TrustBox from "@/components/ui/TrustBox";
import Callout from "@/components/mdx/Callout";
import { avecTypo } from "@/components/ui/Typo";
import { formatJJMMAAAA } from "@/lib/fraicheur";

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
  "Checklist déclaration crypto 2026 : 8 étapes";
const DESCRIPTION =
  "Checklist pas-à-pas pour déclarer correctement vos cryptomonnaies en 2026. 8 étapes à cocher, imprimable, couvre Cerfa 2086 + 3916-bis. Pour vous organiser avant la deadline.";

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESCRIPTION),
  alternates: withHreflang(`${BRAND.url}/guides/declaration-crypto-2026-checklist`),
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
    title: "Listez tous les exchanges utilisés en 2025",
    detail:
      "Notez les exchanges (Binance, Kraken, Coinbase, Bitstack, Coinhouse, etc.) où vous avez eu un compte ouvert au moins 1 jour en 2025, MÊME sans transaction. Vérifiez vos emails (notifications de connexion) et votre gestionnaire de mots de passe.",
    why: "Tout compte ouvert chez un exchange étranger doit être déclaré sur l'annexe 3916-bis, même sans transaction. Oubli = amende 750 € par compte (1 500 € si solde > 50 000 €).",
  },
  {
    n: 2,
    title: "Exportez les CSV de transactions de chaque exchange",
    detail:
      "Connectez-vous à chaque exchange et téléchargez l'historique complet 2025 au format CSV. Sur Binance : Wallet → Transaction History → Export. Sur Coinbase : Settings → Statements → Generate. Sur Kraken : History → Export.",
    why: "Le CSV est la source officielle pour calculer les plus-values. Sans CSV propre, impossible de remplir le Cerfa 2086 correctement.",
    // Audit 2026-10-02 : /blog/exporter-csv-binance-kraken-coinbase n'existe pas (404).
    // Les étapes d'export par exchange sont détaillées ci-dessus ; on renvoie vers
    // le comparatif des logiciels qui importent ces CSV.
    link: { href: "/blog/waltio-vs-koinly-vs-accointing-comparatif-2026", label: "Logiciels qui importent vos CSV (comparatif)" },
  },
  {
    n: 3,
    title: "Calculez vos plus-values avec la formule BOFiP",
    detail:
      "Pour chaque cession crypto-vers-euros, appliquez la formule de l’article 150 VH bis (ligne 224 du 2086) : PV = prix de cession net des frais − prix total d’acquisition net × prix de cession / valeur globale du portefeuille. Le prix d’acquisition net retire les fractions déjà imputées lors des ventes précédentes. Les échanges crypto contre crypto sans soulte ne sont PAS taxables (sursis d’imposition, art. 150 VH bis CGI).",
    why: "Calcul manuel = risque d'erreur élevé. Un outil qui suit BOFiP à la lettre fait gagner ~3h et évite les redressements pour erreur de calcul.",
    link: { href: "/outils/cerfa-2086-auto", label: "Outil gratuit Cerfa 2086 auto" },
  },
  {
    n: 4,
    title: "Vérifiez le seuil d'exonération de 305 €",
    detail:
      "Si la SOMME de vos cessions crypto-fiat 2025 ne dépasse pas 305 €, vous êtes exonéré d'impôt sur la plus-value. Attention : c'est le PRIX DE CESSION qui compte, pas la plus-value. Au-delà de 305 €, l'intégralité de la plus-value est imposable au PFU 31,4 %.",
    why: "Ce seuil est une exonération mais pas une dispense de déclaration. Si vous avez des cryptos à l'étranger, vous devez quand même remplir le 3916-bis (qui est indépendant du 2086).",
  },
  {
    n: 5,
    title: "Identifiez les cas particuliers : staking, airdrops, NFT, DeFi",
    detail:
      "Si vous avez eu des rewards staking, des airdrops gratuits, des NFT achetés/vendus, ou des positions DeFi (Aave, Uniswap, etc.), retenez les principes : échange token-to-token sans soulte = neutre (sursis, art. 150 VH bis), cession contre euro = imposable au PFU 31,4 %. Le traitement des rewards/airdrops (moment d'imposition, régime, prix d'acquisition) n'est pas tranché officiellement — à vérifier au cas par cas.",
    why: "Les cas particuliers sont la cause #1 d'erreurs de déclaration. Pour les patrimoines > 50 000 € avec staking ou DeFi, consulter un expert-comptable.",
    link: { href: "/etudes/fiscalite-crypto-france-2026-guide-cerfa#cas-speciaux", label: "Détail des cas particuliers" },
  },
  {
    n: 6,
    title: "Remplissez le formulaire 2086 (Cerfa plus-values)",
    detail:
      "Sur impots.gouv.fr, déclaration en ligne → section « Plus-values » → cochez « Cessions d'actifs numériques ». Saisissez chaque cession (date, prix de cession, frais, prix d'acquisition retenu, plus-value). Le total se reporte automatiquement sur la ligne 3AN du formulaire 2042-C.",
    why: "C'est le formulaire principal. Si vous utilisez un outil qui génère le PDF pré-rempli, recopiez les valeurs dans la grille en ligne. Sinon télé-déclarez directement.",
  },
  {
    n: 7,
    title: "Remplissez l'annexe 3916-bis (comptes étrangers)",
    detail:
      "Pour chaque exchange étranger (Kraken Irlande, Coinbase Luxembourg, Bitpanda Autriche, ancien compte Binance tenu par une entité étrangère, etc.) : 1 ligne sur 3916-bis avec le nom de l'établissement, adresse, numéro de compte, date d'ouverture (et éventuellement de clôture).",
    why: "C'est l'oubli #1 dans les redressements observés en 2024-2025. Sanctions : 750 €/compte (1 500 € si la valeur des comptes dépasse 50 000 €). À déclarer même sans transaction dans l'année.",
    link: { href: "/etudes/fiscalite-crypto-france-2026-guide-cerfa#cerfa-3916", label: "Détail 3916-bis" },
  },
  {
    n: 8,
    title: "Déclarez avant la deadline de votre département",
    detail:
      "Dates 2026 : 21 mai pour départements 1-19 + non-résidents, 28 mai pour 20-54, 4 juin pour 55-976. Déclaration papier : 19 mai 2026 maximum. En cas de retard : majoration 10 % minimum. Pour corriger une déclaration déjà déposée, le service de correction en ligne est ouvert du 29 juillet au 30 novembre 2026 inclus (impots.gouv.fr).",
    why: "Le retard de déclaration est le 2ème motif de pénalité après l'oubli. Mieux vaut déclarer un peu approximatif dans les délais qu'attendre la perfection en retard (vous pouvez toujours faire une déclaration rectificative ensuite).",
  },
];

const baseUrl = BRAND.url;

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

const jsonLd: JsonLd = graphSchema([howTo]);

function ChecklistPage() {
  return (
    <div className="min-h-screen bg-background text-fg">
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

      {/* En-tête (maquette C+ : surtitre, filet or, titre en serif, chapô, dates) — plus de dégradé de fond */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-10 sm:px-6 lg:px-8">
          <Breadcrumbs chemin="/guides/declaration-crypto-2026-checklist" label="Checklist de déclaration crypto 2026" />

          <p className="no-print mt-8 text-base font-semibold text-primary">Guide pratique · checklist imprimable</p>
          <span aria-hidden="true" className="no-print mt-3 block h-[3px] w-16 rounded-full bg-link-line" />

          <h1 className="print-h1 mt-5 text-[2.5rem] font-medium leading-[1.08] tracking-[-0.02em] text-fg md:text-[3.25rem]">
            Checklist déclaration crypto 2026 :<br className="hidden sm:block" /> 8 étapes avant votre déclaration
          </h1>

          <p className="print-muted no-print mt-5 flex flex-wrap items-center gap-x-2 text-base text-muted">
            <span>
              Publié le {formatJJMMAAAA(PUBLISHED_DATE)}
            </span>
            <span aria-hidden="true" className="text-fg-4">
              ·
            </span>
            <span>5 min de lecture</span>
          </p>

          <p className="lead print-muted mt-6 max-w-[34em] text-[1.25rem] leading-normal text-fg-2">
            Vous avez déjà compris la fiscalité crypto FR (sinon, lisez l&apos;
            <Link
              href="/etudes/fiscalite-crypto-france-2026-guide-cerfa"
              className="text-link underline decoration-link-line decoration-2 underline-offset-[0.28em] hover:text-link-hover hover:decoration-[3px]"
            >
              étude complète
            </Link>
            ). Passez à l&apos;action avec cette checklist en 8 étapes. Cochez au fur
            et à mesure, imprimez si vous préférez travailler sur papier.
          </p>

          <div className="no-print mt-7 flex flex-wrap gap-3">
            <a href="/outils/cerfa-2086-auto" className="btn-primary">
              Lancer l&apos;outil Cerfa 2086
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              className="btn-ghost"
              onClick={undefined}
              // Le formatter est purement Server Component — bouton fonctionne via
              // le pattern progressif suivant : on encapsule l'action dans un
              // `data-` attribute lu par un mini-script inline.
              data-print="true"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
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

      {/* Étapes */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li
              key={s.n}
              id={`step-${s.n}`}
              className="print-card rounded-2xl border border-border bg-surface p-5 shadow-e1 sm:p-6"
            >
              {/* Passe finale B4 (jury ronde 2) : numéro et titre sur la même ligne, le corps prend TOUTE la largeur de la
                  carte sur téléphone (avant : colonne du numéro de 130 px, 20 à 28 signes par ligne) ; dès 640 px il s'aligne
                  sur le bord gauche du titre. Plus d'icône de case devant le titre (la 2e ligne repartait sous l'icône). */}
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 sm:gap-x-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-action font-semibold text-on-action">
                  {s.n}
                </div>
                <h2 className="ds-h3 print-h1 min-w-0 text-fg">{s.title}</h2>
                <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2">
                  <p className="print-muted max-w-[34em] text-lg leading-[1.6] text-fg-2">{s.detail}</p>
                  <Callout type="warning" title="Pourquoi">
                    {s.why}
                  </Callout>
                  {s.link && (
                    <Link
                      href={s.link.href}
                      className="no-print mt-3 inline-flex items-center gap-1 text-base font-semibold text-link underline decoration-link-line decoration-2 underline-offset-[0.28em] hover:text-link-hover hover:decoration-[3px]"
                    >
                      {s.link.label}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Encadré de confiance (lot B4) : rédaction, date, méthode ; aucune rubrique « Rémunération » ou « Sources » ici,
            la page n'a pas calculé ces informations (rien n'est annoncé par défaut). */}
        <div className="no-print">
          <TrustBox variante="complet" publieLe={PUBLISHED_DATE} titre="Comment ce guide est vérifié" />
        </div>

        {/* CTA primaire */}
        <div className="no-print mt-12 rounded-2xl border border-border-strong bg-surface p-6 text-center shadow-e1 sm:p-8">
          <h2 className="text-2xl font-medium tracking-tight text-fg">
            Vous voulez automatiser les étapes 2 et 3 ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg leading-[1.6] text-fg-2">
            Recopiez vos opérations dans le modèle CSV de l&apos;outil Cryptoreflex :
            il calcule chaque plus-value selon l&apos;article 150 VH bis et vous
            donne le récapitulatif Cerfa 2086 + les fiches 3916-bis à recopier.
            Gratuit ; aperçu sans compte, PDF avec un compte gratuit.
          </p>
          <Link href="/outils/cerfa-2086-auto" className="btn-primary mt-6">
            Lancer l&apos;outil
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Newsletter : composant et texte uniques (lot B4), aucun rythme promis */}
      <section className="no-print border-t border-border bg-sunken">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <NewsletterInline source="bottom-article" variant="default" />
        </div>
      </section>

      {/* Pack CTA + étude pilier — maillage interne (audit 2026-05-14) */}
      <section className="no-print">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <PackCTABlock fromPage="guide-checklist-2026" />
          <FiscalCornerstoneCard fromPage="guide-checklist-2026" variant="compact" />
        </div>
      </section>

      {/* Cross-links */}
      <section className="no-print border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-medium tracking-tight text-fg">Pour aller plus loin</h2>
          <div className="mt-4 grid gap-3 text-base sm:grid-cols-2">
            <Link
              href="/etudes/fiscalite-crypto-france-2026-guide-cerfa"
              className="rounded-xl border border-border bg-surface p-4 shadow-e1 transition hover:border-border-strong"
            >
              <div className="font-semibold text-fg">
                Étude complète — Fiscalité crypto FR 2026
              </div>
              <div className="mt-1 text-fg-2">
                Le guide académique : 22 min, sources BOFiP, cas particuliers
                staking/NFT/DeFi.
              </div>
            </Link>
            <Link
              href="/etudes/mica-juillet-2026-etat-des-lieux"
              className="rounded-xl border border-border bg-surface p-4 shadow-e1 transition hover:border-border-strong"
            >
              <div className="font-semibold text-fg">
                Étude — MiCA juillet 2026
              </div>
              <div className="mt-1 text-fg-2">
                Quelles plateformes ne sont plus autorisées en France ?
                Implications fiscales de la migration.
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
    </div>
  );
}

export default avecTypo(ChecklistPage, { riche: true });
