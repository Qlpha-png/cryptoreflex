import { avecTypoSync } from "@/components/ui/Typo";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, CalendarDays, Euro, ExternalLink, FileText, User } from "lucide-react";
import VerifieLe from "@/components/ui/VerifieLe";
import { getAuthorByIdOrDefault } from "@/lib/authors";
import { formatJJMMAAAA } from "@/lib/fraicheur";
import { isoOrNull } from "@/lib/data-dates";
import type { SourceCitee } from "@/lib/article-confiance";

/**
 * <TrustBox> — l'encadré de confiance du site (lot B4, 10/10/2026 ; spec C+ § 7, « Encadré de confiance »).
 * Remplace AuthorBox (28 MDX) et les deux variantes d'AuthorCard : ces composants lui délèguent, aucun MDX n'est touché.
 *
 *  - variante « complet » (bas d'article) : Rédaction, Dates, Méthode, Rémunération, Sources, puis les liens
 *    Charte éditoriale / Qui nous rémunère. Chaque entrée n'affiche que ce que la page sait réellement :
 *      · Rédaction = l'auteur du frontmatter résolu par lib/authors (jamais « La rédaction » ni signature collective) ;
 *      · Dates = publication (frontmatter) et mise à jour (frontmatter, via <VerifieLe> : l'âge se dit tout seul) ;
 *      · Méthode = lien vers /methodologie (aucune déclaration sur l'usage de l'IA : elle n'existe pas encore) ;
 *      · Rémunération = les formulations EXACTES de lib/partnerships.ts (REMUNERATION), choisies selon les liens
 *        rémunérés réellement présents (lib/article-confiance.ts) ;
 *      · Sources = celles du frontmatter si présentes, sinon les sites officiels cités dans le texte ; sans elles, la
 *        ligne n'existe pas (rien d'inventé).
 *  - variante « ligne » (en-tête d'article) : signature compacte, pastille de l'auteur, nom et rôle, dates.
 *  - variante « methode » : une ligne qui renvoie à la méthode (ce qu'AuthorBox affiche dans le corps du MDX).
 * Aucun bouclier coché ni sceau : des phrases datées et sourcées, en texte (règle C+).
 */

export interface TrustBoxProps {
  variante?: "complet" | "ligne" | "methode";
  /** id ou nom d'affichage de l'auteur (frontmatter) ; défaut = auteur du site. */
  auteur?: unknown;
  /** dates ISO (AAAA-MM-JJ ou horodatage) */
  publieLe?: string;
  misAJourLe?: string;
  /** Sources à afficher (frontmatter ou sites officiels cités). */
  sources?: SourceCitee[];
  /** Intitulé de l'entrée Sources (« Sources » ou « Textes officiels cités »). */
  sourcesTitre?: string;
  /** Lignes de la rubrique Rémunération (lignesRemuneration()). Absent = la rubrique n'est pas affichée : une page qui n'a pas
   *  calculé ses liens n'annonce rien (jamais « aucun lien publicitaire » par défaut). */
  remuneration?: string[];
  /** Titre de l'encadré (défaut « Comment cet article est vérifié »). */
  titre?: string;
  /** Lien de fin (ex. « Tous les articles »). */
  retour?: { href: string; label: string };
  className?: string;
}

function minuscule(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** « Fondateur et seul rédacteur » → « fondateur » (décision D3 : « Kevin Voisin, fondateur »). Le rôle complet reste dans data/authors.json (JSON-LD). */
function roleCourt(role: string): string {
  return minuscule(role.replace(/\s+et seul r[ée]dacteur/i, ""));
}

/**
 * Dates : « Publié le <time> » et « Mis à jour le … » (VerifieLe). Aucune n'est insécable en bloc (texte agrandi à 200 % :
 * une date en `nowrap` sortait de l'écran) ; la mise à jour passe sous la publication sur téléphone, sans « · » orphelin
 * en fin de ligne (le séparateur n'existe qu'à partir de 640 px).
 */
function Date_({ publieLe, misAJourLe, point = true }: { publieLe?: string; misAJourLe?: string; point?: boolean }) {
  const pub = isoOrNull(publieLe);
  const maj = isoOrNull(misAJourLe);
  const majDifferente = maj && maj !== pub;
  return (
    <>
      {pub && (
        <span>
          Publié le <time dateTime={pub}>{formatJJMMAAAA(pub)}</time>
        </span>
      )}
      {point && pub && majDifferente && (
        <span aria-hidden="true" className="hidden text-fg-4 sm:inline">
          ·
        </span>
      )}
      {majDifferente && <VerifieLe date={maj} famille="editorial" label="Mis à jour" />}
    </>
  );
}

const LIEN = "text-link underline decoration-link-line decoration-2 underline-offset-[0.28em] hover:text-link-hover hover:decoration-[3px]";

/** Ligne qui renvoie à la méthode (délégation d'AuthorBox, dans le corps de l'article). */
export function LigneMethode({ href = "/methodologie", className = "" }: { href?: string; className?: string }) {
  return (
    <p className={`not-prose my-6 max-w-none text-base text-muted ${className}`.trim()}>
      Méthode :{" "}
      <Link href={href} className={LIEN}>
        comment nous vérifions
      </Link>
    </p>
  );
}

function TrustBox({
  variante = "complet",
  auteur,
  publieLe,
  misAJourLe,
  sources,
  sourcesTitre = "Sources",
  remuneration,
  titre = "Comment cet article est vérifié",
  retour,
  className = "",
}: TrustBoxProps) {
  if (variante === "methode") return <LigneMethode className={className} />;

  const a = getAuthorByIdOrDefault(auteur);
  const profil = `/auteur/${a.id}`;

  if (variante === "ligne") {
    return (
      <div className={`not-prose flex items-center gap-3 border-y border-border py-4 ${className}`.trim()}>
        <Link
          href={profil}
          aria-label={`Voir tous les articles de ${a.name}`}
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-elevated"
        >
          <Image src={a.image} alt={`Photo de ${a.name}`} width={48} height={48} className="h-12 w-12 object-cover" />
        </Link>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-snug text-fg">
            <Link href={profil} className={LIEN}>
              {a.name}
            </Link>
            <span className="font-normal text-fg-2">, {roleCourt(a.role)}</span>
          </p>
          <p className="mt-0.5 flex flex-col gap-x-2 gap-y-0.5 text-base text-muted sm:flex-row sm:flex-wrap sm:items-center">
            <Date_ publieLe={publieLe} misAJourLe={misAJourLe} />
          </p>
        </div>
      </div>
    );
  }

  const lignesRemu = remuneration && remuneration.length ? remuneration : null;
  const entree = "min-w-0";
  const dt = "flex items-center gap-2 text-[0.875rem] font-semibold text-muted";
  const dd = "mt-1 text-[1rem] leading-relaxed text-fg-2";
  const icone = "h-4 w-4 shrink-0 text-muted";

  return (
    <aside
      aria-label={titre}
      data-trust-box=""
      className={`not-prose my-12 rounded-2xl border border-border bg-surface shadow-e1 ${className}`.trim()}
    >
      <div className="rounded-t-2xl border-b border-border bg-sunken px-5 py-3 sm:px-6">
        <h2 className="titre-libre font-sans text-lg font-semibold leading-snug text-fg">{titre}</h2>
      </div>
      <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-[repeat(2,minmax(0,1fr))] sm:px-6">
        <div className={entree}>
          <dt className={dt}>
            <User className={icone} aria-hidden />
            Auteur
          </dt>
          <dd className={dd}>
            <Link href={profil} className={LIEN}>
              {a.name}
            </Link>
            , {roleCourt(a.role)}
          </dd>
        </div>
        {(isoOrNull(publieLe) || isoOrNull(misAJourLe)) && (
          <div className={entree}>
            <dt className={dt}>
              <CalendarDays className={icone} aria-hidden />
              Dates
            </dt>
            <dd className={`${dd} flex flex-col gap-y-0.5`}>
              <Date_ publieLe={publieLe} misAJourLe={misAJourLe} point={false} />
            </dd>
          </div>
        )}
        <div className={entree}>
          <dt className={dt}>
            <BookOpen className={icone} aria-hidden />
            Méthode
          </dt>
          <dd className={dd}>
            <Link href="/methodologie" className={LIEN}>
              Comment nous vérifions
            </Link>
          </dd>
        </div>
        {lignesRemu && (
          <div className={entree}>
            <dt className={dt}>
              <Euro className={icone} aria-hidden />
              Rémunération
            </dt>
            <dd className={dd}>
              {lignesRemu.map((l, i) => (
                <span key={i} className={i > 0 ? "mt-2 block" : "block"}>
                  {l}
                </span>
              ))}
              <Link href="/transparence" className={`${LIEN} mt-1 inline-block`}>
                Qui nous rémunère
              </Link>
            </dd>
          </div>
        )}
        {sources && sources.length > 0 && (
          <div className={`${entree} sm:col-span-2`}>
            <dt className={dt}>
              <FileText className={icone} aria-hidden />
              {sourcesTitre}
            </dt>
            <dd className={dd}>
              <ul className="m-0 list-none space-y-1 p-0">
                {sources.map((s) => (
                  <li key={s.url} className="max-w-none">
                    <a href={s.url} target="_blank" rel="noopener nofollow" className={`${LIEN} break-words`}>
                      {s.label}
                      <ExternalLink className="ml-1 inline h-[0.8em] w-[0.8em] align-baseline opacity-70" aria-hidden />
                      <span className="sr-only"> (site externe, nouvel onglet)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
      <p className="m-0 flex max-w-none flex-wrap gap-x-6 gap-y-1 border-t border-border px-5 py-3 text-base sm:px-6">
        <Link href="/charte" className={LIEN}>
          Charte éditoriale
        </Link>
        {retour && (
          <Link href={retour.href} className={LIEN}>
            {retour.label}
          </Link>
        )}
      </p>
    </aside>
  );
}

export default avecTypoSync(TrustBox, { riche: true });
