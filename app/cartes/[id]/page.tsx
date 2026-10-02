import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, CalendarDays, ExternalLink, Sparkles } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import CardVisual from "@/components/reflex-cards/CardVisual";
import CardTilt from "@/components/reflex-cards/CardTilt";
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
  rarityInfo,
  seasonDay,
  shareText,
  todayChance,
} from "@/lib/reflex-cards/data";
import { PIPS, RC, RNAME } from "@/lib/reflex-cards/render";
import type { ReflexCard } from "@/lib/reflex-cards/types";

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
 */
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  if (!isReflexCardsEnabled()) return [];
  return allCards().map((c) => ({ id: c.id }));
}

interface Props {
  params: { id: string };
}

const rarityArticle = (c: ReflexCard) => (c.fossil ? "Fossile" : RNAME[c.r]);

export function generateMetadata({ params }: Props): Metadata {
  const c = getCard(params.id);
  if (!c || !isReflexCardsEnabled()) return {};
  const name = cleanName(c.name);
  const url = `${BRAND.url}/cartes/${c.id}`;
  if (!isVisible(c, seasonDay())) {
    const t = `${name} : carte Reflex à venir`;
    return { title: t, description: `La carte Reflex de ${name} sortira au fil de la saison 1 de Reflex Cards, le jeu de cartes crypto gratuit de Cryptoreflex.`, robots: { index: false, follow: true }, alternates: { canonical: url } };
  }
  const label = c.sym.toLowerCase() === name.toLowerCase() ? name : `${name} (${c.sym})`;
  const title = c.fossil ? `${name} : carte Fossile Reflex Cards` : `${label} : carte ${RNAME[c.r]} Reflex Cards`;
  const description = c.fossil
    ? `${name} au Musée des Fossiles de Reflex Cards : ce qui s'est passé et la leçon à retenir. Jeu de cartes crypto gratuit de Cryptoreflex.`
    : `Carte ${RNAME[c.r]} n° ${c.num} de la saison 1 de Reflex Cards, le jeu de cartes crypto gratuit de Cryptoreflex. ${c.tag || ""}`.trim();
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: isIndexable(c) ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** pourquoi cette carte a cette rareté (règle validée : notoriété durable, jamais le prix) */
function rarityReason(c: ReflexCard): string {
  if (c.fossil) return "Les projets morts (faillite, fraude jugée, réseau arrêté) quittent l'album et entrent au Musée des Fossiles. Le critère est un événement sourcé, jamais le prix.";
  const fam = albumCards().filter((x) => x.fam === c.fam).sort((a, b) => a.noto - b.noto);
  if (c.r === "L") {
    const why = [c.legende && `le projet le plus connu de la famille ${c.fam}`, c.merite && "l'un des 10 projets les plus connus de la saison (hors stablecoins)"].filter(Boolean);
    return why.length ? `Légendaire car c'est ${why.join(" et ")}.` : `Légendaire d'après son rang de notoriété durable : ${c.noto}e sur ${REFLEX_META.ncards}.`;
  }
  if (c.r === "UR") {
    const k = fam.filter((x) => x.r !== "L").findIndex((x) => x.id === c.id) + 1;
    if (k > 0 && k <= 2) return `Ultra rare car c'est l'un des 2 projets les plus connus de la famille ${c.fam} après ses Légendaires.`;
    return "Ultra rare car c'est l'un des 40 projets les plus connus de la saison.";
  }
  return `${RNAME[c.r]} d'après son rang de notoriété durable : ${c.noto}e sur ${REFLEX_META.ncards}.`;
}

/** carte pas encore sortie : rien ne fuite (ni rareté, ni numéro, ni partie, ni date) */
function CarteAVenir({ c, name, fiche }: { c: ReflexCard; name: string; fiche: string | null }) {
  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/cartes" className="hover:text-fg">Reflex Cards</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">{name}</span>
        </nav>
        <div className="mt-6 grid items-start gap-8 md:grid-cols-[288px,1fr] md:gap-12">
          <div className="mx-auto md:mx-0">
            <CardVisual card={c} mode="back" width={288} />
          </div>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" /> Carte à venir · Saison 1
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{name} : carte Reflex à venir</h1>
            <p className="mt-3 text-fg/75">
              La carte de {name} sortira au fil de la saison 1. Sa rareté, son numéro et sa date de sortie restent secrets jusque-là : les cartes se dévoilent partie après partie, chaque semaine.
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

export default function CartePage({ params }: Props) {
  if (!isReflexCardsEnabled()) notFound();
  const c = getCard(params.id);
  if (!c) notFound();
  const day = seasonDay();
  const name = cleanName(c.name);
  const fiche = ficheHref(c);
  if (!isVisible(c, day)) return <CarteAVenir c={c} name={name} fiche={fiche} />;
  const revealed = isRevealed(c);
  const info = c.fossil ? null : rarityInfo(c.r);
  const col = c.fossil ? "#a8927a" : RC[c.r];
  const chance = todayChance(c, day);
  const family = c.fossil ? [] : albumCards().filter((x) => x.fam === c.fam && isVisible(x, day));
  const idx = family.findIndex((x) => x.id === c.id);
  const near = family.slice(Math.max(0, idx - 4), idx + 5).filter((x) => x.id !== c.id).slice(0, 8);

  const schema = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Reflex Cards", url: "/cartes" },
      { name, url: `/cartes/${c.id}` },
    ]),
  ]);

  const facts: [string, React.ReactNode][] = c.fossil
    ? [
        ["Statut", "Musée des Fossiles (hors circulation dans l'album)"],
        ["Famille", c.fam],
        ["Critère", c.fossile?.critere ?? "Événement sourcé"],
        ["Chance", `${oddsText(chance)} tirée pour ce fossile`],
      ]
    : [
        ["Rareté", <span key="r" style={{ color: col }}>{RNAME[c.r]} {PIPS[c.r]}</span>],
        ["Famille (chapitre)", c.fam],
        ["N° d'album", `${String(c.num).padStart(3, "0")} / ${REFLEX_META.ncards}`],
        ["Notoriété durable", `${c.noto}e projet le plus connu de la saison`],
        ...(c.year ? ([["Lancement", String(c.year)]] as [string, string][]) : []),
        ["Sortie", c.sortie ? `${c.sortie.collection}, partie ${c.sortie.partie} · jour ${c.sortie.jour} de la saison${c.sortie.tete ? " (tête d'affiche)" : ""}` : "—"],
        ["Fabrication", c.sortie ? `avec des éclats, dès le jour ${c.sortie.fabrication}` : "—"],
        ["Chance", `${oddsText(chance)} tirée ${day >= 1 ? "aujourd'hui" : "au lancement"}`],
      ];

  return (
    <>
      <StructuredData data={schema} id={`carte-${c.id}`} />
      <CardTilt />
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">Accueil</Link>
            <span className="mx-2">/</span>
            <Link href="/cartes" className="hover:text-fg">Reflex Cards</Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">{name}</span>
          </nav>

          <div className="mt-6 grid gap-8 md:grid-cols-[288px,1fr] md:gap-12 items-start">
            <div className="mx-auto md:mx-0 md:sticky md:top-24">
              <CardVisual card={c} mode={revealed ? "card" : "slot"} day={day} width={288} />
              {!revealed && (
                <p className="mt-3 max-w-[288px] text-center text-xs text-muted">
                  La case de l&apos;album est vide : la carte entière se découvre en l&apos;obtenant dans un booster.
                </p>
              )}
            </div>

            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                style={{ borderColor: `${col}66`, background: `${col}1a`, color: col }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {c.fossil ? "Musée des Fossiles" : `Carte ${rarityArticle(c)} · Saison 1`}
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {name} {c.sym.toLowerCase() !== name.toLowerCase() && <span className="text-fg/50 text-2xl sm:text-3xl">({c.sym})</span>}
              </h1>
              <p className="mt-3 text-fg/75">{rarityReason(c)}</p>

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
                <h2 className="text-lg font-bold">Reflex Cards arrive bientôt</h2>
                <p className="mt-1 text-sm text-fg/70">
                  Le jeu de cartes crypto gratuit de Cryptoreflex : un booster de 5 cartes offert toutes les 10 minutes (jusqu&apos;à 36 en réserve), sans achat ni revente.
                </p>
                <Link href="/cartes" className="btn-primary mt-4 text-sm py-2.5 px-5">
                  Découvrir le jeu <ArrowRight className="h-4 w-4" />
                </Link>
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
                      <span className="shrink-0 text-xs" style={{ color: RC[x.r] }} title={RNAME[x.r]}>{PIPS[x.r]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-10 text-xs text-muted">
            Saison 1 · données du {new Date(REFLEX_META.genere).toLocaleDateString("fr-FR")}
            {REFLEX_META.provisoire ? " · classement provisoire, susceptible d'évoluer avant le lancement" : ""}. Reflex Cards est un jeu gratuit : les cartes n&apos;ont aucune valeur marchande et ne constituent pas un conseil en investissement.
          </p>
        </div>
      </section>
    </>
  );
}
