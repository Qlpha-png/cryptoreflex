/**
 * lib/engagements.ts — engagements éditoriaux affichés sur les pages « Le site » (06/10/2026).
 *
 * 1. DÉLAI DE RÉPONSE ET DE CORRECTION — NON TRANCHÉ.
 *    Le site annonce aujourd'hui six délais différents (relevé du 06/10/2026, grep sur app/, components/, lib/) :
 *      - 24 h ................ lib/email/templates.ts (« réponse sous 24 h »)
 *      - 48 h ................ app/charte/page.tsx (« corrigée sous 48 h », « On vérifie sous 48 h »),
 *                              components/ReassuranceSection.tsx (« On corrige sous 48h »),
 *                              lib/email/templates.ts (« réponse argumentée sous 48 h »)
 *      - 48 h ouvrées ........ app/mentions-legales/page.tsx (courriers), components/ContactForm.tsx (message de
 *                              confirmation et texte d'aide du formulaire de /contact)
 *      - 5 jours ouvrés ...... app/contact/page.tsx (×4), app/accessibilite/page.tsx, app/sponsoring/page.tsx,
 *                              components/SponsoringForm.tsx, lib/partnership-forms.ts
 *      - 7 jours ............. app/a-propos/page.tsx, app/methodologie/page.tsx (×2)
 *      - 7 jours ouvrés ...... app/transparence/page.tsx
 *    DÉCISION D4 de Kev (06/10/2026) : délai UNIQUE de réponse et de correction = 7 jours. Toutes les pages, les
 *    formulaires et les e-mails qui citent un délai lisent cette constante ; tests/lib/passe-finale.test.ts échoue si
 *    un autre délai (« 48 h », « 24 h », « 5 jours ouvrés », « jours ouvrés »…) réapparaît dans app/, components/ ou lib/.
 */
export const DELAI_REPONSE = "7\u00a0jours";

/**
 * 2. DATES « MISE À JOUR » DES PAGES ÉDITORIALES ET LÉGALES.
 *    Règle : la date affichée est celle de la dernière modification RÉELLE du contenu de la page
 *    (git log -1 --format=%cs -- <fichier>, recoupé avec le diff), jamais une date de complaisance.
 *    Contrôle : tests/lib/confiance-editoriale.test.ts vérifie qu'aucune page n'affiche une date
 *    antérieure à une correction inscrite pour elle dans data/corrections.json.
 *
 *    Relevé du 06/10/2026 (avant correction) : /mentions-legales affichait le 25 avril 2026, /charte le
 *    7 mai 2026, /methodologie le 6 mai 2026, alors que le contenu des trois pages avait changé le
 *    06/10/2026 (commit 8d378104) ; /a-propos n'affichait aucune date.
 */
export const PAGE_UPDATED: Readonly<Record<string, string>> = {
  "/a-propos": "2026-10-06",
  "/charte": "2026-10-06",
  "/methodologie": "2026-10-06",
  "/mentions-legales": "2026-10-06",
  "/transparence": "2026-10-06",
};

/** Date de création des pages (premier commit du fichier). */
export const PAGE_PUBLISHED: Readonly<Record<string, string>> = {
  "/methodologie": "2026-04-25",
  "/charte": "2026-05-07",
};

/** « 6 octobre 2026 » à partir d'une date ISO (midi UTC : pas de décalage d'un jour selon le fuseau). */
export function formatDateFr(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`)
    .toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Paris",
    })
    .replace(/^1 /, "1er ");
}

/** Date de mise à jour d'une page, lisible (lève une erreur si la page n'est pas déclarée : pas de date inventée). */
export function pageUpdatedFr(path: string): string {
  const iso = PAGE_UPDATED[path];
  if (!iso) throw new Error(`lib/engagements : aucune date de mise à jour déclarée pour ${path}`);
  return formatDateFr(iso);
}
