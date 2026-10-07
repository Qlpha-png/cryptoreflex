/**
 * Script « avant affichage » du thème (lot A6 du plan de migration, phase « Encre seule »).
 *
 * Injecté EN LIGNE et SYNCHRONE dans le <head> de app/layout.tsx (dangerouslySetInnerHTML, jamais next/script) :
 * il s'exécute avant la première image, donc aucun flash. Il ne pose que l'attribut data-theme sur <html> ;
 * data-theme n'est jamais écrit dans le JSX (même HTML pour tous : ISR et cache CDN inchangés).
 *
 * Phase « Encre seule » (lots A6 à B10) — le sombre (Encre) est le rendu par défaut, sans attribut :
 *  - ?theme=papier (lot B2, adresse donnée au jury ; alias A6 : ?apparence=essai-clair)
 *                            → localStorage cr-essai-clair = "1" (interrupteur d'essai, pages du site seulement) ;
 *  - ?theme=encre (alias A6 : ?apparence=normal) → cr-essai-clair retiré ;
 *  - data-theme="light" est posé SEULEMENT si cr-essai-clair vaut "1" (relu après écriture) ; sinon RIEN n'est posé.
 *    Depuis le lot B2, tokens.css porte les valeurs Papier sous :root[data-theme="light"] : l'essai est visible, sur
 *    toutes les pages suivantes (mémoire), sans aucun bouton. Stockage bloqué : pas d'essai (jamais un thème à moitié).
 *  - cr-theme (choix mémorisé du visiteur : light | dark) est LU pour préparer la phase finale, jamais appliqué ici.
 * Phase finale (lot B11) : cr-theme light|dark → data-theme + mise à jour des 2 meta theme-color.
 *
 * Widgets /embed/* (iframes chez des tiers) : la préférence du site ne s'applique PAS (ni cr-essai-clair, ni
 * cr-theme, ni ?apparence) ; seul ?theme=light|dark pose data-theme ; auto, absent ou autre valeur → rien (rendu
 * actuel). La page de documentation /embed reste une page du site.
 *
 * Contraintes : aucune dépendance, ES5 (aucune fonction fléchée, let/const ni gabarit), TOUT dans un try/catch
 * (stockage absent ou qui lève, URLSearchParams absent : aucune exception ne sort, la page reste en Encre).
 * Testé en l'exécutant dans un DOM simulé : tests/lib/theme-anti-flash.test.ts.
 */

/** Clé localStorage du choix mémorisé (light | dark ; absente = automatique). Aussi le nom de l'événement de bascule. */
export const CLE_THEME = "cr-theme";
/** Clé localStorage de l'interrupteur d'essai du thème clair (phase « Encre seule »). */
export const CLE_ESSAI_CLAIR = "cr-essai-clair";
/** Paramètre d'URL de l'interrupteur d'essai (pages du site), forme A6 : essai-clair | normal. */
export const PARAM_APPARENCE = "apparence";
/** Paramètre d'URL du thème des widgets /embed/* (light | dark) ; sur les pages du site : papier | encre (lot B2). */
export const PARAM_THEME_WIDGET = "theme";
/** Valeurs de ?theme= de l'interrupteur d'essai sur les pages du site (lot B2). */
export const ESSAI_PAPIER = "papier";
export const ESSAI_ENCRE = "encre";

export const SCRIPT_AVANT_AFFICHAGE =
  "(function(){try{" +
  "var d=document.documentElement,l=window.location,q=null;" +
  "try{q=new URLSearchParams(l.search)}catch(e){q=null}" +
  // widgets /embed/x : ?theme seulement, préférence du site ignorée
  "if(/^\\/embed\\/./.test(l.pathname||\"\")){" +
  "var t=q?q.get(\"" + PARAM_THEME_WIDGET + "\"):null;" +
  "if(t===\"light\"||t===\"dark\")d.setAttribute(\"data-theme\",t);" +
  "return}" +
  "var s=null;try{s=window.localStorage}catch(e){s=null}" +
  "var a=q?q.get(\"" + PARAM_APPARENCE + "\"):null,th=q?q.get(\"" + PARAM_THEME_WIDGET + "\"):null,essai=null,choix=null;" +
  "if(s){" +
  "try{if(a===\"essai-clair\"||th===\"" + ESSAI_PAPIER + "\")s.setItem(\"" + CLE_ESSAI_CLAIR + "\",\"1\");" +
  "else if(a===\"normal\"||th===\"" + ESSAI_ENCRE + "\")s.removeItem(\"" + CLE_ESSAI_CLAIR + "\")}catch(e){}" +
  "try{essai=s.getItem(\"" + CLE_ESSAI_CLAIR + "\")}catch(e){essai=null}" +
  "try{choix=s.getItem(\"" + CLE_THEME + "\")}catch(e){choix=null}" +
  "}" +
  // phase finale (B11) : choix light|dark → data-theme + meta theme-color ; phase Encre seule : lu, non appliqué
  "if(choix!==\"light\"&&choix!==\"dark\")choix=null;" +
  "if(essai===\"1\")d.setAttribute(\"data-theme\",\"light\")" +
  "}catch(e){}})();";
