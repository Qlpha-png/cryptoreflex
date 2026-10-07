import Link from "next/link";
import { ArrowRight, Crown, Gift, Landmark, Scale, ShieldCheck, Smartphone, Sparkles, UserPlus } from "lucide-react";

import CardVisual from "@/components/reflex-cards/CardVisual";
import { getCard, oddsText, seasonDay } from "@/lib/reflex-cards/data";
import { FAM, PIPS, RC, RNAME } from "@/lib/reflex-cards/render";
import { CATS, CAT_LABEL, universById, universCards, universOvr, universStats, type Cat } from "@/lib/reflex-cards/univers";
import { RULES, universCardP } from "@/lib/reflex-cards/engine";
import { rareCard } from "@/lib/reflex-cards/rare";
import type { ReflexCard, Rarity } from "@/lib/reflex-cards/types";

/**
 * /cartes en mode Univers (04/10/2026, Kev : « faire un point sur la cohérence du nombre de cartes ») : la vitrine du jeu avec les
 * VRAIS chiffres de l'Univers (cartes, chapitres, raretés, éditions), les formes les plus rares pour donner envie, et les meilleures
 * cartes de chaque chapitre. Tout est calculé depuis le catalogue servi au jeu : rien n'est écrit en dur.
 */
const RAR: Rarity[] = ["C", "PC", "R", "SR", "UR", "L"];
const fr = (n: number) => n.toLocaleString("fr-FR").replace(/ /g, " ");
const pct1 = (x: number) => (x * 100).toLocaleString("fr-FR", { maximumFractionDigits: x < 0.01 ? 2 : 1 }) + " %";
const CAT_DESC: Record<Cat, string> = {
  crypto: "Toutes les cryptomonnaies, du Bitcoin aux memecoins.",
  protocole: "La finance décentralisée : échanges, prêts, staking.",
  plateforme: "Les plateformes d'échange, des géants aux disparues.",
  nft: "Les collections NFT, de CryptoPunks aux nouveautés.",
  personne: "Les personnalités qui ont fait (et défait) la crypto.",
  evenement: "Les dates qui ont marqué l'histoire, piratages compris.",
  entreprise: "Les sociétés du secteur, émetteurs, mineurs, analystes.",
  concept: "Les idées : blockchain, preuve de travail, DeFi…",
};

/** exemple d'une rareté sans carte du jeu d'origine (Commune) : une vraie crypto du catalogue, nom court, logo CoinGecko */
const SHOWCASE_FALLBACK: Partial<Record<Rarity, { id: string; fam: string; sub: string; fact: string }>> = {
  C: { id: "fxhash", fam: "Plateforme", sub: "Art génératif", fact: "Jeton de fxhash, plateforme d'art génératif." },
};
const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export default function UniversHub({ accounts }: { accounts: boolean }) {
  const all = universCards(), total = all.length, st = universStats();
  const day = seasonDay();
  /* chance moyenne d'une carte de rareté r (sert aux parts de rareté) ; chance d'une carte précise d'une catégorie (05/10 au soir :
     la catégorie est tirée après la rareté, selon RULES.wFam) */
  const pCard = (r: Rarity) => universCardP(day, r);
  const pCat = (r: Rarity, cat: Cat) => universCardP(day, r, CAT_LABEL[cat]);
  const catShare = (cat: Cat) => RULES.wFam?.[CAT_LABEL[cat]] ?? 0;
  const tot: Record<Rarity, number> = Object.fromEntries(RAR.map((r) => [r, CATS.reduce((s, c) => s + ((st[c] as Record<string, number>)[r] ?? 0), 0)])) as Record<Rarity, number>;
  const nIcons = RULES.ed.icon?.list.length ?? 0, nMyth = RULES.ed.myth?.list.length ?? 0, nRelic = RULES.relics.length;
  /* éventail : les formes les plus rares (images du moteur du jeu) */
  const fan = ["bitcoin", "ethereum", "solana"].map((id) => ({ id, rare: rareCard(id), name: universById(id)?.nom ?? id })).filter((x) => x.rare);
  /* 05/10/2026 (Kev : « ça dit 6 raretés, on en voit 5 ») : aucune carte du jeu d'origine n'est Commune dans l'Univers (elles
     sont toutes parmi les 2 000 cryptos les plus connues). La Commune est donc dessinée à partir de sa ligne du catalogue. */
  const fromUnivers = (r: Rarity): { r: Rarity; card: ReflexCard; id: string; ft: string } | null => {
    const f = SHOWCASE_FALLBACK[r];
    const u = f ? (() => { try { return universById(f.id); } catch { return undefined; } })() : undefined;
    const base = "https://coin-images.coingecko.com/coins/images/";
    if (!f || !u || u.r !== r || !u.img?.startsWith(base)) return null;
    const total = (st.crypto as Record<string, number>).total;
    const card: ReflexCard = {
      id: u.id, name: u.nom, sym: u.sym, img: u.img.slice(base.length).replace(/\?.*$/, "").replace("/large/", "/"), fam: f.fam, famColor: FAM[f.fam]?.c ?? "#60a5fa",
      sub: f.sub, year: 0, r, noto: u.rank, ovr: universOvr(u.rank, total), num: u.rank, fossil: false, legende: false, merite: false, score: null, slug: "",
      desc: f.fact, tag: "", sortie: null, fossile: null, nm: { size: 25, two: false, html: escHtml(u.nom) }, ph: { size: 19, two: false, html: escHtml(u.nom) },
      subSize: 9.5, ab: `<b>En bref</b> ${escHtml(f.fact)}`, chance: "", chanceP: 0,
    };
    return { r, card, id: u.id, ft: `Cryptos · ${u.rank.toLocaleString("fr-FR")}/${total.toLocaleString("fr-FR")}` };
  };
  /* une carte du jeu d'origine par rareté, avec sa rareté ACTUELLE (Univers) */
  const showcase = RAR.map((r) => {
    /* exemple de rareté : une crypto connue du jeu d'origine, jamais un produit financier tokenisé ni un stablecoin */
    const ok = (lc: ReflexCard) => !/RWA|Actifs réels|tokeni|Stablecoin/i.test(`${lc.fam} ${lc.sub} ${lc.name}`);
    const u = all.filter((c) => c.cat === "crypto" && c.r === r).sort((a, b) => a.rank - b.rank).find((c) => { const lc = getCard(c.id); return !!lc && ok(lc); });
    const lc = u ? getCard(u.id) : undefined;
    return u && lc ? { r, card: { ...lc, r, num: u.rank, noto: u.rank, ovr: universOvr(u.rank, (st.crypto as Record<string, number>).total) } as ReflexCard, id: u.id, ft: `Cryptos · ${u.rank.toLocaleString("fr-FR")}/${(st.crypto as Record<string, number>).total.toLocaleString("fr-FR")}` } : fromUnivers(r);
  }).filter((x): x is { r: Rarity; card: ReflexCard; id: string; ft: string } => !!x);
  const top = (cat: Cat) => all.filter((c) => c.cat === cat && (c.r === "L" || c.r === "UR")).sort((a, b) => a.rank - b.rank).slice(0, 24);

  return (
    <>
      {/* Héros */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">Accueil</Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Reflex Cards</span>
          </nav>
          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1fr,auto]">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-glow/40 bg-primary-glow/10 px-3 py-1 text-xs font-semibold text-primary-soft">
                <Sparkles className="h-3.5 w-3.5" /> Saison 1 · {fr(total)} cartes
              </span>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Reflex Cards, le jeu de cartes <span className="gradient-text">crypto</span> gratuit
              </h1>
              <p className="mt-4 text-lg text-fg/75">
                {fr(total)} cartes à collectionner en 8 chapitres : cryptos, protocoles, plateformes, NFT, personnalités, événements,
                entreprises et concepts. Ouvrez des boosters gratuits et remplissez votre album. Aucun achat, aucune revente.
              </p>
              <p className="mt-3 rounded-xl border border-border/70 bg-surface/60 px-4 py-3 text-sm text-fg/80">
                <strong className="text-fg">Comment on joue :</strong> rien à payer, rien à télécharger. Ouvrez votre premier booster sans
                compte ; un <strong className="text-fg">compte gratuit</strong> garde vos cartes pour toujours, sur tous vos appareils, et
                ouvre les amis et les échanges.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/cartes/jouer" className="btn-primary px-5 py-2.5 text-sm">
                  Jouer maintenant <ArrowRight className="h-4 w-4" />
                </a>
                {accounts && (
                  <Link href="/inscription?next=%2Fcartes%2Fjouer" className="inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-fg hover:bg-primary/20">
                    <UserPlus className="h-4 w-4" /> Créer mon compte gratuit
                  </Link>
                )}
                <a href="#chapitres" className="inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-fg/85 hover:border-primary/50 hover:text-fg">
                  Explorer les 8 chapitres
                </a>
              </div>
            </div>
            {fan.length === 3 && (
              <div className="relative mx-auto h-[300px] w-[330px] sm:h-[380px] sm:w-[440px]" aria-hidden="true">
                {fan.map((x, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={x.id}
                    src={x.rare!.src}
                    alt=""
                    width={x.rare!.w}
                    height={x.rare!.h}
                    className={`absolute bottom-0 h-auto drop-shadow-[0_22px_34px_rgb(var(--c-scrim)/0.6)] ${i === 1 ? "left-1/2 z-10 w-[170px] -translate-x-1/2 sm:w-[220px]" : i === 0 ? "left-0 w-[140px] origin-bottom -rotate-[9deg] sm:w-[180px]" : "right-0 w-[140px] origin-bottom rotate-[9deg] sm:w-[180px]"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Raretés : le dosage réel */}
      <section className="py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Six raretés, de la Commune à la Légendaire</h2>
          <p className="mt-2 max-w-[34em] text-fg/70">
            La rareté d&apos;une carte, c&apos;est sa place dans sa catégorie (popularité, usage, histoire), jamais son prix. Chaque carte
            d&apos;un booster tire d&apos;abord une rareté, puis une catégorie, puis une carte au hasard parmi celles de cette catégorie et
            de cette rareté : une Commune crypto précise sort {oddsText(pCat("C", "crypto")).replace("1 carte sur", "1 fois sur")}, une
            Légendaire crypto précise {oddsText(pCat("L", "crypto")).replace("1 carte sur", "1 fois sur")}.
            Dans un booster de 5 cartes, on tire en moyenne {fr(Math.round(pCard("C") * tot.C * 50) / 10)} Communes,{" "}
            {fr(Math.round(pCard("PC") * tot.PC * 50) / 10)} Peu commune et {fr(Math.round(pCard("R") * tot.R * 50) / 10)} Rare ; une
            Ultra rare ou mieux tombe environ 1 booster sur {fr(Math.round(1 / (1 - Math.pow(1 - pCard("UR") * tot.UR - pCard("L") * tot.L, 5))))}.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {showcase.map(({ r, card, id, ft }) => (
              <li key={r} className="flex flex-col items-center text-center">
                <Link href={`/cartes/${id}`} aria-label={`Carte ${card.name}`}>
                  <CardVisual card={card} day={day} width={150} uid={`uh-${r}`} chance={pCat(r, universById(id)?.cat ?? "crypto")} ft={ft} />
                </Link>
                <p className="mt-3 text-sm font-bold" style={{ color: RC[r] }}>
                  {RNAME[r]} <span className="text-xs">{PIPS[r]}</span>
                </p>
                <p className="text-xs text-muted">{fr(tot[r])} cartes · {pct1(pCard(r) * tot[r])} des tirages</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Éditions spéciales */}
      <section className="py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"><Crown className="h-6 w-6 text-primary-soft" /> Au-dessus des Légendaires</h2>
          <p className="mt-2 max-w-[34em] text-fg/70">
            Les éditions spéciales ne se fabriquent pas : on les trouve en booster, ou jamais. Chacun des 8 chapitres a les siennes.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { t: "Icônes", n: nIcons, d: `Marbre et or : les pionniers de chaque chapitre. Une Icône quelconque : ${oddsText(RULES.ed.icon?.p ?? 0)} tirée.`, c: "#e8d49a" },
              { t: "Mythiques", n: nMyth, d: `Grenat impérial, numérotées dans l'ordre de découverte. Une Mythique quelconque : ${oddsText(RULES.ed.myth?.p ?? 0)} tirée.`, c: "#ff2d6f" },
              { t: "Reliques", n: nRelic, d: "Obsidienne gravée d'or : 1 carte sur 1 milliard. Le premier découvreur entre au registre « Premier au monde ».", c: "#f7d774" },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border bg-surface p-5" style={{ borderColor: `${x.c}55` }}>
                <p className="text-2xl font-extrabold" style={{ color: x.c }}>{fr(x.n)}</p>
                <h3 className="mt-1 font-bold text-fg">{x.t}</h3>
                <p className="mt-1 text-sm text-fg/70">{x.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Les Reliques restent scellées : leur identité se révèle le jour où quelqu&apos;un en trouve une, et son premier découvreur entre au registre.
          </p>
        </div>
      </section>

      {/* Règles */}
      <section className="py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Les règles du jeu</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Gift, t: "Gratuit, pour toujours", d: "Un booster de 5 cartes offert toutes les 15 minutes, jusqu'à 10 en réserve. Rien à acheter." },
              { icon: ShieldCheck, t: "Vos cartes à vie", d: "Chaque carte obtenue reste dans votre collection, doubles compris." },
              { icon: Scale, t: "Échanges", d: "La Boutique échange avec vous chaque jour ; entre amis, échangez vos doublons ou offrez-les. Aucune revente." },
              { icon: Landmark, t: "Aucune valeur marchande", d: "Les cartes ne s'achètent pas, ne se vendent pas et ne sont pas un conseil en investissement." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-border bg-surface p-5">
                <Icon className="h-5 w-5 text-primary-soft" />
                <h3 className="mt-3 font-bold text-fg">{t}</h3>
                <p className="mt-1 text-sm text-fg/70">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-fg/75">
            <Smartphone className="h-4 w-4 text-primary" /> Le jeu s&apos;installe comme une application, sans store :{" "}
            <a href="/cartes/jouer#installer" className="font-semibold text-primary-soft hover:text-primary">voir comment</a>.
          </p>
        </div>
      </section>

      {/* Les 8 chapitres */}
      <section id="chapitres" className="scroll-mt-24 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Les 8 chapitres de l&apos;album</h2>
          <p className="mt-2 max-w-[34em] text-fg/70">
            {fr(total)} cartes au total, toutes en jeu. Chaque chapitre a sa part des tirages : les petits chapitres (personnes,
            événements, entreprises, concepts) sortent bien plus souvent que leur taille ne le voudrait, pour qu&apos;un booster ne soit
            pas fait que de cryptos. Ouvrez un chapitre pour voir ses Légendaires et ses Ultra rares.
          </p>
          <div className="mt-6 space-y-3">
            {CATS.map((cat) => {
              const s = st[cat] as Record<string, number>;
              return (
                <details key={cat} className="group rounded-2xl border border-border bg-surface">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                    <span className="min-w-0">
                      <span className="block font-semibold text-fg">{CAT_LABEL[cat]}</span>
                      <span className="block text-xs text-muted">{CAT_DESC[cat]}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted">
                      <b className="text-fg">{fr(s.total)}</b> cartes
                      <span className="block">{pct1(catShare(cat))} des tirages</span>
                      <span className="block" style={{ color: RC.L }}>{fr(s.L ?? 0)} Légendaires</span>
                    </span>
                  </summary>
                  <ul className="flex flex-wrap gap-2 px-5 pb-5">
                    {top(cat).map((c) => (
                      <li key={c.id}>
                        <Link href={`/cartes/${c.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-fg/85 hover:border-primary/50 hover:text-fg">
                          {c.nom}
                          <span style={{ color: RC[c.r] }} title={RNAME[c.r]}>{PIPS[c.r]}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
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
                ["Combien y a-t-il de cartes ?", `${fr(total)} cartes en 8 chapitres, dont ${fr(tot.L)} Légendaires, plus ${fr(nIcons)} Icônes, ${fr(nMyth)} Mythiques et ${fr(nRelic)} Reliques en éditions spéciales.`],
                ["Faut-il un compte pour jouer ?", "Pour ouvrir votre premier booster, non. Pour garder vos cartes, les retrouver sur tous vos appareils et jouer avec vos amis, oui : un compte Cryptoreflex gratuit, une adresse e-mail suffit."],
                ["Comment une carte devient-elle Légendaire ?", "Par sa place dans sa catégorie : popularité, usage et histoire (capitalisation pour une crypto, valeur verrouillée pour un protocole, audience Wikipédia pour une personnalité). Le prix n'entre jamais en compte."],
                ["Peut-on revendre ses cartes ?", "Non. Les cartes n'ont aucune valeur marchande. Seuls les échanges 1 contre 1 existent : avec la Boutique et entre amis."],
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
