import Link from "next/link";
import { ExternalLink, ShieldCheck, Star } from "lucide-react";
import { getAllPlatforms, isAvailableFr, feeShort, type Platform, verifiedBonus } from "@/lib/platforms";
import PlatformLogo from "@/components/PlatformLogo";
import AffiliateLink from "@/components/AffiliateLink";
import PaidLinkCaption from "@/components/PaidLinkCaption";
import { isPaidLink } from "@/lib/partnerships";
import { getMicaStatusByName } from "@/lib/mica";
import { isNoPlatformNote } from "@/lib/cryptos";

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
  const allPlatforms = getAllPlatforms();
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

  /* Ne restent que : les plateformes du comparatif autorisées en France, et les protocoles décentralisés / portefeuilles
     (hors du champ de l'agrément MiCA). Une plateforme non autorisée ou inconnue du registre n'est jamais affichée. */
  const note = platformNames.find(isNoPlatformNote);
  const matches: Array<{ name: string; platform?: Platform }> = platformNames.flatMap((name) => {
    if (isNoPlatformNote(name)) return [];
    const p = allPlatforms.find((kp) => norm(kp.name) === norm(name) || norm(kp.id) === norm(name));
    if (p) return isAvailableFr(p) ? [{ name, platform: p }] : [];
    const reg = getMicaStatusByName(name);
    if (reg) return reg.micaStatus === "out_of_scope" ? [{ name }] : [];
    return isDecentralized(name) ? [{ name }] : [];
  });

  if (!matches.length) {
    return (
      <section id="acheter" className="scroll-mt-24">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Où acheter {cryptoName} en France ?</h2>
        <p className="mt-2 text-sm text-muted max-w-[34em]">
          {note
            ? `${note}.`
            : `À notre connaissance, aucune plateforme agréée MiCA avec un accès à la France ne propose ${cryptoName} aujourd'hui.`}{" "}
          Vérifiez le statut de toute plateforme avec notre{" "}
          <Link href="/outils/verificateur-mica" className="underline hover:text-fg-max">
            vérificateur MiCA
          </Link>{" "}
          avant d&apos;y déposer des fonds.
        </p>
      </section>
    );
  }

  // Audit F (cohérence partnerships) : la mention « commission » n'est légitime
  // que si au moins une plateforme listée est réellement rémunérée. Sinon =
  // claim trompeur (DGCCRF L.121-1). Source de vérité : lib/partnerships.ts.
  const anyPaid = matches.some(
    (m) => m.platform && isPaidLink(m.platform.id, m.platform.affiliateUrl),
  );

  return (
    <section id="acheter" className="scroll-mt-24">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Où acheter {cryptoName} en France ?
      </h2>
      <p className="mt-2 text-sm text-muted max-w-[34em]">
        Plateformes agréées MiCA avec un accès à la France (registre de l&apos;ESMA) qui listent{" "}
        {cryptoName}, et protocoles décentralisés le cas échéant. Ouvrez un compte directement depuis Cryptoreflex
        {anyPaid ? " (les liens marqués « Publicité » sont rémunérés, sans surcoût pour vous)" : ""}.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {matches.map(({ name, platform }) => (
          <PlatformRow key={name} name={name} platform={platform} cryptoName={cryptoName} />
        ))}
      </div>

      <p className="mt-4 text-xs text-muted leading-relaxed">
        {anyPaid ? (
          <>
            Seuls les liens marqués « Publicité » sont rémunérés (affiliation ou
            parrainage) — cela ne change ni le classement, ni la note attribuée
            (cf.{" "}
            <Link href="/transparence" className="underline hover:text-fg-max">
              page transparence
            </Link>
            ).{" "}
          </>
        ) : null}
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
    // Protocole décentralisé ou portefeuille (hors du champ de l'agrément MiCA), sans fiche Cryptoreflex.
    return (
      <div className="rounded-2xl border border-border bg-surface/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-fg">{name}</div>
            <div className="mt-0.5 text-xs text-muted">
              Protocole décentralisé : vous gardez vos clés, pas d&apos;agrément MiCA
            </div>
          </div>
          <span className="text-xs uppercase tracking-wider text-muted">
            DEX
          </span>
        </div>
      </div>
    );
  }

  const p = platform;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <PlatformLogo id={p.id} name={p.name} size={40} />
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-bold text-fg">{p.name}</h3>
            {p.mica.micaCompliant && (
              <span
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-accent-green/30 bg-accent-green/10 px-2 py-0.5 text-xs font-semibold text-accent-green"
                title="Plateforme conforme à la régulation européenne MiCA"
              >
                <ShieldCheck className="h-3 w-3" /> MiCA
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">{p.tagline}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-1 text-xs text-fg">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-mono font-semibold">{p.scoring.global.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            <span className="text-muted">/5</span>
          </div>
          <div className="mt-1 text-xs text-muted">Frais {feeShort(p)}</div>
        </div>
      </div>

      {verifiedBonus(p) && (
        <div className="mt-3 rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-1.5 text-xs text-accent-green">
          {verifiedBonus(p)}
        </div>
      )}

      {/* AffiliateLink (et non <a> brut) : rel="sponsored" calculé seulement si
          la plateforme est rémunérée, pas de noreferrer (préserve l'attribution
          Binance/Kraken), clic tracé. showCaption=false : disclaimer de section
          unique en bas de la liste. */}
      <div className="mt-4 flex items-center gap-2">
        <AffiliateLink
          href={p.affiliateUrl}
          platform={p.id}
          placement="crypto-detail-where-to-buy"
          showCaption={false}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-3 py-2 text-xs font-semibold text-background hover:opacity-90 transition"
        >
          Acheter {cryptoName} sur {p.name}
          <ExternalLink className="h-3.5 w-3.5" />
        </AffiliateLink>
        <Link
          href={`/avis/${p.id}`}
          className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg hover:border-primary/40"
        >
          Avis
        </Link>
      </div>
      {/* 06/10/2026 : mention sous CE lien, et seulement s'il est réellement rémunéré (bon type). */}
      <PaidLinkCaption platformId={p.id} href={p.affiliateUrl} className="mt-1.5 block text-xs text-muted underline hover:text-fg" />
    </div>
  );
}

/** Protocole décentralisé ou portefeuille cité dans les données éditoriales (hors du champ de l'agrément MiCA). */
function isDecentralized(name: string): boolean {
  return /\bDEX\b|wallet|portefeuille|jupiter|raydium|uniswap|aerodrome|hyperliquid|curve|pancakeswap|atomic swap/i.test(name);
}
