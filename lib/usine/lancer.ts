/**
 * lib/usine/lancer.ts — demande à GitHub de lancer un workflow (API « workflow_dispatch »), même mécanique que
 * app/api/cron/gardien/[robot]/route.ts (jeton GITHUB_GARDIEN_TOKEN, jamais renvoyé ni journalisé).
 * Utilisé par le bouton « Lancer » du tableau de bord /admin/usine (app/admin/usine/actions.ts).
 */
import { BRANCHE_ROBOTS, DEPOT_ROBOTS } from "@/lib/gardien";

const DELAI_MS = 10_000;

export interface ResultatLancement {
  ok: boolean;
  statut: number | null;
  raison?: string;
}

/** Message d'erreur de GitHub, court, sans jamais recopier le jeton. */
function messageGitHub(texte: string, jeton: string): string | undefined {
  let message: unknown;
  try {
    message = (JSON.parse(texte) as { message?: unknown }).message;
  } catch {
    return undefined;
  }
  if (typeof message !== "string" || !message) return undefined;
  return message.split(jeton).join("***").slice(0, 200);
}

export async function demanderLancement(
  workflow: string,
  inputs: Readonly<Record<string, string>>,
  jeton: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResultatLancement> {
  let statut: number | null = null;
  let raison: string | undefined;
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${DEPOT_ROBOTS}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jeton}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "cryptoreflex-usine",
      },
      body: JSON.stringify({ ref: BRANCHE_ROBOTS, inputs }),
      signal: AbortSignal.timeout(DELAI_MS),
      cache: "no-store",
    });
    statut = res.status;
    if (!res.ok) raison = messageGitHub(await res.text().catch(() => ""), jeton) ?? `GitHub a répondu ${res.status}`;
  } catch (e) {
    raison = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError") ? "délai dépassé (10 s)" : "erreur réseau";
  }
  const ok = statut !== null && statut >= 200 && statut < 300;
  return { ok, statut, ...(raison ? { raison } : {}) };
}
