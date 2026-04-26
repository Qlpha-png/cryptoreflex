import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Wallet,
  Coins,
  HeadphonesIcon,
  Gift,
  AlertTriangle,
  ExternalLink,
  Star,
  CheckCircle2,
  XCircle,
  Phone,
  MessageSquare,
} from "lucide-react";
import { getAllPlatforms, getPlatformById, type Platform } from "@/lib/platforms";
import {
  getPublishableReviewSlugs,
  getRelatedComparisons,
  COMPARISONS,
} from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import AffiliateLink from "@/components/AffiliateLink";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  platformReviewSchema,
} from "@/lib/schema";
import MiCAComplianceBadge from "@/components/MiCAComplianceBadge";
import RelatedPagesNav from "@/components/RelatedPagesNav";

export const revalidate = 86400; // 24h — la donnée bouge à la marge

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getPublishableReviewSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const p = getPlatformById(params.slug);
  if (!p) return {};
  // SEO long-tail "[plateforme] avis 2026" : keyword exact en première position,
  // marque en suffixe auto-ajouté par root layout. Title <60c, description <155c.
  const title = `${p.name} avis 2026 — Test complet par Cryptoreflex`;
  const description = `${p.name} en 2026 : frais réels, conformité MiCA, support FR. Notre verdict objectif (${p.scoring.global}/5) basé sur 30 jours de test.`;
  return {
    title,
    description,
    keywords: [
      `${p.name} avis 2026`,
      `${p.name} avis`,
      `${p.name} frais`,
      `${p.name} France`,
      `${p.name} MiCA`,
      `avis ${p.name}`,
    ],
    alternates: { canonical: `${BRAND.url}/avis/${p.id}` },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/avis/${p.id}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/* ------------------------------------------------------------------
 * Helpers visuels
 * ------------------------------------------------------------------ */

function Score({ value, label }: { value: number; label: string }) {
  const pct = Math.round((value / 5) * 100);
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
        <span className="font-mono text-sm tabular-nums text-white">
          {value.toFixed(1)}<span className="text-muted">/5</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-elevated overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < Math.round(n) ? "fill-primary text-primary" : "text-border"
          }`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
 * Verdicts contextuels — varient selon le profil de la plateforme.
 * Évite d'avoir 15 pages avec le même paragraphe générique.
 * ------------------------------------------------------------------ */

function buildVerdict(p: Platform): { headline: string; recommendation: string; ideal: string; avoid: string } {
  const isExchange = p.category === "exchange";
  const cheap = p.scoring.fees >= 4.3;
  const safe = p.scoring.security >= 4.6;
  const french = p.support.frenchPhone;

  let headline = `${p.name} obtient ${p.scoring.global}/5 dans notre méthodologie 2026.`;
  let recommendation: string;

  if (cheap && isExchange) {
    recommendation = `Si ta priorité est de comprimer chaque centime de frais — typiquement parce que tu trades du spot mensuellement ou que tu DCA-es sur des positions importantes — ${p.name} est statistiquement difficile à battre. Les ${p.fees.spotMaker}% maker / ${p.fees.spotTaker}% taker en font l'une des structures les plus agressives du marché européen MiCA, mais cette compression de coûts s'accompagne d'une interface qui ne pardonne pas grand-chose à un débutant pressé.`;
  } else if (safe && french) {
    recommendation = `${p.name} se distingue d'abord par ce que ${p.security.coldStoragePct}% de stockage à froid couplé à un support téléphonique en français révèlent : un acteur qui priorise la rétention de l'utilisateur prudent plutôt que la conversion à tout prix. C'est un choix structurant. Le revers est mécanique : qui dit infrastructure de sécurité institutionnelle dit frais qui ne peuvent pas concurrencer Binance ou Bitget en pure compétition tarifaire.`;
  } else if (p.cryptos.totalCount < 100) {
    recommendation = `${p.name} fait un pari clair : moins de cryptos (${p.cryptos.totalCount} listées), mais une expérience qu'on peut tendre à un parent ou à un collègue sans honte. Si tu cherches à acheter Bitcoin, Ethereum et 3-4 majors sans jamais ouvrir un onglet trading, le fonctionnement est exactement calibré pour ça. Si tu veux chasser la prochaine alt à 100M$ de capi, il faudra regarder ailleurs.`;
  } else {
    recommendation = `${p.name} occupe une position d'équilibriste : assez large (${p.cryptos.totalCount} cryptos) pour ne pas te limiter, assez régulé pour respecter MiCA, mais sans le tranchant tarifaire des leaders frais ni la simplicité radicale des brokers grand public. C'est typiquement un choix par défaut intelligent — pas le meilleur sur un seul axe, mais probablement dans le top 3 sur 4 axes.`;
  }

  const ideal = p.idealFor;
  const avoid = p.weaknesses[0]
    ? `Si ${p.weaknesses[0].toLowerCase()} est un dealbreaker pour toi, regarde plutôt nos ${p.scoring.fees < 4 ? "alternatives à frais réduits" : "alternatives plus simples"}.`
    : "Aucun dealbreaker structurel identifié à date.";

  return { headline, recommendation, ideal, avoid };
}

/* ------------------------------------------------------------------
 * FAQ — questions générées en contexte (varient selon les data)
 * ------------------------------------------------------------------ */

function buildFaq(p: Platform): { q: string; a: string }[] {
  const faq: { q: string; a: string }[] = [];

  faq.push({
    q: `${p.name} est-elle régulée en France en 2026 ?`,
    a: `Oui. ${p.name} dispose du statut "${p.mica.status}"${p.mica.amfRegistration ? ` (enregistrement AMF n°${p.mica.amfRegistration})` : ""}, avec une mise en conformité MiCA validée. Vérification effectuée par notre équipe le ${p.mica.lastVerified}.`,
  });

  faq.push({
    q: `Quels sont les frais réels sur ${p.name} ?`,
    a: `Sur le marché spot, tu paies ${p.fees.spotMaker}% en maker et ${p.fees.spotTaker}% en taker. L'achat instantané (CB) coûte ${p.fees.instantBuy}%, ce qui reste plus cher que le passage par ordre limite. Le retrait SEPA est facturé ${typeof p.fees.withdrawalFiatSepa === "number" ? `${p.fees.withdrawalFiatSepa}€` : p.fees.withdrawalFiatSepa}. Le spread observé : ${p.fees.spread}.`,
  });

  faq.push({
    q: `${p.name} propose-t-elle un support en français ?`,
    a: p.support.frenchPhone
      ? `Oui — chat ET téléphone en français, avec un délai de réponse moyen de ${p.support.responseTime}. C'est un cas rare sur le marché.`
      : p.support.frenchChat
        ? `Le support chat est disponible en français (délai ${p.support.responseTime}), mais il n'y a pas de ligne téléphonique. Pour de la résolution complexe, comptez 1 à 2 cycles d'aller-retour.`
        : `Le support n'est pas disponible en français. Tu seras redirigé vers l'anglais avec un délai de ${p.support.responseTime}.`,
  });

  if (p.cryptos.stakingAvailable) {
    faq.push({
      q: `Peut-on faire du staking sur ${p.name} ?`,
      a: `Oui. ${p.name} propose du staking sur ${p.cryptos.stakingCryptos.length} cryptos majeures, dont ${p.cryptos.stakingCryptos.slice(0, 5).join(", ")}. Les APY varient selon la crypto (typiquement 2-12%) et sont versés directement sur ton compte. Attention au lock-up : certaines cryptos imposent une période d'unstaking de quelques jours à plusieurs semaines.`,
    });
  } else {
    faq.push({
      q: `Peut-on faire du staking sur ${p.name} ?`,
      a: `Non, ${p.name} ne propose pas de staking en propre. Si le staking est une de tes priorités, regarde plutôt Coinbase, Kraken ou Bitpanda qui offrent un large catalogue avec une expérience régulée MiCA.`,
    });
  }

  faq.push({
    q: `${p.name} a-t-elle déjà subi un piratage ?`,
    a: p.security.lastIncident
      ? `Incident notable : ${p.security.lastIncident}. ${p.security.coldStoragePct}% des fonds clients sont stockés à froid (cold wallet) et ${p.security.insurance ? "couverts par une assurance dédiée" : "non couverts par une assurance externe"}.`
      : `Aucun incident de sécurité majeur n'est documenté à date sur ${p.name}. ${p.security.coldStoragePct}% des fonds clients sont en cold storage, ${p.security.insurance ? "avec une couverture d'assurance" : "sans assurance externe formalisée"}.`,
  });

  faq.push({
    q: `Quel bonus de bienvenue propose ${p.name} ?`,
    a: p.bonus.amount
      ? `${p.bonus.welcome}. Conditions : ${p.bonus.conditions}. Offre valable jusqu'au ${p.bonus.validUntil ?? "préavis"}.`
      : `${p.bonus.welcome}. ${p.bonus.conditions ?? "Pas de conditions spécifiques."}`,
  });

  // Q6 — quel dépôt minimum / how to start
  faq.push({
    q: `Quel est le dépôt minimum sur ${p.name} et comment recharger ?`,
    a: `Le dépôt minimum est de ${p.deposit.minEur}€. Tu peux recharger ton compte par ${p.deposit.methods.slice(0, 4).join(", ")}${p.deposit.methods.length > 4 ? "…" : ""}. Le SEPA est généralement le moins cher (souvent gratuit) mais peut prendre 24-48h ; la carte bancaire est instantanée mais facturée ${p.fees.instantBuy}%.`,
  });

  // Q7 — comparatif avec un concurrent direct (signal SEO + intent commercial)
  const competitor = p.scoring.fees >= 4.4 ? "Coinbase" : "Binance";
  if (p.name !== competitor) {
    faq.push({
      q: `${p.name} ou ${competitor} : lequel choisir en 2026 ?`,
      a: `Tout dépend de ta priorité. ${p.name} se distingue par ${p.strengths[0]?.toLowerCase() ?? "son positionnement"}, là où ${competitor} mise sur ${competitor === "Coinbase" ? "la régulation maximale et l'UX simple" : "les frais bas et le catalogue le plus large"}. Notre comparatif détaillé tranche selon ton profil.`,
    });
  }

  return faq;
}

/* ------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------ */

export default function ReviewPage({ params }: Props) {
  const p = getPlatformById(params.slug);
  if (!p) notFound();

  const verdict = buildVerdict(p);
  const faq = buildFaq(p);
  const relatedComparisons = getRelatedComparisons(p.id, 4);
  const otherPlatforms = getAllPlatforms()
    .filter((x) => x.id !== p.id)
    .slice(0, 3);

  /*
   * Schema.org @graph — combine 3 entités liées par @id :
   *  1. Product + AggregateRating + Review (via platformReviewSchema())
   *     → permet à Google d'afficher les ⭐ étoiles dans les SERP
   *     (rich result Product nécessite aggregateRating, pas juste Rating)
   *  2. FAQPage → rich result Q&A déroulable dans Google
   *  3. BreadcrumbList → fil d'Ariane visible dans les SERP
   *
   * AVANT (bug SEO) : on injectait un simple `Review` avec `Rating` (sans
   * aggregate) → Google ignorait les étoiles. Maintenant : Product+AggregateRating
   * (via reviewCount=trustpilotCount) = étoiles éligibles dans les résultats.
   */
  const jsonLd = graphSchema([
    platformReviewSchema(p),
    faqSchema(faq.map((item) => ({ question: item.q, answer: item.a }))),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Avis plateformes", url: "/#plateformes" },
      { name: p.name, url: `/avis/${p.id}` },
    ]),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-white">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/#plateformes" className="hover:text-white">
            Avis plateformes
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white/80">{p.name}</span>
        </nav>

        {/* HEADER */}
        <header className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] items-start">
          <div>
            {p.badge && (
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary-glow">
                {p.badge}
              </span>
            )}
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
              {p.name} avis 2026
              <span className="block mt-1 text-2xl sm:text-3xl text-fg/70 font-bold">
                Test complet par Cryptoreflex
              </span>
            </h1>
            <p className="mt-3 text-lg text-white/70">{p.tagline}</p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Stars n={p.scoring.global} />
                <span className="font-mono text-sm tabular-nums">
                  <span className="text-white font-semibold">{p.scoring.global.toFixed(1)}</span>
                  <span className="text-muted">/5</span>
                </span>
              </div>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted">
                Trustpilot {p.ratings.trustpilot}/5 ({p.ratings.trustpilotCount.toLocaleString("fr-FR")} avis)
              </span>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted">
                Vérifié le {new Date(p.mica.lastVerified).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>

          {/* Carte CTA latérale */}
          <aside className="rounded-2xl border border-border bg-surface p-5 sticky top-24">
            <div className="text-xs uppercase tracking-wide text-muted">
              Tester {p.name}
            </div>
            {/*
              MiCA badge JUSTE au-dessus du CTA = trust signal au moment exact
              où l'utilisateur s'apprête à cliquer. Source : audit Trust 26-04
              (issue critique #6). Estimation impact +7-12% conversion.
            */}
            {p.mica.micaCompliant && (
              <div className="mt-3 flex justify-center">
                <MiCAComplianceBadge
                  variant="compact"
                  jurisdiction={p.mica.amfRegistration ? "France" : undefined}
                  verifiedAt={p.mica.lastVerified}
                />
              </div>
            )}
            {p.bonus.amount && (
              <div className="mt-2 rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-accent-green" />
                  <span className="text-sm text-white">{p.bonus.welcome}</span>
                </div>
              </div>
            )}
            <AffiliateLink
              href={p.affiliateUrl}
              platform={p.id}
              placement="avis-sidebar"
              ctaText={`Aller sur ${p.name}`}
              showCaption={false}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-3 text-sm font-semibold text-background hover:opacity-90 transition"
            >
              Aller sur {p.name}
              <ExternalLink className="h-4 w-4" />
            </AffiliateLink>
            <p className="mt-3 text-[11px] text-muted leading-relaxed">
              Publicité — Cryptoreflex perçoit une commission si tu ouvres un compte, sans surcoût pour toi. Cela ne change pas notre note (cf. <Link href="/methodologie" className="underline hover:text-white">méthodologie</Link> et <Link href="/transparence" className="underline hover:text-white">page transparence</Link>).
            </p>
          </aside>
        </header>

        {/* VERDICT EXPRESS — 3 lignes en intro (CRO best practice : on donne
            la conclusion dès le scroll-fold pour les visiteurs qui scannent) */}
        <section className="mt-10 rounded-2xl border-l-4 border-primary bg-surface p-5 sm:p-6">
          <div className="text-xs uppercase tracking-wide text-primary-glow font-semibold">
            Verdict express — 3 lignes
          </div>
          <ul className="mt-3 space-y-2 text-sm sm:text-base text-white/85 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-primary-glow shrink-0">·</span>
              <span><strong className="text-white">Note globale :</strong> {p.scoring.global.toFixed(1)}/5 — {p.badge ?? p.tagline}.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-glow shrink-0">·</span>
              <span><strong className="text-white">Idéal pour :</strong> {p.idealFor}.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-glow shrink-0">·</span>
              <span><strong className="text-white">À éviter si :</strong> {p.weaknesses[0] ?? "aucun dealbreaker structurel."}.</span>
            </li>
          </ul>
          <div className="mt-5">
            <AffiliateLink
              href={p.affiliateUrl}
              platform={p.id}
              placement="avis-verdict-express"
              ctaText={`Tester ${p.name}`}
              showCaption={false}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary-glow hover:bg-primary/25 transition-colors"
            >
              Tester {p.name}
              <ExternalLink className="h-4 w-4" />
            </AffiliateLink>
          </div>
        </section>

        {/* POUR QUI / POUR QUI PAS — table 2 colonnes (CRO + clarté) */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">
            {p.name} : pour qui c&apos;est fait, pour qui ce ne l&apos;est pas
          </h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="bg-accent-green/5 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-accent-green">
                  <CheckCircle2 className="h-4 w-4" />
                  Fait pour toi si…
                </div>
                <ul className="mt-3 space-y-2 text-sm text-white/85">
                  {p.scoring.fees >= 4.4 && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> Tu chasses les frais les plus bas du marché.</li>
                  )}
                  {p.scoring.security >= 4.7 && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> La sécurité (cold storage, audits) prime sur tout le reste.</li>
                  )}
                  {p.scoring.ux >= 4.5 && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> Tu démarres et veux une interface qui ne te perd pas.</li>
                  )}
                  {p.support.frenchPhone && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> Tu veux un support FR par téléphone (pas que par chat).</li>
                  )}
                  {p.cryptos.stakingAvailable && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> Tu veux faire du staking ({p.cryptos.stakingCryptos.length} cryptos éligibles).</li>
                  )}
                  {p.mica.micaCompliant && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> La conformité MiCA est un dealbreaker pour toi.</li>
                  )}
                </ul>
              </div>
              <div className="bg-accent-rose/5 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-accent-rose">
                  <XCircle className="h-4 w-4" />
                  Pas pour toi si…
                </div>
                <ul className="mt-3 space-y-2 text-sm text-white/85">
                  {p.weaknesses.slice(0, 3).map((w) => (
                    <li key={w} className="flex gap-2"><span className="text-accent-rose">•</span> {w}.</li>
                  ))}
                  {!p.support.frenchPhone && (
                    <li className="flex gap-2"><span className="text-accent-rose">•</span> Tu as besoin d&apos;un support téléphonique en français.</li>
                  )}
                  {!p.cryptos.stakingAvailable && (
                    <li className="flex gap-2"><span className="text-accent-rose">•</span> Le staking est un de tes critères principaux.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FRAIS RÉELS CHIFFRÉS — exemple concret (CRO : transparence frais) */}
        <section className="mt-10 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Frais réels chiffrés sur {p.name} (exemple 1 000 €)
          </h2>
          <p className="mt-2 text-sm text-muted">
            Estimation indicative au {new Date(p.mica.lastVerified).toLocaleDateString("fr-FR")} — recoupe avec le backoffice de la plateforme avant tout investissement engageant.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-elevated p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Achat instantané (CB)</div>
              <div className="mt-1 text-2xl font-bold text-white tabular-nums">
                {(1000 * p.fees.instantBuy / 100).toFixed(2)} €
              </div>
              <div className="mt-1 text-xs text-fg/60">{p.fees.instantBuy}% sur 1 000 €</div>
            </div>
            <div className="rounded-xl border border-border bg-elevated p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Ordre limité (taker)</div>
              <div className="mt-1 text-2xl font-bold text-white tabular-nums">
                {(1000 * p.fees.spotTaker / 100).toFixed(2)} €
              </div>
              <div className="mt-1 text-xs text-fg/60">{p.fees.spotTaker}% sur 1 000 €</div>
            </div>
            <div className="rounded-xl border border-border bg-elevated p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Ordre limité (maker)</div>
              <div className="mt-1 text-2xl font-bold text-white tabular-nums">
                {(1000 * p.fees.spotMaker / 100).toFixed(2)} €
              </div>
              <div className="mt-1 text-xs text-fg/60">{p.fees.spotMaker}% sur 1 000 €</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted leading-relaxed">
            <strong className="text-fg/80">Lecture :</strong> sur un achat de 1 000 € en CB, tu paies environ <strong className="text-white">{(1000 * p.fees.instantBuy / 100).toFixed(2)} €</strong> de frais. En passant par un ordre limité maker, ce coût tombe à <strong className="text-white">{(1000 * p.fees.spotMaker / 100).toFixed(2)} €</strong> — soit une économie de {((p.fees.instantBuy - p.fees.spotMaker) * 10).toFixed(2)} € (<strong>{Math.round((1 - p.fees.spotMaker / Math.max(p.fees.instantBuy, 0.01)) * 100)}%</strong>). Spread observé en plus : {p.fees.spread}.
          </p>
        </section>

        {/* SCORING DÉTAILLÉ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Notre scoring détaillé</h2>
          <p className="mt-2 text-sm text-muted max-w-2xl">
            Six critères pondérés, chacun mesuré sur la base de tests réels et de données vérifiables (frais affichés, registres AMF, audits Trustpilot). Détails dans la <Link href="/methodologie" className="underline hover:text-white">méthodologie publique</Link>.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Score value={p.scoring.fees} label="Frais" />
            <Score value={p.scoring.security} label="Sécurité" />
            <Score value={p.scoring.ux} label="Interface (UX)" />
            <Score value={p.scoring.support} label="Support FR" />
            <Score value={p.scoring.mica} label="Conformité MiCA" />
            <Score value={p.scoring.global} label="Note globale" />
          </div>
        </section>

        {/* FRAIS */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Frais sur {p.name}
          </h2>
          <p className="mt-3 text-white/80 leading-relaxed">
            La structure de frais de {p.name} compte trois étages qu'il faut comprendre séparément avant de signer : les frais d'exécution sur le marché spot, le surcoût d'achat instantané par carte bancaire, et les frais ponctuels (dépôt SEPA, retrait crypto vers un wallet externe). Pour la plupart des utilisateurs grand public, ce sera l'étage 2 — l'instant buy en CB — qui pèsera le plus sur la rentabilité réelle, parce que c'est le plus utilisé et de loin le plus cher.
          </p>
          <div className="mt-5 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 text-muted">Spot maker</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.fees.spotMaker}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted">Spot taker</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.fees.spotTaker}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted">Achat instantané (CB)</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.fees.instantBuy}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted">Spread observé</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.fees.spread}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted">Retrait SEPA</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {typeof p.fees.withdrawalFiatSepa === "number"
                      ? p.fees.withdrawalFiatSepa === 0
                        ? "Gratuit"
                        : `${p.fees.withdrawalFiatSepa}€`
                      : p.fees.withdrawalFiatSepa}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted">Retrait crypto</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.fees.withdrawalCrypto}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted">Dépôt minimum</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.deposit.minEur}€</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SÉCURITÉ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Sécurité et conformité
          </h2>
          <p className="mt-3 text-white/80 leading-relaxed">
            En 2026, la conformité MiCA n'est plus une option pour opérer en France : c'est l'agrément qui autorise une plateforme à offrir des services crypto à un résident français. {p.name} a obtenu cet agrément ({p.mica.status}){p.mica.amfRegistration ? ` avec un enregistrement AMF n°${p.mica.amfRegistration}` : ""}, ce qui implique une ségrégation stricte des fonds clients, des audits annuels et un capital minimum réglementaire. C'est une protection structurelle qui n'existait pas avant 2024.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Cold storage</div>
              <div className="mt-1 text-2xl font-bold text-white">{p.security.coldStoragePct}%</div>
              <p className="mt-2 text-sm text-white/70">
                Pourcentage des fonds clients conservés hors-ligne. Au-dessus de 95% est considéré comme une bonne pratique.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Statut MiCA</div>
              <div className="mt-1 text-sm font-semibold text-white">{p.mica.status}</div>
              <p className="mt-2 text-sm text-white/70">
                Enregistré le {p.mica.registrationDate ? new Date(p.mica.registrationDate).toLocaleDateString("fr-FR") : "—"}. Vérifié par Cryptoreflex le {new Date(p.mica.lastVerified).toLocaleDateString("fr-FR")}.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Assurance</div>
              <div className="mt-1 text-sm font-semibold text-white">
                {p.security.insurance ? "Oui — police dédiée" : "Non documentée"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Dernier incident</div>
              <div className="mt-1 text-sm text-white/90">
                {p.security.lastIncident ?? "Aucun à date"}
              </div>
            </div>
          </div>
        </section>

        {/* CTA milieu — après section sécurité (pic d'engagement) */}
        <section className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <div className="text-base font-bold text-white">
              Prêt à tester {p.name} ?
            </div>
            <p className="mt-1 text-sm text-white/70 max-w-xl">
              {p.mica.micaCompliant ? "Plateforme agréée MiCA" : "Statut en cours de revue"} · vérifié le {new Date(p.mica.lastVerified).toLocaleDateString("fr-FR")}.
            </p>
          </div>
          <AffiliateLink
            href={p.affiliateUrl}
            platform={p.id}
            placement="avis-mid-content"
            ctaText={`Ouvrir un compte ${p.name}`}
            showCaption={false}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition shrink-0"
          >
            Ouvrir un compte {p.name}
            <ExternalLink className="h-4 w-4" />
          </AffiliateLink>
        </section>

        {/* CRYPTOS & STAKING */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Catalogue crypto et staking
          </h2>
          <p className="mt-3 text-white/80 leading-relaxed">
            {p.name} liste {p.cryptos.totalCount} cryptomonnaies en avril 2026.{" "}
            {p.cryptos.totalCount > 200
              ? `C'est un catalogue large qui couvre Bitcoin et Ethereum, l'intégralité du top 50 par capitalisation, et descend dans les altcoins de cap moyenne. Pour un trader qui chasse les rotations sectorielles (DePIN, RWA, IA), c'est suffisant.`
              : p.cryptos.totalCount > 80
                ? `C'est un catalogue intermédiaire : tous les majors, l'essentiel du top 50, mais des trous dès qu'on descend en cap moyenne. Conviendra parfaitement à un investisseur long terme.`
                : `C'est un catalogue volontairement resserré sur les majors. Tu y trouveras Bitcoin, Ethereum et l'essentiel du top 20, mais pas les altcoins de niche. C'est un choix éditorial cohérent avec un positionnement grand public.`}
          </p>
          {p.cryptos.stakingAvailable ? (
            <div className="mt-5 rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <CheckCircle2 className="h-4 w-4 text-accent-green" />
                Staking disponible
              </div>
              <p className="mt-2 text-sm text-white/70">
                Cryptos éligibles : {p.cryptos.stakingCryptos.join(", ")}. APY variables selon la crypto et le marché. Voir nos <Link href="/staking/ethereum" className="text-primary-glow hover:underline">guides staking dédiés</Link> pour les rendements actuels.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <XCircle className="h-4 w-4 text-accent-rose" />
                Pas de staking
              </div>
              <p className="mt-2 text-sm text-white/70">
                {p.name} ne propose pas de staking. Si c'est un critère bloquant, voir Coinbase, Kraken ou Bitpanda.
              </p>
            </div>
          )}
        </section>

        {/* SUPPORT */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HeadphonesIcon className="h-6 w-6 text-primary" />
            Support client
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
              <MessageSquare className={`h-5 w-5 ${p.support.frenchChat ? "text-accent-green" : "text-muted"}`} />
              <div>
                <div className="text-sm font-semibold">Chat français</div>
                <div className="text-xs text-muted">{p.support.frenchChat ? "Disponible" : "Non disponible"}</div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
              <Phone className={`h-5 w-5 ${p.support.frenchPhone ? "text-accent-green" : "text-muted"}`} />
              <div>
                <div className="text-sm font-semibold">Téléphone FR</div>
                <div className="text-xs text-muted">{p.support.frenchPhone ? "Disponible" : "Non disponible"}</div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Délai réponse</div>
              <div className="mt-1 text-sm font-semibold text-white">{p.support.responseTime}</div>
            </div>
          </div>
        </section>

        {/* BONUS */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Bonus de bienvenue
          </h2>
          <div className="mt-4 rounded-xl border border-accent-green/30 bg-accent-green/5 p-5">
            <div className="text-sm font-semibold text-white">{p.bonus.welcome}</div>
            {p.bonus.conditions && (
              <p className="mt-2 text-sm text-white/70">
                <span className="text-muted">Conditions :</span> {p.bonus.conditions}
              </p>
            )}
            {p.bonus.validUntil && (
              <p className="mt-1 text-xs text-muted">
                Valable jusqu'au {new Date(p.bonus.validUntil).toLocaleDateString("fr-FR")}.
              </p>
            )}
          </div>
        </section>

        {/* POINTS FORTS / FAIBLES */}
        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-accent-green/30 bg-accent-green/5 p-6">
            <h3 className="text-lg font-bold text-accent-green flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Ce qui fait la différence
            </h3>
            <ul className="mt-4 space-y-3">
              {p.strengths.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-white/85">
                  <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-accent-rose/30 bg-accent-rose/5 p-6">
            <h3 className="text-lg font-bold text-accent-rose flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Ce qui peut bloquer
            </h3>
            <ul className="mt-4 space-y-3">
              {p.weaknesses.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm text-white/85">
                  <XCircle className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* VERDICT */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-2xl font-bold tracking-tight">Verdict Cryptoreflex</h2>
          <p className="mt-3 text-base text-white/85 leading-relaxed">{verdict.headline}</p>
          <p className="mt-4 text-sm text-white/80 leading-relaxed">{verdict.recommendation}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Idéal pour</div>
              <div className="mt-1 text-sm text-white/90">{verdict.ideal}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">À éviter si</div>
              <div className="mt-1 text-sm text-white/90">{verdict.avoid}</div>
            </div>
          </div>
          <div className="mt-6">
            <AffiliateLink
              href={p.affiliateUrl}
              platform={p.id}
              placement="avis-verdict-final"
              ctaText={`S'inscrire sur ${p.name}`}
              showCaption={false}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-5 py-3 text-sm font-semibold text-background hover:opacity-90 transition"
            >
              S&apos;inscrire sur {p.name}
              <ExternalLink className="h-4 w-4" />
            </AffiliateLink>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Questions fréquentes</h2>
          <div className="mt-5 space-y-3">
            {faq.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-surface px-5 py-4 open:bg-elevated"
              >
                <summary className="cursor-pointer list-none font-semibold text-white flex items-center justify-between">
                  {item.q}
                  <span className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-sm text-white/80 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* COMPARATIFS LIÉS — maillage interne */}
        {relatedComparisons.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight">
              {p.name} vs ses concurrents
            </h2>
            <p className="mt-2 text-sm text-muted">
              Comparez {p.name} en duel sur les frais, la sécurité et l'expérience utilisateur.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {relatedComparisons.map((c) => {
                const other = c.a === p.id ? c.b : c.a;
                const otherPlat = getPlatformById(other);
                return (
                  <Link
                    key={c.slug}
                    href={`/comparatif/${c.slug}`}
                    className="rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="text-sm font-semibold text-white">
                      {p.name} vs {otherPlat?.name ?? other}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Comparatif détaillé : frais, sécurité, support
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Maillage interne — cluster sémantique du graphe */}
        <RelatedPagesNav
          currentPath={`/avis/${p.id}`}
          limit={4}
          variant="default"
        />

        {/* ALTERNATIVES À ${p.name} */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Alternatives à {p.name}
          </h2>
          <p className="mt-2 text-sm text-muted">
            Trois plateformes comparables — choisis celle qui matche ton profil ou
            <Link href={`/comparatif`} className="text-primary-glow hover:underline"> compare-les en duel</Link>.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {otherPlatforms.map((op) => {
              const altSlug = `${p.id}-vs-${op.id}`;
              const altExists = COMPARISONS.some((c) => c.slug === altSlug || c.slug === `${op.id}-vs-${p.id}`);
              const realSlug = COMPARISONS.find((c) => c.slug === altSlug || c.slug === `${op.id}-vs-${p.id}`)?.slug;
              return (
                <div
                  key={op.id}
                  className="rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors flex flex-col"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-white">{op.name}</div>
                    <div className="flex items-center gap-1 text-xs text-amber-300">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-mono tabular-nums">{op.scoring.global.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted line-clamp-2">{op.tagline}</div>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-fg/60">
                    <span>Frais : {op.fees.spotTaker}%</span>
                    <span>·</span>
                    <span>{op.cryptos.totalCount} cryptos</span>
                  </div>
                  <div className="mt-auto pt-3 flex items-center gap-2 text-xs">
                    <Link href={`/avis/${op.id}`} className="text-primary-glow hover:underline">
                      Voir l&apos;avis
                    </Link>
                    {altExists && realSlug && (
                      <>
                        <span className="text-muted">·</span>
                        <Link href={`/comparatif/${realSlug}`} className="text-primary-glow hover:underline">
                          Comparer
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* DISCLAIMER */}
        <section className="mt-12 rounded-xl border border-border bg-surface/50 p-5">
          <p className="text-xs text-muted leading-relaxed">
            Cet avis est rédigé par l'équipe éditoriale {BRAND.name}. Données vérifiées le {new Date(p.mica.lastVerified).toLocaleDateString("fr-FR")} auprès des sources publiques (site officiel, registre AMF, Trustpilot). {BRAND.name} perçoit une commission via le lien d'inscription, sans surcoût ni biais sur la note attribuée — méthodologie publique sur <Link href="/methodologie" className="underline hover:text-white">/methodologie</Link>. Investir dans les cryptoactifs comporte un risque de perte en capital. Cette page ne constitue pas un conseil en investissement.
          </p>
        </section>
      </div>

      {/* Sticky CTA mobile : visible après scroll, jusqu'à l'arrivée du footer. */}
      <MobileStickyCTA
        platformId={p.id}
        title={p.name}
        label={`Aller sur ${p.name}`}
        href={p.affiliateUrl}
        surface="avis-page"
      />
    </article>
  );
}
