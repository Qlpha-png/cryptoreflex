import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calculator, GalleryVerticalEnd, GraduationCap, Scale, type LucideIcon } from "lucide-react";
import { feeShortFr, getTopPlatforms } from "@/lib/platforms";
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
  cta: { href: string; label: string; plain?: boolean };
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

function TopPlatforms() {
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
            <Image src={p.logo} alt="" width={28} height={28} className="h-7 w-7 rounded-md object-contain" />
            <span className="flex-1 min-w-0 truncate whitespace-nowrap text-sm font-semibold text-fg">{p.name}</span>
            {/* « frais d'achat » en entier, sauf dans les 4 colonnes étroites (≥ 1280 px) où « frais » suffit */}
            <span className="shrink-0 whitespace-nowrap text-xs text-fg/70">
              <span className="xl:hidden">frais d&apos;achat </span>
              <span className="hidden xl:inline">frais </span>
              <b className="text-fg/90">{feeShortFr(p)}</b>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CardsFan() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-4 h-[150px] w-full max-w-[260px]">
      {FAN.map((c) => (
        <Image
          key={c.id}
          src={`/cartes/rare/${c.id}.webp`}
          alt={c.alt}
          width={102}
          height={141}
          className={`absolute left-1/2 top-1 h-[141px] w-[102px] drop-shadow-[0_8px_18px_rgba(0,0,0,0.55)] ${c.rot}`}
        />
      ))}
    </div>
  );
}

export default function HomeDoors() {
  const cards = isReflexCardsEnabled();
  const doors: Door[] = [
    {
      id: "acheter",
      Icon: Scale,
      title: "Acheter des cryptos",
      text: "Seulement des plateformes autorisées en France, avec leurs vrais frais.",
      cta: { href: "/comparatif", label: "Comparer les plateformes" },
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
              <h3 className="text-xl font-bold text-fg">{d.title}</h3>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-fg/75">{d.text}</p>
            <div className="flex-1">{d.children}</div>
            {d.cta.plain ? (
              <a href={d.cta.href} className="btn-primary mt-5 inline-flex w-full justify-center py-3 text-sm">
                {d.cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <Link href={d.cta.href} className="btn-primary mt-5 inline-flex w-full justify-center py-3 text-sm">
                {d.cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
            <ul className="mt-3 space-y-1.5 text-sm">
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
