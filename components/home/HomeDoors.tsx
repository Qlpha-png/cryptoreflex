import { avecTypoSync } from "@/components/ui/Typo";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calculator, GalleryVerticalEnd, GraduationCap, Scale, type LucideIcon } from "lucide-react";
import { getTopPlatforms, purchaseCostText, simpleCost1000 } from "@/lib/platforms";
import PlatformLogo from "@/components/PlatformLogo";
import { isReflexCardsEnabled } from "@/lib/reflex-cards/data";
import { STATS, fmtCount } from "@/lib/brand";

/**
 * « Que voulez-vous faire ? » — les 4 portes de l'accueil (Kev, 04/10/2026 : « un accueil propre, joli et simple,
 * qui redirige proprement et facilement, qu'un enfant de 8 ans trouve toutes les informations qu'il souhaite »).
 * Une porte = une idée = un gros bouton, plus deux raccourcis au plus. Composant serveur, aucun JavaScript.
 */

interface Door {
  id: string;
  Icon: LucideIcon;
  title: string;
  text: string;
  /** primary : seul bouton plein de la section (06/10/2026 : 4 boutons or identiques = aucune hiérarchie). */
  cta: { href: string; label: string; plain?: boolean; primary?: boolean };
  links: { href: string; label: string }[];
  children?: React.ReactNode;
}

/** Les 3 Mythiques de l'éventail (images de public/cartes/rare, forme la plus rare de chaque carte). */
const FAN = [
  /* centre de la carte du milieu sur l'axe ; les deux autres décalées d'environ 60 % de largeur, inclinées */
  { id: "ethereum", alt: "Carte Mythique Ethereum « La Fusion »", rot: "-rotate-[9deg] -translate-x-[110%] translate-y-2" },
  { id: "bitcoin", alt: "Carte Mythique Bitcoin « L'Origine »", rot: "z-10 -translate-x-1/2" },
  { id: "solana", alt: "Carte Mythique Solana « La Grande Accélération »", rot: "rotate-[9deg] translate-x-[10%] translate-y-2" },
];

function TopPlatformsBase() {
  const top = getTopPlatforms(3);
  return (
    <ul className="mt-4 space-y-2" aria-label="Les 3 plateformes autorisées en France les mieux notées">
      {top.map((p) => (
        <li key={p.id}>
          <Link
            href={`/avis/${p.id}`}
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2 hover:border-primary/50"
          >
            {/* pas de fond blanc : certains logos sont blancs (Coinbase), comme dans le comparatif */}
            <PlatformLogo id={p.id} name={p.name} size={28} className="h-7 w-7 rounded-md" />
            <span className="flex-1 min-w-max whitespace-nowrap text-sm font-semibold text-fg">{p.name}</span>
            {/* 10/10/2026 : coût réel d'un achat de 1 000 € dans l'appli (simpleCost1000, relevé daté sur la fiche),
                et non plus le frais « taker » d'une interface avancée présenté comme « frais d'achat ».
                B1 : le nom n'est plus tronqué ; c'est la mention du coût qui passe à la ligne. */}
            <span className="min-w-0 text-right text-xs text-fg/70">
              <span className="xl:hidden">achat de 1&nbsp;000&nbsp;€ : </span>
              <span className="hidden xl:inline">1&nbsp;000&nbsp;€ : </span>
              <b className="text-fg/90">{purchaseCostText(simpleCost1000(p))}</b>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CardsFanBase() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-4 h-[150px] w-full max-w-[260px]">
      {FAN.map((c) => (
        <Image
          key={c.id}
          src={`/cartes/rare/${c.id}.webp`}
          alt={c.alt}
          width={102}
          height={141}
          className={`absolute left-1/2 top-1 h-[141px] w-[102px] drop-shadow-[0_8px_18px_rgb(var(--c-scrim)/0.55)] ${c.rot}`}
        />
      ))}
    </div>
  );
}

function HomeDoors() {
  const cards = isReflexCardsEnabled();
  const doors: Door[] = [
    {
      id: "acheter",
      Icon: Scale,
      title: "Acheter des cryptos",
      text: "Seulement des plateformes autorisées en France, avec leurs vrais frais.",
      cta: { href: "/comparatif", label: "Comparer les plateformes", primary: true },
      links: [{ href: "/wizard/premier-achat", label: "Mon premier achat, pas à pas" }],
      children: <TopPlatforms />,
    },
    {
      id: "comprendre",
      Icon: GraduationCap,
      title: "Comprendre la crypto",
      text: "Des explications simples, sans jargon, pour bien démarrer.",
      cta: { href: "/academie", label: "Commencer à apprendre" },
      links: [
        { href: "/cryptos", label: `Les ${fmtCount(STATS.cryptos)} fiches crypto` },
        { href: "/glossaire", label: "Le glossaire" },
      ],
    },
    {
      id: "declarer",
      Icon: Calculator,
      title: "Déclarer et calculer",
      text: "Votre impôt crypto, le formulaire 2086 et vos conversions, gratuitement.",
      cta: { href: "/outils/calculateur-fiscalite", label: "Calculer mon impôt" },
      links: [
        { href: "/outils/cerfa-2086-auto", label: "Préparer le formulaire 2086" },
        { href: "/convertisseur", label: "Convertir une crypto en euros" },
      ],
    },
    ...(cards
      ? [
          {
            id: "jouer",
            Icon: GalleryVerticalEnd,
            title: "Jouer aux cartes",
            text: `Collectionnez ${fmtCount(STATS.cards)} cartes crypto. Gratuit, sans rien acheter.`,
            /* le jeu est une page autonome : lien classique, pas de navigation côté client */
            cta: { href: "/cartes/jouer", label: "Ouvrir un booster", plain: true },
            links: [{ href: "/cartes", label: "Découvrir le jeu" }],
            children: <CardsFan />,
          } satisfies Door,
        ]
      : []),
  ];

  return (
    <section aria-labelledby="home-doors-title" className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
      <h2 id="home-doors-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Que voulez-vous faire&nbsp;?
      </h2>
      <p className="mt-2 text-base text-fg/70 sm:text-lg">Choisissez, on vous guide.</p>

      <ul className={`mt-7 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 ${doors.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {doors.map((d) => (
          <li key={d.id} className="card-obsidian flex flex-col rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-glow">
                <d.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="text-2xl font-bold text-fg">{d.title}</h3>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-fg/75">{d.text}</p>
            <div className="flex-1">{d.children}</div>
            {/* un seul bouton plein (« Comparer les plateformes ») ; les autres portes en btn-ghost (06/10/2026).
                Hauteur fixe 48 px (plein sans bordure = 44, contour = 46) ; xl:px-3 : en 4 colonnes,
                « Comparer les plateformes » + flèche (204 px) passait sur 2 lignes avec px-5.
                B1 (07/10/2026) : text-sm = 16 px, le libellé repassait sur 2 lignes en 4 colonnes (230 px pour 218) ;
                xl:text-body (15 px) + xl:px-2.5 : 217 px pour 222, sur 1 ligne (mesuré au rendu, 1280 à 1440 px). */}
            {d.cta.plain ? (
              <a href={d.cta.href} className={`${d.cta.primary ? "btn-primary" : "btn-ghost"} mt-5 inline-flex h-12 w-full justify-center py-0 text-base xl:px-2.5 xl:text-[0.9375rem]`}>
                {d.cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <Link href={d.cta.href} className={`${d.cta.primary ? "btn-primary" : "btn-ghost"} mt-5 inline-flex h-12 w-full justify-center py-0 text-base xl:px-2.5 xl:text-[0.9375rem]`}>
                {d.cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
            {/* place de 2 liens réservée dès 2 colonnes : boutons alignés d'une porte à l'autre (06/10/2026).
                B1 finitions F5 : text-sm = 16 px / 24 px, 2 liens = 54 px (3,375 rem) ; l'ancienne réserve de 46 px laissait les
                portes à 1 lien 8 px plus bas. */}
            <ul className="mt-3 space-y-1.5 text-sm xl:text-[0.9375rem] md:min-h-[3.375rem]">
              {d.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-primary-soft underline-offset-4 hover:text-primary hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

const TopPlatforms = avecTypoSync(TopPlatformsBase);
const CardsFan = avecTypoSync(CardsFanBase);

export default avecTypoSync(HomeDoors);
