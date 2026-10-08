import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, CalendarDays, ExternalLink, Sparkles } from "lucide-react";

import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import { graphSchema } from "@/lib/schema";
import CardVisual from "@/components/reflex-cards/CardVisual";
import CardTilt from "@/components/reflex-cards/CardTilt";
import { InviteBanner, PlayLink } from "@/components/reflex-cards/InviteLanding";
import {
  REFLEX_META,
  albumCards,
  allCards,
  cleanName,
  ficheHref,
  getCard,
  isIndexable,
  isReflexCardsEnabled,
  isRevealed,
  isVisible,
  oddsText,
  ordinal,
  isLaunched,
  rarityInfo,
  seasonDay,
  shareText,
  todayChance,
} from "@/lib/reflex-cards/data";
import { applyReleases } from "@/lib/reflex-cards/releases";
import { PIPS, RC, RNAME } from "@/lib/reflex-cards/render";
import type { ReflexCard } from "@/lib/reflex-cards/types";
import { CAT_LABEL, UNIVERS_ON, universBlurb, universById, universCards, universIndexable, universOvr, universStats } from "@/lib/reflex-cards/univers";
import { universCardP } from "@/lib/reflex-cards/engine";
import { rareCard } from "@/lib/reflex-cards/rare";
import UniversCarte from "@/components/reflex-cards/UniversCarte";
import Breadcrumbs from "@/components/Breadcrumbs";

/**
 * /cartes/[id] — page publique d'une carte Reflex (id = identifiant CoinGecko).
 * Rien ne fuite avant la sortie (décision Kev 02/10) :
 *  - pas encore sortie : page « à venir » neutre (dos de carte, ni rareté ni numéro ni date), noindex ;
 *  - sortie : case vide de l'album (la carte entière se découvre en l'obtenant) ;
 *  - révélée officiellement : carte entière.
 * Toutes les cartes sont générées au build (dynamicParams = false : id inconnu = VRAI 404 ; avec le
 * loading.tsx racine, un notFound() dynamique répondrait 200). Régénération chaque heure : une carte
 * passe d'« à venir » à « sortie » le jour J sans redéploiement.
 * Indexable seulement si sortie, avec une description ET une fiche crypto à relier.
 * Univers (REFLEX_CARDS_UNIVERS=true au build) : les 27 000 cartes du catalogue ne sont pas générées au build ; elles sont
 * rendues à la demande (dynamicParams) et mises en cache une heure ; id inconnu = notFound() (page sans lecture « no-store » : vrai 404).
 */
export const dynamicParams = process.env.REFLEX_CARDS_UNIVERS?.trim() === "true";
export const revalidate = 3600;

/** part des tirages pris par les éditions (Mythiques, Équipe, Icônes, Bloc, Fossiles, Reliques) ce jour-là */

export function generateStaticParams() {
  if (!isReflexCardsEnabled()) return [];
  return allCards().map((c) => ({ id: c.id }));
}

interface Props {
  params: { id: string };
}

const rarityArticle = (c: ReflexCard) => (c.fossil ? "Fossile" : RNAME[c.r]);
/** ordinal féminin (« la 1re crypto », « la 12e ») */
const ordF = (n: number) => (n === 1 ? "1re" : `${n.toLocaleString("fr-FR")}e`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await applyReleases({ readOnly: true });
  const c = getCard(params.id);
  if (!c && isReflexCardsEnabled() && UNIVERS_ON()) {
    const u = universById(params.id);
    if (!u) return {};
    const url = `${BRAND.url}/cartes/${u.id}`;
    const title = `${u.nom} : carte ${RNAME[u.r]} Reflex Cards (${CAT_LABEL[u.cat]})`;
    const blurb = universBlurb(u.id);
    const description = `${blurb ? blurb + " " : ""}Carte ${RNAME[u.r].toLowerCase()} du chapitre ${CAT_LABEL[u.cat]} de Reflex Cards, le jeu de cartes crypto gratuit de Cryptoreflex.`.slice(0, 300);
    return { title, description, alternates: withHreflang(url), robots: universIndexable(u) ? undefined : { index: false, follow: true }, openGraph: { title, description, url, type: "website" }, twitter: { card: "summary_large_image", title, description } };
  }
  if (!c || !isReflexCardsEnabled()) return {};
  const name = cleanName(c.name);
  const url = `${BRAND.url}/cartes/${c.id}`;
  if (!(UNIVERS_ON() && !c.fossil && universById(c.id)) && !isVisible(c, seasonDay())) {
    const t = `${name} : carte Reflex à venir`;
    return { title: t, description: `La carte Reflex de ${name} sortira au fil de la saison 1 de Reflex Cards, le jeu de cartes crypto gratuit de Cryptoreflex.`, robots: { index: false, follow: true }, alternates: withHreflang(url) };
  }
  const label = c.sym.toLowerCase() === name.toLowerCase() ? name : `${name} (${c.sym})`;
  /* Univers (04/10) : rareté, numéro et total de cartes du JEU actuel (cohérence avec le jeu, Kev : « point sur le nombre de cartes ») */
  const uu = UNIVERS_ON() && !c.fossil ? universById(c.id) : undefined;
  if (uu) {
    const total = universCards().length, catTotal = universStats()[uu.cat].total;
    const t = `${label} : carte ${RNAME[uu.r]} Reflex Cards`;
    const d = `Carte ${RNAME[uu.r]} n° ${uu.rank.toLocaleString("fr-FR")} sur ${catTotal.toLocaleString("fr-FR")} du chapitre Cryptos de Reflex Cards, le jeu de cartes crypto gratuit de Cryptoreflex. ${c.tag || ""}`.trim();
    const sh = `Carte ${RNAME[uu.r]} n° ${uu.rank.toLocaleString("fr-FR")} des cryptos. ${total.toLocaleString("fr-FR")} cartes crypto à collectionner gratuitement, sans achat : ouvrez votre premier booster et tentez votre chance.`;
    return { title: t, description: d, alternates: withHreflang(url), robots: isIndexable(c) ? undefined : { index: false, follow: true }, openGraph: { title: t, description: sh, url, type: "website" }, twitter: { card: "summary_large_image", title: t, description: sh } };
  }
  const title = c.fossil ? `${name} : carte Fossile Reflex Cards` : `${label} : carte ${RNAME[c.r]} Reflex Cards`;
  const description = c.fossil
    ? `${name} au Musée des Fossiles de Reflex Cards : ce qui s'est passé et la leçon à retenir. Jeu de cartes crypto gratuit de Cryptoreflex.`
    : `Carte ${RNAME[c.r]} n° ${c.num} de la saison 1 de Reflex Cards, le jeu de cartes crypto gratuit de Cryptoreflex. ${c.tag || ""}`.trim();
  /* texte sous l'aperçu du lien partagé : donner envie de venir collectionner, sans rien promettre de faux */
  const share = c.fossil
    ? `${name} au Musée des Fossiles de Reflex Cards : ce qui s'est passé et la leçon à retenir. ${REFLEX_META.ncards} cartes crypto à collectionner gratuitement.`
    : `Carte ${RNAME[c.r]} n° ${String(c.num).padStart(3, "0")} sur ${REFLEX_META.ncards}. Collectionnez les ${REFLEX_META.ncards} cartes crypto gratuitement, sans achat : ouvrez votre premier booster et tentez votre chance !`;
  return {
    title,
    description,
    alternates: withHreflang(url),
    robots: isIndexable(c) ? undefined : { index: false, follow: true },
    openGraph: { title, description: share, url, type: "website" },
    twitter: { card: "summary_large_image", title, description: share },
  };
}

/** pourquoi cette carte a cette rareté (règle validée : notoriété durable, jamais le prix) */
function rarityReason(c: ReflexCard): string {
  if (c.fossil) return "Les projets morts (faillite, fraude jugée, réseau arrêté) quittent l'album et entrent au Musée des Fossiles. Le critère est un événement sourcé, jamais le prix.";
  const fam = albumCards().filter((x) => x.fam === c.fam).sort((a, b) => a.noto - b.noto);
  if (c.r === "L") {
    const why = [c.legende && `le projet le plus connu de la famille ${c.fam}`, c.merite && "l'un des 10 projets les plus connus de la saison (hors stablecoins)"].filter(Boolean);
    return why.length ? `Légendaire car c'est ${why.join(" et ")}.` : `Légendaire d'après son rang de notoriété durable : ${ordinal(c.noto)} sur ${REFLEX_META.ncards}.`;
  }
  if (c.r === "UR") {
    const k = fam.filter((x) => x.r !== "L").findIndex((x) => x.id === c.id) + 1;
    if (k > 0 && k <= 2) return `Ultra rare car c'est l'un des 2 projets les plus connus de la famille ${c.fam} après ses Légendaires.`;
    return "Ultra rare car c'est l'un des 40 projets les plus connus de la saison.";
  }
  return `${RNAME[c.r]} d'après son rang de notoriété durable : ${ordinal(c.noto)} sur ${REFLEX_META.ncards}.`;
}

/** carte pas encore sortie : rien ne fuite (ni rareté, ni numéro, ni partie, ni date) */
function CarteAVenir({ c, name, fiche }: { c: ReflexCard; name: string; fiche: string | null }) {
  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin={`/cartes/${c.id}`} label={name} />
        <div className="mt-6 grid grid-cols-1 items-start gap-8 md:grid-cols-[288px,1fr] md:gap-12">
          {/* B1 : sous 320 px, la carte (288 px) ne tient pas dans 248 px → zoom 0,86 sur la carte seule */}
          <div className="mx-auto md:mx-0 max-[319px]:[zoom:0.86]">
            <CardVisual card={c} mode="back" day={0} width={288} />
          </div>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-glow/40 bg-primary-glow/10 px-3 py-1 text-xs font-semibold text-primary-soft">
              <Sparkles className="h-3.5 w-3.5" /> Carte à venir · Saison 1
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{name} : carte Reflex à venir</h1>
            <p className="mt-3 text-fg/75">
              La carte de {name} sortira au fil de la saison 1. Sa rareté, son numéro et sa date de sortie restent secrets jusque-là : les cartes se dévoilent partie après partie, chaque semaine.
            </p>
            <h2 className="mt-8 text-lg font-bold">Comment sortent les cartes ?</h2>
            <p className="mt-2 text-sm text-fg/70">
              La saison 1 compte {REFLEX_META.ncards} cartes, dévoilées en 12 parties : 300 le premier jour, puis une cinquantaine à chaque future sortie. Chaque carte se tire dès sa sortie, gratuitement, dans des boosters de 5 cartes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/cartes" className="btn-primary text-sm py-2.5 px-5">
                Découvrir le jeu <ArrowRight className="h-4 w-4" />
              </Link>
              {fiche && (
                <Link href={fiche} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-fg/85 hover:border-primary/50 hover:text-fg">
                  <BookOpen className="h-4 w-4" /> Lire la fiche {name}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function CartePage({ params }: Props) {
  await applyReleases({ readOnly: true }); // sorties effectives (paliers de joueurs)
  if (!isReflexCardsEnabled()) notFound();
  const c = getCard(params.id);
  if (!c) {
    /* carte de l'Univers (hors jeu d'origine) : page dédiée ; sinon vrai 404 */
    const u = UNIVERS_ON() ? universById(params.id) : undefined;
    if (!u) notFound();
    return <UniversCarte c={u} chance={universCardP(seasonDay(), u.r, CAT_LABEL[u.cat])} />;
  }
  const day = seasonDay();
  const name = cleanName(c.name);
  const fiche = ficheHref(c);
  /* Univers : toutes les cartes sont sorties (plus de page « à venir ») */
  if (!(UNIVERS_ON() && !c.fossil && universById(c.id)) && !isVisible(c, day)) return <CarteAVenir c={c} name={name} fiche={fiche} />;
  /* Univers (04/10) : la carte d'origine prend la rareté, le chapitre, le numéro et la chance du JEU actuel ; plus rien de caché
     (Kev : « je ne veux plus cacher pour attirer les gens ») ; sa forme la plus rare est montrée */
  const u = UNIVERS_ON() && !c.fossil ? universById(c.id) : undefined;
  const st = u ? universStats()[u.cat] : null;
  const cv: ReflexCard = u && st ? { ...c, r: u.r, num: u.rank, noto: u.rank, ovr: universOvr(u.rank, st.total) } : c;
  const ft = u && st ? `Cryptos · ${u.rank.toLocaleString("fr-FR")}/${st.total.toLocaleString("fr-FR")}` : undefined;
  const rare = rareCard(c.id);
  const revealed = u ? true : isRevealed(c);
  const info = c.fossil || u ? null : rarityInfo(c.r);
  const col = c.fossil ? "#a8927a" : RC[cv.r];
  // Reprise B2 : TEXTE de rareté sur le jeton r-*-text (= RC en Encre, foncé en Papier) ; col reste la teinte d'aplat.
  const colTxt = c.fossil ? col : `rgb(var(--c-r-${cv.r.toLowerCase()}-text))`;
  const chance = u ? universCardP(day, u.r, CAT_LABEL[u.cat]) : todayChance(c, day);
  const family = c.fossil ? [] : albumCards().filter((x) => x.fam === c.fam && isVisible(x, day));
  const idx = family.findIndex((x) => x.id === c.id);
  const near = family.slice(Math.max(0, idx - 4), idx + 5).filter((x) => x.id !== c.id).slice(0, 8);

  const schema = graphSchema([
  ]);

  const facts: [string, React.ReactNode][] = c.fossil
    ? [
        ["Statut", "Musée des Fossiles (hors circulation dans l'album)"],
        ["Famille", c.fam],
        ["Critère", c.fossile?.critere ?? "Événement sourcé"],
        ["Chance", `${oddsText(chance)} tirée pour ce fossile`],
      ]
    : [
        ["Rareté", <span key="r" style={{ color: colTxt }}>{RNAME[cv.r]} {PIPS[cv.r]}</span>],
        ...(u && st
          ? ([
              ["Chapitre", "Cryptos"],
              ["Type", c.fam],
              ["N° d'album", `${u.rank.toLocaleString("fr-FR")} / ${st.total.toLocaleString("fr-FR")}`],
              ["Notoriété", `${ordF(u.rank)} crypto la plus connue de l'Univers`],
              ...(c.year ? ([["Lancement", String(c.year)]] as [string, string][]) : []),
              ...(rare ? ([["Version la plus rare", rare.label]] as [string, string][]) : []),
            ] as [string, string][])
          : ([
              ["Famille (chapitre)", c.fam],
              ["N° d'album", `${String(c.num).padStart(3, "0")} / ${REFLEX_META.ncards}`],
              ["Notoriété durable", `${ordinal(c.noto)} projet le plus connu de la saison`],
              ...(c.year ? ([["Lancement", String(c.year)]] as [string, string][]) : []),
              ["Sortie", c.sortie ? `${c.sortie.collection}, partie ${c.sortie.partie} · jour ${c.sortie.jour} de la saison${c.sortie.tete ? " (tête d'affiche)" : ""}` : "—"],
              ["Fabrication", c.sortie ? `avec des éclats, dès le jour ${c.sortie.fabrication}` : "—"],
            ] as [string, string][])),
        ["Chance", `${oddsText(chance)} tirée ${day >= 1 ? "aujourd'hui" : "au lancement"}`],
      ];

  return (
    <>
      <StructuredData data={schema} id={`carte-${c.id}`} />
      <CardTilt />
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs chemin={`/cartes/${c.id}`} label={name} />
          {isLaunched() && <InviteBanner name={name} />}

          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[288px,1fr] md:gap-12 items-start">
            <div className="mx-auto md:mx-0 md:sticky md:top-24">
              {/* B1 : sous 320 px, la carte (288 px) ne tient pas dans 248 px → zoom 0,86 sur la carte seule */}
              <div className="max-[319px]:[zoom:0.86]">
                <CardVisual card={cv} mode={revealed ? "card" : "slot"} day={day} width={288} chance={u ? chance : undefined} ft={ft} />
              </div>
              {rare && (
                <div className="mt-6 max-w-[288px] text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: rare.form === "myth" ? "#ff2d6f" : "#f7d774" }}>Sa version la plus rare</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={rare.src} width={rare.w} height={rare.h} alt={`Carte Reflex ${name}, version ${rare.label}`} loading="lazy" decoding="async" className="mx-auto mt-2 h-auto w-[220px] drop-shadow-[0_18px_30px_rgb(var(--c-scrim)/0.55)]" />
                  <p className="mt-2 text-xs text-muted"><strong className="text-fg/85">{rare.label}</strong> : {rare.phrase}.</p>
                </div>
              )}
              {!revealed && (
                <p className="mt-3 max-w-[288px] text-center text-xs text-muted">
                  La case de l&apos;album est vide : la carte entière se découvre en l&apos;obtenant dans un booster.
                </p>
              )}
            </div>

            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                style={{ borderColor: `${col}66`, background: `${col}1a`, color: colTxt }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {c.fossil ? "Musée des Fossiles" : u ? `Carte ${RNAME[cv.r]} · chapitre Cryptos` : `Carte ${rarityArticle(c)} · Saison 1`}
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {name} {c.sym.toLowerCase() !== name.toLowerCase() && <span className="text-fg-4 text-2xl sm:text-3xl">({c.sym})</span>}
              </h1>
              <p className="mt-3 text-fg/75">
                {u && st
                  ? `${RNAME[cv.r]} : la rareté est la place de la carte dans sa catégorie (notoriété, usage), jamais son prix. ${name} est la ${ordF(u.rank)} des ${st.total.toLocaleString("fr-FR")} cryptos de l'Univers Reflex Cards.`
                  : rarityReason(c)}
              </p>

              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-border bg-surface p-5 text-sm">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
                    <dd className="mt-0.5 text-fg">{v}</dd>
                  </div>
                ))}
              </dl>

              {c.fossil && c.fossile ? (
                <div className="mt-8 space-y-4">
                  <h2 className="text-xl font-bold">Ce qui s&apos;est passé</h2>
                  <p className="text-fg/80 leading-relaxed">{c.fossile.evenement}</p>
                  <h2 className="text-xl font-bold">La leçon</h2>
                  <p className="text-fg/80 leading-relaxed">{c.fossile.lecon}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <a href={c.fossile.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-soft hover:text-primary">
                      Source <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a href={c.fossile.article.replace(/^https:\/\/www\.cryptoreflex\.fr/, "")} className="inline-flex items-center gap-1 text-primary-soft hover:text-primary">
                      Lire l&apos;article Cryptoreflex <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-8">
                  <h2 className="text-xl font-bold">À propos de {name}</h2>
                  {c.tag && <p className="mt-2 font-semibold text-fg/90">{c.tag}</p>}
                  <p className="mt-2 text-fg/80 leading-relaxed">{c.desc}</p>
                  {fiche && (
                    <Link href={fiche} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-soft hover:border-primary hover:text-primary">
                      <BookOpen className="h-4 w-4" /> Lire la fiche complète {name}
                    </Link>
                  )}
                </div>
              )}

              {u && st && (
                <div className="mt-8 rounded-2xl border border-border p-5 text-sm text-fg/80">
                  <div className="flex items-center gap-2 font-semibold text-fg">
                    <CalendarDays className="h-4 w-4" style={{ color: col }} />
                    Rareté {RNAME[cv.r]}
                  </div>
                  <p className="mt-2">
                    Le chapitre Cryptos compte {(st[cv.r] ?? 0).toLocaleString("fr-FR")} cartes {RNAME[cv.r].toLowerCase()}s sur {st.total.toLocaleString("fr-FR")}. Un booster tire d&apos;abord une rareté, puis une carte au hasard parmi celles de cette rareté : celle-ci sort {oddsText(chance)}.
                  </p>
                </div>
              )}
              {info && (
                <div className="mt-8 rounded-2xl border border-border p-5 text-sm text-fg/80">
                  <div className="flex items-center gap-2 font-semibold text-fg">
                    <CalendarDays className="h-4 w-4" style={{ color: col }} />
                    Rareté {RNAME[c.r]}
                  </div>
                  <p className="mt-2">
                    {info.n} cartes {RNAME[c.r].toLowerCase()}s sur {REFLEX_META.ncards}. {shareText(info.chance)} {info.chance >= 0.01 ? "sont" : "est"} {RNAME[c.r].toLowerCase()}{info.chance >= 0.01 ? "s" : ""} ; celle-ci en particulier : {oddsText(chance).replace("1 carte sur", "1 sur")}.
                    Le classement suit la notoriété durable (pages vues Wikipédia sur 12 mois et abonnés CoinGecko), jamais le prix.
                  </p>
                </div>
              )}

              <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
                <h2 className="text-lg font-bold">{isLaunched() ? "Jouez à Reflex Cards" : "Reflex Cards arrive bientôt"}</h2>
                <p className="mt-1 text-sm text-fg/70">
                  Le jeu de cartes crypto gratuit de Cryptoreflex : un booster de 5 cartes offert toutes les 15 minutes (jusqu&apos;à 10 en réserve), sans achat ni revente.
                </p>
                {isLaunched() ? (
                  <PlayLink className="btn-primary mt-4 text-sm py-2.5 px-5">
                    Jouer maintenant <ArrowRight className="h-4 w-4" />
                  </PlayLink>
                ) : (
                  <Link href="/cartes" className="btn-primary mt-4 text-sm py-2.5 px-5">
                    Découvrir le jeu <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              {revealed && <details className="mt-6 rounded-2xl border border-border p-5 text-sm">
                <summary className="cursor-pointer font-semibold text-fg">Intégrer cette carte sur votre site</summary>
                <p className="mt-2 text-fg/70">Copiez ce code dans votre page (blog, profil, forum). La carte reste à jour automatiquement.</p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background p-3 text-xs text-fg/85">
                  <code>{`<iframe src="${BRAND.url}/embed/carte/${c.id}" width="280" height="410" style="border:0" loading="lazy" title="Carte Reflex ${name.replace(/["<>&]/g, "")}"></iframe>`}</code>
                </pre>
              </details>}
            </div>
          </div>

          {near.length > 0 && (
            <div className="mt-14">
              <h2 className="text-xl font-bold">Dans la même famille : {c.fam}</h2>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {near.map((x) => (
                  <li key={x.id}>
                    <Link href={`/cartes/${x.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:border-primary/50">
                      <span className="truncate text-fg">{cleanName(x.name)}</span>
                      <span className="shrink-0 text-xs" style={{ color: `rgb(var(--c-r-${x.r.toLowerCase()}-text))` }} title={RNAME[x.r]}>{PIPS[x.r]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-10 text-xs text-muted">
            Saison 1 · données du {new Date(REFLEX_META.genere).toLocaleDateString("fr-FR", { timeZone: "UTC" })}
            {REFLEX_META.provisoire ? " · classement provisoire, susceptible d'évoluer avant le lancement" : ""}. Reflex Cards est un jeu gratuit : les cartes n&apos;ont aucune valeur marchande et ne constituent pas un conseil en investissement.
          </p>
        </div>
      </section>
    </>
  );
}
