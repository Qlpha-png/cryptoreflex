import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import NewsletterInline from "@/components/NewsletterInline";
import { withHreflang } from "@/lib/seo-alternates";
import { getExchangePlatforms, isAvailableFr } from "@/lib/platforms";
import { getAllMicaPlatforms } from "@/lib/mica";

/**
 * /etudes/mica-juillet-2026-etat-des-lieux — état des lieux des plateformes crypto en France
 * après la fin de la période transitoire MiCA (1er juillet 2026).
 *
 * Réécrite le 2026-10-02 (audit) : la version du 6 mai 2026 décrivait la situation avant
 * l'échéance et contenait des statuts et dates d'agrément erronés. Tous les statuts sont
 * désormais calculés depuis data/platforms.json, lui-même aligné sur le registre MiCA de
 * l'ESMA (CASPS.csv, données au 29/09/2026) et la liste blanche de l'AMF.
 * Mise à jour : relancer la vérification des registres, puis changer LAST_UPDATED / REGISTER_AS_OF.
 */

const PUBLISHED_DATE = "2026-05-06";
const LAST_UPDATED = "2026-10-02";
const REGISTER_AS_OF = "29 septembre 2026";

const TITLE = "MiCA juillet 2026 : état des lieux des plateformes crypto en France";
const DESCRIPTION =
  "Après la fin de la période transitoire MiCA (1er juillet 2026) : quelles plateformes crypto sont agréées pour servir la France, lesquelles ne le sont pas. Données du registre officiel de l'ESMA et de la liste blanche de l'AMF, mises à jour le 2 octobre 2026.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}/etudes/mica-juillet-2026-etat-des-lieux`),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}/etudes/mica-juillet-2026-etat-des-lieux`,
    type: "article",
    publishedTime: PUBLISHED_DATE,
    modifiedTime: LAST_UPDATED,
  },
  robots: { index: true, follow: true },
};

const frDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }) : "—";

const PLATFORMS = getExchangePlatforms();
const AUTHORIZED = PLATFORMS.filter(isAvailableFr).sort((a, b) => a.name.localeCompare(b.name, "fr"));
const NOT_AUTHORIZED = PLATFORMS.filter((p) => !isAvailableFr(p)).sort((a, b) => a.name.localeCompare(b.name, "fr"));
const AMF_AUTHORIZED = AUTHORIZED.filter((p) => p.mica.amfRegistration);

const STATS = [
  { value: String(PLATFORMS.length), label: "plateformes suivies par Cryptoreflex", color: "text-cyan-400" },
  { value: String(AUTHORIZED.length), label: "agréées MiCA avec accès à la France", color: "text-emerald-400" },
  { value: String(NOT_AUTHORIZED.length), label: "non autorisées en France", color: "text-amber-400" },
  { value: String(AMF_AUTHORIZED.length), label: "agréées directement par l'AMF", color: "text-indigo-400" },
];

const TOC = [
  { id: "tldr", label: "Résumé" },
  { id: "contexte", label: "1. Ce qui a changé le 1er juillet 2026" },
  { id: "agreees", label: "2. Plateformes agréées avec accès à la France" },
  { id: "non-autorisees", label: "3. Plateformes non autorisées en France" },
  { id: "stablecoins", label: "4. Stablecoins" },
  { id: "pratique", label: "5. Ce que vous devez faire" },
  { id: "faq", label: "6. FAQ" },
  { id: "sources", label: "7. Sources & méthodologie" },
];

/* Registre des émetteurs de jetons de monnaie électronique (EMT) de l'ESMA, vérifié le 02/10/2026 */
const STABLECOINS = [
  { name: "USDC et EURC (Circle)", ok: true, detail: "Émis par Circle, établissement agréé en France par l'ACPR, inscrit au registre des émetteurs de jetons de monnaie électronique (EMT) de l'ESMA." },
  { name: "EURCV et USDCV (Société Générale-Forge)", ok: true, detail: "Émis par Société Générale-Forge, agréée par l'ACPR, inscrite au même registre EMT de l'ESMA." },
  { name: "USDT (Tether)", ok: false, detail: "Aucun émetteur inscrit au registre EMT de l'ESMA à la date de notre vérification." },
  { name: "DAI / USDS", ok: false, detail: "Aucun émetteur inscrit au registre EMT de l'ESMA à la date de notre vérification." },
];

const FAQ = [
  {
    q: "Que s'est-il passé le 1er juillet 2026 ?",
    a: "La période transitoire prévue par l'article 143 du règlement MiCA (UE) 2023/1114 a pris fin en France. Depuis, seul un prestataire agréé MiCA (CASP), en France ou dans un autre État membre avec un passeport vers la France, peut fournir des services sur crypto-actifs à des résidents français. Binance, par exemple, a cessé ses services sur crypto-actifs en France à cette date.",
  },
  {
    q: "Mes cryptos sur une plateforme non autorisée sont-elles perdues ?",
    a: "Non, en principe : la plateforme doit vous permettre de récupérer vos avoirs. Renseignez-vous sans tarder sur les conditions et délais de retrait qu'elle annonce, puis transférez vos cryptos vers une plateforme agréée ou vers un portefeuille personnel.",
  },
  {
    q: "Un ancien numéro PSAN (E20xx-xxx) vaut-il encore autorisation ?",
    a: "Non. Le régime PSAN, créé par la loi PACTE de 2019, a pris fin avec la période transitoire : depuis le 1er juillet 2026, il faut un agrément MiCA. Plusieurs anciens PSAN français l'ont obtenu auprès de l'AMF, par exemple Coinhouse (n° A2026-013) ou Bitstack (n° A2025-003).",
  },
  {
    q: "Une plateforme agréée dans un autre pays de l'UE est-elle moins sûre ?",
    a: "Juridiquement, non : l'agrément MiCA est le même dans toute l'Union, et le passeport européen permet à un prestataire agréé à Malte, en Irlande ou au Luxembourg de servir la France. Ce qui compte, c'est que la France figure parmi les pays couverts par son passeport au registre de l'ESMA. En cas de litige, votre interlocuteur réglementaire sera l'autorité du pays d'agrément.",
  },
  {
    q: "Changer de plateforme est-il imposable ?",
    a: "Transférer vos cryptos d'une plateforme à une autre, ou vers votre portefeuille personnel, n'est pas une cession : ce n'est pas imposable. Un échange crypto contre crypto (par exemple USDT contre USDC) bénéficie du sursis d'imposition de l'article 150 VH bis du CGI. Seules les cessions contre des euros ou contre un bien sont imposables. Pensez aussi à déclarer chaque compte détenu à l'étranger (formulaire 3916-bis).",
  },
  {
    q: "Les services DeFi (Aave, Uniswap…) sont-ils concernés ?",
    a: "Pas directement : le règlement exclut les services fournis de manière entièrement décentralisée (considérant 22). Les portefeuilles en auto-conservation, où vous gardez vos clés, sont eux aussi hors du champ de l'agrément.",
  },
  {
    q: "Comment vérifier moi-même une plateforme ?",
    a: "Deux sources officielles : le registre MiCA de l'ESMA, qui liste les prestataires agréés et les pays couverts par leur passeport, et les listes blanches de l'AMF, qui incluent les prestataires étrangers autorisés en France. Notre vérificateur MiCA reprend ces deux sources.",
  },
];

const SOURCES = [
  { name: "Règlement (UE) 2023/1114 (MiCA), EUR-Lex", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32023R1114" },
  { name: "ESMA : registres intérimaires MiCA (prestataires agréés, émetteurs EMT)", url: "https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica" },
  { name: "AMF : listes blanches des acteurs autorisés", url: "https://www.amf-france.org/fr/espace-epargnants/proteger-son-epargne/listes-blanches-autorisations" },
];

const baseUrl = BRAND.url;

const breadcrumb = breadcrumbSchema([
  { name: "Accueil", url: baseUrl + "/" },
  { name: "Études", url: baseUrl + "/etudes" },
  { name: "MiCA juillet 2026", url: baseUrl + "/etudes/mica-juillet-2026-etat-des-lieux" },
]);

const article = articleSchema({
  slug: "etudes/mica-juillet-2026-etat-des-lieux",
  title: TITLE,
  description: DESCRIPTION,
  date: PUBLISHED_DATE,
  dateModified: LAST_UPDATED,
  category: "Réglementation",
  tags: ["MiCA", "CASP", "AMF", "ESMA", "France", "réglementation"],
  readTime: "8 min",
  author: "Kevin Voisin",
});

const faq = faqSchema(FAQ.map((f) => ({ question: f.q, answer: f.a })));

const jsonLd: JsonLd = graphSchema([breadcrumb, article, faq]);

export default function MicaStudyPage() {
  return (
    <main className="min-h-screen bg-[#05060A] text-slate-100">
      <StructuredData id="mica-study-jsonld" data={jsonLd} />

      {/* Hero */}
      <section className="border-b border-white/5 bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-slate-400" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-cyan-300">
              Accueil
            </Link>
            <span className="mx-2 text-slate-600">/</span>
            <Link href="/etudes" className="hover:text-cyan-300">
              Études
            </Link>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-slate-300">MiCA juillet 2026</span>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
            <BookOpen className="h-3.5 w-3.5" />
            Étude réglementaire — Cryptoreflex Research
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
            MiCA juillet 2026 :<br className="hidden sm:block" /> état des lieux des plateformes crypto en France
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Publié le {frDate(PUBLISHED_DATE)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />8 min de lecture
            </span>
            <span className="inline-flex items-center gap-1.5">Mis à jour le {frDate(LAST_UPDATED)}</span>
            <span className="inline-flex items-center gap-1.5">
              Auteur :{" "}
              <Link href="/a-propos" className="text-cyan-300 hover:underline">
                Kevin Voisin
              </Link>
            </span>
          </div>

          <div role="note" className="mt-6 rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-4 text-sm text-slate-200 leading-relaxed">
            <strong className="text-cyan-200">Mise à jour du {frDate(LAST_UPDATED)}.</strong> La première version de cette étude
            décrivait la situation avant la fin de la période transitoire. Elle a été entièrement réécrite : tous les statuts
            ci-dessous viennent du registre MiCA de l&apos;ESMA (données au {REGISTER_AS_OF}) et de la liste blanche de l&apos;AMF.
          </div>

          <p className="mt-6 text-lg text-slate-300 leading-relaxed">
            Depuis le 1er juillet 2026, une plateforme crypto doit être agréée MiCA, avec un accès à la France, pour servir des
            clients français. Sur les {PLATFORMS.length} plateformes que nous suivons, {AUTHORIZED.length} remplissent cette
            condition et {NOT_AUTHORIZED.length} ne la remplissent pas. Données réutilisables sous licence{" "}
            <Link href="/api-publique" className="text-cyan-300 underline-offset-2 hover:underline">
              CC-BY 4.0
            </Link>
            .
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="mt-1 text-xs text-slate-400 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOC */}
      <section className="border-b border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Sommaire</h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
            {TOC.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="inline-flex items-center gap-2 text-slate-300 hover:text-cyan-300 transition">
                  <ChevronRight className="h-3.5 w-3.5 text-cyan-500" />
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Body */}
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 prose prose-invert prose-slate prose-headings:tracking-tight prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-a:text-cyan-300 prose-strong:text-white">
        <section id="tldr">
          <h2 className="text-2xl font-bold tracking-tight">Résumé</h2>
          <ul className="mt-4 space-y-2 list-none p-0">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <strong>{AUTHORIZED.length} plateformes</strong> sur {PLATFORMS.length} sont agréées MiCA avec un accès à la
                France, dont {AMF_AUTHORIZED.length} agréées directement par l&apos;AMF.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>{NOT_AUTHORIZED.length} plateformes</strong> ne peuvent plus servir de clients français, dont Binance,
                qui a cessé ses services en France le 1er juillet 2026.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-cyan-400" />
              <span>
                Côté stablecoins, <strong>USDC, EURC et EURCV</strong> ont un émetteur inscrit au registre de l&apos;ESMA ;
                USDT n&apos;en a pas.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <BookOpen className="mt-1 h-4 w-4 shrink-0 text-indigo-400" />
              <span>
                L&apos;ancien statut <strong>PSAN</strong> ne vaut plus autorisation : seul compte l&apos;agrément{" "}
                <strong>MiCA (CASP)</strong>.
              </span>
            </li>
          </ul>
        </section>

        <section id="contexte" className="mt-12">
          <h2>1. Ce qui a changé le 1er juillet 2026</h2>
          <p>
            Le règlement <strong>(UE) 2023/1114</strong>, dit <strong>MiCA</strong>, s&apos;applique aux prestataires de
            services sur crypto-actifs (CASP) depuis le 30 décembre 2024, et aux émetteurs de stablecoins depuis le 30 juin
            2024. Son article 143 laissait aux acteurs déjà en activité une période transitoire, que la France a fixée à 18
            mois : elle a pris fin le 1er juillet 2026.
          </p>
          <p>
            Depuis, seul un prestataire agréé MiCA peut fournir des services sur crypto-actifs à un résident français. Il peut
            être agréé par l&apos;AMF, ou par l&apos;autorité d&apos;un autre État membre à condition que son passeport européen
            couvre la France. L&apos;ancien régime français, le <strong>PSAN</strong>, a disparu avec la période transitoire.
          </p>
        </section>

        <section id="agreees" className="mt-12">
          <h2>2. Plateformes agréées avec accès à la France</h2>
          <p>
            Ces {AUTHORIZED.length} plateformes, parmi celles que nous suivons, figurent au registre MiCA de l&apos;ESMA avec un
            accès à la France (données au {REGISTER_AS_OF}).
          </p>
          <div className="my-6 not-prose space-y-3">
            {AUTHORIZED.map((p) => (
              <div key={p.id} className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">
                    <Link href={`/avis/${p.id}`} className="hover:text-cyan-300">
                      {p.name}
                    </Link>
                  </h3>
                  {p.mica.legalEntity && <span className="text-xs text-slate-400">{p.mica.legalEntity}</span>}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500">Autorité</div>
                    <div className="text-slate-200">{p.mica.authority ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500">Agrément MiCA</div>
                    <div className="text-slate-200">{frDate(p.mica.registrationDate)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500">Accès à la France</div>
                    <div className="text-slate-200">
                      {p.mica.amfRegistration ? `Agrément AMF n° ${p.mica.amfRegistration}` : "Passeport européen"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="non-autorisees" className="mt-12">
          <h2>3. Plateformes non autorisées en France</h2>
          <p>
            Ces {NOT_AUTHORIZED.length} plateformes, que nous suivions avant l&apos;échéance, ne peuvent pas servir de clients
            français à la date de notre vérification. Nous ne les recommandons pas et ne proposons aucun lien vers elles.
          </p>
          <div className="my-6 not-prose space-y-3">
            {NOT_AUTHORIZED.map((p) => (
              <div key={p.id} className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <XCircle className="h-5 w-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">
                    <Link href={`/avis/${p.id}`} className="hover:text-cyan-300">
                      {p.name}
                    </Link>
                  </h3>
                </div>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{p.mica.status}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="stablecoins" className="mt-12">
          <h2>4. Stablecoins</h2>
          <p>
            MiCA encadre aussi les émetteurs de stablecoins adossés à une monnaie, les jetons de monnaie électronique (EMT).
            Situation au registre de l&apos;ESMA pour les plus utilisés :
          </p>
          <div className="my-6 not-prose space-y-3">
            {STABLECOINS.map((s) => (
              <div
                key={s.name}
                className={`rounded-xl border p-5 ${s.ok ? "border-emerald-500/15 bg-emerald-500/[0.04]" : "border-amber-500/20 bg-amber-500/[0.04]"}`}
              >
                <div className="flex items-center gap-3">
                  {s.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-amber-400" />}
                  <h3 className="text-base font-bold text-white">{s.name}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pratique" className="mt-12">
          <h2>5. Ce que vous devez faire</h2>
          <ol>
            <li>
              <strong>Vérifiez chacune de vos plateformes</strong> avec notre{" "}
              <Link href="/outils/verificateur-mica">vérificateur MiCA</Link> ou directement sur les registres officiels.
            </li>
            <li>
              <strong>Si une plateforme n&apos;est pas autorisée</strong>, renseignez-vous sur ses conditions de retrait et
              transférez vos avoirs vers une plateforme agréée ou vers un portefeuille personnel. Un transfert entre vos propres
              comptes n&apos;est pas imposable.
            </li>
            <li>
              <strong>Déclarez vos comptes à l&apos;étranger</strong> (formulaire 3916-bis), y compris ceux que vous avez fermés
              en cours d&apos;année : l&apos;oubli coûte 750 € par compte, 1 500 € si la valeur dépasse 50 000 €.
            </li>
            <li>
              <strong>Choisissez une plateforme agréée</strong> selon vos besoins réels (frais, catalogue, support en
              français) : voir notre <Link href="/comparatif/frais">comparatif des frais</Link>.
            </li>
          </ol>
        </section>

        <section id="faq" className="mt-12">
          <h2>6. FAQ</h2>
          <div className="my-6 not-prose space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 open:border-amber-500/30">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-semibold text-white">
                  <span>{item.q}</span>
                  <span className="text-amber-300 transition group-open:rotate-45 mt-0.5 shrink-0">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="sources" className="mt-12">
          <h2>7. Sources & méthodologie</h2>
          <p>
            Les statuts viennent du registre intérimaire MiCA de l&apos;ESMA (fichier officiel des prestataires agréés, données
            au {REGISTER_AS_OF}) et des listes blanches de l&apos;AMF pour les numéros d&apos;agrément français, consultés le{" "}
            {frDate(LAST_UPDATED)}. Une plateforme est dite « agréée avec accès à la France » si elle est agréée par l&apos;AMF
            ou si la France figure parmi les pays couverts par son passeport.
          </p>
          <ul className="not-prose mt-4 space-y-2">
            {SOURCES.map((s) => (
              <li key={s.url} className="flex items-start gap-2 text-sm">
                <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-cyan-300 hover:underline">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            <strong>Données réutilisables</strong> : les statuts sont disponibles en JSON sur{" "}
            <Link href="/api/public/psan-registry">/api/public/psan-registry</Link> sous licence CC-BY 4.0, avec mention
            d&apos;attribution.
          </p>
          <p className="mt-4 text-sm">
            <strong>Une erreur ?</strong> Écrivez-nous :{" "}
            <a href={`mailto:${BRAND.partnersEmail}`} className="text-cyan-300">
              {BRAND.partnersEmail}
            </a>
            .
          </p>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            <strong>Avertissement.</strong> Cette étude est publiée à titre d&apos;information. Cryptoreflex ne fournit ni conseil
            en investissement ni conseil juridique. Investir dans les crypto-actifs comporte un risque de perte en capital.
          </p>
        </section>
      </article>

      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <NewsletterInline
            source="bottom-article"
            context="regulation"
            variant="default"
            title="Vous suivez l'évolution MiCA ?"
            subtitle="Nouveaux agréments, plateformes qui ferment, ce que ça change pour vous. Désinscription en 1 clic."
            ctaLabel="M'abonner à la veille MiCA"
          />
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Continuer</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/outils/verificateur-mica"
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left hover:border-cyan-500/30 transition"
            >
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300">Vérificateur MiCA</h3>
              <p className="mt-2 text-sm text-slate-300">Le statut de {getAllMicaPlatforms().length} plateformes et portefeuilles, à partir des registres officiels.</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300">
                Vérifier une plateforme
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
            <Link
              href="/comparatif/frais"
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left hover:border-cyan-500/30 transition"
            >
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300">Comparatif des frais</h3>
              <p className="mt-2 text-sm text-slate-300">Les frais réels des plateformes autorisées en France, sourcés et datés.</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300">
                Voir le comparatif
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
