import { avecTypoSync } from "@/components/ui/Typo";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, ShieldAlert, ShieldCheck, Sparkles, Wallet } from "lucide-react";

import { getAllPlatforms, getPlatformById, isAvailableFr, type Platform } from "@/lib/platforms";
import { getPublishableComparisons, type ComparisonSpec } from "@/lib/programmatic";
import { buildRows } from "@/lib/comparateur";
import { BRAND, STATS } from "@/lib/brand";
import { paidLinkCaption } from "@/lib/partnerships";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import PlatformLogo from "@/components/PlatformLogo";
import Comparateur from "@/components/comparateur/Comparateur";
import ComparateurNotice from "@/components/ComparateurNotice";
import { breadcrumbSchema, faqSchema, graphSchema, type JsonLd } from "@/lib/schema";
import { fitDescription } from "@/lib/seo-text";

/**
 * /comparatif — refonte du 05/10/2026 (GO de Kev : « beau, fluide, simple, qu'un enfant de 8 ans puisse tout faire »).
 * Avant : 0 tableau, 43 tuiles de duels dont 12 avec Binance, 14 écrans sur téléphone, portefeuilles mélangés aux
 * plateformes, pastilles « Audit récent » et « 0 incident » sans source. Maintenant : deux questions et une liste
 * classée par le coût réel d'un achat (lib/comparateur.ts), un panier « Comparer », le reste replié.
 */

export const revalidate = 86400;

const PAGE_PATH = "/comparatif";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Comparatif plateformes crypto MiCA 2026";
const DESCRIPTION = `Les ${STATS.platforms} plateformes crypto autorisées en France, classées par le vrai coût d'un achat de 100 € ou 1 000 € (après virement ou par carte). Frais relevés sur les grilles officielles, agréments vérifiés.`;

export const metadata: Metadata = {
  title: TITLE,
  description: fitDescription(DESCRIPTION),
  alternates: withHreflang(PAGE_URL),
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  keywords: ["comparatif plateforme crypto", "meilleure plateforme crypto france", "frais plateforme crypto", "comparatif crypto MiCA"],
};

const FAQ = [
  {
    question: "Comment Cryptoreflex classe les plateformes ?",
    answer:
      "Par le coût réel d'un achat de Bitcoin de 100 € ou de 1 000 € par le chemin le plus simple de l'appli, après un virement ou par carte. Les frais sont relevés sur la grille tarifaire officielle de chaque plateforme (source et date affichées). Quand la plateforme publie un maximum pour sa marge, on compte ce maximum (« au plus »). Quand elle ajoute une marge sans la chiffrer, son coût n'est qu'un minimum et elle passe après celles dont le coût est publié ; celles qui ne publient pas leurs frais passent en dernier.",
  },
  {
    question: "Pourquoi Binance n'est-elle pas dans la liste ?",
    answer:
      "Binance a cessé ses services sur crypto-actifs en France le 1er juillet 2026, à la fin de la période transitoire MiCA, et ne figure pas au registre MiCA de l'ESMA. Depuis cette date, seule une plateforme agréée MiCA avec un accès à la France peut servir les résidents français.",
  },
  {
    question: "Qu'est-ce que l'agrément MiCA ?",
    answer:
      "MiCA est le règlement européen sur les crypto-actifs. Une plateforme qui sert des clients en France doit être agréée comme prestataire (CASP), par l'AMF ou par l'autorité d'un autre pays de l'Union avec un passeport vers la France. Nous vérifions chaque statut sur le registre de l'ESMA et la liste blanche de l'AMF.",
  },
  {
    question: "Cryptoreflex est-il payé par les plateformes ?",
    answer:
      "Certains liens sont rémunérés (parrainage ou affiliation) : c'est indiqué à côté du lien et détaillé sur la page Transparence. Le classement n'en tient pas compte : il suit uniquement le coût et les critères publics.",
  },
];

function duelTitle(c: ComparisonSpec): string {
  return `${getPlatformById(c.a)?.name ?? c.a} vs ${getPlatformById(c.b)?.name ?? c.b}`;
}

function ComparatifPage() {
  const all = getAllPlatforms();
  /* mention affichée seulement quand le lien rapporte quelque chose (sinon : bruit inutile sous chaque carte) */
  // 06/10/2026 : même mention « Publicité — … » (bon type) que partout ailleurs sur le site.
  const rows = buildRows(all, (id) => paidLinkCaption(id) ?? "");
  const wallets = all.filter((p) => p.category === "wallet");
  const blocked: Platform[] = all.filter((p) => p.category !== "wallet" && !isAvailableFr(p));
  const duels = getPublishableComparisons().filter((c) => {
    const a = getPlatformById(c.a), b = getPlatformById(c.b);
    return !!a && !!b && isAvailableFr(a) && isAvailableFr(b);
  }).sort((x, y) => y.priority - x.priority);

  const itemList: JsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${PAGE_URL}#plateformes`,
    name: `Plateformes crypto autorisées en France`,
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, url: `${BRAND.url}/avis/${r.id}`, name: r.name })),
  };
  const schema = graphSchema([
    itemList,
    breadcrumbSchema([{ name: "Accueil", url: "/" }, { name: "Comparatif", url: PAGE_PATH }]),
    faqSchema(FAQ),
  ]);

  return (
    <>
      <StructuredData data={schema} id="comparatif-hub" />
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">Accueil</Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Comparatif</span>
          </nav>

          <header className="mt-5 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Comparatif des plateformes crypto
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Où acheter des cryptos <span className="gradient-text">en France ?</span>
            </h1>
            <p className="mt-3 text-base text-fg/75 sm:text-lg">
              Les {rows.length} plateformes autorisées, rangées par le prix que vous payez vraiment. Répondez à deux questions,
              la liste se range toute seule.
            </p>
          </header>

          <ComparateurNotice
            className="mt-5"
            critere={
              <>
                par défaut, le coût d&apos;un achat de Bitcoin de 100 € après un virement, relevé sur la grille officielle de
                chaque plateforme. Les coûts publiés en entier ou plafonnés passent d&apos;abord, puis ceux qui ajoutent une
                marge non chiffrée, puis ceux qui ne sont pas publiés ; à coût égal, la note sur 5 départage. Les boutons
                ci-dessous changent ce critère.
              </>
            }
            perimetre={
              <>
                les {rows.length} plateformes autorisées en France de notre base de {all.filter((p) => p.category !== "wallet").length}{" "}
                plateformes étudiées. D&apos;autres prestataires agréés peuvent servir la France sans figurer ici.
              </>
            }
          />

          <div className="mt-6">
            <Comparateur rows={rows} duelSlugs={duels.map((d) => d.slug)} />
          </div>

          {/* Le reste, replié : une idée par bloc */}
          <div className="mt-10 space-y-3">
            <details className="group rounded-2xl border border-border bg-surface p-4 open:pb-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-bold text-fg">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent-green" aria-hidden="true" /> Comment on calcule ?</span>
                <ChevronDown className="h-5 w-5 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <ul className="mt-3 space-y-2 text-sm text-fg/80">
                <li>• On prend le chemin le plus simple de chaque appli : un achat de Bitcoin depuis votre solde en euros, après un virement SEPA (ou par carte si vous le choisissez).</li>
                <li>• Les frais viennent de la grille tarifaire officielle de la plateforme : la source et la date sont sous chaque ligne.</li>
                <li>• « au plus » : la plateforme publie un maximum pour sa marge, et c&apos;est ce maximum que l&apos;on compte.</li>
                <li>• « + marge non publiée » : la plateforme ajoute une marge au prix sans la chiffrer. Le montant affiché est alors un minimum, et elle passe après celles dont le coût est publié.</li>
                <li>• « Non publié » : la plateforme ne chiffre pas ses frais. Elle passe en dernier.</li>
                <li>• Seules les plateformes agréées MiCA avec un accès à la France sont classées (registre de l&apos;ESMA, liste blanche de l&apos;AMF).</li>
              </ul>
              <Link href="/methodologie" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Toute la méthode <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </details>

            <details className="group rounded-2xl border border-border bg-surface p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-bold text-fg">
                <span className="inline-flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" aria-hidden="true" /> Pour garder vos cryptos vous-même</span>
                <ChevronDown className="h-5 w-5 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-sm text-fg/80">
                Un portefeuille matériel garde vos cryptos hors ligne, sous votre seul contrôle. Il n&apos;achète rien : vous achetez sur une plateforme, puis vous transférez.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {wallets.map((w) => (
                  <Link key={w.id} href={`/avis/${w.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 hover:border-primary/50">
                    <PlatformLogo id={w.id} name={w.name} size={32} />
                    <span className="font-bold text-fg">{w.name}</span>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </details>

            <details className="group rounded-2xl border border-border bg-surface p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-bold text-fg">
                <span className="inline-flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-danger-fg" aria-hidden="true" /> À éviter en France ({blocked.length})</span>
                <ChevronDown className="h-5 w-5 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-sm text-fg/80">Ces plateformes ne peuvent pas (ou plus) servir les résidents français.</p>
              <ul className="mt-3 divide-y divide-border">
                {blocked.map((p) => (
                  <li key={p.id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-3">
                    <Link href={`/avis/${p.id}`} className="shrink-0 font-semibold text-fg hover:text-primary">{p.name}</Link>
                    <span className="text-xs text-muted">{p.mica.status}</span>
                  </li>
                ))}
              </ul>
            </details>

            <details className="group rounded-2xl border border-border bg-surface p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-bold text-fg">
                <span>Les duels détaillés ({duels.length})</span>
                <ChevronDown className="h-5 w-5 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {duels.map((c) => (
                  <Link key={c.slug} href={`/comparatif/${c.slug}`} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-fg hover:border-primary/50">
                    {duelTitle(c)} <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </details>
          </div>

          <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold text-fg">Filtrer selon vos critères</p>
              <p className="mt-1 text-sm text-fg/70">Paiement par carte, aide en français, coût publié : la liste des plateformes autorisées qui les remplissent.</p>
            </div>
            <Link href="/quiz/plateforme" className="btn-primary shrink-0 px-4 py-2.5 text-sm">
              Ouvrir le filtre <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <section className="mt-10" aria-labelledby="faq-comparatif">
            <h2 id="faq-comparatif" className="text-xl font-extrabold text-fg">Questions fréquentes</h2>
            <div className="mt-3 space-y-2">
              {FAQ.map((f) => (
                <details key={f.question} className="group rounded-2xl border border-border bg-surface p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-fg">
                    {f.question}
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-fg/80">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <p className="mt-10 max-w-[34em] text-xs leading-relaxed text-muted">
            Cryptoreflex est un média indépendant. Certains liens sont rémunérés, sans surcoût pour vous et sans effet sur le
            classement (<Link href="/transparence" className="underline hover:text-fg">transparence</Link>,{" "}
            <Link href="/methodologie" className="underline hover:text-fg">méthodologie</Link>). Investir dans les crypto-actifs
            comporte un risque de perte en capital. Cette page ne constitue pas un conseil en investissement.
          </p>
        </div>
      </section>
    </>
  );
}

export default avecTypoSync(ComparatifPage);
