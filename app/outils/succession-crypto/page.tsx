import type { Metadata } from "next";
import Link from "next/link";
import VerifieLe from "@/components/ui/VerifieLe";
import { Heart, ShieldAlert, Scale, Users, FileText, ArrowRight } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { articleSchema, faqSchema, graphSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import SuccessionCryptoTool from "@/components/SuccessionCryptoTool";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import Breadcrumbs from "@/components/Breadcrumbs";

/**
 * /outils/succession-crypto — outil « Succession crypto » (terminé le 05/10/2026 ; page « Bientôt » auparavant).
 *
 * Générateur de lettre d'intention + liste de contrôle (components/SuccessionCryptoTool, lib/succession-crypto :
 * tout dans le navigateur, phrase de récupération / clé privée bloquées) + guide légal et fiscal français.
 * Chaque règle chiffrée ou article cité a été vérifié le 05/10/2026 sur Légifrance, service-public.fr, BOFiP ou
 * notaires.fr (sources en bas de page) : à revérifier à chaque loi de finances.
 */

export const revalidate = 86400;

const PATH = "/outils/succession-crypto";

export const metadata: Metadata = {
  title: fitTitle("Succession crypto : transmettre ses cryptos à ses proches"),
  description: fitDescription(
    "Transmettre ses cryptos sans qu'elles se perdent : lettre d'intention gratuite à imprimer, liste de contrôle, testament et droits de succession en France. Rien n'est enregistré.",
  ),
  alternates: withHreflang(`${BRAND.url}${PATH}`),
  openGraph: {
    title: "Succession crypto — Cryptoreflex",
    description: "Lettre d'intention à imprimer, liste de contrôle et règles françaises pour transmettre vos cryptos.",
    url: `${BRAND.url}${PATH}`,
    type: "website",
  },
};

/** Barème des droits de succession en ligne directe (art. 777 CGI), part nette après abattement. */
const BAREME_LIGNE_DIRECTE: Array<[string, string]> = [
  ["Jusqu'à 8 072 €", "5 %"],
  ["De 8 072 € à 12 109 €", "10 %"],
  ["De 12 109 € à 15 932 €", "15 %"],
  ["De 15 932 € à 552 324 €", "20 %"],
  ["De 552 324 € à 902 838 €", "30 %"],
  ["De 902 838 € à 1 805 677 €", "40 %"],
  ["Au-delà de 1 805 677 €", "45 %"],
];

/** Abattements et taux selon le lien de parenté (art. 777, 779, 788 et 796-0 bis CGI). */
const PAR_LIEN: Array<[string, string, string]> = [
  ["Conjoint marié ou partenaire de PACS", "Exonération totale", "—"],
  ["Enfant (ou parent)", "100 000 €", "Barème ci-dessous, de 5 % à 45 %"],
  ["Frère ou sœur", "15 932 €", "35 % jusqu'à 24 430 €, 45 % au-delà (exonération possible sous conditions)"],
  ["Neveu ou nièce", "7 967 €", "55 %"],
  ["Autre parent jusqu'au 4e degré", "1 594 €", "55 %"],
  ["Au-delà, ou sans lien de parenté (concubin compris)", "1 594 €", "60 %"],
];

/** Sources vérifiées le 05/10/2026 (Légifrance : textes consolidés en vigueur ; liens ouverts un par un). */
const SOURCES: Array<[string, string]> = [
  ["Droits de succession : barème et abattements (service-public.gouv.fr)", "https://www.service-public.gouv.fr/particuliers/vosdroits/F14198"],
  ["Article 777 du CGI — barème des droits", "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000030061736"],
  ["Article 779 du CGI — abattements", "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000026292566"],
  ["Article 150 VH bis du CGI — prix d'acquisition des crypto-actifs reçus par succession", "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038612228"],
  ["BOFiP BOI-RPPM-PVBMC-30-20, § 80 et 90 — succession et justificatifs", "https://bofip.impots.gouv.fr/bofip/11968-PGP.html/identifiant=BOI-RPPM-PVBMC-30-20-20190902"],
  ["Article 970 du Code civil — testament olographe", "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006434066"],
  ["Article 812 du Code civil — mandat à effet posthume", "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006431826"],
  ["Article 85 de la loi Informatique et Libertés — directives après décès", "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039280582"],
  ["Fichier central des dispositions de dernières volontés (service-public.gouv.fr)", "https://www.service-public.gouv.fr/particuliers/vosdroits/F15009"],
];

const SIMULATEUR_URL = "https://www.service-public.gouv.fr/simulateur/calcul/droits-succession";

export default function SuccessionCryptoPage() {
  const faqItems = [
    {
      q: "Que deviennent mes cryptos si je décède sans rien prévoir ?",
      a: "Sur une plateforme (Coinbase, Kraken, Bitpanda…), vos héritiers peuvent en général récupérer le compte en justifiant de leur qualité d'héritier. Dans un portefeuille que vous détenez vous-même (clé Ledger, MetaMask…), personne ne peut retrouver une phrase de récupération perdue : ni le fabricant, ni la plateforme, ni le notaire. Les fonds sont alors inaccessibles pour toujours.",
    },
    {
      q: "Puis-je écrire ma phrase de récupération dans mon testament ?",
      a: "C'est déconseillé : un testament est lu lors du règlement de la succession et ses dispositions sont portées à la connaissance des héritiers et des personnes chargées du dossier. Indiquez plutôt dans votre testament où se trouve l'information (par exemple une enveloppe scellée confiée à votre notaire ou rangée dans un coffre), sans en écrire le contenu.",
    },
    {
      q: "La lettre d'intention remplace-t-elle un testament ?",
      a: "Non. C'est un document d'information pour vos proches, sans valeur juridique contraignante. Pour décider qui hérite de quoi, il faut un testament (écrit en entier, daté et signé de votre main, ou reçu par un notaire). La lettre d'intention se range avec lui pour expliquer, concrètement, comment accéder aux cryptos.",
    },
    {
      q: "Mes héritiers paieront-ils des droits de succession sur mes cryptos ?",
      a: "Oui, comme sur tout autre bien : les crypto-actifs font partie de la succession et sont évalués à leur valeur au jour du décès. Le conjoint et le partenaire de PACS sont exonérés ; chaque enfant bénéficie d'un abattement de 100 000 €, puis du barème de 5 % à 45 %. Les droits portent sur la part reçue de tous les biens, pas sur les seules cryptos.",
    },
    {
      q: "Et si mes héritiers revendent les cryptos plus tard ?",
      a: "La vente est imposée comme une plus-value sur crypto-actifs (formulaire 2086). Pour les cryptos reçues par succession, le prix d'acquisition retenu est la valeur prise en compte pour le calcul des droits de succession, même si l'héritier en est exonéré (conjoint, partenaire de PACS). Sans justificatif, ce prix est réputé nul : conservez la déclaration de succession et les preuves de valeur au jour du décès.",
    },
    {
      q: "Mes données sont-elles enregistrées ?",
      a: "Non. L'outil fonctionne entièrement dans votre navigateur : rien n'est envoyé à Cryptoreflex ni enregistré. Si vous fermez la page, tout disparaît ; pensez à imprimer ou télécharger votre lettre avant.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/succession-crypto",
      title: "Succession crypto : transmettre ses cryptos à ses proches",
      description: "Lettre d'intention à imprimer, liste de contrôle et règles françaises pour transmettre ses crypto-actifs.",
      date: "2026-05-02",
      dateModified: "2026-10-05",
      category: "Outil",
      tags: ["succession", "héritage crypto", "testament", "transmission", "droits de succession"],
    }),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="succession-crypto" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin="/outils/succession-crypto" />

        <header className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-soft">
            <Heart className="h-3 w-3" aria-hidden /> Gratuit · rien n&apos;est enregistré
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text">Succession crypto</span> : transmettez vos cryptos sans qu&apos;elles se perdent
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Si vous disparaissiez demain, vos proches sauraient-ils que vous avez des cryptos, où elles sont et
            comment y accéder ? En 10 minutes, préparez une lettre d&apos;intention à ranger avec votre testament,
            vérifiez vos points de sécurité et découvrez les règles françaises.
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Un portefeuille dont personne ne connaît l'accès est perdu pour toujours. Une lettre claire, rangée au bon endroit, évite ce drame."
            bullets={[
              { emoji: "📝", text: "Lettre d'intention générée ici, à imprimer et signer (sans aucun secret dedans)" },
              { emoji: "🔐", text: "Vos phrases de récupération : sur papier, en lieu sûr, jamais dans le testament" },
              { emoji: "⚖️", text: "Le testament décide qui hérite ; la lettre explique comment accéder aux cryptos" },
              { emoji: "💶", text: "Droits de succession : comme tout bien, valeur au jour du décès" },
            ]}
            readingTime="10 min"
            level="Tous niveaux"
          />
        </div>

        {/* Règles d'or */}
        <section className="mt-12" aria-labelledby="regles-or">
          <h2 id="regles-or" className="text-2xl font-bold tracking-tight">Les 3 règles d&apos;or</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { Icon: ShieldAlert, title: "Aucun secret par écrit en clair", body: "Jamais de phrase de récupération dans un testament, un e-mail, une photo ou un service en ligne. Notez-la sur papier ou sur métal et rangez-la en lieu sûr." },
              { Icon: Users, title: "Vos proches doivent savoir", body: "Ils doivent savoir que vous avez des cryptos, qui contacter (notaire, personne de confiance) et où trouver l'accès, sans connaître le secret de votre vivant." },
              { Icon: FileText, title: "Tout est écrit et à jour", body: "Une lettre d'intention qui liste vos plateformes et portefeuilles, rangée avec votre testament et relue au moins une fois par an." },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border bg-elevated/40 p-5">
                <Icon className="h-6 w-6 text-primary" aria-hidden />
                <h3 className="mt-3 text-base font-bold">{title}</h3>
                <p className="mt-2 text-sm text-fg/80 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Outil */}
        <section className="mt-14" aria-labelledby="outil">
          <h2 id="outil" className="text-2xl font-bold tracking-tight">Préparez votre lettre d&apos;intention</h2>
          <p className="mt-2 text-sm text-fg/75">
            Remplissez ce que vous voulez : les champs vides restent en blanc dans la lettre, à compléter à la main.
          </p>
          <div className="mt-6">
            <SuccessionCryptoTool />
          </div>
        </section>

        {/* Cadre légal */}
        <section className="mt-14" aria-labelledby="cadre-legal">
          <h2 id="cadre-legal" className="text-2xl font-bold tracking-tight">Le cadre légal en France</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              { title: "Le testament", body: "Il désigne qui hérite. Le testament olographe doit être écrit en entier, daté et signé de votre main (article 970 du Code civil) ; le testament authentique est reçu par un notaire. Confié à un notaire, il est inscrit au Fichier central des dispositions de dernières volontés, consulté après le décès." },
              { title: "La lettre d'intention", body: "Document d'information pour vos proches, sans valeur juridique contraignante. Elle explique où sont les cryptos et comment y accéder ; elle complète le testament, elle ne le remplace pas." },
              { title: "L'exécuteur testamentaire", body: "Personne que vous désignez dans votre testament pour veiller à la bonne exécution de vos volontés (articles 1025 et suivants du Code civil). Choisissez de préférence quelqu'un à l'aise avec les cryptos." },
              { title: "Le mandat à effet posthume", body: "Acte notarié par lequel vous chargez une personne de gérer tout ou partie de la succession pour le compte des héritiers, si un intérêt sérieux et légitime le justifie (articles 812 et suivants du Code civil), par exemple un portefeuille crypto complexe." },
              { title: "Vos comptes en ligne", body: "Vous pouvez laisser des directives sur le sort de vos données personnelles après votre décès, auprès des services en ligne eux-mêmes ou d'un tiers de confiance certifié (article 85 de la loi Informatique et Libertés). Elles portent sur vos données, pas sur la propriété de vos cryptos." },
              { title: "La preuve d'héritier", body: "Pour récupérer un compte sur une plateforme, les héritiers présentent l'acte de décès et un document prouvant leur qualité d'héritier, le plus souvent un acte de notoriété établi par le notaire." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-border bg-surface p-5">
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <Scale className="h-4 w-4 text-primary-soft" aria-hidden /> {c.title}
                </h3>
                <p className="mt-2 text-sm text-fg/80 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Héritiers */}
        <section className="mt-14" aria-labelledby="heritiers">
          <h2 id="heritiers" className="text-2xl font-bold tracking-tight">Pour vos héritiers : les démarches</h2>
          <ol className="mt-5 space-y-3">
            {[
              "Contacter le notaire chargé de la succession et lui remettre la lettre d'intention.",
              "Pour chaque plateforme : écrire au service client avec l'acte de décès et l'acte de notoriété ; la plateforme bloque le compte puis transfère les fonds selon sa procédure.",
              "Pour chaque portefeuille personnel (clé, application) : ne le manipuler qu'avec une personne de confiance compétente, sans jamais saisir la phrase de récupération sur un site ou dans un logiciel conseillé par un inconnu.",
              "Évaluer les cryptos à leur valeur vénale au jour du décès (aucune règle propre aux cryptos : c'est la règle générale) et les inclure dans la déclaration de succession. Conserver les justificatifs (cours à cette date, relevés des plateformes) : ils serviront aussi lors d'une revente.",
              "Déposer la déclaration de succession dans les 6 mois suivant le décès s'il a eu lieu en France métropolitaine (12 mois dans les autres cas) ; le notaire s'en charge en général.",
              "Méfiance : aucun vrai service ne demande une phrase de récupération. Les faux « services de récupération » ciblent les familles en deuil.",
            ].map((s, i) => (
              <li key={s} className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-fg/85 leading-relaxed">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>

        {/* Fiscalité */}
        <section className="mt-14" aria-labelledby="fiscalite">
          <h2 id="fiscalite" className="text-2xl font-bold tracking-tight">Droits de succession : les repères</h2>
          <p className="mt-3 text-sm text-fg/80 leading-relaxed">
            Les crypto-actifs sont taxés comme les autres biens : on additionne tout ce que reçoit chaque héritier,
            on retire son abattement, puis on applique le taux lié à son lien de parenté. Les donations reçues du
            défunt depuis moins de 15 ans réduisent l&apos;abattement disponible.
          </p>
          {/* Téléphone : une fiche par héritier (le tableau coupait les mots et cachait les taux à 390 px). */}
          <ul className="mt-5 space-y-3 sm:hidden">
            {PAR_LIEN.map(([who, ab, taux]) => (
              <li key={who} className="rounded-xl border border-border bg-surface p-4 text-sm">
                <p className="font-semibold text-fg">{who}</p>
                <p className="mt-1.5 text-fg/80">
                  Abattement : <span className="whitespace-nowrap font-semibold text-fg">{ab}</span>
                </p>
                <p className="mt-0.5 text-fg/80">Taux : {taux}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-border sm:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Abattements et taux des droits de succession selon le lien de parenté</caption>
              <thead className="bg-elevated/60 text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Héritier</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Abattement</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Taux après abattement</th>
                </tr>
              </thead>
              <tbody>
                {PAR_LIEN.map(([who, ab, taux]) => (
                  <tr key={who} className="border-t border-border/70">
                    <th scope="row" className="px-3 py-2 text-left font-medium text-fg">{who}</th>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{ab}</td>
                    <td className="px-3 py-2">{taux}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mt-8 text-lg font-bold">Barème en ligne directe (enfants, parents)</h3>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">Barème des droits de succession en ligne directe</caption>
              <thead className="bg-elevated/60 text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Part nette taxable (après abattement)</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold text-right">Taux</th>
                </tr>
              </thead>
              <tbody>
                {BAREME_LIGNE_DIRECTE.map(([tranche, taux]) => (
                  <tr key={tranche} className="border-t border-border/70">
                    <td className="px-3 py-2 tabular-nums">{tranche}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{taux}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-fg/80 leading-relaxed">
            <strong>Exemple.</strong> Un enfant reçoit 130 000 € au total, dont 40 000 € de cryptos. Après
            l&apos;abattement de 100 000 €, il reste 30 000 € taxables : 5 % sur 8 072 € + 10 % sur 4 037 € +
            15 % sur 3 823 € + 20 % sur 14 068 € = 403,60 + 403,70 + 573,45 + 2 813,60 ={" "}
            <strong>4 194,35 €</strong> de droits.
          </p>
          <p className="mt-3 text-sm text-fg/80 leading-relaxed">
            <strong>Revente plus tard.</strong> Quand l&apos;héritier revendra ces cryptos, la plus-value sera calculée
            avec, comme prix d&apos;acquisition, la valeur retenue pour les droits de succession (article 150 VH bis du
            CGI), même s&apos;il en était exonéré. Sans justificatif, ce prix est réputé nul : une évaluation sérieuse
            et documentée au jour du décès protège donc deux fois.{" "}
            <Link href="/outils/cerfa-2086-auto" className="font-semibold text-primary-soft underline-offset-2 hover:underline">
              Préparer le formulaire 2086
            </Link>
            .
          </p>
          <p className="mt-3 text-sm text-fg/80 leading-relaxed">
            À savoir : le partenaire de PACS n&apos;hérite que si un testament le prévoit ; un héritier handicapé
            bénéficie d&apos;un abattement supplémentaire de 159 325 €, cumulable. Pour estimer des droits, le{" "}
            <a href={SIMULATEUR_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-soft underline-offset-2 hover:underline">
              simulateur officiel de service-public.gouv.fr
            </a>{" "}
            est gratuit et anonyme.
          </p>
          <p className="mt-3 text-xs text-muted">
            Repères généraux (exonérations particulières, assurance-vie, donations… non détaillés) : pour un chiffrage
            personnel, adressez-vous à votre notaire.
          </p>
        </section>

        <div className="mt-10">
          <AmfDisclaimer variant="fiscalite" />
        </div>

        {/* FAQ */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 space-y-3">
            {faqItems.map((item) => (
              <details key={item.q} className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40">
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-fg">
                  {item.q}
                  <span className="text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Sources */}
        <section className="mt-12" aria-labelledby="sources">
          <h2 id="sources" className="text-lg font-bold">Sources (<VerifieLe date="2026-10-05" famille="fiscalite" label="vérifiées" />)</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {SOURCES.map(([label, href]) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-soft underline-offset-2 hover:underline">
                  {label} <ArrowRight className="h-3 w-3" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Ce guide est informatif et ne remplace pas un notaire. Les montants sont ceux en vigueur à la date de
            vérification.
          </p>
        </section>

        <div className="mt-12">
          <RelatedPagesNav currentPath={PATH} variant="default" limit={4} />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="succession-crypto" />
        </div>
      </div>
    </article>
  );
}
