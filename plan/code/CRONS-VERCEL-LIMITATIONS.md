# Crons & Vercel — limitations FS et workarounds

**Audit back 26-04-2026 — issue C1 (CRITIQUE)**
**Statut : workaround appliqué (option C — génération locale + commit). Roadmap V2 : option A (GitHub API).**

---

## Le problème

Deux crons dans `app/api/cron/` font des écritures FS pour produire des fichiers MDX :

| Cron | Sortie | Volume |
|---|---|---|
| `/api/cron/aggregate-news` | `content/news/<slug>.mdx` | 5–10 fichiers / jour |
| `/api/cron/generate-ta` | `content/analyses-tech/<date>-<symbol>-...mdx` | 5 fichiers / jour |

En **production sur Vercel Lambda**, ces écritures **échouent silencieusement** :

> Vercel functions run on AWS Lambda. The Lambda filesystem is **read-only** except for the `/tmp` directory, which is **ephemeral** (purged at every cold start, max ~512 MB, not shared between invocations).
>
> — [Vercel docs · Functions FAQ](https://vercel.com/docs/functions/runtimes#filesystem)

Concrètement avant le fix :
1. Le cron tourne (Vercel Cron déclenche le GET → 200 OK).
2. `fs.writeFile()` jette `EROFS: read-only file system` ou écrit dans `/tmp` (perdu à la prochaine invocation).
3. Aucun MDX n'apparaît dans le repo / n'est servi par les pages `/actualites` ou `/analyses-tech`.
4. **Le cron a l'air de fonctionner (200 OK + logs sympa) mais ne produit rien.** Silent fail = pire scénario observabilité.

---

## Le fix immédiat (déployé)

Les deux crons commencent désormais leur handler par :

```ts
if (process.env.VERCEL && !process.env.ALLOW_FS_WRITE) {
  console.warn(`[${cronName}-skip] reason=vercel-lambda-readonly`);
  return NextResponse.json({
    ok: true,
    skipped: "vercel-lambda-readonly",
    note: "Files cannot be written on Vercel Lambda. ...",
  }, { status: 200 });
}
```

Effets :
- **En prod (Vercel)** : le cron répond 200 + `skipped` instantanément. Aucun EROFS dans les logs. Le job daily-orchestrator continue ses autres sous-crons sans être bloqué.
- **En local** : `process.env.VERCEL` est falsy → comportement normal, `fs.writeFile()` marche.
- **Override** : `ALLOW_FS_WRITE=1` permet de forcer l'écriture (utile si on monte un volume Vercel Edge Storage / Disk plus tard, ou pour debugger en preview).

---

## Les 3 options pour produire le contenu en prod

### Option A — GitHub API (V2 cible)

Le cron **commit** directement les MDX dans le repo via l'API GitHub Contents (PUT `/repos/{owner}/{repo}/contents/{path}`).

**Pros :**
- Automation 100 %. Aucune intervention humaine.
- Versioning Git natif (rollback facile, blame par crypto, diff lisible).
- Trigger naturel d'un redeploy Vercel (auto-rebuild sur push main).

**Cons :**
- Quota GitHub API : 5 000 req/h par token (largement suffisant : 15 fichiers/jour).
- Faut provisionner un Personal Access Token (PAT) ou GitHub App avec scope `contents:write` (et faire confiance à un secret de plus en prod).
- Le commit du bot pollue l'historique → conventionner un préfixe genre `chore(news): ...` et exclure du changelog.
- Conflit possible si génération concurrente (rare avec 1 cron/jour, mitigeable via `ETag` sur le PUT).

**Effort :** ~1 jour. Module `lib/github-write.ts` + refactor des deux crons pour appeler `commitMdx(path, content)` au lieu de `fs.writeFile`.

### Option B — KV storage avec adapter MDX

Stocker les MDX dans Upstash KV (déjà provisionné pour rate-limit + alerts) et lire depuis KV dans `lib/news-mdx.ts` + `lib/ta-mdx.ts` au lieu du FS.

**Pros :**
- Storage écrivable depuis Lambda (REST → INCR, SET, GET).
- Pas de cold start FS (KV répond < 50 ms).
- Couches déjà présentes (`lib/kv.ts` mock-aware).

**Cons :**
- Perte du versioning Git (un MDX écrasé = perdu).
- ISR/SSG plus complexe : on ne peut plus utiliser `generateStaticParams` au build (les MDX n'existent qu'à runtime). Il faudrait basculer en `dynamic = "force-dynamic"` + cache long, ou ajouter un script `npm run prebuild:fetch-mdx` qui hydrate `content/` depuis KV avant build.
- Pas de preview gitops (un MDX KV n'apparaît pas dans une PR).

**Effort :** ~2 jours. Création `lib/mdx-storage.ts` (interface FS-or-KV), refactor `news-mdx.ts` + `ta-mdx.ts` + revoir tous les `getStaticProps` / pages associées.

### Option C — Génération locale + commit manuel (workaround actuel)

L'opérateur exécute en local :

```bash
ALLOW_FS_WRITE=1 CRON_SECRET=<secret> \
  curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/aggregate-news

ALLOW_FS_WRITE=1 CRON_SECRET=<secret> \
  curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/generate-ta

git add content/ && git commit -m "chore(content): daily news + TA" && git push
```

Vercel détecte le push, rebuild + sert les nouveaux MDX sous ~2 min.

**Pros :**
- Zéro infra à provisionner. Marche immédiatement avec ce qui existe.
- Versioning Git natif (option A sans le bot).
- Reviewable : on lit les MDX avant de pousser.

**Cons :**
- Demande une intervention humaine quotidienne.
- Pas de SLA si l'opérateur part en vacances → pas de news fresh pendant la durée.
- Le cron Vercel daily-orchestrator continue de tourner mais n'apporte rien sur ces 2 sous-crons (les autres — alerts, refresh-events — fonctionnent normalement).

**Effort :** 0. C'est ce qu'on a aujourd'hui.

---

## Décision actuelle

**Workaround actif : option C.**

- Les crons tournent côté Vercel (orchestrateur quotidien) → pas de régression sur les jobs qui n'ont pas besoin d'écrire (evaluate-alerts, refresh-events, email-series-fiscalite).
- Les jobs FS (aggregate-news, generate-ta) répondent 200 + skipped — pas de pollution de logs.
- Génération locale 1× / jour avant la session de travail. Acceptable en V1 (volume = 15 fichiers/jour, 5 min d'opération).

## Roadmap V2

**Cible : option A (GitHub API).** Voir issue tracker.

Étapes :
1. Provisionner un PAT GitHub avec scope `contents:write` sur le repo `crypto-affiliate-site`.
2. Stocker dans Vercel env var `GITHUB_WRITE_TOKEN`.
3. Créer `lib/github-write.ts` exportant `commitFileToRepo({ path, content, message })`.
4. Dans les deux crons, remplacer le bloc `fs.writeFile + revalidateTag` par :
   ```ts
   if (process.env.VERCEL && process.env.GITHUB_WRITE_TOKEN) {
     await commitFileToRepo({ path: relPath, content: fileContent, message: `chore(news): ${slug}` });
     // Pas de revalidateTag : le push déclenche un redeploy Vercel.
   } else {
     await fs.writeFile(filePath, fileContent, "utf8");
     revalidateTag(NEWS_MDX_TAG);
   }
   ```
5. Retirer le short-circuit `process.env.VERCEL && !process.env.ALLOW_FS_WRITE`.
6. Monitoring : alerter si le cron n'a rien commité depuis > 36h.

**Estimation : 1 jour de dev, 0,5 jour de QA / monitoring.**

---

## Logs de référence

Avant fix (silent fail) :
```
[news-cron-start] session=abc123 ts=...
[news-cron-end] session=abc123 processed=18 created=0 skipped=18 errors=0 ...
```
→ `created=0` permanent malgré du flux RSS frais.

Après fix (skipped clair) :
```
[news-cron-skip] session=abc123 reason=vercel-lambda-readonly hint="commit MDX files to git in dev, ..."
```
→ Visible dans Vercel logs, pas d'erreur, pas d'ambiguïté.
