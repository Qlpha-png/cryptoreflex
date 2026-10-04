import Link from "next/link";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import { PlayLink } from "@/components/reflex-cards/InviteLanding";
import { PIPS, RC, RNAME } from "@/lib/reflex-cards/render";
import { CAT_LABEL, universById, universCards, universDesc, universStats, type UCard } from "@/lib/reflex-cards/univers";
import { oddsText } from "@/lib/reflex-cards/data";

/**
 * /cartes/[id] — page d'une carte de l'Univers (protocole, plateforme, NFT, personne, événement, entreprise, concept, ou crypto
 * absente du jeu d'origine). Rendue à la demande (ISR). Tout est « sorti » : la page montre la carte entière.
 */
const SRC_NAME: Record<string, string> = { coingecko: "CoinGecko", defillama: "DefiLlama", "defillama-hacks": "DefiLlama (registre des piratages)", wikipedia: "Wikipédia", "chronologie-cryptoreflex": "Chronologie Cryptoreflex" };
const CAT_INTRO: Record<string, string> = {
  crypto: "une cryptomonnaie", protocole: "un protocole de finance décentralisée", plateforme: "une plateforme d'échange", nft: "une collection NFT",
  personne: "une personnalité du monde crypto", evenement: "un événement de l'histoire des cryptos", entreprise: "une entreprise ou organisation du secteur", concept: "un concept ou une technologie du monde crypto",
};
const fr = (n: number) => n.toLocaleString("fr-FR").replace(/ /g, " ");
const dateFr = (t: string) => (/^\d{4}-\d{2}-\d{2}/.test(t) ? new Date(t.slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : t);

/** chance qu'une carte tirée soit celle-ci (toutes les cartes à égalité, moins la part des éditions) */
export function universCardChance(pEditions: number): number {
  return (1 - pEditions) / universCards().length;
}

export default function UniversCarte({ c, pEditions }: { c: UCard; pEditions: number }) {
  const d = universDesc(c.id);
  const col = RC[c.r];
  const label = CAT_LABEL[c.cat];
  const total = universStats()[c.cat].total;
  const chance = universCardChance(pEditions);
  const linked = d?.l ? universById(d.l) : undefined;
  const near = universCards().filter((x) => x.cat === c.cat && Math.abs(x.rank - c.rank) <= 4 && x.id !== c.id).sort((a, b) => a.rank - b.rank).slice(0, 8);
  const schema = graphSchema([breadcrumbSchema([{ name: "Accueil", url: "/" }, { name: "Reflex Cards", url: "/cartes" }, { name: c.nom, url: `/cartes/${c.id}` }])]);
  const facts: [string, React.ReactNode][] = [
    ["Rareté", <span key="r" style={{ color: col }}>{RNAME[c.r]} {PIPS[c.r]}</span>],
    ["Catégorie (chapitre)", label],
    ["Place dans la catégorie", `n° ${fr(c.rank)} sur ${fr(total)}`],
    ...(c.sous || c.fam ? ([["Type", c.fam || c.sous]] as [string, string][]) : []),
    ...(d?.t ? ([["Date", dateFr(d.t)]] as [string, string][]) : []),
    ["Chance", `${oddsText(chance)} tirée`],
  ];
  return (
    <>
      <StructuredData data={schema} id={`carte-${c.id}`} />
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">Accueil</Link>
            <span className="mx-2">/</span>
            <Link href="/cartes" className="hover:text-fg">Reflex Cards</Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">{c.nom}</span>
          </nav>
          <div className="mt-6 grid items-start gap-8 md:grid-cols-[288px,1fr] md:gap-12">
            <div className="mx-auto md:mx-0 md:sticky md:top-24">
              <div className="relative flex h-[404px] w-[288px] flex-col items-center justify-center overflow-hidden rounded-2xl border bg-surface p-6 text-center" style={{ borderColor: `${col}66`, boxShadow: `0 0 0 1px ${col}33, 0 20px 60px -30px ${col}` }}>
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: col }} />
                <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
                  {c.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.img} alt="" width={144} height={144} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  ) : (
                    <Sparkles className="h-12 w-12" style={{ color: col }} />
                  )}
                </div>
                <div className="mt-5 text-xl font-extrabold leading-tight">{c.nom}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-muted">{c.sym || c.fam || c.sous || label}</div>
                <div className="mt-4 rounded-full border px-3 py-1 text-xs font-bold" style={{ borderColor: `${col}66`, background: `${col}1a`, color: col }}>{RNAME[c.r]} {PIPS[c.r]}</div>
                <div className="mt-auto pt-4 text-[11px] text-muted">{label} · {fr(c.rank)} / {fr(total)}</div>
              </div>
              <p className="mt-3 max-w-[288px] text-center text-xs text-muted">La carte complète, avec sa matière de rareté, se découvre dans le jeu.</p>
            </div>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: `${col}66`, background: `${col}1a`, color: col }}>
                <Sparkles className="h-3.5 w-3.5" /> Carte {RNAME[c.r]} · {label}
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {c.nom} {c.sym && c.sym.toLowerCase() !== c.nom.toLowerCase() && <span className="text-2xl text-fg/50 sm:text-3xl">({c.sym})</span>}
              </h1>
              <p className="mt-3 text-fg/75">
                {c.nom} est {CAT_INTRO[c.cat]}. Dans Reflex Cards, c&apos;est une carte {RNAME[c.r].toLowerCase()} du chapitre {label} : {c.rank === 1 ? "la plus connue" : `la ${fr(c.rank)}e plus connue`} des {fr(total)} cartes de ce chapitre.
              </p>
              <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 rounded-2xl border border-border bg-surface p-5 text-sm sm:grid-cols-2">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
                    <dd className="mt-0.5 text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
              {d?.d && (
                <div className="mt-8">
                  <h2 className="text-xl font-bold">À propos de {c.nom}</h2>
                  <p className="mt-2 leading-relaxed text-fg/80">{d.d}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    {d.u && (
                      <a href={d.u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-soft hover:text-primary">
                        Source : {SRC_NAME[d.s] ?? d.s ?? "source"} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {linked && (
                      <Link href={`/cartes/${linked.id}`} className="inline-flex items-center gap-1 text-primary-soft hover:text-primary">
                        Voir la carte {linked.nom} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </p>
                  {d.s === "wikipedia" && <p className="mt-2 text-xs text-muted">Texte d&apos;après Wikipédia (CC BY-SA 4.0) ; image : licence propre à chaque fichier Wikimedia Commons.</p>}
                </div>
              )}
              <div className="mt-8 rounded-2xl border border-border p-5 text-sm text-fg/80">
                <div className="font-semibold text-fg">Comment la rareté est décidée</div>
                <p className="mt-2">
                  Chaque carte de l&apos;Univers a la même chance de tomber dans un booster : {oddsText(chance).replace("1 carte sur", "1 sur")}. La rareté d&apos;une carte est sa place dans sa catégorie (notoriété, usage, histoire), jamais son prix. Le chapitre {label} compte {fr(total)} cartes, dont {fr(universStats()[c.cat].L ?? 0)} Légendaires.
                </p>
              </div>
              <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
                <h2 className="text-lg font-bold">Jouez à Reflex Cards</h2>
                <p className="mt-1 text-sm text-fg/70">Le jeu de cartes crypto gratuit de Cryptoreflex : {fr(universCards().length)} cartes à collectionner, un booster de 5 cartes offert toutes les 15 minutes, sans achat ni revente.</p>
                <PlayLink className="btn-primary mt-4 px-5 py-2.5 text-sm">Jouer maintenant <ArrowRight className="h-4 w-4" /></PlayLink>
              </div>
            </div>
          </div>
          {near.length > 0 && (
            <div className="mt-14">
              <h2 className="text-xl font-bold">Dans le même chapitre : {label}</h2>
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {near.map((x) => (
                  <li key={x.id}>
                    <Link href={`/cartes/${x.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:border-primary/50">
                      <span className="truncate text-fg">{x.nom}</span>
                      <span className="shrink-0 text-xs" style={{ color: RC[x.r] }} title={RNAME[x.r]}>{PIPS[x.r]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-10 text-xs text-muted">
            Univers Reflex Cards · logos et images : CoinGecko, DefiLlama, Wikimedia Commons ; marques de leurs propriétaires, sans affiliation. Un jeu gratuit : les cartes n&apos;ont aucune valeur marchande et ne constituent pas un conseil en investissement. Signaler une erreur ou demander un retrait : {BRAND.url.replace(/^https?:\/\//, "")}/contact.
          </p>
        </div>
      </section>
    </>
  );
}
