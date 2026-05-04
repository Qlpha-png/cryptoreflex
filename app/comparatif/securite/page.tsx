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

import { getExchangePlatforms } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";

/**
 * /comparatif/securite — Page dediee a la securite des plateformes crypto FR.
 *
 * BLOC 2 (2026-05-04). Pendant de /comparatif/frais. Mot-cle SEO fort
 * apres FTX/Celsius : les utilisateurs cherchent "plateforme crypto la
 * plus securisee", "Coinbase vs Binance securite", "proof of reserves".
 *
 * Pattern : Server Component, ranking par score securite, transparence
 * sur cold storage / assurance / 2FA / dernier incident. Donnees issues
 * de data/platforms.json (security.coldStoragePct, insurance, twoFA,
 * lastIncident).
 *
 * SEO : indexable, hreflang, JSON-LD CollectionPage + FAQ riche.
 */

export const revalidate = 86400;

const PAGE_PATH = "/comparatif/securite";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Securite plateformes crypto 2026 : ranking et audit";
const DESCRIPTION =
  "Comparatif securite de 30+ plateformes crypto en France : cold storage, assurance, 2FA, hack history, conformite MiCA. Audit transparent Cryptoreflex.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  keywords: [
    "securite plateforme crypto",
    "Coinbase securite",
    "Binance securite",
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
  logo: string;
  href: string;
  securityScore: number;
  coldStoragePct: number;
  insurance: boolean;
  twoFA: boolean;
  lastIncident: string | null;
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
      href: `/comparatif/${p.id}`,
      securityScore: p.scoring.security,
      coldStoragePct: p.security.coldStoragePct,
      insurance: p.security.insurance,
      twoFA: p.security.twoFA,
      lastIncident: p.security.lastIncident,
      micaCompliant: p.mica.micaCompliant,
      micaStatus: p.mica.status,
      amfRegistration: p.mica.amfRegistration,
    }))
    .sort((a, b) => b.securityScore - a.securityScore);
}

export default function ComparatifSecuritePage() {
  const rows = buildRows();
  const top = rows[0];
  const safeNoIncident = rows.filter((r) => !r.lastIncident).length;
  const micaCompliantCount = rows.filter((r) => r.micaCompliant).length;
  const avgColdStorage =
    rows.reduce((acc, r) => acc + r.coldStoragePct, 0) / rows.length;

  const schemas = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Comparatif", url: "/comparatif" },
      { name: "Securite", url: PAGE_PATH },
    ]),
    faqSchema([
      {
        question: "Quelle est la plateforme crypto la plus securisee en 2026 ?",
        answer: `Selon notre score Cryptoreflex (composite cold storage / assurance / 2FA / track record / conformite MiCA), ${top.name} arrive en tete avec ${top.securityScore.toFixed(1)}/5. A nuancer : la securite reelle depend AUSSI de tes propres pratiques (mot de passe fort, 2FA hardware key, jamais d'API key sans whitelist IP).`,
      },
      {
        question: "Qu'est-ce que le cold storage et pourquoi c'est important ?",
        answer: "Le cold storage = stockage des cryptos dans des wallets HORS LIGNE (hardware wallets, air-gapped). Si la plateforme est piratee, les fonds en cold storage sont en general intouchables. Les meilleures plateformes detiennent 95%+ des fonds clients en cold storage. Tout pourcentage en hot wallet est expose en cas de hack.",
      },
      {
        question: "L'assurance d'une plateforme couvre-t-elle vraiment mes fonds ?",
        answer: "Pas toujours. Les polices d'assurance crypto couvrent typiquement le hack de l'infrastructure (ex: vol de hot wallet) MAIS PAS : ton compte piratee a cause d'un mot de passe faible, le phishing, l'erreur utilisateur. Coinbase et Kraken ont les couvertures les plus larges (Lloyd's of London). Toujours lire les conditions.",
      },
      {
        question: "MiCA / agrement CASP, ca change quoi pour la securite ?",
        answer: `Le reglement MiCA UE (en application complete au 1er juillet 2026) impose : (1) capital reglementaire minimum, (2) separation des fonds clients, (3) audits reguliers, (4) responsabilite de la plateforme en cas de hack. ${micaCompliantCount} plateformes sur ${rows.length} dans notre base sont deja agreees CASP. Les non-conformes risquent de perdre l'acces UE le 1er juillet 2026.`,
      },
      {
        question: "Comment activer 2FA hardware (YubiKey) sur les plateformes ?",
        answer: "Les plateformes serieuses supportent les hardware keys FIDO2/U2F (YubiKey, Titan). C'est BIEN plus secure que TOTP (Google Authenticator) car immune au phishing. Activation : Settings > Security > Two-Factor Authentication > Add hardware key. Coinbase, Kraken, Binance, Bitstamp supportent FIDO2.",
      },
      {
        question: "Que faire en cas de hack de ma plateforme ?",
        answer: "1) Changer mot de passe + revoquer toutes les sessions actives. 2) Verifier l'historique des transactions et alerter le support. 3) Si vol confirme : depot de plainte (commissariat) + signalement TRACFIN + contact assurance plateforme. 4) Documenter pour la fiscalite : un vol crypto peut etre deductible (BOFiP BOI-RPPM-PVBMC-30-30-20).",
      },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="comparatif-securite" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/comparatif" className="hover:text-fg">Comparatif</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Securite</span>
        </nav>

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <ShieldCheck className="h-3.5 w-3.5" />
            Securite des plateformes
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Securite plateformes crypto :{" "}
            <span className="gradient-text">audit 2026</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{rows.length} plateformes</strong>{" "}
            auditees sur 5 axes : cold storage, assurance, 2FA, track record
            (hack/incident), conformite MiCA. Trie du plus securise au moins
            securise.
          </p>
        </header>

        {/* Stats hero */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Score le plus eleve"
            value={top.name}
            sub={`${top.securityScore.toFixed(1)}/5`}
            tone="green"
            icon={<Trophy className="h-4 w-4" />}
          />
          <Stat
            label="Cold storage moyen"
            value={`${avgColdStorage.toFixed(0)}%`}
            sub="des fonds clients hors ligne"
            tone="primary"
            icon={<Snowflake className="h-4 w-4" />}
          />
          <Stat
            label="Conformite MiCA"
            value={`${micaCompliantCount}/${rows.length}`}
            sub="plateformes agreees CASP"
            tone="primary"
            icon={<Lock className="h-4 w-4" />}
          />
        </div>

        {/* Table */}
        <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="bg-elevated/60 text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Plateforme</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right" title="Pourcentage de fonds clients en cold storage">
                  Cold storage
                </th>
                <th className="px-4 py-3 text-center" title="Assurance des fonds clients">
                  Assurance
                </th>
                <th className="px-4 py-3 text-center" title="Hardware keys FIDO2 / U2F">
                  2FA hardware
                </th>
                <th className="px-4 py-3 text-left">MiCA / CASP</th>
                <th className="px-4 py-3 text-left">Dernier incident</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isBest = i === 0;
                const noIncident = !r.lastIncident;
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-border ${isBest ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={r.href}
                        className="inline-flex items-center gap-2 font-semibold text-fg hover:text-primary transition-colors"
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
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">#1</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary-soft">
                        {r.securityScore.toFixed(1)}/5
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-mono tabular-nums text-fg">
                        {r.coldStoragePct}%
                      </div>
                      <div className="text-[10px] text-muted">
                        {r.coldStoragePct >= 95 ? "Excellent" : r.coldStoragePct >= 80 ? "Bon" : "A surveiller"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.insurance ? (
                        <CheckCircle2 className="inline h-4 w-4 text-accent-green" aria-label="Oui" />
                      ) : (
                        <XCircle className="inline h-4 w-4 text-muted" aria-label="Non" />
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
                        <span className="inline-flex items-center gap-1 rounded-md border border-accent-green/30 bg-accent-green/10 px-2 py-0.5 text-[10px] font-bold text-accent-green">
                          <CheckCircle2 className="h-3 w-3" />
                          {r.micaStatus.length > 30 ? "Agree CASP" : r.micaStatus}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          A risque 1er juillet 2026
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {noIncident ? (
                        <span className="text-accent-green">Aucun signale</span>
                      ) : (
                        <span className="text-amber-300" title={r.lastIncident ?? ""}>
                          {r.lastIncident && r.lastIncident.length > 35
                            ? r.lastIncident.slice(0, 35) + "..."
                            : r.lastIncident}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Insights */}
        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-accent-green/30 bg-accent-green/5 p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-accent-green">
              Bon a savoir
            </div>
            <p className="mt-2 text-sm text-fg/85">
              <strong className="text-fg">{safeNoIncident} plateformes</strong>{" "}
              n&apos;ont jamais ete victime d&apos;un incident de securite
              majeur a notre connaissance. Cela ne garantit pas l&apos;avenir
              mais c&apos;est un signal positif sur la maturite operationnelle.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Important
            </div>
            <p className="mt-2 text-sm text-fg/85">
              La meilleure plateforme du monde ne te protege pas contre tes
              propres erreurs : phishing, mot de passe faible, partage de cle
              API. Active toujours <strong className="text-fg">2FA hardware</strong>
              {" "}(YubiKey) et garde tes seeds <strong className="text-fg">en cold wallet</strong>.
            </p>
          </div>
        </section>

        {/* CTA cross-link */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/comparatif/frais"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Aussi compare
            </div>
            <div className="mt-2 text-base font-bold text-fg">Frais des plateformes</div>
            <div className="mt-1 text-xs text-muted">Maker, taker, spread, depot SEPA, retrait</div>
          </Link>
          <Link
            href="/outils/verificateur-mica"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Verifie une plateforme
            </div>
            <div className="mt-2 text-base font-bold text-fg">Verificateur MiCA / CASP</div>
            <div className="mt-1 text-xs text-muted">Statut PSAN/CASP en 1 clic</div>
          </Link>
        </section>

        <p className="mt-10 text-[11px] text-muted leading-relaxed">
          Donnees au {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.
          La conformite MiCA s&apos;appuie sur le registre AMF / ESMA officiel
          (a recouper avant decision). Cette page contient des liens
          d&apos;affiliation : voir notre{" "}
          <Link href="/transparence" className="underline hover:text-fg">page transparence</Link>.
        </p>
      </div>
    </article>
  );
}

function Stat({
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
    amber: "border-amber-400/30 bg-amber-400/5 text-amber-300",
  };
  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-extrabold text-fg">{value}</div>
      <div className="mt-0.5 text-xs text-fg/70">{sub}</div>
    </div>
  );
}
