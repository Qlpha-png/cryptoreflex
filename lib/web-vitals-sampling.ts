/**
 * lib/web-vitals-sampling.ts — qui envoie des Web Vitals au KV (06/10/2026, quota Upstash épuisé).
 *
 * Avant : 100 % des pages vues, robots navigateurs (audit de nuit, tests) et serveurs locaux compris, 5 mesures par
 * page → premier poste en commandes Upstash dans l'hypothèse haute de l'inventaire.
 * Maintenant : 10 % des pages vues, tirage UNE fois par page (une page tirée envoie toutes ses mesures, le p75 reste
 * juste), uniquement sur le domaine de production, jamais pour un navigateur piloté (navigator.webdriver) ni un agent
 * « headless » ou robot.
 */

export const VITALS_SAMPLE_RATE = 0.1;
export const VITALS_PROD_HOSTS = ["www.cryptoreflex.fr", "cryptoreflex.fr"];
/** « bot/ » et « bot » isolé (Googlebot/2.1, XxxBot/1.0…) sans exclure un téléphone « Cubot ». */
export const VITALS_BOT_UA =
  /Headless|Lighthouse|PageSpeed|Playwright|Puppeteer|Selenium|PhantomJS|crawler|spider|bot\/|\bbot\b/i;

export interface VitalsEnv {
  hostname: string;
  userAgent: string;
  webdriver: boolean;
}

/** Le navigateur courant peut-il envoyer des mesures ? (hors tirage) */
export function vitalsAllowed(env: VitalsEnv): boolean {
  if (env.webdriver) return false;
  if (VITALS_BOT_UA.test(env.userAgent)) return false;
  return VITALS_PROD_HOSTS.includes(env.hostname.toLowerCase());
}

/** Décision pour une page : autorisée ET tirée au sort (random injectable pour les tests). */
export function shouldReportVitals(env: VitalsEnv, random: () => number = Math.random, rate = VITALS_SAMPLE_RATE): boolean {
  return vitalsAllowed(env) && random() < rate;
}
