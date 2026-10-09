"use server";
/**
 * app/admin/usine/actions.ts — action serveur du bouton « Lancer » du tableau de bord de l'Usine (09/10/2026).
 *
 * Sécurité :
 *  - réservé aux administrateurs (getUser().isAdmin, mêmes règles que /admin : 404 strict ailleurs) ;
 *  - seuls les postes du registre marqués lançables (workflow GitHub, hors gardes-fous) peuvent être lancés ;
 *  - entrées envoyées = celles du Gardien pour ce workflow (toujours les variantes SÛRES : « filet » pour la publication
 *    du jour, contrôle léger pour la sentinelle, jamais « enregistrer » pour la veille), sinon aucune entrée ;
 *  - jeton GITHUB_GARDIEN_TOKEN (déjà présent sur Vercel pour le Gardien), jamais renvoyé ni journalisé ;
 *  - Next vérifie l'origine de l'appel (protection CSRF des actions serveur) ; le middleware bloque les mutations
 *    cross-site en amont.
 */
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { robotGardien } from "@/lib/gardien";
import { demanderLancement } from "@/lib/usine/lancer";
import type { Poste } from "@/lib/usine/types";
import { estLancable, posteParId } from "@/scripts/lib/usine-registre.mjs";

export interface ResultatAction {
  ok: boolean;
  message: string;
}

export async function lancerPoste(posteId: string): Promise<ResultatAction> {
  const user = await getUser();
  if (!user || !user.isAdmin) return { ok: false, message: "Accès refusé." };

  const poste = posteParId(String(posteId)) as Poste | undefined;
  if (!poste || !estLancable(poste) || !poste.workflow) return { ok: false, message: "Poste inconnu ou non lançable depuis le tableau de bord." };

  const jeton = process.env.GITHUB_GARDIEN_TOKEN;
  if (!jeton) {
    return {
      ok: false,
      message: "Jeton GitHub du Gardien absent (GITHUB_GARDIEN_TOKEN) : lancement impossible depuis le site. Utilise « Run workflow » sur GitHub.",
    };
  }

  const gardien = (poste.gardien ?? []).map((cle) => robotGardien(cle)).find((r) => r !== undefined);
  const inputs = gardien?.inputs ?? {};
  const resultat = await demanderLancement(poste.workflow, inputs, jeton);

  if (resultat.ok) console.info(`[usine] ${poste.id} : lancement demandé à GitHub par un administrateur (${resultat.statut})`);
  else console.error(`[usine] ${poste.id} : lancement refusé ou impossible (${resultat.statut ?? "sans réponse"}${resultat.raison ? ` : ${resultat.raison}` : ""})`);

  revalidatePath("/admin/usine");
  return resultat.ok
    ? { ok: true, message: `Lancement de « ${poste.nom} » demandé à GitHub. Le passage apparaît dans le journal d'ici une minute.` }
    : { ok: false, message: `GitHub a refusé le lancement (${resultat.statut ?? "sans réponse"}${resultat.raison ? ` : ${resultat.raison}` : ""}).` };
}
