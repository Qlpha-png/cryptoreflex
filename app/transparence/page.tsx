import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Eye,
  HandCoins,
  Scale,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import { getAllPlatforms, type Platform } from "@/lib/platforms";
import StructuredData from "@/components/StructuredData";
import {
  graphSchema,
  breadcrumbSchema,
  organizationSchema,
} from "@/lib/schema";

/* -------------------------------------------------------------------------- */
/*  Metadata SEO                                                              */
/* -------------------------------------------------------------------------- */

const PAGE_PATH = "/transparence";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: `Transparence et partenariats — ${BRAND.name}`,
  description:
    "Liste exhaustive de nos partenariats d'affiliation, statut MiCA/CASP de chaque plateforme, type de rémunération perçue et engagement éditorial. Conformité loi Influenceurs juin 2023.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `Transparence et partenariats — ${BRAND.name}`,
    description:
      "Tous nos partenariats actifs, leur statut MiCA et la rémunération perçue. Aucune note achetée, méthodologie publique.",
    url: PAGE_URL,
    type: "website",
    siteName: BRAND.name,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: `Transparence et partenariats — ${BRAND.name}`,
    description:
      "Tous nos partenariats actifs, leur statut MiCA et la rémunération perçue.",
  },
  robots: { index: true, follow: true },
};

/* -------------------------------------------------------------------------- */
/*  Const partnerships (rémunération + date de mise en place)                 */
/*                                                                            */
/*  Hardcodé ici plutôt que dans data/platforms.json parce que :              */
/*   - cette information est de nature légale/financière, pas éditoriale      */
/*   - on veut un seul fichier à auditer pour la DGCCRF                       */
/*   - le statut "EN REVIEW" peut changer rapidement (candidature acceptée /  */
/*     refusée) sans impacter le reste du site.                               */
/* -------------------------------------------------------------------------- */

type PartnershipStatus = "live" | "review";

interface PartnershipMeta {
  revenue: string;
  since: string;
  status: PartnershipStatus;
}

const PARTNERSHIPS: Record<string, PartnershipMeta> = {
  binance: {
    revenue: "Commission via code referral CRYPTOREFLEX",
    since: "2026-04-25",
    status: "live",
  },
  bitpanda: {
    revenue:
      "Tell-a-Friend (10€/filleul). Application Partners en cours (25% lifetime).",
    since: "2026-04-25",
    status: "live",
  },
  "trade-republic": {
    revenue: "Parrainage in-app (15€/filleul + 200€ d'actions au filleul)",
    since: "2026-04-25",
    status: "live",
  },
  ledger: {
    revenue: "10% commission sur hardware (Nano S+, Nano X, Stax)",
    since: "2026-04-26",
    status: "live",
  },
  coinbase: {
    revenue: "EN REVIEW — 50% des fees pendant 3 mois (Impact.com)",
    since: "candidature soumise 2026-04-25",
    status: "review",
  },
  bitget: {
    revenue: "EN REVIEW — 50% commission (programme Influencer)",
    since: "candidature soumise 2026-04-25",
    status: "review",
  },
  swissborg: {
    revenue: "EN REVIEW",
    since: "candidature soumise 2026-04-25",
    status: "review",
  },
  trezor: {
    revenue: "EN REVIEW — 12-15% hardware (Cellxpert)",
    since: "candidature soumise 2026-04-26",
    status: "review",
  },
};

const PAGE_LAST_UPDATED = "2026-04-26";

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function TransparencePage() {
  const allPlatforms = getAllPlatforms();
  // On ne montre dans le tableau que les plateformes pour lesquelles un statut
  // de partenariat est documenté ci-dessus (live OU review).
  const trackedRows: Array<Platform & { partnership: PartnershipMeta }> =
    allPlatforms
      .filter((p) => PARTNERSHIPS[p.id])
      .map((p) => ({ ...p, partnership: PARTNERSHIPS[p.id] }));

  const livePartnerships = trackedRows.filter(
    (r) => r.partnership.status === "live"
  );
  const reviewPartnerships = trackedRows.filter(
    (r) => r.partnership.status === "review"
  );

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Transparence et partenariats", url: PAGE_PATH },
  ]);
  const ld = graphSchema([breadcrumbs, organizationSchema()]);

  return (
    <article className="py-16 sm:py-20">
      <StructuredData data={ld} id="transparence-jsonld" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* HERO ------------------------------------------------------------- */}
        <header className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Sparkles className="h-3.5 w-3.5" />
            Conformité loi Influenceurs (n°2023-451 du 9 juin 2023)
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
            Transparence absolue sur{" "}
            <span className="gradient-text">nos partenariats</span>
          </h1>
          <p className="mt-5 text-lg text-fg/80 leading-relaxed">
            {BRAND.name} est un comparateur indépendant financé par des liens
            d'affiliation. Chaque fois que vous ouvrez un compte sur une
            plateforme via l'un de nos liens, nous percevons une commission —
            <strong className="text-fg"> sans aucun surcoût pour vous</strong>.
            Cette page liste exhaustivement nos partenariats actifs, leur
            statut réglementaire MiCA, et le type de rémunération perçu.
          </p>
          <p className="mt-3 text-sm text-muted">
            Dernière mise à jour :{" "}
            {new Date(PAGE_LAST_UPDATED).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Les modifications sont historisées dans Git (audit trail public).
          </p>
        </header>

        {/* ENGAGEMENTS (3 cards) -------------------------------------------- */}
        <section className="mt-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-fg">
            Notre engagement éditorial
          </h2>
          <p className="mt-2 text-sm text-muted max-w-2xl">
            Trois règles non négociables qui définissent ce que nos
            partenariats commerciaux ne nous autorisent <em>pas</em> à faire.
          </p>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <EngagementCard
              Icon={Eye}
              title="Aucune note achetée"
              body="Les scoring sont calculés selon une méthodologie publique et identique pour toutes les plateformes — affiliées ou non. Aucun annonceur ne peut influencer une note ou un classement."
              cta={{ label: "Voir la méthodologie", href: "/methodologie" }}
            />
            <EngagementCard
              Icon={ShieldCheck}
              title="Filtre MiCA-only"
              body="Nous ne recommandons que des plateformes agréées CASP au sens du règlement MiCA (UE) 2023/1114. Les acteurs en attente d'agrément sont signalés explicitement comme « à risque juillet 2026 »."
              cta={{ label: "Vérificateur MiCA", href: "/outils/verificateur-mica" }}
            />
            <EngagementCard
              Icon={FileText}
              title="Refus du sponsoring caché"
              body="Aucun article « as-told-to », aucun publi-rédactionnel déguisé en review. Tout contenu commandé par une marque est marqué « Publicité » dès la première ligne, conformément à la charte ARPP et à la loi Influenceurs."
              cta={{ label: "Notre offre sponsoring", href: "/sponsoring" }}
            />
          </div>
        </section>

        {/* TABLEAU PARTENARIATS LIVE ---------------------------------------- */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-fg">
              Partenariats actifs
            </h2>
            <span className="text-xs text-muted">
              {livePartnerships.length} plateforme
              {livePartnerships.length > 1 ? "s" : ""} en production
            </span>
          </div>
          <p className="mt-2 text-sm text-muted max-w-3xl">
            Pour chaque partenaire actif : statut MiCA, numéro d'enregistrement
            AMF, type exact de rémunération que perçoit {BRAND.name}, et date
            de mise en place du programme.
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface/40">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface/70 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Plateforme</th>
                  <th className="px-4 py-3 text-left font-semibold">Statut MiCA</th>
                  <th className="px-4 py-3 text-left font-semibold">N° AMF</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Rémunération perçue
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Depuis</th>
                  <th className="px-4 py-3 text-left font-semibold sr-only">
                    Avis
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {livePartnerships.map((row) => (
                  <PartnershipRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TABLEAU PARTENARIATS EN REVIEW ----------------------------------- */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-fg">
              Candidatures en cours
            </h2>
            <span className="text-xs text-muted">
              {reviewPartnerships.length} dossier
              {reviewPartnerships.length > 1 ? "s" : ""} soumis
            </span>
          </div>
          <p className="mt-2 text-sm text-muted max-w-3xl">
            Plateformes pour lesquelles {BRAND.name} a soumis une candidature
            d'affiliation, encore en cours d'instruction par le partenaire.
            Aucune commission n'est encore perçue tant que ces lignes restent
            en review — mais la mention « Publicité » est appliquée dès
            l'activation.
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface/40">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface/70 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Plateforme</th>
                  <th className="px-4 py-3 text-left font-semibold">Statut MiCA</th>
                  <th className="px-4 py-3 text-left font-semibold">N° AMF</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Rémunération prévue
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold sr-only">
                    Avis
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviewPartnerships.map((row) => (
                  <PartnershipRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* COMMENT ON PERÇOIT LA COMMISSION --------------------------------- */}
        <section className="mt-16 rounded-2xl border border-border bg-surface/30 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <HandCoins className="h-6 w-6 text-accent-cyan shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-fg">
                Comment percevons-nous notre commission&nbsp;?
              </h2>
              <div className="mt-3 space-y-3 text-fg/85 leading-relaxed text-sm sm:text-base">
                <p>
                  Quand vous cliquez sur un lien marqué « Publicité » et que
                  vous ouvrez un compte chez la plateforme partenaire, votre
                  navigateur transmet un identifiant unique (souvent un
                  paramètre <code className="rounded bg-surface px-1 py-0.5 text-xs">?ref=CRYPTOREFLEX</code> ou un cookie d'attribution)
                  à la plateforme. Si vous remplissez ensuite la condition
                  prévue par le programme — premier dépôt, premier trade,
                  achat hardware… — la plateforme nous reverse une commission
                  qui peut être un montant fixe (ex&nbsp;: 10€ pour Bitpanda),
                  un pourcentage des frais que vous payez (ex&nbsp;: 50% sur 3
                  mois pour Coinbase), ou un pourcentage du panier (ex&nbsp;:
                  10% sur les ventes Ledger).
                </p>
                <p>
                  Cette commission est <strong>payée par la plateforme,
                  prélevée sur sa propre marge</strong> — jamais sur ce que
                  vous déposez. Le tarif que vous payez (frais de trading,
                  spread, prix d'un Nano X) est strictement identique à celui
                  que vous obtiendriez en accédant à la plateforme directement
                  sans passer par {BRAND.name}.
                </p>
                <p>
                  Pour des raisons de transparence comptable et conformément
                  aux obligations DGCCRF, l'ensemble des revenus d'affiliation
                  perçus est consolidé dans un audit annuel public publié
                  chaque janvier sur la page{" "}
                  <Link
                    href="/affiliations"
                    className="text-primary-glow underline underline-offset-2"
                  >
                    /affiliations
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CE QUE ÇA CHANGE POUR VOUS --------------------------------------- */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-fg">
            Ce que ça change pour vous
          </h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <BenefitCard
              Icon={CheckCircle2}
              title="0€ pour vous"
              body="Le prix payé est exactement celui de la plateforme. La commission est prélevée sur la marge du partenaire, jamais sur votre dépôt ou vos frais."
            />
            <BenefitCard
              Icon={Eye}
              title="Transparence en clair"
              body="Chaque CTA affiche la mention « Publicité — Cryptoreflex perçoit une commission » et renvoie vers cette page. Aucun lien d'affiliation déguisé."
            />
            <BenefitCard
              Icon={Scale}
              title="Indépendance éditoriale"
              body="Nous évaluons aussi des plateformes sans partenariat (Coinhouse, Kraken FR…) avec la même méthodologie. Aucune note ne dépend du programme d'affiliation."
            />
          </div>
        </section>

        {/* BANDEAU LÉGAL ---------------------------------------------------- */}
        <aside className="mt-16 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-1" />
            <div>
              <h2 className="text-base font-bold text-amber-100">
                Cadre légal de cette page
              </h2>
              <p className="mt-2 text-sm text-amber-50/85 leading-relaxed">
                Cette page de transparence est rédigée en application :
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-amber-50/85 leading-relaxed list-disc pl-5">
                <li>
                  de la <strong>loi n°2023-451 du 9 juin 2023</strong> visant
                  à encadrer l'influence commerciale (« loi Influenceurs »),
                  en particulier l'obligation d'identification claire et
                  apparente du caractère commercial de toute communication ;
                </li>
                <li>
                  des <strong>articles 88 et 89 du règlement MiCA</strong> (UE)
                  2023/1114 sur la communication commerciale relative aux
                  cryptoactifs ;
                </li>
                <li>
                  de la <strong>doctrine AMF</strong> Position-Recommandation
                  DOC-2024-01 sur la promotion de cryptoactifs ;
                </li>
                <li>
                  des <strong>recommandations DGCCRF</strong> en matière de
                  pratiques commerciales trompeuses (Art. L121-1 du Code de
                  la consommation modifié), dont la sanction maximale est de
                  6 mois d'emprisonnement et 300 000€ d'amende, assortie
                  d'une interdiction professionnelle de 5 ans.
                </li>
              </ul>
              <p className="mt-3 text-xs text-amber-50/70 leading-relaxed">
                Pour signaler une mention manquante ou inexacte, écrivez à{" "}
                <a
                  href={`mailto:${BRAND.email}?subject=Transparence%20-%20signalement`}
                  className="underline hover:text-amber-100"
                >
                  {BRAND.email}
                </a>
                . Nous corrigeons sous 48h ouvrées.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function EngagementCard({
  Icon,
  title,
  body,
  cta,
}: {
  Icon: typeof Eye;
  title: string;
  body: string;
  cta: { label: string; href: string };
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5">
      <Icon className="h-6 w-6 text-accent-green mb-3" />
      <h3 className="font-semibold text-fg text-base">{title}</h3>
      <p className="mt-2 text-sm text-fg/75 leading-relaxed">{body}</p>
      <Link
        href={cta.href}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-glow hover:text-primary"
      >
        {cta.label} <ExternalLink className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}

function BenefitCard({
  Icon,
  title,
  body,
}: {
  Icon: typeof CheckCircle2;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 p-5">
      <Icon className="h-5 w-5 text-accent-cyan mb-3" />
      <h3 className="font-semibold text-fg text-base">{title}</h3>
      <p className="mt-2 text-sm text-fg/75 leading-relaxed">{body}</p>
    </div>
  );
}

function PartnershipRow({
  row,
}: {
  row: Platform & { partnership: PartnershipMeta };
}) {
  const isReview = row.partnership.status === "review";
  return (
    <tr className="hover:bg-surface/50">
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/5 ring-1 ring-border overflow-hidden">
            <Image
              src={row.logo}
              alt=""
              width={20}
              height={20}
              className="object-contain"
            />
          </span>
          <div>
            <div className="font-semibold text-fg">{row.name}</div>
            <div className="text-[11px] text-muted capitalize">
              {row.category}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top text-fg/80 text-xs leading-snug max-w-[220px]">
        {row.mica.status}
      </td>
      <td className="px-4 py-3 align-top text-xs">
        {row.mica.amfRegistration ? (
          <code className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-fg/90">
            {row.mica.amfRegistration}
          </code>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-fg/80 text-xs leading-snug max-w-[280px]">
        {row.partnership.revenue}
      </td>
      <td className="px-4 py-3 align-top text-xs">
        {isReview ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">
            <Clock className="h-3 w-3" /> {row.partnership.since}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/15 px-2 py-0.5 text-[11px] font-medium text-accent-green">
            <CheckCircle2 className="h-3 w-3" />{" "}
            {new Date(row.partnership.since).toLocaleDateString("fr-FR")}
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-xs">
        <Link
          href={`/avis/${row.id}`}
          className="inline-flex items-center gap-1 font-semibold text-primary-glow hover:text-primary whitespace-nowrap"
        >
          Voir l'avis
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}
