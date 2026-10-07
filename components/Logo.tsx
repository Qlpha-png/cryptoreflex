import Link from "next/link";
import { useId } from "react";

/**
 * Logo Cryptoreflex — lot B2 (kit C+ « Papier & Encre », symbole cr-logo des maquettes figées le 06/10/2026).
 *
 * SVG EN LIGNE, aucune image : le mot-symbole suit le thème par les jetons, sans requête ni fichier en cache.
 *  - « crypto », l'horizon et le filet : currentColor (couleur du texte, fg par défaut : encre sur Papier, crème sur Encre) ;
 *  - « reflex » : --c-logo-accent (or foncé sur Papier, or sur Encre ; ≥ 3:1, test de contraste) ;
 *  - reflets sous l'horizon : --c-logo-reflet ; soleil : dégradé --c-logo-sun-hi → --c-gold → --c-logo-sun-lo.
 * Aucune couleur en dur (cliquets de tests/lib/design-cliquets.test.ts).
 *
 * Variantes :
 *  - full : soleil + mot-symbole « cryptoreflex » (en-tête, pied de page) — rapport 671 × 113,8 ;
 *  - mark : emblème seul (soleil, horizon, reflets), carré ou presque — rapport 32 × 28 ;
 *  - mono : mot-symbole entièrement en currentColor (impression, fonds imposés).
 *
 * Le dégradé du soleil porte un identifiant UNIQUE par instance (useId) : plusieurs logos sur la page (en-tête, pied de
 * page) et un logo masqué (display: none) ne se volent pas leur dégradé.
 * Fichiers de marque statiques (favicon, icônes PWA, logos à télécharger) : public/brand/*-v1.svg.
 */

export type LogoVariant = "full" | "mark" | "mono";

interface LogoProps {
  variant?: LogoVariant;
  /** Hauteur en px. Largeur calculée d'après le rapport du dessin. */
  height?: number;
  className?: string;
  /** Si true (défaut), enveloppe dans un Link vers "/". */
  asLink?: boolean;
  /** Nom accessible (lien) ; masqué aux lecteurs d'écran sans lien (le contexte nomme déjà la marque). */
  title?: string;
  /** Sans effet depuis le lot B2 (SVG en ligne, rien à précharger) ; gardé pour la compatibilité des appels. */
  priority?: boolean;
  /** Classes du <svg> (ex. hauteur responsive « h-5 xl:h-7 w-auto ») ; prioritaires sur width/height. */
  svgClassName?: string;
}

/** Tracé de « crypto » (currentColor). */
const TRACE_CRYPTO =
  "m167.7 121.2q-9.9 0-17.7-4.6q-7.8-4.6-12.3-13q-4.5-8.4-4.5-19.9q0-11.6 4.4-20.1q4.5-8.4 12.3-13q7.9-4.5 17.8-4.5q6.4 0 11.9 1.9q5.5 1.9 9.7 5.4q4.2 3.5 6.9 8.4q2.7 5 3.6 11.1h-15.2q-.6-3.2-2.1-5.8q-1.5-2.5-3.6-4.2q-2.2-1.7-4.9-2.6q-2.8-.9-6.1-.9q-6.2 0-10.5 2.9q-4.4 3-6.7 8.5q-2.4 5.4-2.4 12.9q0 7.4 2.3 12.8q2.4 5.4 6.7 8.4q4.4 3 10.6 3q3.3 0 6-.9q2.7-.9 4.9-2.6q2.2-1.8 3.6-4.3q1.5-2.5 2.2-5.7h15.2q-.9 6.1-3.6 11q-2.7 5-6.9 8.5q-4.2 3.5-9.7 5.4q-5.5 1.9-11.9 1.9zm37.9-1.2v-51.6h13.9v8.8h.1q1.4-4.7 4.4-6.9q3.1-2.2 8.2-2.2q1.3 0 2.3 0q1.1 0 1.9 .1v12.2q-.7 0-2.5-.1q-1.8-.1-3.7-.1q-2.9 0-5.2 1.3q-2.4 1.4-3.7 4q-1.3 2.7-1.3 6.6v27.9zm37.7 20.4l.1-11.4l6.5 0q1.7 0 2.8-.5q1.1-.5 1.9-1.7q.7-1.2 1.4-3.2l1.4-3.8l-19.9-51.4h15.2l8.6 25.5q1.5 4.5 2.8 9.1q1.4 4.5 2.7 9.1h-4q1.2-4.6 2.5-9.1q1.4-4.6 2.9-9.1l8.7-25.5h14.9l-22.7 59.6q-1.7 4.3-3.9 7q-2.2 2.8-5.3 4.1q-3 1.3-7.1 1.3q-2.3 0-4.7 0q-2.4 0-4.8 0zm52 0v-72h14.2v7h.1q1.6-2.7 3.9-4.4q2.3-1.8 5.2-2.7q2.9-.9 6.2-.9q6.6 0 11.6 3.4q5 3.4 7.8 9.4q2.8 6.1 2.8 14q0 8-2.8 14.1q-2.7 6-7.7 9.4q-5 3.4-11.8 3.4q-3.4 0-6.2-1q-2.9-1-5.1-3q-2.2-1.9-3.7-4.8h-.1v28.1zm25.8-31q3.5 0 6.1-1.8q2.6-1.8 4-5.2q1.4-3.4 1.4-8.2q0-4.9-1.4-8.2q-1.4-3.4-4-5.2q-2.6-1.8-6.1-1.8q-3.6 0-6.4 1.9q-2.7 1.8-4.2 5.2q-1.6 3.4-1.6 8.1q0 4.6 1.6 8q1.5 3.4 4.3 5.3q2.7 1.9 6.3 1.9zm61.3-41v11.4h-33.8v-11.4zm-24.9-14h14.4v49.7q0 2.6 1.1 3.6q1 1 4 1q1.2 0 2.9 0q1.7 0 2.6 0v11.3q-1.3 0-3.7 0q-2.3 0-4.7 0q-8.5 0-12.5-3.3q-4.1-3.4-4.1-10.4zm53.2 66.8q-7.8 0-13.7-3.4q-5.9-3.4-9.2-9.4q-3.3-6.1-3.3-14.1q0-8.1 3.3-14.2q3.3-6 9.2-9.4q5.9-3.4 13.7-3.4q7.9 0 13.7 3.4q5.9 3.4 9.2 9.4q3.3 6.1 3.3 14.2q0 8-3.3 14.1q-3.3 6-9.2 9.4q-5.8 3.4-13.7 3.4zm0-11.7q3.5 0 6.2-1.8q2.6-1.8 4.1-5.3q1.4-3.4 1.4-8.1q0-4.9-1.4-8.3q-1.5-3.4-4.1-5.2q-2.7-1.9-6.2-1.9q-3.5 0-6.1 1.9q-2.6 1.8-4.1 5.2q-1.5 3.4-1.5 8.3q0 4.7 1.5 8.1q1.5 3.5 4.1 5.3q2.6 1.8 6.1 1.8z";
/** Tracé de « reflex » (--c-logo-accent). */
const TRACE_REFLEX =
  "m459.4 81.4q-.1-.3-.3-.5q-.1-.3-.6-.3q-1.5 0-3.2 .8q-1.7 .9-3.6 3.1q-2 2.2-4.3 6.4l-1.5-.6q2.6-6.5 5.3-10.2q2.7-3.7 5.7-5.2q3-1.5 6.3-1.5q1.3 0 2.3 .1q1.1 .1 2.1 .3q1.1 .2 2.3 .6l-6.4 20.5l-.2-.3q3.9-8 7.2-12.7q3.4-4.6 6.5-6.6q3.1-2 6.1-2q3.1 0 4.6 1.6q1.6 1.5 1.6 4q0 2-1 3.6q-1 1.6-2.5 2.5q-1.6 .9-3.5 .9q-.9 0-1.5-.6q-.6-.5-1.1-1.9q-.4-1.3-.9-1.8q-.6-.5-1.4-.5q-1.3 0-2.9 1.1q-1.7 1.2-3.4 3.3q-1.8 2.2-3.6 5.3q-1.8 3-3.5 6.8q-1.6 3.8-3 8.2l-4.5 14.2h-9.3zm51.1-4.8q-2.7 0-5.1 1.8q-2.4 1.8-4.3 4.9q-1.9 3-3.2 6.8q-1.3 3.7-2 7.5q-.7 3.8-.7 7q0 5.2 2 7.4q2 2.2 5.5 2.2q2.5 0 4.8-1q2.3-.9 4.5-3.2q2.3-2.3 4.5-6.5l2.1 .1q-2.9 6.8-5.8 10.7q-2.9 3.8-6.2 5.3q-3.3 1.5-7.4 1.5q-4.3 0-7.4-1.6q-3-1.7-4.7-4.8q-1.6-3.2-1.6-7.6q0-5.2 1.3-10.2q1.4-4.9 3.9-9.2q2.5-4.3 5.8-7.5q3.3-3.2 7.3-5.1q4-1.8 8.3-1.8q4 0 6.3 1.2q2.4 1.2 3.5 3.3q1.1 2 1.1 4.4q0 2.2-.8 4.4q-.8 2.3-2.3 3.9q-2.6 1.1-5.7 2.3q-3.1 1.2-6.5 2.3q-3.4 1.2-7 2.3q-3.6 1.1-7.1 2.1l.2-3.1q5.1-1.6 8.7-3.1q3.6-1.5 6-2.9q2.4-1.4 3.8-2.9q1.3-1.4 1.9-3q.6-1.5 .6-3.2q0-1.5-.5-2.5q-.5-1.1-1.4-1.7q-1-.5-2.4-.5zm16.3 1.7l.7-3.9h31l-.7 3.9zm12.6 30q-2.3 10.4-5.3 17.5q-3 7.1-6.5 11.5q-3.4 4.3-7.4 6.2q-3.9 1.9-8.1 1.9q-4.5 0-6.8-1.9q-2.3-1.8-2.3-4.7q0-2.1 1.3-3.6q1.3-1.5 3.4-1.5q1.4 0 2.3 1q.9 1 1.5 3q.6 2.1 1.6 2.8q1 .8 2.3 .8q1.9 0 3.6-1q1.7-.9 3.2-3.4q1.6-2.4 3-6.7q1.5-4.4 2.9-11.1l9.2-44.1q1.8-8.8 5.9-14.8q4-6.1 9.7-9.2q5.8-3.1 12.4-3.1q3.7 0 6.1 .9q2.4 .9 3.6 2.4q1.1 1.5 1.1 3.5q0 2.4-1.6 3.9q-1.6 1.6-4.1 1.6q-1.5 0-2.4-1.4q-.9-1.4-1.6-3.4q-.6-2-1.8-2.9q-1.2-.9-3.2-.9q-3 0-5.5 1.6q-2.5 1.7-4.4 5.3q-1.9 3.6-3.2 9.4zm31.9-51.3q-.9-.9-1.8-1.7q-1-.7-2.2-1.5q-1.1-.7-2.5-1.5l.3-1.2l17.3-3.2h1l-21.2 68l-1.4-2q1.7 .3 3.9-.3q2.2-.6 4.9-2.4q2.8-1.8 5.9-4.9l1.2 1.2q-3.8 5-7.2 8q-3.4 3-6.4 4.3q-3 1.3-5.6 1.3q-3.1 0-4.3-1.1q-1.1-1-.3-3.6zm33.3 19.6q-2.7 0-5.1 1.8q-2.4 1.8-4.3 4.9q-1.9 3-3.2 6.8q-1.3 3.7-2 7.5q-.7 3.8-.7 7q0 5.2 2 7.4q2 2.2 5.5 2.2q2.5 0 4.8-1q2.3-.9 4.5-3.2q2.3-2.3 4.5-6.5l2.1 .1q-2.9 6.8-5.8 10.7q-2.9 3.8-6.2 5.3q-3.3 1.5-7.4 1.5q-4.3 0-7.4-1.6q-3-1.7-4.7-4.8q-1.6-3.2-1.6-7.6q0-5.2 1.3-10.2q1.4-4.9 3.9-9.2q2.5-4.3 5.8-7.5q3.3-3.2 7.3-5.1q4-1.8 8.3-1.8q4 0 6.3 1.2q2.4 1.2 3.5 3.3q1.1 2 1.1 4.4q0 2.2-.8 4.4q-.8 2.3-2.3 3.9q-2.6 1.1-5.7 2.3q-3.1 1.2-6.5 2.3q-3.4 1.2-7 2.3q-3.6 1.1-7.1 2.1l.2-3.1q5.1-1.6 8.7-3.1q3.6-1.5 6-2.9q2.4-1.4 3.8-2.9q1.3-1.4 1.9-3q.6-1.5 .6-3.2q0-1.5-.5-2.5q-.5-1.1-1.4-1.7q-1-.5-2.4-.5zm38.2 21.5l-2.8 1.3l-8.3 12.4q-2.4 3.5-4.5 5.5q-2 2-4.1 2.9q-2 .9-4.3 .9q-2.9 0-4.5-1.6q-1.5-1.6-1.5-4q0-1.9 .8-3.4q.8-1.5 2.2-2.4q1.4-.8 3-.8q1.2 0 1.7 .5q.6 .6 .9 1.7q.4 1.2 .9 1.6q.5 .5 1.3 .5q1.1 0 2.5-.7q1.3-.8 3-2.5q1.6-1.7 3.7-4.7l6.3-9.2l2.9-1.4l8.5-12.5q2.3-3.3 4.3-5.3q2-2 4-2.8q2-.8 4.2-.8q2.8 0 4.4 1.6q1.6 1.6 1.6 3.9q0 1.9-.8 3.5q-.8 1.5-2.2 2.4q-1.4 .8-3 .8q-1 0-1.6-.5q-.5-.4-.9-1.7q-.5-1.2-1-1.7q-.5-.4-1.4-.4q-1.2 0-2.5 .8q-1.4 .8-3.2 2.6q-1.7 1.9-3.8 5zm19.2 4.4q-2.7 7.5-5.1 11.5q-2.4 4.1-5 5.6q-2.5 1.5-5.7 1.5q-1.4 0-2.5-.5q-1-.4-1.7-1.6q-.7-1.1-1.1-3l-7.2-33.4q-.4-1.3-.7-1.8q-.3-.4-.8-.4q-1.7 0-3.7 2.4q-2.1 2.5-4.2 8.8h-1.9q1.7-7.2 3.8-11.2q2.2-3.9 4.8-5.5q2.6-1.6 5.5-1.6q1.5 0 2.5 .5q1 .5 1.7 1.6q.6 1.1 1 3.1l7.1 33q.4 1.7 .7 2.2q.4 .5 1 .5q1.3 0 2.6-1q1.4-1 3-3.5q1.7-2.5 4-7.2z";

const SOLEIL = [
  ["0", "--c-logo-sun-hi"],
  [".55", "--c-gold"],
  ["1", "--c-logo-sun-lo"],
] as const;

export default function Logo({
  variant = "full",
  height = 30,
  className = "",
  asLink = true,
  title = "Cryptoreflex — Accueil",
  svgClassName = "",
}: LogoProps) {
  const inner = variant === "mark" ? <Embleme height={height} cls={svgClassName} /> : <MotSymbole height={height} mono={variant === "mono"} cls={svgClassName} />;

  if (!asLink) {
    return (
      <span className={`inline-flex items-center text-fg ${className}`} aria-hidden="true" data-logo={title}>
        {inner}
      </span>
    );
  }

  return (
    <Link href="/" aria-label={title} className={`inline-flex items-center text-fg ${className}`}>
      {inner}
    </Link>
  );
}

function useIdSvg(prefixe: string): string {
  // Les « : » de useId sont valides dans un id, mais on les retire pour url(#…) (même résultat serveur et client).
  return prefixe + useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

function Degrade({ id, cx, cy, r }: { id: string; cx: number; cy: number; r: number }) {
  return (
    <defs>
      <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r}>
        {SOLEIL.map(([offset, jeton]) => (
          <stop key={offset} offset={offset} style={{ stopColor: `rgb(var(${jeton}))` }} />
        ))}
      </radialGradient>
    </defs>
  );
}

const REFLET = { fill: "rgb(var(--c-logo-reflet))" };
const ACCENT = { fill: "rgb(var(--c-logo-accent))" };

/** Mot-symbole complet (viewBox du symbole cr-logo). */
function MotSymbole({ height, mono, cls }: { height: number; mono: boolean; cls: string }) {
  const id = useIdSvg("cr-soleil-");
  const width = Math.round((height * 671) / 113.8);
  const plein = mono ? { fill: "currentColor" } : undefined;
  return (
    <svg viewBox="0 44.1 671 113.8" width={width} height={height} aria-hidden="true" focusable="false" className={`block select-none ${cls}`}>
      {!mono && <Degrade id={id} cx={47.92} cy={93.38} r={49.7} />}
      <path d="M15.6 115.4 A41.2 41.2 0 0 1 98 115.4 Z" fill={mono ? "currentColor" : `url(#${id})`} />
      <rect x="7.1" y="116.81" width="99.4" height="6.39" rx="3.19" fill="currentColor" />
      <rect x="28.4" y="132.43" width="56.8" height="7.81" rx="3.91" style={plein ?? REFLET} />
      <rect x="40.82" y="147.33" width="31.95" height="7.81" rx="3.91" style={plein ?? REFLET} opacity=".6" />
      <path fill="currentColor" d={TRACE_CRYPTO} />
      <path style={plein ?? ACCENT} d={TRACE_REFLEX} />
    </svg>
  );
}

/** Emblème seul (viewBox du symbole cr-emb). */
function Embleme({ height, cls }: { height: number; cls: string }) {
  const id = useIdSvg("cr-soleil-");
  const width = Math.round((height * 32) / 28);
  return (
    <svg viewBox="0 4 32 28" width={width} height={height} aria-hidden="true" focusable="false" className={`block select-none ${cls}`}>
      <Degrade id={id} cx={13.5} cy={12} r={14} />
      <path d="M4.4 18.2 A11.6 11.6 0 0 1 27.6 18.2 Z" fill={`url(#${id})`} />
      <rect x="2" y="18.6" width="28" height="1.8" rx="0.9" fill="currentColor" />
      <rect x="8" y="23" width="16" height="2.2" rx="1.1" style={REFLET} />
      <rect x="11.5" y="27.2" width="9" height="2.2" rx="1.1" style={REFLET} opacity=".6" />
    </svg>
  );
}
