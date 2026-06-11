/**
 * /mon-compte/dev — Dashboard développeur B2B.
 *
 * Liste les clés API du user + bouton de création sandbox + lien upgrade.
 *
 * Mode UI minimaliste cohérent avec le reste de /mon-compte. Pas de
 * client-side state pour le MVP (Server Component pur, Server Actions pour
 * créer/révoquer).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { listApiKeysForUser } from "@/lib/api-keys/db";
import { BRAND } from "@/lib/brand";
import { createSandboxKey } from "./actions";
import { Code2, KeyRound, ShieldCheck, Plus, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Clés API développeur",
  description:
    "Créez et gérez vos clés API B2B Cryptoreflex (sandbox 14j gratuits ou abonnement Starter / Pro).",
  alternates: { canonical: `${BRAND.url}/mon-compte/dev` },
  robots: { index: false, follow: false },
};

export default async function DevDashboardPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getUser();
  if (!user) {
    redirect("/connexion?next=/mon-compte/dev");
  }

  const keys = await listApiKeysForUser(user.id);

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/mon-compte" className="hover:underline">
            Mon compte
          </Link>
          <span>/</span>
          <span>Clés API développeur</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Code2 className="size-8 text-primary" />
          Vos clés API B2B
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Branchez vos outils, vos scripts ou votre projet quant sur les données
          Cryptoreflex via une API REST stable. Documentez les endpoints sur la{" "}
          <Link href="/dev/api/docs" className="underline">
            page développeur
          </Link>
          .
        </p>
      </header>

      {searchParams?.error === "create_failed" ? (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          La création de la clé a échoué. Réessayez ou contactez le support.
        </div>
      ) : null}

      {/* CTA création */}
      <section className="mb-8 rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Tier sandbox — 14 jours gratuits
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Générez une clé d'essai pour tester l'API sans engagement. Scopes
              limités à la lecture (60 req/min). Vous pouvez upgrader vers Starter
              ou Pro à tout moment depuis le détail de la clé.
            </p>
          </div>
          <form action={createSandboxKey} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Nom de la clé</span>
              <input
                type="text"
                name="label"
                placeholder="Ex: Projet quant"
                maxLength={100}
                className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              Créer ma clé sandbox
            </button>
          </form>
        </div>
      </section>

      {/* Upgrade lien */}
      <section className="mb-10 rounded-xl border bg-muted/30 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-medium">Besoin de quotas plus élevés ?</h3>
          <p className="text-sm text-muted-foreground">
            Starter (19 €/mois, 500 req/s) ou Pro (99 €/mois, 5000 req/s + données
            historiques). Détails sur la page tarifs.
          </p>
        </div>
        <Link
          href="/pro/api"
          className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          Voir les tarifs B2B
          <ArrowUpRight className="size-4" />
        </Link>
      </section>

      {/* Liste des clés */}
      <section>
        <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
          <KeyRound className="size-5" />
          Clés actives ({keys.filter((k) => k.status === "active").length})
        </h2>

        {keys.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Aucune clé créée pour l'instant. Générez votre première clé sandbox
            ci-dessus pour démarrer.
          </div>
        ) : (
          <ul className="space-y-3">
            {keys.map((k) => (
              <li
                key={k.id}
                className="rounded-xl border bg-card p-4 sm:p-5 flex items-start justify-between gap-4 flex-wrap"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium truncate">{k.label}</h3>
                    <StatusBadge status={k.status} />
                    <TierBadge tier={k.tier} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
                    {k.public_key}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Préfixe affichage :{" "}
                    <span className="font-mono">{k.secret_prefix}</span>
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>
                      Créée le{" "}
                      {new Date(k.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    {k.expires_at ? (
                      <span>
                        Expire le{" "}
                        {new Date(k.expires_at).toLocaleDateString("fr-FR")}
                      </span>
                    ) : null}
                    {k.last_used_at ? (
                      <span>
                        Dernier appel :{" "}
                        {new Date(k.last_used_at).toLocaleDateString("fr-FR")}
                      </span>
                    ) : (
                      <span>Jamais utilisée</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/mon-compte/dev/${k.id}`}
                  className="text-sm font-medium hover:underline shrink-0"
                >
                  Détails →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-12 pt-8 border-t text-xs text-muted-foreground space-y-2">
        <p>
          Conformité PSAN : l'API B2B Cryptoreflex est purement informationnelle.
          Aucune recommandation d'investissement — article L321-1 CMF.
        </p>
        <p>
          Conformité RGPD : vos données sont hébergées en UE (Frankfurt). Vous
          pouvez exporter ou supprimer votre compte à tout moment depuis{" "}
          <Link href="/mon-compte" className="underline">
            Mon compte
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    active: { label: "Active", classes: "bg-green-500/10 text-green-700 border-green-500/30" },
    deprecated: {
      label: "Période de grâce",
      classes: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    },
    revoked: { label: "Révoquée", classes: "bg-muted text-muted-foreground border-border" },
    expired: { label: "Expirée", classes: "bg-muted text-muted-foreground border-border" },
  };
  const cfg = map[status] ?? { label: status, classes: "bg-muted" };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    sandbox: "Sandbox",
    b2b_starter: "Starter",
    b2b_pro: "Pro",
    b2b_enterprise: "Enterprise",
  };
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium bg-primary/5 text-primary border-primary/30">
      {map[tier] ?? tier}
    </span>
  );
}
