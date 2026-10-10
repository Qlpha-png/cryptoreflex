/**
 * scripts/lib/gemini-client.mjs — client Gemini minimal pour R10 (lot Z7, 10/10/2026).
 *
 * Offre GRATUITE de Google AI Studio, usage INTERNE (jamais de texte généré publié tel quel). La clé passe uniquement par
 * l'en-tête « x-goog-api-key » (jamais dans l'adresse, jamais imprimée). Les erreurs sont ramenées à trois codes :
 *  - cle_invalide : clé refusée (« API key not valid », 401, 403) ;
 *  - quota        : 429 (plafond de l'offre gratuite) ;
 *  - panne        : tout le reste (404, 5xx, réseau, réponse vide, délai dépassé).
 * REPLI : `generer` reçoit la liste ordonnée des modèles de la lecture ; sur 404 (modèle retiré), 503 (surcharge) ou 429, le
 * modèle suivant est essayé (au plus ESSAIS_MAX essais) si `prendre()` accepte un appel de plus dans le plafond du jour. Le
 * résultat porte le modèle réellement utilisé. Une clé refusée n'est jamais retentée.
 * `fetchImpl` est injectable : les tests et le banc d'essai n'appellent JAMAIS le réseau.
 */
import { ESSAIS_MAX, ErreurGemini, MODELES_PAR_DEFAUT } from "./proposeur.mjs";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Code d'erreur d'après le statut HTTP et le corps (corps jamais renvoyé tel quel : seulement un statut court). */
export function classerErreur(statut, corps) {
  const t = String(corps ?? "");
  if (statut === 429 || /RESOURCE_EXHAUSTED/.test(t)) return "quota";
  if (statut === 401 || statut === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/.test(t)) return "cle_invalide";
  return "panne";
}
/** Une erreur qui autorise l'essai du modèle suivant : modèle retiré (404), surcharge (503), quota du modèle (429). */
export const autoriseRepli = (statut) => statut === 404 || statut === 503 || statut === 429;

/**
 * @param {{ cle: string, fetchImpl?: typeof fetch, delaiMs?: number }} o
 * @returns {{ generer(a: { systeme: string, utilisateur: string, modeles?: string[], prendre?: () => boolean }): Promise<{ texte: string, modele: string, essais: number }> }}
 */
export function creerClientGemini({ cle, fetchImpl = globalThis.fetch, delaiMs = 60_000 } = {}) {
  if (!cle) throw new ErreurGemini("cle_invalide", "clé Gemini absente");
  async function appeler(modele, systeme, utilisateur) {
    let res;
    try {
      res = await fetchImpl(`${BASE}/${encodeURIComponent(modele)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": cle },
        signal: AbortSignal.timeout(delaiMs),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systeme }] },
          contents: [{ role: "user", parts: [{ text: utilisateur }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 4096, responseMimeType: "application/json" },
        }),
      });
    } catch (e) {
      throw new ErreurGemini("panne", `réseau : ${String(e?.name ?? "erreur").slice(0, 40)}`);
    }
    if (!res.ok) {
      const corps = await res.text().catch(() => "");
      throw new ErreurGemini(classerErreur(res.status, corps), `HTTP ${res.status} (${modele})`, autoriseRepli(res.status));
    }
    let j;
    try { j = await res.json(); } catch { throw new ErreurGemini("panne", "réponse non JSON"); }
    const texte = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof texte !== "string" || !texte.trim()) throw new ErreurGemini("panne", `réponse vide (${j?.candidates?.[0]?.finishReason ?? "?"})`);
    return texte;
  }
  return {
    async generer({ systeme, utilisateur, modeles = MODELES_PAR_DEFAUT.A, prendre = () => true }) {
      let derniere = null;
      const essais = Math.min(ESSAIS_MAX, modeles.length);
      for (let i = 0; i < essais; i++) {
        // l'essai de repli est un appel de plus : il doit tenir dans le plafond du jour
        if (i > 0 && !prendre()) throw new ErreurGemini("quota", "plafond d'appels du jour atteint avant le repli");
        try {
          return { texte: await appeler(modeles[i], systeme, utilisateur), modele: modeles[i], essais: i + 1 };
        } catch (e) {
          if (!(e instanceof ErreurGemini) || !e.repli) throw e;
          derniere = e;
        }
      }
      throw derniere;
    },
  };
}
