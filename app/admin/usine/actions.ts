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
import { DEPOT_ROBOTS, robotGardien } from "@/lib/gardien";
import { demanderLancement } from "@/lib/usine/lancer";
import { PREFIXE_BRANCHE_IA } from "@/scripts/lib/usine-registre.mjs";
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

/**
 * Fusionner une proposition de l'Usine, à la demande de Kevin (un clic depuis l'application, après lecture de la carte).
 * La pull request doit venir d'une branche usine/… ; fusion « squash » avec un message « usine(<mission>): <titre> » que
 * le garde-fou de dégradation sait reconnaître. Jeton GITHUB_GARDIEN_TOKEN : il lui faut le droit « Pull requests » en
 * écriture (sinon GitHub répond 403 et la fusion se fait sur GitHub, comme avant).
 */
export async function fusionnerProposition(numero: number): Promise<ResultatAction> {
  const user = await getUser();
  if (!user || !user.isAdmin) return { ok: false, message: "Accès refusé." };
  const n = Number(numero);
  if (!Number.isInteger(n) || n <= 0) return { ok: false, message: "Numéro de pull request invalide." };
  const jeton = process.env.GITHUB_GARDIEN_TOKEN;
  if (!jeton) return { ok: false, message: "Jeton GitHub du Gardien absent : fusionne depuis la page GitHub de la pull request." };
  const entetes = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${jeton}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "cryptoreflex-usine",
  };
  try {
    const lecture = await fetch(`https://api.github.com/repos/${DEPOT_ROBOTS}/pulls/${n}`, { headers: entetes, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!lecture.ok) return { ok: false, message: `Pull request introuvable (GitHub ${lecture.status}).` };
    const pr = (await lecture.json()) as { title?: string; state?: string; merged?: boolean; head?: { ref?: string } };
    const branche = pr.head?.ref ?? "";
    if (!branche.startsWith(PREFIXE_BRANCHE_IA)) return { ok: false, message: "Cette pull request ne vient pas de l'Usine : fusion refusée ici." };
    if (pr.state !== "open" || pr.merged) return { ok: false, message: "Cette pull request n'est plus ouverte." };
    const mission = branche.slice(PREFIXE_BRANCHE_IA.length).split("-")[0] || "agent";
    const titre = String(pr.title ?? "").replace(/^Usine IA — \[[^\]]+\]\s*/, "").slice(0, 110);
    const fusion = await fetch(`https://api.github.com/repos/${DEPOT_ROBOTS}/pulls/${n}/merge`, {
      method: "PUT",
      headers: entetes,
      body: JSON.stringify({
        merge_method: "squash",
        commit_title: `usine(${mission}): ${titre}`,
        commit_message: `Proposition de l'agent « ${mission} » relue et fusionnée par Kevin depuis /admin/usine (pull request #${n}).`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const corps = (await fusion.json().catch(() => ({}))) as { message?: string };
    revalidatePath("/admin/usine");
    if (fusion.ok) {
      console.info(`[usine] pull request #${n} fusionnée par un administrateur`);
      return { ok: true, message: `Proposition #${n} fusionnée. Vercel déploie ; la sentinelle contrôle le site après le déploiement.` };
    }
    const raison = String(corps.message ?? `GitHub ${fusion.status}`).split(jeton).join("***").slice(0, 160);
    return { ok: false, message: fusion.status === 403 || fusion.status === 404 ? `GitHub refuse (${raison}) : donne au jeton du Gardien le droit « Pull requests » en écriture, ou fusionne sur GitHub.` : `Fusion refusée : ${raison}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error && e.name === "TimeoutError" ? "GitHub n'a pas répondu à temps." : "Erreur réseau vers GitHub." };
  }
}

/** Lancer le retour arrière recommandé par le garde-fou (workflow usine-garde-fou.yml, simulation décochée), à la demande de Kevin. */
export async function lancerRetourArriere(): Promise<ResultatAction> {
  const user = await getUser();
  if (!user || !user.isAdmin) return { ok: false, message: "Accès refusé." };
  const jeton = process.env.GITHUB_GARDIEN_TOKEN;
  if (!jeton) return { ok: false, message: "Jeton GitHub du Gardien absent : lance « Usine — garde-fou » sur GitHub, case simulation décochée." };
  const r = await demanderLancement("usine-garde-fou.yml", { simulation: "false" }, jeton);
  revalidatePath("/admin/usine");
  return r.ok
    ? { ok: true, message: "Retour arrière demandé : le workflow annule la dernière fusion de l'Usine en cause et pousse main. Vercel redéploie l'état précédent." }
    : { ok: false, message: `GitHub a refusé le lancement (${r.statut ?? "sans réponse"}${r.raison ? ` : ${r.raison}` : ""}).` };
}
