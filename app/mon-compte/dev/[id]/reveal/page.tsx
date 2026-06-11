/**
 * /mon-compte/dev/[id]/reveal — Affichage de la clé secrète UNE SEULE FOIS.
 *
 * Cette page existe UNIQUEMENT comme target de redirect post-création depuis
 * la Server Action `createSandboxKey`. Le secret arrive en query param `?s=...`
 * et n'est JAMAIS persisté côté serveur (pas de session storage, pas de DB).
 *
 * Comportement :
 *   - Si `?s=...` présent : affichage one-shot avec copy-to-clipboard.
 *     Le user est instruit de stocker la clé MAINTENANT.
 *   - Si pas de `?s=...` : redirect vers le détail (la clé n'est plus
 *     récupérable, c'est volontaire).
 *
 * Sécurité :
 *   - Vérification stricte : la clé doit appartenir au user courant + le
 *     fragment public extrait du `?s=` doit matcher `api_keys.public_key`.
 *   - HTTPS only en prod (TLS protège la query string).
 *   - meta robots noindex (déjà sur tout `/mon-compte/*` via parent).
 *   - Pas de log côté serveur du contenu de `?s=` (sinon ça apparaît en
 *     Vercel access logs).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getApiKeyByPublicKey } from "@/lib/api-keys/db";
import { parseSecretKey } from "@/lib/api-keys/format";
import { BRAND } from "@/lib/brand";
import { CopyableKey } from "./CopyableKey";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Votre clé API — copiez-la maintenant",
  alternates: { canonical: `${BRAND.url}/mon-compte/dev` },
  robots: { index: false, follow: false },
};

export default async function RevealKeyPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { s?: string };
}) {
  const user = await getUser();
  if (!user) {
    redirect("/connexion?next=/mon-compte/dev");
  }

  const secretRaw = (searchParams.s || "").trim();
  if (!secretRaw) {
    // Pas de secret → redirect vers le détail (la clé n'est plus reveal-able).
    redirect(`/mon-compte/dev/${params.id}`);
  }

  // Validation du format + ownership : on parse le secret, on récupère la
  // public_key dérivée, on vérifie que ça matche bien la row + le user.
  const parsed = parseSecretKey(secretRaw);
  if (!parsed) {
    redirect(`/mon-compte/dev/${params.id}`);
  }

  const key = await getApiKeyByPublicKey(parsed!.public_key);
  if (!key || key.id !== params.id || key.user_id !== user.id) {
    // Quelqu'un essaie d'accéder à une URL qui ne lui appartient pas → 404 silencieux.
    redirect("/mon-compte/dev");
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700">
        <ShieldCheck className="size-4" />
        Clé créée avec succès
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-3">
        Copiez votre clé secrète <span className="text-primary">maintenant</span>
      </h1>
      <p className="text-muted-foreground mb-8">
        Cette clé ne sera <strong>plus jamais affichée</strong>. Stockez-la dans
        votre gestionnaire de secrets (1Password, Bitwarden, fichier{" "}
        <code className="px-1 rounded bg-muted">.env</code>, etc.) avant de
        quitter cette page.
      </p>

      <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
        <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900">Sécurité :</p>
          <ul className="mt-1 list-disc list-inside space-y-1 text-amber-900/80">
            <li>Ne committez jamais la clé dans un repo public.</li>
            <li>
              Transmettez-la uniquement via header{" "}
              <code className="px-1 rounded bg-amber-500/10">
                Authorization: Bearer
              </code>
              , jamais en query string.
            </li>
            <li>Si vous la perdez, générez-en une nouvelle (rotation 7j de grâce).</li>
          </ul>
        </div>
      </div>

      <CopyableKey value={secretRaw} />

      <section className="mt-10 rounded-xl border bg-muted/30 p-5">
        <h2 className="font-semibold mb-3">Premier appel</h2>
        <pre className="text-xs sm:text-sm font-mono bg-background border rounded p-3 overflow-x-auto">
          {`curl -H "Authorization: Bearer ${secretRaw}" \\
  https://www.cryptoreflex.fr/api/v1/me`}
        </pre>
      </section>

      <div className="mt-8 flex items-center gap-4">
        <Link
          href={`/mon-compte/dev/${params.id}`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          J'ai copié ma clé, voir le détail
        </Link>
        <Link href="/mon-compte/dev" className="text-sm hover:underline">
          Retour aux clés
        </Link>
      </div>
    </div>
  );
}
