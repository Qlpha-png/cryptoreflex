/**
 * GET /api/cron/aggregate-news
 *
 * Endpoint cron du Pilier 1 (News auto). Idempotent.
 *
 * Workflow :
 *   1. Auth Bearer CRON_SECRET via `verifyBearer` (404 sinon, security
 *      through obscurity).
 *   2. Si on tourne sur Vercel Lambda sans `ALLOW_FS_WRITE=1` → no-op
 *      propre. Le filesystem est read-only sauf `/tmp` (éphémère, perdu
 *      à chaque cold start) — toute tentative `fs.writeFile()` jette EROFS.
 *      Cf. plan/code/CRONS-VERCEL-LIMITATIONS.md pour le workflow prod.
 *   3. fetchNewsRaw() → flux RSS internationaux filtrés par mot-clé
 *   4. rewriteNews() pour chaque item → frontmatter + body MDX
 *   5. Skip si content/news/<slug>.mdx existe déjà (idempotence)
 *   6. fs.writeFile() des nouveaux fichiers (UNIQUEMENT en local / hors Vercel)
 *   7. revalidateTag("news-mdx") pour invalider le cache des pages
 *   8. Réponse JSON {processed, created, skipped, errors, durationMs}
 *
 * Logs structurés [news-cron-start] / [news-cron-end] / [news-cron-error]
 * pour faciliter la corrélation dans Vercel logs.
 *
 * LIMITATION VERCEL — IMPORTANT :
 *   En prod Vercel Lambda, ce cron tourne mais ne crée AUCUN fichier
 *   (`process.env.VERCEL` truthy ⇒ short-circuit avant writeFile). Le
 *   workflow recommandé est : exécution locale (`npm run cron:news` avec
 *   `ALLOW_FS_WRITE=1`) → commit MDX → push → Vercel rebuild + ISR.
 *   Roadmap V2 : auto-commit via GitHub API (cf. doc Limitations).
 *
 * Note Vercel Hobby (1 cron/jour max) : ce endpoint sera appelé par
 * l'orchestrateur global (cf. recommandations en fin de rapport agent),
 * pas directement par vercel.json — ce qui permet de garder l'unique slot
 * cron Hobby pour `/api/cron/evaluate-alerts`.
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidateTag } from "next/cache";

import { fetchNewsRaw } from "@/lib/news-aggregator";
import { rewriteNews } from "@/lib/news-rewriter";
import { NEWS_DIR, NEWS_MDX_TAG } from "@/lib/news-mdx";
import type { NewsCronReport } from "@/lib/news-types";
import { verifyBearer } from "@/lib/auth";

export const runtime = "nodejs"; // fs requis
export const dynamic = "force-dynamic";

/** Marge avant le hard timeout Vercel Hobby (60s). */
const CRON_DEADLINE_MS = 55_000;

/** Plafond raisonnable d'items créés par run (cohérent avec le cahier des charges). */
const MAX_CREATED_PER_RUN = 10;

/* -------------------------------------------------------------------------- */

async function ensureNewsDir(): Promise<void> {
  try {
    await fs.mkdir(NEWS_DIR, { recursive: true });
  } catch (err) {
    // mkdir { recursive: true } ne throw pas si le dossier existe — toute autre
    // erreur (EACCES, ENOSPC) doit remonter.
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const cronName = "news-cron";

  const secret = process.env.CRON_SECRET;
  if (!verifyBearer(req, secret)) {
    // 404 délibéré (security through obscurity).
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!secret) {
    console.warn(
      "[news-cron-start] CRON_SECRET absent — endpoint ouvert (mode dev)."
    );
  }

  // Vercel Lambda = filesystem READ-ONLY (sauf /tmp éphémère).
  // Si on tourne sur Vercel sans flag d'override, on no-op proprement
  // au lieu d'accumuler des EROFS dans les logs.
  if (process.env.VERCEL && !process.env.ALLOW_FS_WRITE) {
    console.warn(
      `[${cronName}-skip] session=${sessionId} reason=vercel-lambda-readonly ` +
        `hint="commit MDX files to git in dev, or implement GitHub API write for prod"`,
    );
    return NextResponse.json({
      ok: true,
      sessionId,
      skipped: "vercel-lambda-readonly",
      note: "Files cannot be written on Vercel Lambda. Generate locally and commit to Git, or implement GitHub API write strategy for prod automation.",
    }, { status: 200 });
  }

  console.info(
    `[news-cron-start] session=${sessionId} ts=${startedAt} deadlineMs=${CRON_DEADLINE_MS}`
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CRON_DEADLINE_MS);

  const errorDetails: Array<{ slug?: string; message: string }> = [];
  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  try {
    await ensureNewsDir();

    // 1) Pull flux RSS internationaux + filtre keyword
    const rawItems = await fetchNewsRaw({ totalLimit: 25 });
    processed = rawItems.length;

    // 2) Pour chaque item : rewrite → check exists → write
    for (const item of rawItems) {
      if (controller.signal.aborted) {
        errorDetails.push({ message: "Aborted before completion (deadline reached)" });
        break;
      }
      if (created >= MAX_CREATED_PER_RUN) {
        skipped += rawItems.length - rawItems.indexOf(item);
        break;
      }

      try {
        const { slug, frontmatter, body } = rewriteNews(item);
        const filePath = path.join(NEWS_DIR, `${slug}.mdx`);

        if (await fileExists(filePath)) {
          skipped++;
          continue;
        }

        const fileContent = `${frontmatter}\n\n${body}`;
        await fs.writeFile(filePath, fileContent, "utf8");
        created++;
      } catch (err) {
        errors++;
        const message = err instanceof Error ? err.message : String(err);
        errorDetails.push({ message });
        console.error(
          `[news-cron-error] session=${sessionId} item="${item.title.slice(0, 80)}" message=${message}`
        );
      }
    }

    // 3) Invalidation du cache des pages /actualites + /actualites/[slug]
    if (created > 0) {
      try {
        revalidateTag(NEWS_MDX_TAG);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[news-cron-end] revalidateTag failed: ${message}`);
      }
    }

    const durationMs = Date.now() - t0;
    const report: NewsCronReport = {
      ok: errors === 0,
      processed,
      created,
      skipped,
      errors,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      durationMs,
      startedAt,
    };

    console.info(
      `[news-cron-end] session=${sessionId} processed=${processed} created=${created} skipped=${skipped} errors=${errors} durationMs=${durationMs}`
    );

    return NextResponse.json(
      { sessionId, ...report },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted = controller.signal.aborted;
    const durationMs = Date.now() - t0;
    console.error(
      `[news-cron-error] session=${sessionId} aborted=${aborted} message=${message} durationMs=${durationMs}`
    );
    return NextResponse.json(
      {
        ok: false,
        sessionId,
        aborted,
        error: message,
        processed,
        created,
        skipped,
        errors: errors + 1,
        durationMs,
        startedAt,
      },
      {
        status: aborted ? 408 : 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
