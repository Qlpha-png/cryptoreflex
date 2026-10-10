import { avecTypoSync } from "@/components/ui/Typo";
import Link from "next/link";
import { ChevronDown, Heart } from "lucide-react";
import { BRAND } from "@/lib/brand";
import Logo from "./Logo";
import { isReflexCardsEnabled } from "@/lib/reflex-cards/flag";
import { FOOTER_LEGAL } from "@/lib/nav";
import { BANDE_CONFIANCE, PIED_COLONNES } from "@/lib/nav-data";
import { GLOSSARY_TERMS, groupByLetter } from "@/lib/glossary";
import { RISK } from "@/lib/risk-text";

/**
 * Footer — le pied de page EST le plan du site (lot B3a, 08/10/2026 ; architecture finale § 7).
 *
 *  - Colonnes par rubrique, lues dans lib/nav-data.ts (PIED_COLONNES) : chaque page publique une fois, sans plafond
 *    (fin de MAX_LINKS) ; /impact, /partenaires, /quiz/crypto, /outils/yield-stablecoins et /pro/api en sont exclus.
 *  - Rendu serveur, liens <a href> : tout le plan est dans le HTML de chaque page.
 *  - Téléphone : chaque colonne est un accordéon <details>/<summary> (natif, clavier et lecteur d'écran). Le HTML
 *    sort OUVERT (sans JavaScript, tout reste lisible) ; le petit script en fin de pied les replie sous 768 px avant
 *    le premier affichage, et les garde ouverts sur ordinateur.
 *  - Ligne A–Z vers /glossaire#a…#z (seulement les lettres qui ont des mots) ; ligne légale (dont la rubrique
 *    D111-7 et le plan du site) ; bande de confiance ; ♥ Soutenir (NEXT_PUBLIC_SUPPORT_URL est défini en
 *    production, la page /soutenir porte le bouton de contribution) ; « Newsletter » sans rythme promis.
 *  - Avertissement : RISK.long (lib/risk-text.ts), le même texte que les bandeaux AmfDisclaimer.
 *  - Pas de choix Apparence clair/sombre ici (lot B11).
 */

const CURRENT_YEAR = new Date().getFullYear();
const CARTES_ON = isReflexCardsEnabled();
const COLONNES = PIED_COLONNES.filter((c) => CARTES_ON || c.id !== "cartes");

const LETTRES_PRESENTES = new Set(Object.keys(groupByLetter(GLOSSARY_TERMS)));
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Replie les colonnes sur téléphone avant l'affichage ; les rouvre sur ordinateur (où le summary est masqué). */
const SCRIPT_ACCORDEONS = `(function(){var m=window.matchMedia("(max-width: 767px)");var d=document.querySelectorAll("[data-pied-col]");function a(){for(var i=0;i<d.length;i++){d[i].open=!m.matches}}a();if(m.addEventListener)m.addEventListener("change",a)})();`;

/* Styles portés par les conteneurs (variantes arbitraires) : un lien du pied ne répète aucune classe, le HTML reste léger. */
const COLS =
  "columns-1 gap-x-8 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 " +
  "[&_a]:block [&_a]:py-2.5 md:[&_a]:py-1.5 [&_a]:leading-snug [&_a]:text-fg-2 [&_a]:underline [&_a]:decoration-transparent [&_a]:underline-offset-4 " +
  "hover:[&_a]:text-fg hover:[&_a]:decoration-link-line focus-visible:[&_a]:outline-none focus-visible:[&_a]:ring-2 focus-visible:[&_a]:ring-primary [&_a]:rounded-sm";

const LIGNE =
  "flex flex-wrap gap-x-4 gap-y-1 [&_a]:inline-flex [&_a]:min-h-[32px] [&_a]:items-center [&_a]:text-fg-2 [&_a]:underline [&_a]:decoration-transparent [&_a]:underline-offset-4 " +
  "hover:[&_a]:text-fg hover:[&_a]:decoration-link-line focus-visible:[&_a]:outline-none focus-visible:[&_a]:ring-2 focus-visible:[&_a]:ring-primary [&_a]:rounded-sm";

/* Bande de confiance : liens soulignés en permanence (maquette gelée), sinon on les lit comme un slogan. */
const BANDE =
  "flex flex-wrap gap-x-4 gap-y-1 [&_a]:inline-flex [&_a]:min-h-[32px] [&_a]:items-center [&_a]:text-fg-2 [&_a]:underline [&_a]:decoration-link-line [&_a]:underline-offset-4 " +
  "hover:[&_a]:text-fg hover:[&_a]:decoration-fg focus-visible:[&_a]:outline-none focus-visible:[&_a]:ring-2 focus-visible:[&_a]:ring-primary [&_a]:rounded-sm";

function Footer() {
  return (
    <footer aria-label="Pied de page" className="mt-12 border-t border-border-strong bg-sunken text-sm">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        {/* Marque, bande de confiance et soutien */}
        <div className="flex flex-col gap-6 border-b border-border-strong pb-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <Link href="/" aria-label="Cryptoreflex, accueil" className="inline-flex min-h-[44px] items-center">
              <Logo variant="full" height={30} asLink={false} title="Cryptoreflex" />
            </Link>
            <p className="mt-2 text-fg-2">
              Comparer les plateformes autorisées en France, comprendre chaque crypto, déclarer ses impôts. Des
              outils gratuits et des sources datées.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <p className={`${BANDE} items-center`} data-bande-confiance="">
              <span className="font-semibold text-fg">{BANDE_CONFIANCE.texte}</span>
              {BANDE_CONFIANCE.liens.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </p>
            <Link
              href="/soutenir"
              className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg border border-border-strong px-4 font-semibold text-fg hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:self-end"
            >
              <Heart className="h-4 w-4 text-[rgb(var(--c-gold))]" aria-hidden="true" fill="currentColor" />
              Soutenir le site
            </Link>
          </div>
        </div>

        {/* Plan du site : une colonne par rubrique, accordéons sur téléphone */}
        <nav aria-label="Plan du site" className="mt-8">
          <div className={COLS}>
            {COLONNES.map((c) => (
              <details
                key={c.id}
                open
                data-pied-col={c.id}
                className="group mb-2 break-inside-avoid border-b border-border md:mb-6 md:border-b-0"
              >
                {/* Téléphone : le summary est le bouton de l'accordéon. Ordinateur : il disparaît (display:none, donc
                    ni arrêt de tabulation ni bouton « développé » pour un lecteur d'écran) et un simple titre le remplace. */}
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 md:hidden [&::-webkit-details-marker]:hidden">
                  <h3 className="font-semibold text-fg">{c.titre}</h3>
                  <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <h3 className="hidden min-h-[44px] items-center border-b border-border-strong font-semibold text-fg md:flex">{c.titre}</h3>
                <ul className="pb-3 pt-1 md:pb-0">
                  {c.liens.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </nav>

        {/* Glossaire de A à Z */}
        <nav aria-label="Glossaire de A à Z" className="mt-6 border-t border-border-strong pt-5">
          <p className="mb-1 font-semibold text-fg">
            <Link href="/glossaire" className="hover:underline">
              Glossaire de A à Z
            </Link>
          </p>
          <p className="flex flex-wrap gap-x-0.5 [&_a]:inline-flex [&_a]:min-h-[32px] [&_a]:min-w-[28px] [&_a]:items-center [&_a]:justify-center [&_a]:rounded-sm [&_a]:text-fg-2 hover:[&_a]:bg-surface hover:[&_a]:text-fg focus-visible:[&_a]:outline-none focus-visible:[&_a]:ring-2 focus-visible:[&_a]:ring-primary">
            {ALPHABET.map((l) =>
              LETTRES_PRESENTES.has(l) ? (
                <a key={l} href={`/glossaire#${l.toLowerCase()}`} aria-label={`Mots en ${l}`}>
                  {l}
                </a>
              ) : (
                <span key={l} className="inline-flex min-h-[32px] min-w-[28px] items-center justify-center text-fg-4" aria-hidden="true">
                  {l}
                </span>
              ),
            )}
          </p>
        </nav>

        {/* Ligne légale (dont la rubrique D111-7 et le plan du site) */}
        <nav aria-label="Informations légales" className="mt-6 border-t border-border-strong pt-4">
          <ul className={`${LIGNE} text-xs`}>
            {FOOTER_LEGAL.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 space-y-3 text-xs text-fg-2">
          <p role="note" className="max-w-4xl leading-relaxed">
            <strong className="text-fg">Avertissement.</strong> {RISK.long} Certains liens, marqués « Publicité », sont
            rémunérés (affiliation ou parrainage du fondateur) :{" "}
            <Link href="/transparence" className="underline decoration-link-line underline-offset-4 hover:text-fg">
              qui nous rémunère
            </Link>
            .
          </p>
          <p>
            © {CURRENT_YEAR} {BRAND.name} · Édité depuis la France par Kevin Voisin (entreprise individuelle), directeur
            de publication · Hébergé par Vercel (région Paris) · Site indépendant, non affilié à l’AMF.
          </p>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_ACCORDEONS }} />
    </footer>
  );
}

export default avecTypoSync(Footer);
