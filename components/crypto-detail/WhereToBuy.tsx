import Link from "next/link";
import { ExternalLink, ShieldCheck, Star } from "lucide-react";
import { getAllPlatforms, type Platform } from "@/lib/platforms";

interface Props {
  cryptoName: string;
  /** Liste des noms de plateformes telle qu'elle figure dans le JSON éditorial. */
  platformNames: string[];
}

/**
 * Section "Où acheter X en France" :
 * - matche `platformNames` (strings éditoriales) avec les fiches enrichies
 *   de `lib/platforms.ts` (scoring, MiCA, lien d'affiliation).
 * - les plateformes connues affichent un CTA d'affiliation + score,
 *   les inconnues sont rendues en "fallback léger" (pas de hardcoded URL).
 */
export default function WhereToBuy({ cryptoName, platformNames }: Props) {
  const knownPlatforms = getAllPlatforms();
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

  const matches: Array<{ name: string; platform?: Platform }> = platformNames.map(
    (name) => {
      const p = knownPlatforms.find(
        (kp) => norm(kp.name) === norm(name) || norm(kp.id) === norm(name)
      );
      return { name, platform: p };
    }
  );

  return (
    <section id="acheter" className="scroll-mt-24">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Où acheter {cryptoName} en France ?
      </h2>
      <p className="mt-2 text-sm text-muted max-w-3xl">
        Les plateformes ci-dessous sont régulées (PSAN AMF ou agrément MiCA européen)
        et listent {cryptoName} en avril 2026. Cliquez pour ouvrir un compte directement
        depuis le lien d'affiliation Cryptoreflex (sans surcoût pour vous).
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {matches.map(({ name, platform }) => (
          <PlatformRow key={name} name={name} platform={platform} cryptoName={cryptoName} />
        ))}
      </div>

      <p className="mt-4 text-[11px] text-muted leading-relaxed">
        Publicité. Cryptoreflex perçoit une commission lorsqu'un visiteur ouvre
        un compte via l'un de ces liens — cela ne change ni le classement, ni la note attribuée
        (cf. <a href="/transparence" className="underline hover:text-white">page transparence</a>).
        Vérifiez systématiquement le statut MiCA et les frais avant tout dépôt.
      </p>
    </section>
  );
}

function PlatformRow({
  name,
  platform,
  cryptoName,
}: {
  name: string;
  platform?: Platform;
  cryptoName: string;
}) {
  if (!platform) {
    // Plateforme citée dans la sélection éditoriale mais pas (encore) review-ée par CR.
    return (
      <div className="rounded-2xl border border-border bg-surface/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-fg">{name}</div>
            <div className="mt-0.5 text-xs text-muted">
              Plateforme citée — fiche détaillée à venir
            </div>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted">
            Non testée
          </span>
        </div>
      </div>
    );
  }

  const p = platform;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-fg">{p.name}</h3>
            {p.mica.micaCompliant && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-accent-green/30 bg-accent-green/10 px-2 py-0.5 text-[10px] font-semibold text-accent-green"
                title="Plateforme conforme à la régulation européenne MiCA"
              >
                <ShieldCheck className="h-3 w-3" /> MiCA
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted line-clamp-2">{p.tagline}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-1 text-xs text-fg">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-mono font-semibold">{p.scoring.global.toFixed(1)}</span>
            <span className="text-muted">/5</span>
          </div>
          <div className="mt-1 text-[10px] text-muted">Frais spot {p.fees.spotMaker}%</div>
        </div>
      </div>

      {p.bonus.welcome && (
        <div className="mt-3 rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-1.5 text-xs text-accent-green">
          {p.bonus.welcome}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <a
          href={p.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-3 py-2 text-xs font-semibold text-background hover:opacity-90 transition"
        >
          Acheter {cryptoName} sur {p.name}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <Link
          href={`/avis/${p.id}`}
          className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg hover:border-primary/40"
        >
          Avis
        </Link>
      </div>
    </div>
  );
}
