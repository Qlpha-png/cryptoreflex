import Link from "next/link";
import { ExternalLink, ShieldCheck, Star, Zap } from "lucide-react";
import { getAllPlatforms, type Platform } from "@/lib/platforms";

interface Props {
  cryptoName: string;
  cryptoSymbol: string;
  /** Liste des noms de plateformes telle qu'elle figure dans le JSON éditorial. */
  platformNames: string[];
}

/**
 * QuickBuyBox — encart "Acheter X maintenant" placé EN HAUT de la fiche crypto
 * (après le Hero, avant les stats/charts).
 *
 * Pourquoi un 2e encart d'achat alors que <WhereToBuy /> existe déjà en bas ?
 * Audit conversion 2026-04-26 : ~70% des visiteurs qui arrivent sur
 * /cryptos/[slug] viennent d'une recherche Google "comment acheter [crypto]"
 * — intent commercial fort. Si le 1er CTA d'achat est à 4-5 scrolls, on perd
 * ~30-40% de ces visiteurs (benchmark e-commerce FR : taux de scroll 50%
 * baisse de 60% du nombre d'utilisateurs).
 *
 * Ce composant montre les TOP 2 plateformes (score le plus élevé parmi
 * `platformNames`) avec un CTA primary clair, sans dupliquer le contenu
 * détaillé de <WhereToBuy /> (qui reste pour ceux qui veulent comparer).
 *
 * Conformité : badge MiCA + mention "Lien d'affiliation" + rel="sponsored".
 * Pas de countdown faux, pas de social proof inventé.
 */
export default function QuickBuyBox({
  cryptoName,
  cryptoSymbol,
  platformNames,
}: Props) {
  const knownPlatforms = getAllPlatforms();
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

  // Match par nom puis tri par score global (top 2).
  const matched = platformNames
    .map((name) =>
      knownPlatforms.find(
        (kp) => norm(kp.name) === norm(name) || norm(kp.id) === norm(name),
      ),
    )
    .filter((p): p is Platform => Boolean(p))
    .sort((a, b) => b.scoring.global - a.scoring.global)
    .slice(0, 2);

  // Si moins de 2 plateformes connues, on n'affiche pas (fallback : <WhereToBuy />
  // en bas reste la source de vérité). Évite un encart bancal "1 seule option".
  if (matched.length < 2) return null;

  return (
    <aside
      aria-label={`Où acheter ${cryptoName} rapidement`}
      className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 shadow-glow-gold/30"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-soft">
        <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        Acheter {cryptoSymbol} maintenant
      </div>
      <h2 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-fg leading-tight">
        Les 2 plateformes les mieux notées pour {cryptoName}
      </h2>
      <p className="mt-1.5 text-xs sm:text-sm text-muted">
        Sélection automatique par notre score global (frais, sécurité, MiCA,
        support FR). Détails et alternatives plus bas dans la page.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {matched.map((p, idx) => (
          <QuickBuyRow
            key={p.id}
            platform={p}
            cryptoName={cryptoName}
            isTop={idx === 0}
          />
        ))}
      </div>

      <p className="mt-3 text-[11px] text-muted/90 leading-relaxed">
        Liens d&apos;affiliation. Cryptoreflex perçoit une commission sans
        surcoût pour toi (
        <Link href="/affiliations" className="underline hover:text-fg">
          détail
        </Link>
        ). Pas de conseil en investissement — capital à risque.
      </p>
    </aside>
  );
}

function QuickBuyRow({
  platform,
  cryptoName,
  isTop,
}: {
  platform: Platform;
  cryptoName: string;
  isTop: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border p-4 transition-colors ${
        isTop
          ? "border-primary/60 bg-background/60"
          : "border-border bg-background/40 hover:border-primary/40"
      }`}
    >
      {isTop && (
        <span
          aria-hidden="true"
          className="absolute -top-2 left-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background"
        >
          #1 score
        </span>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm sm:text-base font-bold text-fg truncate">
              {platform.name}
            </h3>
            {platform.mica.micaCompliant && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-accent-green/30 bg-accent-green/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent-green"
                title="Conforme MiCA"
              >
                <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" /> MiCA
              </span>
            )}
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted">
            <Star
              className="h-3 w-3 fill-primary text-primary"
              aria-hidden="true"
            />
            <span className="font-mono font-semibold text-fg">
              {platform.scoring.global.toFixed(1)}
            </span>
            <span>/5 · Frais {platform.fees.spotMaker}%</span>
          </div>
        </div>
      </div>

      <a
        href={platform.affiliateUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        data-analytics-cta={`quickbuy-${platform.id}`}
        className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
          isTop
            ? "bg-primary text-background hover:bg-primary-glow"
            : "border border-border bg-elevated/60 text-fg hover:border-primary/50"
        }`}
      >
        Acheter sur {platform.name}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
      <Link
        href={`/avis/${platform.id}`}
        className="mt-1.5 block text-center text-[11px] text-muted hover:text-fg"
      >
        Lire l&apos;avis détaillé {cryptoName ? `· ${platform.name}` : ""}
      </Link>
    </div>
  );
}
