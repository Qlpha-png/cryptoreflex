import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CardVisual from "@/components/reflex-cards/CardVisual";
import CardTilt from "@/components/reflex-cards/CardTilt";
import { BRAND } from "@/lib/brand";
import { allCards, cleanName, getCard, isReflexCardsEnabled, isRevealed, seasonDay } from "@/lib/reflex-cards/data";
import { applyReleases } from "@/lib/reflex-cards/releases";

/**
 * /embed/carte/[id] — widget iframe d'une carte Reflex, à coller sur un blog ou un profil.
 * Noindex (app/embed/layout.tsx) ; la page /cartes/[id] porte le SEO.
 * Montre la carte entière : réservé aux cartes révélées (phase B : la vitrine de ses propres cartes).
 * Usage : <iframe src="https://www.cryptoreflex.fr/embed/carte/bitcoin" width="280" height="410"></iframe>
 */
/* tout autre id = VRAI 404 (avec le loading.tsx racine, un notFound() dynamique répondrait 200) */
export const dynamicParams = false;
/* la chance imprimée suit les cartes sorties : régénération chaque heure */
export const revalidate = 3600;

/* contrôle visuel local uniquement (build lancé avec REFLEX_CARDS_QA_ALL=1, jamais sur Vercel) :
   toutes les cartes, pour la comparaison pixel avec la maquette */
const QA_ALL =
  process.env.REFLEX_CARDS_QA_ALL === "1" && !process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.NEXT_PUBLIC_VERCEL_ENV && !process.env.CI;
if (QA_ALL) console.warn("[reflex-cards] REFLEX_CARDS_QA_ALL actif : TOUTES les cartes sont rendues en widget. Build de contrôle local uniquement, ne jamais le servir au public.");
const shown = (c: Parameters<typeof isRevealed>[0]) => QA_ALL || isRevealed(c);

export function generateStaticParams() {
  if (!isReflexCardsEnabled()) return [];
  return allCards().filter(shown).map((c) => ({ id: c.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const c = getCard(params.id);
  return {
    title: { absolute: c ? `${cleanName(c.name)} — carte Reflex Cards (embed)` : "Reflex Cards (embed)" },
    robots: { index: false, follow: true },
  };
}

export default async function EmbedCartePage({ params }: { params: { id: string } }) {
  await applyReleases(); // sorties effectives (paliers de joueurs)
  if (!isReflexCardsEnabled()) notFound();
  const c = getCard(params.id);
  if (!c || !shown(c)) notFound();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <CardTilt />
      <a href={`${BRAND.url}/cartes/${c.id}`} target="_blank" rel="noopener" aria-label={`Voir la carte ${cleanName(c.name)} sur Cryptoreflex`}>
        <CardVisual card={c} day={seasonDay()} width={240} />
      </a>
      <a
        href={`${BRAND.url}/cartes`}
        target="_blank"
        rel="noopener"
        style={{ fontSize: 12, color: "#e9b949", textDecoration: "none", fontWeight: 600 }}
      >
        Reflex Cards · jeu gratuit sur Cryptoreflex
      </a>
    </div>
  );
}
