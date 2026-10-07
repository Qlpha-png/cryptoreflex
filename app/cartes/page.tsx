import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Gift, Landmark, Scale, ShieldCheck, Smartphone, Sparkles, UserPlus } from "lucide-react";

import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, graphSchema, type JsonLd } from "@/lib/schema";
import CardVisual from "@/components/reflex-cards/CardVisual";
import CardTilt from "@/components/reflex-cards/CardTilt";
import {
  HERO_CARDS,
  REFLEX_META,
  REFLEX_PARTS,
  REFLEX_RARITIES,
  SHOWCASE_CARDS,
  chapters,
  cleanName,
  fossilCards,
  getCard,
  isPartNamed,
  isReflexCardsEnabled,
  isReleased,
  seasonDay,
  shareText,
} from "@/lib/reflex-cards/data";
import { PIPS, RNAME } from "@/lib/reflex-cards/render";
import { reflexAccountsMode } from "@/lib/reflex-cards/flag";
import { dayDate } from "@/lib/reflex-cards/season";
import { applyReleases, FUTURE_LABEL } from "@/lib/reflex-cards/releases";
import type { ReflexCard } from "@/lib/reflex-cards/types";
import UniversHub from "@/components/reflex-cards/UniversHub";
import { UNIVERS_ON, universCards } from "@/lib/reflex-cards/univers";

/**
 * /cartes — présentation de Reflex Cards (jeu de cartes crypto gratuit).
 * Pas de liste d'attente (décision Kev 02/10 : le jeu ouvrira avant qu'une liste ait du sens).
 * Rien ne fuite avant sa sortie (décision Kev 02/10) : seules les révélations officielles du jour 1
 * se montrent en entier ; les cartes sorties apparaissent au fil des jours (page régénérée chaque heure).
 */
export const revalidate = 3600;

const PAGE_URL = `${BRAND.url}/cartes`;
const TITLE = "Reflex Cards : le jeu de cartes crypto gratuit";
/* comptes joueurs ouverts à tous (REFLEX_CARDS_ACCOUNTS=true) : la partie vit sur le serveur, plus « dans le navigateur » ;
   compte Cryptoreflex gratuit obligatoire pour ouvrir un booster (Kev 02/10) */
const ACCOUNTS = reflexAccountsMode() === "on";
const DESCRIPTION = `${REFLEX_META.ncards} cartes à collectionner, une par crypto, classées par notoriété durable et jamais par le prix. Gratuit, sans achat ni revente, ${ACCOUNTS ? "avec un compte Cryptoreflex gratuit" : "sans compte"} : la saison 1 se joue sur Cryptoreflex.`;

/* Univers (04/10) : les vrais chiffres du jeu actuel */
const descUnivers = () => `${universCards().length.toLocaleString("fr-FR")} cartes crypto à collectionner en 8 chapitres (cryptos, protocoles, plateformes, NFT, personnalités, événements, entreprises, concepts), classées par popularité et jamais par le prix. Gratuit, sans achat ni revente.`;

export function generateMetadata(): Metadata {
  if (!isReflexCardsEnabled()) return {};
  const description = UNIVERS_ON() ? descUnivers() : DESCRIPTION;
  return {
    title: TITLE,
    description,
    alternates: withHreflang(PAGE_URL),
    openGraph: { title: TITLE, description, url: PAGE_URL, type: "website" },
    twitter: { card: "summary_large_image", title: TITLE, description },
  };
}

export default async function CartesPage() {
  if (!isReflexCardsEnabled()) notFound();
  if (UNIVERS_ON()) {
    const schemaU = graphSchema([
      { "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${PAGE_URL}#collection`, url: PAGE_URL, name: TITLE, description: descUnivers(), inLanguage: "fr-FR", isPartOf: { "@id": `${BRAND.url}/#website` } } as JsonLd,
      breadcrumbSchema([{ name: "Accueil", url: "/" }, { name: "Reflex Cards", url: "/cartes" }]),
    ]);
    return (
      <>
        <StructuredData data={schemaU} id="reflex-cards-hub" />
        <CardTilt />
        <UniversHub accounts={ACCOUNTS} />
      </>
    );
  }
  const day = seasonDay();
  /* sorties effectives : par paliers de joueurs inscrits (décision Kev, 03/10), plus par dates */
  const rel = await applyReleases({ readOnly: true });
  /* héros et vitrine : révélations officielles du jour 1 (hors stablecoins pour le héros) */
  const hero = HERO_CARDS;
  const showcase = SHOWCASE_CARDS;
  const fossils = fossilCards();
  /* seules les cartes déjà sorties sont listées */
  const chs = chapters()
    .map((ch) => ({ ...ch, total: ch.cards.length, cards: ch.cards.filter((c) => isReleased(c, day)) }));
  const released = chs.reduce((n, ch) => n + ch.cards.length, 0);
  const nameOf = (id: string) => {
    const c = getCard(id);
    return c ? cleanName(c.name) : id;
  };

  const schema = graphSchema([
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${PAGE_URL}#collection`,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "fr-FR",
      isPartOf: { "@id": `${BRAND.url}/#website` },
    } as JsonLd,
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Reflex Cards", url: "/cartes" },
    ]),
  ]);

  return (
    <>
      <StructuredData data={schema} id="reflex-cards-hub" />
      <CardTilt />

      {/* Héros */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">Accueil</Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Reflex Cards</span>
          </nav>
          <div className="mt-6 grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr,auto]">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-glow/40 bg-primary-glow/10 px-3 py-1 text-xs font-semibold text-primary-soft">
                <Sparkles className="h-3.5 w-3.5" /> {day >= 1 ? "Saison 1 « Genèse » · en cours" : "Bientôt · Saison 1 « Genèse »"}
              </span>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Reflex Cards, le jeu de cartes <span className="gradient-text">crypto</span> gratuit
              </h1>
              <p className="mt-4 text-lg text-fg/75">
                {REFLEX_META.ncards} cartes à collectionner, une par crypto. Ouvrez des boosters gratuits, remplissez votre album et apprenez à connaître chaque projet. Aucun achat possible, aucune revente : on joue pour le plaisir de collectionner.
              </p>
              {day >= 1 && (
                <p className="mt-3 rounded-xl border border-border/70 bg-surface/60 px-4 py-3 text-sm text-fg/80">
                  <strong className="text-fg">Comment on joue :</strong> rien à payer, rien à télécharger. Ouvrez votre premier booster
                  sans compte ; un <strong className="text-fg">compte gratuit</strong> (une adresse e-mail suffit) garde vos cartes pour
                  toujours, les retrouve sur tous vos appareils et ouvre les amis et les échanges.
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {/* le jeu est une page autonome (/cartes/jouer) : lien classique, pas de navigation côté client */}
                {day >= 1 && (
                  <a href="/cartes/jouer" className="btn-primary text-sm py-2.5 px-5">
                    Jouer maintenant <ArrowRight className="h-4 w-4" />
                  </a>
                )}
                {day >= 1 && (
                  <Link
                    href="/inscription?next=%2Fcartes%2Fjouer"
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-fg hover:bg-primary/20"
                  >
                    <UserPlus className="h-4 w-4" /> Créer mon compte gratuit
                  </Link>
                )}
                <a
                  href="#toutes-les-cartes"
                  className={day >= 1 ? "inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-fg/85 hover:border-primary/50 hover:text-fg" : "btn-primary text-sm py-2.5 px-5"}
                >
                  {released > 0 ? `Explorer les ${released} cartes sorties` : "Comment sortent les cartes"}
                </a>
                <a href="#calendrier" className="inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-fg/85 hover:border-primary/50 hover:text-fg">
                  Voir le calendrier
                </a>
              </div>
            </div>
            {/* éventail de 3 cartes (Kev l'adore) : 480 × 380, réduit à 70 % sous 640 px pour tenir sur mobile,
                et à 51,6 % sous 360 px (B1 : 336 px ne tenaient pas dans 248 px à 280 px de large) */}
            <div className="relative mx-auto h-[196px] w-[248px] min-[360px]:h-[266px] min-[360px]:w-[336px] sm:h-[380px] sm:w-[480px]" aria-hidden="true">
              <div className="absolute left-0 top-0 h-[380px] w-[480px] origin-top-left scale-[.516] min-[360px]:scale-[.7] sm:scale-100">
                <div className="absolute bottom-2 left-[40px] origin-bottom -rotate-[8deg]">
                  <CardVisual card={hero[0]} day={day} width={200} uid="hero-a" />
                </div>
                <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
                  <CardVisual card={hero[1]} day={day} width={220} uid="hero-b" />
                </div>
                <div className="absolute bottom-2 right-[40px] origin-bottom rotate-[8deg]">
                  <CardVisual card={hero[2]} day={day} width={200} uid="hero-c" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Raretés */}
      <section className="py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Six raretés, une matière chacune</h2>
          <p className="mt-2 max-w-[34em] text-fg/70">
            Acier, émeraude, saphir, améthyste, cuivre en fusion, or ciselé : la matière de la carte dit sa rareté au premier regard. La rareté vient de la notoriété durable du projet (pages vues Wikipédia sur 12 mois et abonnés CoinGecko), jamais de son prix.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {showcase.map((c) => {
              const info = REFLEX_RARITIES.find((x) => x.r === c.r)!;
              return (
                <li key={c.id} className="flex flex-col items-center text-center">
                  <Link href={`/cartes/${c.id}`} aria-label={`Carte ${cleanName(c.name)}`}>
                    <CardVisual card={c} day={day} width={160} uid={`rar-${c.r}`} />
                  </Link>
                  <p className="mt-3 text-sm font-bold" style={{ color: `rgb(var(--c-r-${c.r.toLowerCase()}-text))` }}>
                    {RNAME[c.r]} <span className="text-xs">{PIPS[c.r]}</span>
                  </p>
                  <p className="text-xs text-muted">{info.n} cartes · {shareText(info.chance)}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-sm text-fg/70">
            Légendaires : le projet n° 1 de chacune des 12 familles et les 10 projets les plus connus (hors stablecoins). Ultra rares : les 2 suivants de chaque famille et le top 40.
            {REFLEX_META.provisoire && " Classement provisoire : il sera figé au lancement."}
          </p>
        </div>
      </section>

      {/* Règles */}
      <section className="py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Les règles du jeu</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Gift, t: "Gratuit, pour toujours", d: `Un booster de 5 cartes offert toutes les 15 minutes, jusqu'à 10 en réserve. Rien à acheter, ${ACCOUNTS ? "un compte gratuit suffit" : "sans compte"}.` },
              { icon: ShieldCheck, t: "Vos cartes à vie", d: "Chaque carte obtenue reste dans votre collection, doubles compris : vous voyez combien vous en avez." },
              { icon: Scale, t: "Échanges", d: "La Boutique échange avec vous chaque jour : 1 carte contre 1 doublon de même rareté ; entre amis, échangez vos doublons ou offrez-les. Aucune revente." },
              { icon: Landmark, t: "Aucune valeur marchande", d: "Les cartes ne s'achètent pas, ne se vendent pas et ne sont pas un conseil en investissement." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-border bg-surface p-5">
                <Icon className="h-5 w-5 text-primary-soft" />
                <h3 className="mt-3 font-bold text-fg">{t}</h3>
                <p className="mt-1 text-sm text-fg/70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calendrier */}
      {/* Installer comme une appli (Kev, 04/10/2026) : PWA, sans store ; tutoriel par appareil. */}
      {day >= 1 && (
        <section id="application" className="scroll-mt-24 py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <Smartphone className="h-6 w-6 text-primary" /> Jouez comme une appli, sans store
            </h2>
            <p className="mt-3 max-w-[34em] text-fg/75">
              Reflex Cards s&apos;installe comme une application : une icône sur votre écran d&apos;accueil, le jeu en plein écran,
              sans barre d&apos;adresse. Rien à télécharger, pas de store, 0 € — c&apos;est la même partie et le même compte.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { t: "iPhone et iPad (Safari)", s: ["Ouvrez le jeu dans Safari.", "Touchez Partager (le carré avec une flèche).", "Touchez « Sur l'écran d'accueil », puis Ajouter."] },
                { t: "Android (Chrome)", s: ["Ouvrez le jeu, menu « Plus » → « Installer l'application ».", "Confirmez l'invite d'installation.", "Lancez Reflex Cards depuis l'icône."] },
                { t: "Ordinateur (Chrome, Edge)", s: ["Ouvrez le jeu.", "Cliquez sur l'icône d'installation à droite de la barre d'adresse (ou menu → « Installer Reflex Cards »).", "Le jeu s'ouvre dans sa propre fenêtre."] },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl border border-border bg-surface p-5">
                  <h3 className="font-semibold">{c.t}</h3>
                  <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-fg/75">
                    {c.s.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <a href="/cartes/jouer#installer" className="btn-primary text-sm py-2.5 px-5">
                Ouvrir le jeu et l&apos;installer <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      <section id="calendrier" className="scroll-mt-24 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <CalendarDays className="h-6 w-6 text-primary-soft" /> Le calendrier de la saison 1
          </h2>
          <p className="mt-2 max-w-[34em] text-fg/70">
            4 collections (Genèse, Ascension, Éclipse, Apogée), chacune en 3 parties ; les parties suivantes sortiront plus tard dans la saison. Chaque partie mélange les familles et a sa Légendaire en tête d&apos;affiche. Une carte se tire dès sa sortie ; les nouveautés se fabriquent avec des éclats 7 jours plus tard.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Sortie</th>
                  <th className="px-4 py-3">Collection</th>
                  <th className="px-4 py-3">Cartes</th>
                  <th className="px-4 py-3">Têtes d&apos;affiche</th>
                </tr>
              </thead>
              <tbody>
                {REFLEX_PARTS.map((p, i) => (
                  <tr key={p.jour} className="border-t border-border">
                    <td className="px-4 py-2.5 font-semibold text-fg">
                      {rel.dates[i] ? (dayDate(rel.days[i]) ?? rel.dates[i]) : <span className="text-muted">{FUTURE_LABEL}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-fg/80">{p.collection} · partie {p.partie}</td>
                    <td className="px-4 py-2.5 text-fg/80">{p.taille}</td>
                    <td className="px-4 py-2.5">
                      {isPartNamed(p.jour, day) ? (
                        p.tete.map((id, i) => (
                          <span key={id}>
                            {i > 0 && ", "}
                            <Link href={`/cartes/${id}`} className="text-primary-soft hover:text-primary">{nameOf(id)}</Link>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">Révélée à sa sortie</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Musée des Fossiles */}
      {fossils.length > 0 && (
        <section className="py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold sm:text-3xl">Le Musée des Fossiles</h2>
            <p className="mt-2 max-w-[34em] text-fg/70">
              Les projets morts quittent l&apos;album pour le Musée : pierre, ambre et une leçon à retenir. On y entre sur un événement sourcé (faillite, fraude jugée, réseau arrêté), jamais sur une baisse de prix. L&apos;histoire est publique ; la carte, elle, se trouve en booster.
            </p>
            <ul className="mt-6 flex flex-wrap gap-6">
              {fossils.map((c: ReflexCard) => (
                <li key={c.id} className="flex max-w-[360px] items-start gap-4">
                  <Link href={`/cartes/${c.id}`} className="shrink-0" aria-label={`Fossile ${cleanName(c.name)}`}>
                    <CardVisual card={c} mode="slot" day={day} width={140} uid={`fossil-${c.id}`} />
                  </Link>
                  <div className="text-sm">
                    <Link href={`/cartes/${c.id}`} className="font-bold text-fg hover:text-primary">{cleanName(c.name)}</Link>
                    <p className="mt-1 text-fg/70">{c.fossile?.lecon}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Toutes les cartes */}
      <section id="toutes-les-cartes" className="scroll-mt-24 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Les cartes sorties, famille par famille</h2>
          <p className="mt-2 max-w-[34em] text-fg/70">
            {released > 0
              ? `${released} cartes sorties sur ${REFLEX_META.ncards}. Douze familles, douze chapitres de l'album ; les autres cartes restent secrètes jusqu'à leur sortie.`
              : `Les cartes restent secrètes jusqu'à leur sortie : 300 le premier jour, puis une cinquantaine à chaque future sortie, jusqu'aux ${REFLEX_META.ncards} cartes de la saison.`}
          </p>
          <div className="mt-6 space-y-3">
            {released > 0 && chs.map((ch) => (
              <details key={ch.fam} className="group rounded-2xl border border-border bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                  <span className="flex items-center gap-3 font-semibold text-fg">
                    <span className="h-3 w-3 rounded-full" style={{ background: ch.color }} aria-hidden="true" />
                    {ch.fam}
                  </span>
                  <span className="text-xs text-muted">{ch.cards.length} / {ch.total} cartes</span>
                </summary>
                <ul className="flex flex-wrap gap-2 px-5 pb-5">
                  {ch.cards.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/cartes/${c.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-fg/85 hover:border-primary/50 hover:text-fg"
                      >
                        {cleanName(c.name)}
                        <span style={{ color: `rgb(var(--c-r-${c.r.toLowerCase()}-text))` }} title={RNAME[c.r]}>{PIPS[c.r]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold">Questions fréquentes</h2>
            <dl className="mt-4 space-y-4 text-sm">
              {[
                ["Combien ça coûte ?", "Rien. Le jeu est gratuit et le restera : il n'y a rien à acheter."],
                ["Faut-il un compte pour jouer ?", "Pour ouvrir votre premier booster, non. Pour garder vos cartes, les retrouver sur tous vos appareils et jouer avec vos amis, oui : un compte Cryptoreflex gratuit, une adresse e-mail suffit. Le jeu vous le propose au bon moment."],
                ["Existe-t-il une application ?", "Oui, sans passer par un store : depuis le jeu, « Installer l'application » (menu Plus, ou la tuile de l'accueil) pose l'icône Reflex Cards sur votre écran d'accueil et ouvre le jeu en plein écran. Sur iPhone : Safari → Partager → « Sur l'écran d'accueil »."],
                ["Peut-on revendre ses cartes ?", "Non. Les cartes n'ont aucune valeur marchande. Seuls les échanges 1 contre 1, de même rareté, existent : avec la Boutique et entre amis."],
                ["Comment une crypto devient-elle Légendaire ?", "Par sa notoriété durable sur 12 mois (pages vues Wikipédia et abonnés CoinGecko). Le prix et la capitalisation n'entrent jamais en compte."],
                ["Quand le jeu ouvre-t-il ?", day >= 1 ? `La saison 1 « Genèse » est ouverte : on joue sur cryptoreflex.fr/cartes/jouer, ${ACCOUNTS ? "sans compte pour le premier booster, puis avec un compte Cryptoreflex gratuit pour garder votre collection sur tous vos appareils" : "sans compte (la partie est enregistrée dans votre navigateur)"}. Les parties suivantes sortiront plus tard dans la saison.` : "La saison 1 « Genèse » est en préparation et ouvrira très bientôt sur cette page."],
              ].map(([q, a]) => (
                <div key={q}>
                  <dt className="font-semibold text-fg">{q}</dt>
                  <dd className="mt-1 text-fg/70">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
