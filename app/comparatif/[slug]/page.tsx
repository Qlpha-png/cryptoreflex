import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Wallet,
  ShieldCheck,
  Coins,
  HeadphonesIcon,
  Gift,
  ExternalLink,
  ArrowRight,
  Minus,
  Plus,
  Equal,
} from "lucide-react";
import { getPlatformById, type Platform } from "@/lib/platforms";
import {
  COMPARISONS,
  getComparison,
  getPublishableComparisons,
  parseComparisonSlug,
} from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import MiCAComplianceBadge from "@/components/MiCAComplianceBadge";
import { breadcrumbSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";

export const revalidate = 86400;

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getPublishableComparisons().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const parsed = parseComparisonSlug(params.slug);
  if (!parsed) return {};
  const a = getPlatformById(parsed.a);
  const b = getPlatformById(parsed.b);
  if (!a || !b) return {};
  const title = `${a.name} vs ${b.name} 2026 : comparatif frais, sécurité, MiCA`;
  const description = `${a.name} ou ${b.name} ? Comparatif détaillé : frais (spot, instant, retrait), sécurité, agrément MiCA, support FR, bonus. Verdict Cryptoreflex.`;
  return {
    title,
    description,
    alternates: { canonical: `${BRAND.url}/comparatif/${params.slug}` },
    openGraph: { title, description, url: `${BRAND.url}/comparatif/${params.slug}`, type: "article" },
  };
}

/* ------------------------------------------------------------------
 * Helpers de comparaison
 * ------------------------------------------------------------------ */

type WinnerHint = "a" | "b" | "tie";

function winner(aValue: number, bValue: number, lowerIsBetter = false): WinnerHint {
  if (aValue === bValue) return "tie";
  if (lowerIsBetter) return aValue < bValue ? "a" : "b";
  return aValue > bValue ? "a" : "b";
}

function WinnerBadge({ hint, side }: { hint: WinnerHint; side: "a" | "b" }) {
  if (hint === "tie") return <Equal className="h-4 w-4 text-muted inline" />;
  if (hint === side) return <Trophy className="h-4 w-4 text-primary inline" />;
  return <Minus className="h-4 w-4 text-muted inline" />;
}

interface CompareRow {
  label: string;
  aDisplay: string;
  bDisplay: string;
  hint: WinnerHint;
  /** Pour expliquer pourquoi A ou B gagne sur ce critère. */
  note?: string;
}

function buildRows(a: Platform, b: Platform): { fees: CompareRow[]; security: CompareRow[]; ux: CompareRow[]; support: CompareRow[] } {
  const fees: CompareRow[] = [
    {
      label: "Frais spot maker",
      aDisplay: `${a.fees.spotMaker}%`,
      bDisplay: `${b.fees.spotMaker}%`,
      hint: winner(a.fees.spotMaker, b.fees.spotMaker, true),
    },
    {
      label: "Frais spot taker",
      aDisplay: `${a.fees.spotTaker}%`,
      bDisplay: `${b.fees.spotTaker}%`,
      hint: winner(a.fees.spotTaker, b.fees.spotTaker, true),
    },
    {
      label: "Achat instantané (CB)",
      aDisplay: `${a.fees.instantBuy}%`,
      bDisplay: `${b.fees.instantBuy}%`,
      hint: winner(a.fees.instantBuy, b.fees.instantBuy, true),
    },
    {
      label: "Spread",
      aDisplay: a.fees.spread,
      bDisplay: b.fees.spread,
      hint: "tie",
      note: "Le spread varie selon la liquidité, comparaison qualitative.",
    },
    {
      label: "Retrait SEPA",
      aDisplay: typeof a.fees.withdrawalFiatSepa === "number" ? (a.fees.withdrawalFiatSepa === 0 ? "Gratuit" : `${a.fees.withdrawalFiatSepa}€`) : a.fees.withdrawalFiatSepa,
      bDisplay: typeof b.fees.withdrawalFiatSepa === "number" ? (b.fees.withdrawalFiatSepa === 0 ? "Gratuit" : `${b.fees.withdrawalFiatSepa}€`) : b.fees.withdrawalFiatSepa,
      hint:
        typeof a.fees.withdrawalFiatSepa === "number" && typeof b.fees.withdrawalFiatSepa === "number"
          ? winner(a.fees.withdrawalFiatSepa, b.fees.withdrawalFiatSepa, true)
          : "tie",
    },
    {
      label: "Dépôt minimum",
      aDisplay: `${a.deposit.minEur}€`,
      bDisplay: `${b.deposit.minEur}€`,
      hint: winner(a.deposit.minEur, b.deposit.minEur, true),
    },
  ];

  const security: CompareRow[] = [
    {
      label: "Cold storage",
      aDisplay: `${a.security.coldStoragePct}%`,
      bDisplay: `${b.security.coldStoragePct}%`,
      hint: winner(a.security.coldStoragePct, b.security.coldStoragePct),
    },
    {
      label: "Assurance",
      aDisplay: a.security.insurance ? "Oui" : "Non",
      bDisplay: b.security.insurance ? "Oui" : "Non",
      hint: a.security.insurance && !b.security.insurance ? "a" : !a.security.insurance && b.security.insurance ? "b" : "tie",
    },
    {
      label: "Score MiCA",
      aDisplay: `${a.scoring.mica}/5`,
      bDisplay: `${b.scoring.mica}/5`,
      hint: winner(a.scoring.mica, b.scoring.mica),
    },
    {
      label: "Score sécurité global",
      aDisplay: `${a.scoring.security}/5`,
      bDisplay: `${b.scoring.security}/5`,
      hint: winner(a.scoring.security, b.scoring.security),
    },
    {
      label: "Dernier incident",
      aDisplay: a.security.lastIncident ?? "Aucun",
      bDisplay: b.security.lastIncident ?? "Aucun",
      hint: !a.security.lastIncident && b.security.lastIncident ? "a" : a.security.lastIncident && !b.security.lastIncident ? "b" : "tie",
    },
  ];

  const ux: CompareRow[] = [
    { label: "Score UX", aDisplay: `${a.scoring.ux}/5`, bDisplay: `${b.scoring.ux}/5`, hint: winner(a.scoring.ux, b.scoring.ux) },
    { label: "Note App Store", aDisplay: `${a.ratings.appStore}/5`, bDisplay: `${b.ratings.appStore}/5`, hint: winner(a.ratings.appStore, b.ratings.appStore) },
    { label: "Note Play Store", aDisplay: `${a.ratings.playStore}/5`, bDisplay: `${b.ratings.playStore}/5`, hint: winner(a.ratings.playStore, b.ratings.playStore) },
    { label: "Trustpilot", aDisplay: `${a.ratings.trustpilot}/5 (${a.ratings.trustpilotCount.toLocaleString("fr-FR")})`, bDisplay: `${b.ratings.trustpilot}/5 (${b.ratings.trustpilotCount.toLocaleString("fr-FR")})`, hint: winner(a.ratings.trustpilot, b.ratings.trustpilot) },
    { label: "Cryptos listées", aDisplay: `${a.cryptos.totalCount}`, bDisplay: `${b.cryptos.totalCount}`, hint: winner(a.cryptos.totalCount, b.cryptos.totalCount) },
  ];

  const support: CompareRow[] = [
    { label: "Chat français", aDisplay: a.support.frenchChat ? "Oui" : "Non", bDisplay: b.support.frenchChat ? "Oui" : "Non", hint: a.support.frenchChat && !b.support.frenchChat ? "a" : !a.support.frenchChat && b.support.frenchChat ? "b" : "tie" },
    { label: "Téléphone FR", aDisplay: a.support.frenchPhone ? "Oui" : "Non", bDisplay: b.support.frenchPhone ? "Oui" : "Non", hint: a.support.frenchPhone && !b.support.frenchPhone ? "a" : !a.support.frenchPhone && b.support.frenchPhone ? "b" : "tie" },
    { label: "Délai réponse", aDisplay: a.support.responseTime, bDisplay: b.support.responseTime, hint: "tie" },
    { label: "Score support", aDisplay: `${a.scoring.support}/5`, bDisplay: `${b.scoring.support}/5`, hint: winner(a.scoring.support, b.scoring.support) },
  ];

  return { fees, security, ux, support };
}

/* ------------------------------------------------------------------
 * Verdict — varie selon les profils croisés (anti-template)
 * ------------------------------------------------------------------ */

function buildVerdict(a: Platform, b: Platform): { intro: string; pickA: string; pickB: string; tradeoff: string } {
  const aFeesAdv = a.scoring.fees - b.scoring.fees;
  const aSecAdv = a.scoring.security - b.scoring.security;
  const aUxAdv = a.scoring.ux - b.scoring.ux;

  let intro: string;
  if (Math.abs(a.scoring.global - b.scoring.global) < 0.2) {
    intro = `${a.name} et ${b.name} obtiennent quasiment le même score global (${a.scoring.global} vs ${b.scoring.global}). C'est une comparaison où le bon choix dépend strictement de tes priorités personnelles, pas d'une supériorité objective de l'un sur l'autre. Trois angles permettent de trancher : le coût réel sur ton profil de trading, l'importance de l'expérience mobile, et la place que tu accordes à un support en français.`;
  } else if (a.scoring.global > b.scoring.global) {
    intro = `${a.name} (${a.scoring.global}/5) devance ${b.name} (${b.scoring.global}/5) dans notre méthodologie globale, mais l'écart cache des spécialisations. ${b.name} reste préférable sur certains profils précis qu'on détaille plus bas — ce comparatif ne se résume pas à "le meilleur score gagne".`;
  } else {
    intro = `${b.name} (${b.scoring.global}/5) devance ${a.name} (${a.scoring.global}/5) dans notre méthodologie globale, mais l'écart cache des spécialisations. ${a.name} reste préférable sur certains profils précis qu'on détaille plus bas — ce comparatif ne se résume pas à "le meilleur score gagne".`;
  }

  const pickA =
    aFeesAdv > 0.3
      ? `Choisis ${a.name} si tu trades régulièrement en spot — tu économises du capital à chaque opération sur les frais (${a.fees.spotMaker}% vs ${b.fees.spotMaker}% en maker). Sur 12 mois et 10 000€ de volume, l'écart devient mécanique.`
      : aSecAdv > 0.3
        ? `Choisis ${a.name} si la sécurité est ta priorité non-négociable. ${a.security.coldStoragePct}% en cold storage et un score MiCA ${a.scoring.mica}/5 placent la barre haut.`
        : aUxAdv > 0.3
          ? `Choisis ${a.name} si l'expérience utilisateur est déterminante — l'app mobile note ${a.ratings.appStore}/5 sur l'App Store et l'onboarding est calibré grand public.`
          : `Choisis ${a.name} si tu valorises : ${a.strengths[0].toLowerCase()}. C'est le critère où l'écart est le plus net face à ${b.name}.`;

  const pickB =
    aFeesAdv < -0.3
      ? `Choisis ${b.name} si tu trades régulièrement en spot — tu économises du capital à chaque opération sur les frais (${b.fees.spotMaker}% vs ${a.fees.spotMaker}% en maker). Sur 12 mois et 10 000€ de volume, l'écart devient mécanique.`
      : aSecAdv < -0.3
        ? `Choisis ${b.name} si la sécurité est ta priorité non-négociable. ${b.security.coldStoragePct}% en cold storage et un score MiCA ${b.scoring.mica}/5 placent la barre haut.`
        : aUxAdv < -0.3
          ? `Choisis ${b.name} si l'expérience utilisateur est déterminante — l'app mobile note ${b.ratings.appStore}/5 sur l'App Store et l'onboarding est calibré grand public.`
          : `Choisis ${b.name} si tu valorises : ${b.strengths[0].toLowerCase()}. C'est le critère où l'écart est le plus net face à ${a.name}.`;

  const tradeoff = `Le vrai trade-off entre ${a.name} et ${b.name} se joue sur ${
    Math.abs(aFeesAdv) > Math.abs(aUxAdv) && Math.abs(aFeesAdv) > Math.abs(aSecAdv)
      ? "le coût total de possession (frais cumulés sur 12 mois)"
      : Math.abs(aSecAdv) > Math.abs(aUxAdv)
        ? "le profil de sécurité et la conformité MiCA"
        : "l'expérience mobile et la simplicité d'usage"
  }. Une fois ce critère arbitré, le reste devient secondaire.`;

  return { intro, pickA, pickB, tradeoff };
}

/* ------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------ */

export default function ComparisonPage({ params }: Props) {
  const spec = getComparison(params.slug);
  if (!spec) notFound();

  const a = getPlatformById(spec.a);
  const b = getPlatformById(spec.b);
  if (!a || !b) notFound();

  const rows = buildRows(a, b);
  const verdict = buildVerdict(a, b);

  // Plateforme gagnante par score global → CTA mobile sticky (égalité → a).
  const winner = b.scoring.global > a.scoring.global ? b : a;

  // Comparatifs liés (autres duels où l'une des 2 plateformes apparaît)
  const related = COMPARISONS.filter(
    (c) => c.slug !== spec.slug && (c.a === a.id || c.b === a.id || c.a === b.id || c.b === b.id)
  ).slice(0, 6);

  // Schema.org : ComparisonPage n'existe pas, on utilise Article + 2 Product mentionnés
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${a.name} vs ${b.name} : comparatif 2026`,
    author: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    publisher: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    datePublished: a.mica.lastVerified,
    mentions: [
      { "@type": "FinancialProduct", name: a.name, url: a.websiteUrl },
      { "@type": "FinancialProduct", name: b.name, url: b.websiteUrl },
    ],
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Comparatif", url: "/comparatif" },
    { name: `${a.name} vs ${b.name}`, url: `/comparatif/${spec.slug}` },
  ]);

  return (
    <article className="py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-white">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-white/80">Comparatif</span>
          <span className="mx-2">/</span>
          <span className="text-white/80">{a.name} vs {b.name}</span>
        </nav>

        {/* HEADER VERSUS */}
        <header className="mt-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            {a.name} <span className="text-muted font-normal">vs</span> {b.name}
            <span className="text-muted font-normal"> en 2026</span>
          </h1>
          <p className="mt-3 text-lg text-white/70 max-w-3xl">
            {spec.bucket === "fr-vs-international"
              ? `Acteur français face à un acteur international : on compare l'accompagnement local et la profondeur de marché.`
              : spec.bucket === "wallet-vs-wallet"
                ? `Deux références du wallet matériel comparées sur la sécurité, l'écosystème et la facilité d'usage.`
                : `Comparatif méthodique : frais réels, sécurité, conformité MiCA, support FR. Données vérifiées le ${new Date(a.mica.lastVerified).toLocaleDateString("fr-FR")}.`}
          </p>

          {/* Cartes versus */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[a, b].map((plat) => (
              <div
                key={plat.id}
                className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-white">{plat.name}</div>
                    <div className="text-xs text-muted">{plat.tagline.slice(0, 70)}…</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-primary">
                      {plat.scoring.global.toFixed(1)}
                    </div>
                    <div className="text-[10px] uppercase text-muted">Note globale</div>
                  </div>
                </div>
                {/*
                  MiCA badge JUSTE avant le CTA = trust signal au moment du clic.
                  Source : audit Trust 26-04 + agent #3 mapping (insertion dans
                  carte versus). Variant compact pour ne pas dominer le CTA.
                */}
                {plat.mica.micaCompliant && (
                  <div className="flex justify-center">
                    <MiCAComplianceBadge
                      variant="compact"
                      jurisdiction={plat.mica.amfRegistration ? "France" : undefined}
                    />
                  </div>
                )}
                <a
                  href={plat.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition"
                >
                  Tester {plat.name}
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Link
                  href={`/avis/${plat.id}`}
                  className="text-center text-xs text-muted hover:text-white"
                >
                  Lire l'avis détaillé →
                </Link>
              </div>
            ))}
          </div>
        </header>

        {/* INTRO VERDICT */}
        <section className="mt-12 rounded-2xl border border-border bg-surface p-6">
          <p className="text-base text-white/85 leading-relaxed">{verdict.intro}</p>
        </section>

        {/* TABLEAUX COMPARATIFS */}
        {(
          [
            { title: "Frais", icon: Wallet, rows: rows.fees, intro: `Sur les frais, ${a.name} affiche ${a.fees.spotMaker}% en maker contre ${b.fees.spotMaker}% pour ${b.name}. La différence paraît mineure jusqu'à ce qu'on la projette sur 10 000€ de volume mensuel — auquel cas elle devient le critère dominant pour un trader actif.` },
            { title: "Sécurité & MiCA", icon: ShieldCheck, rows: rows.security, intro: `Les deux plateformes opèrent sous agrément MiCA en France. La granularité de la comparaison se joue sur le pourcentage de cold storage, l'existence d'une assurance dédiée et l'historique d'incidents.` },
            { title: "Expérience utilisateur", icon: Coins, rows: rows.ux, intro: `Notes d'app mobile, Trustpilot et taille du catalogue. Ces métriques ne pèsent pas pareil selon ton profil — un investisseur passif accordera plus de poids à l'app, un trader actif au catalogue.` },
            { title: "Support client", icon: HeadphonesIcon, rows: rows.support, intro: `En cas de problème (KYC bloqué, retrait en attente, suspicion de fraude), la qualité du support fait la différence entre une résolution en 24h et un mois de cauchemar administratif.` },
          ] as const
        ).map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <section.icon className="h-6 w-6 text-primary" />
              {section.title}
            </h2>
            <p className="mt-2 text-sm text-white/75 leading-relaxed">{section.intro}</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-elevated">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                      Critère
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted">
                      {a.name}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted">
                      {b.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {section.rows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 text-muted">{row.label}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${row.hint === "a" ? "text-white font-semibold" : "text-white/70"}`}>
                        {row.aDisplay} <WinnerBadge hint={row.hint} side="a" />
                      </td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${row.hint === "b" ? "text-white font-semibold" : "text-white/70"}`}>
                        {row.bDisplay} <WinnerBadge hint={row.hint} side="b" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {/* BONUS COMPARÉS */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Bonus de bienvenue comparés
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[a, b].map((plat) => (
              <div
                key={plat.id}
                className="rounded-xl border border-accent-green/30 bg-accent-green/5 p-4"
              >
                <div className="text-xs uppercase tracking-wide text-accent-green">
                  {plat.name}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {plat.bonus.welcome}
                </div>
                {plat.bonus.conditions && (
                  <p className="mt-2 text-xs text-white/70">{plat.bonus.conditions}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* POINTS FORTS DIFFÉRENCIATEURS */}
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          {[a, b].map((plat) => (
            <div key={plat.id} className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-lg font-bold text-white">
                Ce que {plat.name} fait mieux
              </h3>
              <ul className="mt-4 space-y-2">
                {plat.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-white/80">
                    <Plus className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <h4 className="mt-5 text-sm font-semibold text-muted uppercase tracking-wide">
                Limites
              </h4>
              <ul className="mt-2 space-y-2">
                {plat.weaknesses.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm text-white/70">
                    <Minus className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* VERDICT FINAL */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Verdict : {a.name} ou {b.name} ?
          </h2>
          <p className="mt-3 text-sm text-white/85 leading-relaxed">{verdict.tradeoff}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-primary-glow">
                Choisir {a.name}
              </div>
              <p className="mt-2 text-sm text-white/85 leading-relaxed">{verdict.pickA}</p>
              <a
                href={a.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-glow hover:underline"
              >
                Aller sur {a.name} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-primary-glow">
                Choisir {b.name}
              </div>
              <p className="mt-2 text-sm text-white/85 leading-relaxed">{verdict.pickB}</p>
              <a
                href={b.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-glow hover:underline"
              >
                Aller sur {b.name} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* COMPARATIFS LIÉS */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight">Autres comparatifs utiles</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => {
                const ra = getPlatformById(c.a);
                const rb = getPlatformById(c.b);
                if (!ra || !rb) return null;
                return (
                  <Link
                    key={c.slug}
                    href={`/comparatif/${c.slug}`}
                    className="rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="text-sm font-semibold text-white">
                      {ra.name} vs {rb.name}
                    </div>
                    <div className="mt-1 text-xs text-muted">Comparatif détaillé</div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Maillage interne — cluster sémantique du graphe */}
        <RelatedPagesNav
          currentPath={`/comparatif/${spec.slug}`}
          limit={4}
          variant="default"
        />

        {/* DISCLAIMER */}
        <section className="mt-12 rounded-xl border border-border bg-surface/50 p-5">
          <p className="text-xs text-muted leading-relaxed">
            Comparatif rédigé par l'équipe éditoriale {BRAND.name}. Les frais et données réglementaires sont vérifiés trimestriellement (dernière vérif : {new Date(a.mica.lastVerified).toLocaleDateString("fr-FR")}). Les liens marqués « Publicité » génèrent une commission à {BRAND.name} sans surcoût pour toi, ce qui n'influence pas l'attribution du verdict — voir <Link href="/methodologie" className="underline hover:text-white">/methodologie</Link> et <Link href="/transparence" className="underline hover:text-white">/transparence</Link>. Investir dans les cryptoactifs présente un risque de perte en capital. Ce comparatif n'est pas un conseil en investissement.
          </p>
        </section>
      </div>

      {/* Sticky CTA mobile sur le verdict / la plateforme recommandée. */}
      <MobileStickyCTA
        platformId={winner.id}
        title={`Verdict : ${winner.name}`}
        label={`Aller sur ${winner.name}`}
        href={winner.affiliateUrl}
        surface="comparatif-page"
      />
    </article>
  );
}
