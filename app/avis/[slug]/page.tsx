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
  const title = `Avis ${p.name} 2026 : tests, frais, sécurité, MiCA — ${BRAND.name}`;
  const description = `Notre avis détaillé sur ${p.name} : ${p.scoring.global}/5. ${p.tagline} Frais, sécurité, agrément MiCA, bonus, support FR. Mis à jour ${p.mica.lastVerified}.`;
  return {
    title,
    description,
    alternates: { canonical: `${BRAND.url}/avis/${p.id}` },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/avis/${p.id}`,
      type: "article",
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
    recommendation = `Si votre priorité est de comprimer chaque centime de frais — typiquement parce que vous tradez du spot mensuellement ou que vous DCA-ez sur des positions importantes — ${p.name} est statistiquement difficile à battre. Les ${p.fees.spotMaker}% maker / ${p.fees.spotTaker}% taker en font l'une des structures les plus agressives du marché européen MiCA, mais cette compression de coûts s'accompagne d'une interface qui ne pardonne pas grand-chose à un débutant pressé.`;
  } else if (safe && french) {
    recommendation = `${p.name} se distingue d'abord par ce que ${p.security.coldStoragePct}% de stockage à froid couplé à un support téléphonique en français révèlent : un acteur qui priorise la rétention de l'utilisateur prudent plutôt que la conversion à tout prix. C'est un choix structurant. Le revers est mécanique : qui dit infrastructure de sécurité institutionnelle dit frais qui ne peuvent pas concurrencer Binance ou Bitget en pure compétition tarifaire.`;
  } else if (p.cryptos.totalCount < 100) {
    recommendation = `${p.name} fait un pari clair : moins de cryptos (${p.cryptos.totalCount} listées), mais une expérience qu'on peut tendre à un parent ou à un collègue sans honte. Si vous cherchez à acheter Bitcoin, Ethereum et 3-4 majors sans jamais ouvrir un onglet trading, le fonctionnement est exactement calibré pour ça. Si vous voulez chasser la prochaine alt à 100M$ de capi, il faudra regarder ailleurs.`;
  } else {
    recommendation = `${p.name} occupe une position d'équilibriste : assez large (${p.cryptos.totalCount} cryptos) pour ne pas vous limiter, assez régulé pour respecter MiCA, mais sans le tranchant tarifaire des leaders frais ni la simplicité radicale des brokers grand public. C'est typiquement un choix par défaut intelligent — pas le meilleur sur un seul axe, mais probablement dans le top 3 sur 4 axes.`;
  }

  const ideal = p.idealFor;
  const avoid = p.weaknesses[0]
    ? `Si ${p.weaknesses[0].toLowerCase()} est un dealbreaker pour vous, regardez plutôt nos ${p.scoring.fees < 4 ? "alternatives à frais réduits" : "alternatives plus simples"}.`
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
    a: `Sur le marché spot, vous payez ${p.fees.spotMaker}% en maker et ${p.fees.spotTaker}% en taker. L'achat instantané (CB) coûte ${p.fees.instantBuy}%, ce qui reste plus cher que le passage par ordre limite. Le retrait SEPA est facturé ${typeof p.fees.withdrawalFiatSepa === "number" ? `${p.fees.withdrawalFiatSepa}€` : p.fees.withdrawalFiatSepa}. Le spread observé : ${p.fees.spread}.`,
  });

  faq.push({
    q: `${p.name} propose-t-elle un support en français ?`,
    a: p.support.frenchPhone
      ? `Oui — chat ET téléphone en français, avec un délai de réponse moyen de ${p.support.responseTime}. C'est un cas rare sur le marché.`
      : p.support.frenchChat
        ? `Le support chat est disponible en français (délai ${p.support.responseTime}), mais il n'y a pas de ligne téléphonique. Pour de la résolution complexe, comptez 1 à 2 cycles d'aller-retour.`
        : `Le support n'est pas disponible en français. Vous serez redirigé vers l'anglais avec un délai de ${p.support.responseTime}.`,
  });

  if (p.cryptos.stakingAvailable) {
    faq.push({
      q: `Peut-on faire du staking sur ${p.name} ?`,
      a: `Oui. ${p.name} propose du staking sur ${p.cryptos.stakingCryptos.length} cryptos majeures, dont ${p.cryptos.stakingCryptos.slice(0, 5).join(", ")}. Les APY varient selon la crypto (typiquement 2-12%) et sont versés directement sur votre compte. Attention au lock-up : certaines cryptos imposent une période d'unstaking de quelques jours à plusieurs semaines.`,
    });
  } else {
    faq.push({
      q: `Peut-on faire du staking sur ${p.name} ?`,
      a: `Non, ${p.name} ne propose pas de staking en propre. Si le staking est une de vos priorités, regardez plutôt Coinbase, Kraken ou Bitpanda qui offrent un large catalogue avec une expérience régulée MiCA.`,
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

  // Schema.org Review (Product)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "FinancialProduct",
      name: p.name,
      url: p.websiteUrl,
      provider: { "@type": "Organization", name: p.name },
    },
    author: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    publisher: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    datePublished: p.mica.lastVerified,
    reviewRating: {
      "@type": "Rating",
      ratingValue: p.scoring.global,
      bestRating: 5,
      worstRating: 0,
    },
    reviewBody: verdict.recommendation,
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <article className="py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
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
              Avis {p.name} 2026
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
            {p.bonus.amount && (
              <div className="mt-2 rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-accent-green" />
                  <span className="text-sm text-white">{p.bonus.welcome}</span>
                </div>
              </div>
            )}
            <a
              href={p.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-3 text-sm font-semibold text-background hover:opacity-90 transition"
            >
              Aller sur {p.name}
              <ExternalLink className="h-4 w-4" />
            </a>
            <p className="mt-3 text-[11px] text-muted leading-relaxed">
              Lien sponsorisé. Cryptoreflex perçoit une commission si vous ouvrez un compte, sans surcoût pour vous. Cela ne change pas notre note (cf. <Link href="/methodologie" className="underline hover:text-white">méthodologie</Link>).
            </p>
          </aside>
        </header>

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
                : `C'est un catalogue volontairement resserré sur les majors. Vous y trouverez Bitcoin, Ethereum et l'essentiel du top 20, mais pas les altcoins de niche. C'est un choix éditorial cohérent avec un positionnement grand public.`}
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

        {/* AUTRES PLATEFORMES */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Autres avis plateformes</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {otherPlatforms.map((op) => (
              <Link
                key={op.id}
                href={`/avis/${op.id}`}
                className="rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors"
              >
                <div className="text-sm font-semibold text-white">{op.name}</div>
                <div className="mt-1 text-xs text-muted">{op.tagline.slice(0, 70)}…</div>
                <div className="mt-2 flex items-center gap-2">
                  <Stars n={op.scoring.global} />
                  <span className="text-xs text-muted">{op.scoring.global.toFixed(1)}/5</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* DISCLAIMER */}
        <section className="mt-12 rounded-xl border border-border bg-surface/50 p-5">
          <p className="text-xs text-muted leading-relaxed">
            Cet avis est rédigé par l'équipe éditoriale {BRAND.name}. Données vérifiées le {new Date(p.mica.lastVerified).toLocaleDateString("fr-FR")} auprès des sources publiques (site officiel, registre AMF, Trustpilot). {BRAND.name} perçoit une commission via le lien d'inscription, sans surcoût ni biais sur la note attribuée — méthodologie publique sur <Link href="/methodologie" className="underline hover:text-white">/methodologie</Link>. Investir dans les cryptoactifs comporte un risque de perte en capital. Cette page ne constitue pas un conseil en investissement.
          </p>
        </section>
      </div>
    </article>
  );
}
