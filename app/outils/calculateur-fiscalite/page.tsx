import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import TaxCalculator from "@/components/TaxCalculator";
import { BRAND } from "@/lib/brand";

const PAGE_TITLE = "Calculateur fiscalité crypto 2026 — gratuit, sans inscription";
const PAGE_DESCRIPTION =
  "Calculez votre flat tax (PFU 30 %) sur vos plus-values crypto en 4 questions. Formule officielle 150 VH bis, aide pour le formulaire 2086 et le 3916-bis. 100 % gratuit, 100 % anonyme.";
const PAGE_PATH = "/outils/calculateur-fiscalite";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Quel taux d'imposition s'applique aux plus-values crypto en France en 2026 ?",
    a: "Les plus-values de cession d'actifs numériques par un particulier en gestion non professionnelle sont soumises au Prélèvement Forfaitaire Unique (PFU), aussi appelé flat tax, au taux global de 30 % : 12,8 % d'impôt sur le revenu et 17,2 % de prélèvements sociaux. Vous pouvez également opter pour le barème progressif de l'IR si c'est plus avantageux.",
  },
  {
    q: "Quelle est la formule officielle de calcul (article 150 VH bis) ?",
    a: "Plus-value = montant_de_la_cession − (prix_total_d_acquisition × montant_de_la_cession / valeur_globale_du_portefeuille). Le second terme représente la part du prix d'acquisition imputable à la cession, calculée au prorata du portefeuille cédé.",
  },
  {
    q: "Dois-je déclarer mes échanges crypto contre crypto (BTC → ETH par exemple) ?",
    a: "Non. Les conversions crypto contre crypto sont neutres fiscalement. Seules les cessions vers une monnaie ayant cours légal (€, $) ou contre un bien ou un service sont imposables. Vous devez en revanche conserver l'historique pour le calcul du portefeuille global.",
  },
  {
    q: "Qu'est-ce que le formulaire 2086 et qui doit le remplir ?",
    a: "Le formulaire 2086 est l'annexe à votre déclaration de revenus dans laquelle vous reportez le détail de chaque cession imposable d'actifs numériques de l'année. Il doit être rempli par tout particulier ayant cédé des cryptos contre euros (ou contre un bien) au-dessus du seuil d'exonération de 305 € de cessions cumulées sur l'année.",
  },
  {
    q: "Et le formulaire 3916-bis, c'est obligatoire ?",
    a: "Oui. Le 3916-bis sert à déclarer chaque compte d'actifs numériques détenu, ouvert ou clos auprès d'un prestataire établi à l'étranger (Binance, Kraken, Coinbase, Bybit, etc.). Il est à déposer en même temps que la déclaration de revenus, indépendamment du fait que vous ayez vendu ou non. Une omission expose à 750 € d'amende par compte non déclaré (1 500 € si encours > 50 000 €).",
  },
];

export default function CalculateurFiscalitePage() {
  return (
    <>
      {/* JSON-LD WebApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Calculateur Fiscalité Crypto FR 2026",
            url: PAGE_URL,
            description: PAGE_DESCRIPTION,
            applicationCategory: "FinanceApplication",
            operatingSystem: "Any",
            inLanguage: "fr-FR",
            isAccessibleForFree: true,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
            },
            publisher: {
              "@type": "Organization",
              name: BRAND.name,
              url: BRAND.url,
            },
          }),
        }}
      />

      {/* JSON-LD HowTo */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "Comment calculer ma flat tax crypto en France en 2026",
            description:
              "Méthode officielle (article 150 VH bis du CGI) pour estimer son impôt sur les plus-values d'actifs numériques.",
            inLanguage: "fr-FR",
            totalTime: "PT3M",
            tool: [
              { "@type": "HowToTool", name: "Calculateur Fiscalité Crypto Cryptoreflex" },
            ],
            step: [
              {
                "@type": "HowToStep",
                position: 1,
                name: "Renseigner le total investi",
                text: "Additionnez tous vos achats crypto en euros depuis le début (frais inclus).",
              },
              {
                "@type": "HowToStep",
                position: 2,
                name: "Renseigner la valeur actuelle du portefeuille",
                text: "Indiquez la valeur totale de toutes vos cryptos au prix du jour.",
              },
              {
                "@type": "HowToStep",
                position: 3,
                name: "Indiquer le total des cessions de l'année",
                text: "Cumulez toutes vos ventes vers euros (ou achats de biens/services) sur l'année.",
              },
              {
                "@type": "HowToStep",
                position: 4,
                name: "Indiquer la valeur du portefeuille au moment de la vente",
                text: "Saisissez la valorisation globale juste avant la cession.",
              },
              {
                "@type": "HowToStep",
                position: 5,
                name: "Lire votre flat tax",
                text: "Le calculateur affiche votre plus-value imposable et votre flat tax due (30 % : 12,8 % IR + 17,2 % PS).",
              },
            ],
          }),
        }}
      />

      {/* JSON-LD FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      {/* Hero */}
      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              100 % gratuit, sans inscription
            </span>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Calculateur <span className="gradient-text">Fiscalité Crypto</span>{" "}
              FR 2026
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Estimez votre <strong>flat tax</strong> (PFU 30 %) sur vos plus-values
              crypto en 4 questions. Formule officielle{" "}
              <strong>article 150 VH bis du CGI</strong>, aide pour remplir le{" "}
              <strong>formulaire 2086</strong> et le <strong>3916-bis</strong>.
            </p>

            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { icon: Lock, label: "Aucune donnée envoyée — calcul 100 % local" },
                { icon: ShieldCheck, label: "Pas d'email, pas de compte requis" },
                { icon: CheckCircle2, label: "Formule officielle 150 VH bis" },
                { icon: FileText, label: "Aide pour le 2086 et le 3916-bis" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-white/80">
                  <Icon className="h-4 w-4 text-primary-soft" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer fort */}
          <div
            role="alert"
            className="mt-8 max-w-3xl rounded-xl border border-primary/40 bg-primary/5 p-4 flex gap-3 text-sm text-white/90"
          >
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-primary-soft mt-0.5"
              aria-hidden="true"
            />
            <p>
              <strong className="text-primary-soft">
                Calcul indicatif, à vérifier par un comptable.
              </strong>{" "}
              Cet outil ne remplace pas un expert-comptable ni l'administration
              fiscale. Les règles peuvent évoluer ; vérifiez toujours le détail de
              votre situation avant de déclarer.
            </p>
          </div>

          {/* Calculateur — Suspense requis car TaxCalculator utilise useSearchParams */}
          <div className="mt-10 max-w-4xl">
            <Suspense fallback={<div className="glass rounded-2xl p-6 sm:p-8 min-h-[300px]" aria-busy="true" />}>
              <TaxCalculator />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Méthode</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Comment ça marche ?
            </h2>
            <p className="mt-3 text-white/70">
              Le fisc français applique la formule du <strong>150 VH bis</strong>{" "}
              à chaque cession vers euros. Voici un exemple concret.
            </p>
          </div>

          <div className="mt-10 grid lg:grid-cols-2 gap-6">
            <article className="glass rounded-2xl p-6 sm:p-8">
              <h3 className="font-display font-bold text-xl text-white">
                Exemple chiffré
              </h3>
              <p className="mt-2 text-sm text-muted">
                Marie a investi <strong className="text-white">5 000 €</strong> en
                crypto. Aujourd'hui son portefeuille vaut{" "}
                <strong className="text-white">12 000 €</strong>. Elle vend pour{" "}
                <strong className="text-white">4 000 €</strong> alors que son
                portefeuille en vaut <strong className="text-white">10 000 €</strong>.
              </p>

              <ol className="mt-5 space-y-4 text-sm">
                <Step
                  n={1}
                  title="Prix d'acquisition imputé à la cession"
                  body={
                    <span className="font-mono text-white">
                      5 000 × 4 000 / 10 000 = <strong>2 000 €</strong>
                    </span>
                  }
                />
                <Step
                  n={2}
                  title="Plus-value imposable"
                  body={
                    <span className="font-mono text-white">
                      4 000 − 2 000 = <strong>2 000 €</strong>
                    </span>
                  }
                />
                <Step
                  n={3}
                  title="Flat tax due (PFU 30 %)"
                  body={
                    <span className="font-mono text-white">
                      2 000 × 30 % = <strong className="text-primary-soft">600 €</strong>{" "}
                      <span className="text-muted">
                        (256 € IR + 344 € PS)
                      </span>
                    </span>
                  }
                />
              </ol>

              <p className="mt-5 text-xs text-muted">
                Marie déclare 2 000 € de plus-value sur sa{" "}
                <strong className="text-white">2086</strong> et reporte le total
                sur sa déclaration de revenus.
              </p>
            </article>

            <article className="glass rounded-2xl p-6 sm:p-8">
              <h3 className="font-display font-bold text-xl text-white">
                Les règles à connaître
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-white/80">
                <Bullet>
                  <strong>Seuil 305 €</strong> : si le total de vos cessions de
                  l'année est ≤ 305 €, vous êtes exonéré (mais déclarez quand
                  même).
                </Bullet>
                <Bullet>
                  <strong>Crypto ↔ crypto</strong> : non imposable. Seul le
                  passage en € (ou achat de bien/service) déclenche l'impôt.
                </Bullet>
                <Bullet>
                  <strong>Moins-value</strong> : imputable sur les plus-values
                  crypto de la <em>même année</em> uniquement. Pas de report sur
                  les années suivantes pour les particuliers.
                </Bullet>
                <Bullet>
                  <strong>Comptes étrangers</strong> : tout compte chez Binance,
                  Kraken, Coinbase, Bybit, etc. doit être déclaré sur le{" "}
                  <strong>3916-bis</strong> — même sans cession.
                </Bullet>
                <Bullet>
                  <strong>Option barème</strong> : vous pouvez choisir le barème
                  progressif de l'IR à la place du PFU, si c'est plus avantageux.
                </Bullet>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* Aide formulaires */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Déclaration</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Aide pour remplir vos formulaires
            </h2>
            <p className="mt-3 text-white/70">
              Une fois le calcul fait, il vous reste deux formulaires à déposer
              avec votre déclaration de revenus.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 gap-6">
            <Link
              href="/blog/declarer-crypto-impots-2086-3916-bis"
              className="glass rounded-2xl p-6 sm:p-8 hover:border-primary/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary-soft" aria-hidden="true" />
                <h3 className="font-display font-bold text-lg text-white">
                  Formulaire 2086
                </h3>
              </div>
              <p className="mt-3 text-sm text-white/70">
                Détail ligne par ligne de vos cessions imposables. Comment
                reporter les chiffres du calculateur, exemple rempli, erreurs
                fréquentes.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary-soft group-hover:gap-2 transition-all">
                Lire le guide <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>

            <Link
              href="/blog/declarer-crypto-impots-2086-3916-bis#3916-bis"
              className="glass rounded-2xl p-6 sm:p-8 hover:border-primary/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-primary-soft" aria-hidden="true" />
                <h3 className="font-display font-bold text-lg text-white">
                  Formulaire 3916-bis
                </h3>
              </div>
              <p className="mt-3 text-sm text-white/70">
                Déclaration des comptes crypto à l'étranger (Binance, Kraken,
                Coinbase…). Obligatoire même sans vente. 750 € d'amende par
                compte oublié.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary-soft group-hover:gap-2 transition-all">
                Lire le guide <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">FAQ</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Questions fréquentes
          </h2>

          <div className="mt-8 space-y-3">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group glass rounded-xl p-5 open:border-primary/40 transition-colors"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-semibold text-white">
                  <span>{item.q}</span>
                  <span
                    className="text-primary-soft text-xl leading-none mt-0.5 transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-white/75 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-primary/40 bg-primary/5 p-5 text-sm text-white/90 flex gap-3">
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-primary-soft mt-0.5"
              aria-hidden="true"
            />
            <p>
              <strong className="text-primary-soft">Rappel :</strong> Cet outil
              ne remplace pas un expert-comptable. Pour des situations complexes
              (staking, lending, NFT, mining, activité habituelle), faites-vous
              accompagner par un professionnel.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------- petits sous-composants serveurs ---------- */

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-background text-xs font-bold"
        aria-hidden="true"
      >
        {n}
      </span>
      <div>
        <p className="text-white/90 font-semibold">{title}</p>
        <p className="mt-1">{body}</p>
      </div>
    </li>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2
        className="h-4 w-4 shrink-0 text-accent-green mt-0.5"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}
