import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AlertTriangle, Calculator, Scale } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";

/**
 * /outils/tax-loss-harvesting — « vendre à perte pour réduire son impôt » : ce qui marche vraiment en France.
 *
 * Refonte du 05/10/2026 (audit) : l'ancienne page reprenait le « tax-loss harvesting » américain (vendre LA crypto
 * en perte → moins-value → rachat le lendemain). C'est faux pour un particulier français : chaque cession se calcule
 * avec la méthode GLOBALE (art. 150 VH bis, III — BOI-RPPM-PVBMC-30-20 § 1 et § 110) :
 *   plus-value = prix de cession − prix total d'acquisition × prix de cession / valeur globale du portefeuille.
 * Le signe dépend donc du portefeuille entier au jour de la vente, pas de la crypto vendue. Les moins-values ne
 * s'imputent que sur les plus-values de même nature de la même année (art. 150 VH bis, IV — BOFiP § 160).
 * L'ancienne FAQ citait aussi une source inexistante (« CE 26/04/2018 » pour un rachat) et comptait le swap
 * crypto-crypto parmi les opérations imposables : retirés.
 *
 * Exemple vérifié (sans frais) : juin, vente 6 000 € d'un portefeuille de 30 000 € acheté 20 000 € → +2 000 €,
 * prix d'acquisition restant 16 000 €. Décembre : portefeuille à 12 000 € → vente 6 000 € = −2 000 € (année 0 €) ;
 * portefeuille à 20 000 € → vente 6 000 € = +1 200 € (année 3 200 €). PFU 31,4 % : 628 € / 0 € / 1 004,80 €.
 */

export const revalidate = 86400;

const TITLE = "Vendre à perte pour réduire son impôt crypto (France)";
const DESCRIPTION =
  "En France, c'est votre portefeuille entier qui décide : vendre une crypto en perte ne crée pas toujours une moins-value. La règle officielle et un exemple chiffré.";

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESCRIPTION),
  alternates: withHreflang(`${BRAND.url}/outils/tax-loss-harvesting`),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}/outils/tax-loss-harvesting`,
    type: "website",
  },
};

// fr-FR sépare les milliers par une espace fine (U+202F), presque invisible dans la police du site : espace insécable.
const eur = (n: number) =>
  `${n
    .toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })
    .replace(/ /g, " ")} €`;

export default function TaxLossHarvestingPage() {
  const faqItems = [
    {
      q: "Vendre une crypto en perte crée-t-il toujours une moins-value ?",
      a: "Non. Pour un particulier, chaque vente contre des euros se calcule sur le portefeuille entier (méthode globale de l'article 150 VH bis du CGI) : plus-value = prix de cession − prix total d'acquisition × prix de cession ÷ valeur globale du portefeuille. Si, le jour de la vente, l'ensemble de vos cryptos vaut plus que ce qu'il vous a coûté, la vente dégage une plus-value, même si la crypto vendue a baissé.",
    },
    {
      q: "Puis-je échanger ma crypto en perte contre une autre crypto pour « réaliser » la perte ?",
      a: "Non. Un échange entre cryptos n'est pas une cession imposable : il ne crée ni plus-value ni moins-value et ne change pas votre prix total d'acquisition. Seules comptent les ventes contre des euros (ou une autre monnaie officielle) et les paiements d'un bien ou d'un service en crypto.",
    },
    {
      q: "Puis-je racheter juste après avoir vendu ?",
      a: "Aucune règle propre aux cryptos n'interdit de racheter ensuite (il n'existe pas d'équivalent de la « wash sale rule » américaine). Mais l'administration peut écarter une opération dont le but est exclusivement ou principalement fiscal (abus de droit, articles L64 et L64 A du livre des procédures fiscales). Une vente suivie d'un rachat immédiat, sans autre motif, s'en approche : demandez l'avis d'un professionnel avant de le faire.",
    },
    {
      q: "Que devient une moins-value que je n'utilise pas ?",
      a: "Elle est perdue. Les moins-values crypto ne s'imputent que sur les plus-values crypto de la même année (article 150 VH bis, IV). Pas de report sur les années suivantes, pas d'imputation sur les actions ou les autres revenus. Le report sur dix ans existe pour les valeurs mobilières (article 150-0 D, 11), pas pour les cryptos.",
    },
    {
      q: "Comment savoir si mon portefeuille est globalement en perte ?",
      a: "Additionnez la valeur, au jour de la vente, de toutes vos cryptos (toutes plateformes et tous portefeuilles confondus) et comparez-la à votre prix total d'acquisition restant (ligne 223 du formulaire 2086). En dessous, une vente crée une moins-value ; au-dessus, une plus-value. Le générateur 2086 gratuit fait ce calcul vente par vente.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/tax-loss-harvesting",
      title: TITLE,
      description: DESCRIPTION,
      date: "2026-05-02",
      dateModified: "2026-10-05",
      category: "Outil",
      tags: ["moins-value crypto", "fiscalité", "PFU", "méthode globale", "formulaire 2086"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Vendre à perte", url: "/outils/tax-loss-harvesting" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="tax-loss-harvesting" data={schemas} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Vendre à perte</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Scale className="h-3 w-3" aria-hidden /> Règle officielle · mise à jour le 5 octobre 2026
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Vendre à perte pour réduire son impôt crypto&nbsp;:{" "}
            <span className="gradient-text">ce qui marche vraiment en France</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-fg/80 leading-relaxed">
            Aux États-Unis, on vend la crypto qui a baissé pour « encaisser » la perte. En France, ça ne marche pas
            comme ça&nbsp;: c&apos;est <strong>votre portefeuille entier</strong> qui décide si une vente dégage un
            gain ou une perte, pas la crypto que vous vendez.
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Une vente contre des euros crée une moins-value seulement si, ce jour-là, l'ensemble de vos cryptos vaut moins que ce qu'il vous a coûté. Sinon, elle crée une plus-value, même si la crypto vendue a baissé."
            bullets={[
              { emoji: "⚖️", text: "Méthode globale : article 150 VH bis du CGI (III), commentée au BOFiP (BOI-RPPM-PVBMC-30-20)" },
              { emoji: "🔁", text: "Un échange crypto contre crypto ne crée ni gain ni perte" },
              { emoji: "📅", text: "Une moins-value ne compense que les plus-values crypto de la même année, puis elle est perdue" },
              { emoji: "🧾", text: "Le générateur 2086 calcule chaque vente avec la valeur de votre portefeuille" },
            ]}
            readingTime="5 min"
            level="Intermédiaire"
          />
        </div>

        {/* La règle */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold">La règle en une ligne</h2>
          <p className="mt-3 text-fg/85 leading-relaxed">
            Pour chaque vente, l&apos;administration ne regarde pas le prix d&apos;achat de la crypto vendue. Elle
            applique cette formule à tout votre portefeuille&nbsp;:
          </p>
          <p className="mt-4 rounded-xl border border-border bg-elevated/40 p-4 font-mono text-sm text-fg">
            plus-value = prix de vente − prix total d&apos;acquisition × prix de vente ÷ valeur de tout le portefeuille
          </p>
          <p className="mt-4 text-fg/85 leading-relaxed">
            Le « prix total d&apos;acquisition » est ce que vous avez payé pour toutes vos cryptos, diminué de la part
            déjà utilisée par vos ventes précédentes (ligne 223 du formulaire 2086). Si votre portefeuille vaut moins
            que ce montant le jour de la vente, le résultat est négatif&nbsp;: c&apos;est une moins-value.
          </p>
        </section>

        {/* Exemple chiffré */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Calculator className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-2xl font-bold">Exemple chiffré (sans frais)</h2>
          </div>
          <p className="mt-4 text-sm text-fg/85 leading-relaxed">
            Léa a acheté pour <strong>{eur(20000)}</strong> de cryptos. En juin, son portefeuille vaut{" "}
            <strong>{eur(30000)}</strong> et elle vend pour <strong>{eur(6000)}</strong>&nbsp;:
            6&nbsp;000 − 20&nbsp;000 × 6&nbsp;000 ÷ 30&nbsp;000 = <strong className="text-success">+{eur(2000)}</strong> de
            plus-value. Son prix total d&apos;acquisition restant tombe à <strong>{eur(16000)}</strong>. Sans autre
            vente, elle paierait {eur(628)} d&apos;impôt (PFU 31,4&nbsp;%). En décembre, elle vend encore pour{" "}
            {eur(6000)} d&apos;une crypto qui a baissé.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-success/30 bg-success/5 p-5">
              <div className="text-[11px] uppercase tracking-wider text-success">
                Cas 1 — portefeuille globalement en perte
              </div>
              <ul className="mt-3 space-y-1 text-sm text-fg/85">
                <li>Valeur du portefeuille en décembre : <strong>{eur(12000)}</strong> (moins que {eur(16000)})</li>
                <li>
                  Vente : 6&nbsp;000 − 16&nbsp;000 × 6&nbsp;000 ÷ 12&nbsp;000 ={" "}
                  <strong className="text-danger">−{eur(2000)}</strong>
                </li>
                <li>Total de l&apos;année : 2&nbsp;000 − 2&nbsp;000 = <strong>{eur(0)}</strong></li>
                <li className="border-t border-border mt-3 pt-3">
                  Impôt : <strong className="text-fg">{eur(0)}</strong> au lieu de {eur(628)}
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-5">
              <div className="text-[11px] uppercase tracking-wider text-danger">
                Cas 2 — portefeuille globalement en gain
              </div>
              <ul className="mt-3 space-y-1 text-sm text-fg/85">
                <li>Valeur du portefeuille en décembre : <strong>{eur(20000)}</strong> (plus que {eur(16000)})</li>
                <li>
                  Vente : 6&nbsp;000 − 16&nbsp;000 × 6&nbsp;000 ÷ 20&nbsp;000 ={" "}
                  <strong className="text-success">+{eur(1200)}</strong>
                </li>
                <li>Total de l&apos;année : 2&nbsp;000 + 1&nbsp;200 = <strong>{eur(3200)}</strong></li>
                <li className="border-t border-border mt-3 pt-3">
                  Impôt : <strong className="text-danger">{eur(1004.8)}</strong> au lieu de {eur(628)}
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs text-fg/70 leading-relaxed">
            Même crypto vendue, même montant, résultat opposé&nbsp;: seule la valeur du portefeuille entier a changé.
            Dans le cas 2, vendre la crypto « perdante » a <strong>augmenté</strong> l&apos;impôt.
          </p>
        </section>

        {/* Ce qui ne marche pas */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold">Ce qui ne marche pas</h2>
          <ul className="mt-4 space-y-3 text-fg/85 leading-relaxed">
            <li>
              <strong>Échanger la crypto en perte contre une autre.</strong> Un échange entre cryptos n&apos;est pas
              imposable&nbsp;: il ne crée ni gain ni perte.
            </li>
            <li>
              <strong>Garder une moins-value pour plus tard.</strong> Elle ne compense que les plus-values crypto de
              la même année (article 150 VH bis, IV), puis elle est perdue&nbsp;: aucun report, aucune imputation sur
              les actions.
            </li>
            <li>
              <strong>Compter une perte « sur le papier ».</strong> Tant que vous n&apos;avez rien vendu contre des
              euros, il n&apos;y a ni plus-value ni moins-value.
            </li>
            <li>
              <strong>Vendre et racheter aussitôt, sans autre raison que l&apos;impôt.</strong> Aucune règle propre
              aux cryptos ne l&apos;interdit, mais l&apos;administration peut écarter une opération à but
              exclusivement ou principalement fiscal (abus de droit, articles L64 et L64 A du livre des procédures
              fiscales).
            </li>
          </ul>
        </section>

        <div className="mt-10 rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3 text-sm text-fg/85">
          <AlertTriangle className="h-4 w-4 text-warning-fg mt-0.5 shrink-0" aria-hidden />
          <p className="leading-relaxed">
            <strong>Information générale, pas un conseil fiscal personnalisé.</strong> Cette page décrit la règle des
            particuliers (article 150 VH bis du CGI). Une activité professionnelle (BIC), le minage, le staking ou la
            DeFi peuvent relever d&apos;autres règles. Avant de vendre pour des raisons fiscales, faites vérifier
            votre cas par un expert-comptable ou un avocat fiscaliste.
          </p>
        </div>

        <section className="mt-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Faites le calcul avec vos chiffres</h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Le générateur 2086 calcule chaque vente avec la valeur de votre portefeuille au jour de la vente, et vous
            dit si elle crée une plus-value ou une moins-value. Gratuit, sans compte.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/outils/cerfa-2086-auto" className="btn-primary btn-primary-shine">
              Calculer mes ventes (2086)
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/outils/calculateur-fiscalite" className="btn-ghost">
              Estimer mon impôt
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-fg">
                  {item.q}
                  <span className="text-primary transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted">
            Sources&nbsp;: article 150 VH bis du code général des impôts (III et IV)&nbsp;; BOFiP
            BOI-RPPM-PVBMC-30-20 (§ 1, § 110, § 160)&nbsp;; articles L64 et L64 A du livre des procédures fiscales.
          </p>
        </section>

        <div className="mt-12">
          <RelatedPagesNav
            currentPath="/outils/tax-loss-harvesting"
            variant="default"
            limit={4}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="tax-loss-harvesting" />
        </div>
      </div>
    </article>
  );
}
