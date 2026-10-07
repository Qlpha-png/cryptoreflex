/**
 * GET /api/cron/gardien/<robot> — l'horloge Vercel lance un robot GitHub (07/10/2026).
 *
 * GitHub saute la plupart de ses horaires « schedule » ; l'horloge Vercel (précise à la minute) appelle cette route,
 * qui demande à GitHub de lancer le workflow du robot (API « workflow_dispatch »). Table des robots et horaires :
 * lib/gardien.ts (vercel.json en est la copie, contrôlée par tests/lib/gardien.test.ts).
 *
 * Sécurité : Bearer CRON_SECRET (envoyé automatiquement par Vercel à ses tâches) ; sinon 404.
 * Jeton GitHub : GITHUB_GARDIEN_TOKEN (jeton à grain fin, droit « Actions » en écriture). Jamais renvoyé ni journalisé.
 * Absent : réponse 200 { ok:false, raison:"jeton absent" } et une ligne neutre dans le journal.
 * Trace de la dernière demande (statut, heure) : clé KV gardien:dernier:<robot>, sans bloquer la réponse si le KV échoue.
 */

import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";
import { BRANCHE_ROBOTS, DEPOT_ROBOTS, cleTraceGardien, robotGardien } from "@/lib/gardien";
import { getKv } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** GitHub (10 s au plus) + trace KV (2 s au plus) : marge sous ce plafond. */
export const maxDuration = 30;

const DELAI_GITHUB_MS = 10_000;
const DELAI_KV_MS = 2_000;
const DUREE_TRACE_S = 30 * 24 * 3600;

interface Trace {
  ok: boolean;
  statut: number | null;
  heure: string;
  raison?: string;
}

/** Écrit la trace dans le KV ; un KV lent ou en panne ne bloque ni ne fait échouer la réponse. */
async function noterTrace(cle: string, trace: Trace): Promise<void> {
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      getKv().set(cleTraceGardien(cle), trace, { ex: DUREE_TRACE_S }),
      new Promise((_, rej) => {
        minuteur = setTimeout(() => rej(new Error("délai")), DELAI_KV_MS);
      }),
    ]);
  } catch {
    console.warn(`[gardien] ${cle} : trace non enregistrée (KV indisponible)`);
  } finally {
    clearTimeout(minuteur);
  }
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

export async function GET(req: Request, { params }: { params: { robot: string } }): Promise<NextResponse> {
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const robot = robotGardien(params.robot);
  if (!robot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const heure = new Date().toISOString();
  const jeton = process.env.GITHUB_GARDIEN_TOKEN;
  if (!jeton) {
    console.info(`[gardien] ${robot.cle} : jeton GitHub non configuré, lancement non demandé`);
    await noterTrace(robot.cle, { ok: false, statut: null, heure, raison: "jeton absent" });
    return NextResponse.json({ ok: false, robot: robot.cle, raison: "jeton absent", heure });
  }

  let statut: number | null = null;
  let raison: string | undefined;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${DEPOT_ROBOTS}/actions/workflows/${encodeURIComponent(robot.workflow)}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${jeton}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "cryptoreflex-gardien",
        },
        body: JSON.stringify({ ref: BRANCHE_ROBOTS, inputs: robot.inputs }),
        signal: AbortSignal.timeout(DELAI_GITHUB_MS),
        cache: "no-store",
      },
    );
    statut = res.status;
    if (!res.ok) raison = messageGitHub(await res.text().catch(() => ""), jeton) ?? `GitHub a répondu ${res.status}`;
  } catch (e) {
    raison = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError") ? "délai dépassé (10 s)" : "erreur réseau";
  }

  const ok = statut !== null && statut >= 200 && statut < 300;
  if (ok) console.info(`[gardien] ${robot.cle} : lancement demandé à GitHub (${statut})`);
  else console.error(`[gardien] ${robot.cle} : lancement refusé ou impossible (${statut ?? "sans réponse"}${raison ? ` : ${raison}` : ""})`);

  await noterTrace(robot.cle, { ok, statut, heure, ...(raison ? { raison } : {}) });
  return NextResponse.json(
    { ok, robot: robot.cle, statut, heure, ...(raison ? { raison } : {}) },
    { status: ok ? 200 : 502 },
  );
}
