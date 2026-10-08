import { avecTypoSync } from "@/components/ui/Typo";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  ArrowRight,
  Trophy,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  Snowflake,
} from "lucide-react";

import { coldStorageLabel, getExchangePlatforms, insuranceLabel, NO_INCIDENT_FOUND } from "@/lib/platforms";
import { formatMicaDate, getMicaMeta } from "@/lib/mica";
import { getReviewHref } from "@/lib/programmatic";
import PlatformName from "@/components/comparison/PlatformName";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import { fmtDateFr } from "@/lib/format-fr";
import { faqSchema, graphSchema } from "@/lib/schema";
import Breadcrumbs from "@/components/Breadcrumbs";

/**
 * /comparatif/securite — Page dediee a la securite des plateformes crypto FR.
 *
 * BLOC 2 (2026-05-04). Pendant de /comparatif/frais. Mot-cle SEO fort
 * apres FTX/Celsius : les utilisateurs cherchent "plateforme crypto la
 * plus securisee", "Coinbase vs Binance securite", "proof of reserves".
 *
 * Pattern : Server Component, ranking par score securite, transparence
 * sur cold storage / assurance / 2FA / dernier incident. Donnees issues
 * de data/platforms.json (security.*). 06/10/2026 : chaque valeur est sourcee
 * (security.source) ou affichee « non communiquee » ; plus de moyenne de
 * pourcentages inventes ni de « n'ont jamais ete victimes d'un incident ».
 *
 * SEO : indexable, hreflang, JSON-LD CollectionPage + FAQ riche.
 */

export const revalidate = 86400;

const PAGE_PATH = "/comparatif/securite";
/** Libellé court, coupé à la fin d'un mot (jamais « création (… »). */
const shortLabel = (t: string, max = 38) => {
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 20)).replace(/[\s(,;:—–-]+$/, "") + "…";
};
/** Note au format français, une décimale (« 4,9 »). */
const note = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Sécurité plateformes crypto 2026 : classement et audit";
const DESCRIPTION =
  "Comparatif sécurité de 30+ plateformes crypto en France : cold storage, assurance, 2FA, historique hack, conformité MiCA. Audit transparent Cryptoreflex.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    // BLOCs 0-7 audit FRONT P0-2 (2026-05-04) — voir /comparatif/frais.
    images: [{ url: `${PAGE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${PAGE_URL}/opengraph-image`],
  },
  keywords: [
    "sécurité plateforme crypto",
    "Coinbase sécurité",
    "Kraken sécurité",
    "proof of reserves",
    "cold storage exchange",
    "plateforme crypto la plus securisee",
    "exchange piratage",
    "MiCA agrement CASP",
  ],
  robots: { index: true, follow: true },
};

interface SecurityRow {
  id: string;
  name: string;
  logo: string | null;
  /** Fiche /avis/<id> si elle existe, sinon null (pas de lien). */
  href: string | null;
  securityScore: number;
  /** Libellé publié (« 98 % », « la majorité, selon … ») ou « Non communiqué par la plateforme ». */
  coldStorage: string;
  coldStoragePublished: boolean;
  insurance: boolean | null;
  insuranceText: string;
  twoFA: boolean;
  lastIncident: string | null;
  source: { coldStoragePct?: string; insurance?: string; lastIncident?: string[] };
  verified: string;
  micaCompliant: boolean;
  micaStatus: string;
  amfRegistration: string | null;
}

function buildRows(): SecurityRow[] {
  return getExchangePlatforms()
    .map((p) => ({
      id: p.id,
      name: p.name,
      logo: p.logo,
      // Audit 2026-10-02 : /comparatif/<id> n'existe pas (404) → fiche avis.
      href: getReviewHref(p.id),
      securityScore: p.scoring.security,
      coldStorage: coldStorageLabel(p),
      coldStoragePublished: p.security.coldStoragePct != null || !!p.security.coldStorageNote,
      insurance: p.security.insurance,
      insuranceText: insuranceLabel(p),
      twoFA: p.security.twoFA,
      lastIncident: p.security.lastIncident,
      source: p.security.source,
      verified: p.security.verified,
      micaCompliant: p.mica.micaCompliant,
      micaStatus: p.mica.status,
      amfRegistration: p.mica.amfRegistration,
    }))
    .sort((a, b) => b.securityScore - a.securityScore);
}

function ComparatifSecuritePage() {
  const rows = buildRows();
  const top = rows[0];
  const withIncident = rows.filter((r) => r.lastIncident).length;
  const micaCompliantCount = rows.filter((r) => r.micaCompliant).length;
  /* 06/10/2026 : la « moyenne de cold storage » (≈ 95 %) était calculée sur des pourcentages jamais publiés. */
  // « Sans objet » (pas de garde : CFD, portefeuille non dépositaire, achat envoyé au client) ne décrit aucune conservation.
  const describedCold = rows.filter((r) => r.coldStoragePublished && !/^sans objet/i.test(r.coldStorage)).length;
  const figureCold = rows.filter((r) => r.coldStoragePublished && /\d\s?%/.test(r.coldStorage)).length;
  const securityVerified = rows.map((r) => r.verified).sort().at(-1);

  const schemas = graphSchema([
    faqSchema([
      {
        question: "Quelle est la plateforme crypto la plus sécurisée en 2026 ?",
        answer: `Selon notre score Cryptoreflex (stockage hors ligne, assurance, double authentification, historique d'incidents, agrément MiCA), ${top.name} arrive en tête avec ${note(top.securityScore)}/5. À nuancer : la sécurité réelle dépend AUSSI de vos propres pratiques (mot de passe fort, clé de sécurité physique, jamais de clé d'API sans liste blanche d'adresses IP).`,
      },
      {
        question: "Qu'est-ce que le cold storage et pourquoi c'est important ?",
        answer: `Le cold storage, c'est le stockage des cryptos dans des portefeuilles HORS LIGNE (portefeuilles matériels, machines jamais connectées). Si la plateforme est piratée, les fonds stockés hors ligne restent en général hors d'atteinte ; la part gardée en ligne (hot wallet) est la plus exposée. Attention : seules ${figureCold} plateformes sur ${rows.length} de notre base publient un chiffre pour la part de fonds conservée hors ligne, et ce chiffre déclaré n'est pas audité.`,
      },
      {
        question: "L'assurance d'une plateforme couvre-t-elle vraiment mes fonds ?",
        answer: "Pas toujours. Les assurances des plateformes couvrent en général le piratage de leur infrastructure (par exemple le vol d'un portefeuille en ligne), MAIS PAS votre compte piraté à cause d'un mot de passe faible, l'hameçonnage ou une erreur de votre part. Les garanties varient beaucoup d'une plateforme à l'autre : lisez toujours les conditions.",
      },
      {
        question: "MiCA et agrément CASP : qu'est-ce que ça change pour la sécurité ?",
        answer: `Le règlement MiCA impose notamment aux prestataires agréés un capital minimum, la ségrégation des fonds clients, des règles de gouvernance et de sécurité informatique. ${micaCompliantCount} plateformes sur ${rows.length} dans notre base sont agréées MiCA avec un accès à la France (registre de l'ESMA vérifié le 2 octobre 2026). Depuis le 1er juillet 2026, fin de la période transitoire, les autres ne peuvent plus servir de clients français.`,
      },
      {
        question: "Comment activer 2FA hardware (YubiKey) sur les plateformes ?",
        answer: "Les plateformes sérieuses acceptent les clés de sécurité physiques FIDO2/U2F (YubiKey, Titan). C'est BIEN plus sûr qu'un code à usage unique (Google Authenticator), car une clé physique résiste à l'hameçonnage. Activation, en général : Paramètres > Sécurité > Double authentification > Ajouter une clé de sécurité. Vérifiez la disponibilité dans l'aide de votre plateforme.",
      },
      {
        question: "Que faire en cas de hack de ma plateforme ?",
        answer: "1) Changez votre mot de passe et fermez toutes les sessions actives. 2) Vérifiez l'historique des transactions et alertez le support. 3) En cas de vol confirmé : portez plainte (commissariat, gendarmerie, ou en ligne pour une escroquerie sur internet) et demandez par écrit à la plateforme sa procédure d'indemnisation. 4) Côté impôts : un vol n'est pas une cession, aucune moins-value n'est déclarée ; gardez la plainte et les preuves, la valeur volée sort simplement de votre portefeuille.",
      },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="comparatif-securite" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumbs chemin="/comparatif/securite" />

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-soft">
            <ShieldCheck className="h-3.5 w-3.5" />
            Sécurité des plateformes
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Sécurité des plateformes crypto :{" "}
            <span className="gradient-text">audit 2026</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{rows.length} plateformes</strong>{" "}
            notées sur 5 axes : stockage hors ligne, assurance, double
            authentification, historique d&apos;incidents et agrément MiCA.
            Classées selon notre note de sécurité ; chaque donnée renvoie à sa
            source.
          </p>
        </header>

        {/* Stats hero */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Score le plus élevé"
            value={top.name}
            sub={`${note(top.securityScore)}/5`}
            tone="green"
            icon={<Trophy className="h-4 w-4" />}
          />
          <Stat
            label="Conservation hors ligne"
            value={`${describedCold}/${rows.length}`}
            sub={`plateformes décrivent leur conservation hors ligne, dont ${figureCold} avec un chiffre`}
            tone="primary"
            icon={<Snowflake className="h-4 w-4" />}
          />
          <Stat
            label="Agrément MiCA"
            value={`${micaCompliantCount}/${rows.length}`}
            sub="plateformes agréées CASP"
            tone="primary"
            icon={<Lock className="h-4 w-4" />}
          />
        </div>

        {/* Table */}
        <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="bg-elevated/60 text-xs uppercase tracking-wider text-muted [&>th]:whitespace-nowrap">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Plateforme</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-left" title="Part des cryptos des clients conservée hors ligne, telle que publiée par la plateforme">
                  Hors ligne (publié)
                </th>
                <th className="px-4 py-3 text-center" title="Assurance des cryptos des clients, telle que publiée par la plateforme">
                  Assurance
                </th>
                <th className="px-4 py-3 text-center" title="Double authentification proposée">
                  2FA
                </th>
                <th className="px-4 py-3 text-left">MiCA / CASP</th>
                <th className="px-4 py-3 text-left">Dernier incident documenté</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isBest = i === 0;
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-border ${isBest ? "bg-primary/5" : ""}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">{i + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PlatformName
                        href={r.href}
                        className="inline-flex items-center gap-2 font-semibold text-fg"
                      >
                        {r.logo && (
                          <Image
                            src={r.logo}
                            alt=""
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded-full"
                            unoptimized
                          />
                        )}
                        {r.name}
                        {isBest && (
                          <span className="text-xs font-bold uppercase tracking-wider text-primary">#1</span>
                        )}
                      </PlatformName>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary-soft">
                        {note(r.securityScore)}/5
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[190px]">
                      {r.coldStoragePublished ? (
                        <SourceLink href={r.source.coldStoragePct} className="text-fg">
                          {r.coldStorage}
                        </SourceLink>
                      ) : (
                        <span className="text-muted">Non publié</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.insurance == null ? (
                        <span className="text-muted" title={r.insuranceText}>—</span>
                      ) : (
                        <SourceLink href={r.source.insurance} title={r.insuranceText}>
                          {r.insurance ? (
                            <CheckCircle2 className="inline h-4 w-4 text-accent-green" aria-label={`Oui : ${r.insuranceText}`} />
                          ) : (
                            <XCircle className="inline h-4 w-4 text-muted" aria-label={r.insuranceText} />
                          )}
                        </SourceLink>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.twoFA ? (
                        <CheckCircle2 className="inline h-4 w-4 text-accent-green" aria-label="Oui" />
                      ) : (
                        <XCircle className="inline h-4 w-4 text-muted" aria-label="Non" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.micaCompliant ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-accent-green/30 bg-accent-green/10 px-2 py-0.5 text-xs font-bold text-accent-green">
                          <CheckCircle2 className="h-3 w-3" />
                          {r.micaStatus.length > 30 ? "Agréée MiCA" : r.micaStatus}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-primary-glow/30 bg-primary-glow/10 px-2 py-0.5 text-xs font-bold text-primary-soft">
                          <AlertTriangle className="h-3 w-3" />
                          Non autorisée en France
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.lastIncident ? (
                        <SourceLink href={r.source.lastIncident?.[0]} title={r.lastIncident} className="text-primary-soft">
                          {shortLabel(r.lastIncident)}
                        </SourceLink>
                      ) : (
                        <span className="text-muted" title={NO_INCIDENT_FOUND}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted leading-relaxed">
          Conservation hors ligne et assurance : telles que publiées par chaque plateforme (cliquez pour la source),
          non auditées par Cryptoreflex. Incidents : le plus récent trouvé dans un communiqué officiel ou la presse
          reconnue ; « — » signifie que nous n&apos;en avons relevé aucun, ce qui n&apos;est pas une garantie.
          Relevé du {fmtDateFr(securityVerified)}.
        </p>

        {/* Insights */}
        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-accent-green/30 bg-accent-green/5 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-accent-green">
              Bon à savoir
            </div>
            <p className="mt-2 text-sm text-fg/85">
              <strong className="text-fg">{withIncident} plateformes sur {rows.length}</strong>{" "}
              ont au moins un incident de sécurité documenté (piratage, fuite de
              données, accès abusif d&apos;employés). Pour les autres, nous
              n&apos;en avons relevé aucun : ce n&apos;est pas une garantie, et
              une plateforme peut être piratée demain.
            </p>
          </div>
          <div className="rounded-2xl border border-primary-glow/30 bg-primary-glow/5 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-primary-soft">
              Important
            </div>
            <p className="mt-2 text-sm text-fg/85">
              La meilleure plateforme du monde ne vous protège pas contre vos
              propres erreurs : hameçonnage, mot de passe faible, clé d&apos;API
              partagée. Activez toujours une <strong className="text-fg">clé de sécurité physique</strong>
              {" "}(YubiKey) et gardez vos phrases de récupération <strong className="text-fg">hors ligne</strong>.
            </p>
          </div>
        </section>

        {/* CTA cross-link */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/comparatif/frais"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              À comparer aussi
            </div>
            <div className="mt-2 text-base font-bold text-fg">Frais des plateformes</div>
            <div className="mt-1 text-xs text-muted">Maker, taker, spread, dépôt SEPA, retrait</div>
          </Link>
          <Link
            href="/outils/verificateur-mica"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              Vérifiez une plateforme
            </div>
            <div className="mt-2 text-base font-bold text-fg">Vérificateur MiCA / CASP</div>
            <div className="mt-1 text-xs text-muted">Statut MiCA en 1 clic</div>
          </Link>
        </section>

        <p className="mt-10 text-xs text-muted leading-relaxed">
          Statuts MiCA vérifiés le {formatMicaDate(getMicaMeta().lastUpdated)} sur le registre de l&apos;ESMA et la
          liste blanche de l&apos;AMF (à recouper avant toute décision). Seuls les liens marqués
          « Publicité » sont rémunérés (affiliation ou parrainage personnel du fondateur) : voir notre{" "}
          <Link href="/transparence" className="underline hover:text-fg">page transparence</Link>.
        </p>
      </div>
    </article>
  );
}

function StatBase({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "green" | "primary" | "amber";
  icon: React.ReactNode;
}) {
  const styles = {
    green: "border-accent-green/30 bg-accent-green/5 text-accent-green",
    primary: "border-primary/30 bg-primary/5 text-primary-soft",
    amber: "border-primary-glow/30 bg-primary-glow/5 text-primary-soft",
  };
  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-extrabold text-fg">{value}</div>
      <div className="mt-0.5 text-xs text-fg/70">{sub}</div>
    </div>
  );
}

/** Valeur cliquable vers sa source (page officielle, communiqué, presse) ; texte simple sans source. */
function SourceLinkBase({
  href,
  title,
  className,
  children,
}: {
  href?: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (!href) return <span title={title} className={className}>{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={title}
      className={`underline decoration-dotted underline-offset-2 hover:opacity-80 ${className ?? ""}`}
    >
      {children}
    </a>
  );
}

const Stat = avecTypoSync(StatBase);
const SourceLink = avecTypoSync(SourceLinkBase);

export default avecTypoSync(ComparatifSecuritePage);
