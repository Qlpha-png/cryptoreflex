/**
 * /mon-compte/dev/[id] — Détail d'une clé API.
 *
 * Affiche :
 *   - Métadonnées (label, tier, scopes, statut, dates)
 *   - Bouton de révocation (irréversible)
 *   - Lien vers l'audit log de la clé (V1)
 *   - Upgrade vers Starter / Pro (V1 — pour MVP, simple lien vers /pro/api)
 *
 * Pas le secret en clair — affiché uniquement sur /reveal post-création.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { listApiKeysForUser } from "@/lib/api-keys/db";
import { SCOPE_LABELS } from "@/lib/api-keys/scopes";
import { BRAND } from "@/lib/brand";
import { revokeApiKeyAction } from "../actions";
import {
  KeyRound,
  ShieldAlert,
  Calendar,
  Clock,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import type { ApiKeyScope } from "@/lib/api-keys/types";

export const metadata: Metadata = {
  // FIX 2026-05-09 : retiré "— Cryptoreflex" pour éviter doublon template.
  title: "Détail clé API",
  alternates: { canonical: `${BRAND.url}/mon-compte/dev` },
  robots: { index: false, follow: false },
};

export default async function ApiKeyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUser();
  if (!user) {
    redirect("/connexion?next=/mon-compte/dev");
  }

  // On lit toutes les clés du user (RLS-safe) puis on filtre — évite une
  // requête direct par id qui pourrait leak via timing si la clé existe pour
  // un autre user.
  const keys = await listApiKeysForUser(user.id);
  const key = keys.find((k) => k.id === params.id);
  if (!key) notFound();

  const isExpired = key.expires_at
    ? new Date(key.expires_at).getTime() < Date.now()
    : false;
  const canBeRevoked = key.status === "active" || key.status === "deprecated";

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6 text-sm text-muted-foreground">
        <Link href="/mon-compte" className="hover:underline">Mon compte</Link>{" "}
        /{" "}
        <Link href="/mon-compte/dev" className="hover:underline">
          Clés API
        </Link>{" "}
        / <span>{key.label}</span>
      </div>

      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <KeyRound className="size-6 text-primary" />
            {key.label}
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground break-all">
            {key.public_key}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={key.status} />
          <TierBadge tier={key.tier} />
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 mb-10">
        <Card title="Tier & quotas" icon={<ShieldAlert className="size-4" />}>
          <dl className="space-y-2 text-sm">
            <Row label="Tier" value={tierLabel(key.tier)} />
            <Row label="Rate limit" value={tierLimit(key.tier)} />
            <Row label="Scopes" value={`${key.scopes.length} actifs`} />
          </dl>
        </Card>

        <Card title="Cycle de vie" icon={<Calendar className="size-4" />}>
          <dl className="space-y-2 text-sm">
            <Row
              label="Créée le"
              value={new Date(key.created_at).toLocaleString("fr-FR")}
            />
            <Row
              label="Expire le"
              value={
                key.expires_at
                  ? new Date(key.expires_at).toLocaleString("fr-FR") +
                    (isExpired ? " (expirée)" : "")
                  : "Pas d'expiration"
              }
            />
            <Row
              label="Dernier appel"
              value={
                key.last_used_at
                  ? new Date(key.last_used_at).toLocaleString("fr-FR")
                  : "Jamais utilisée"
              }
            />
          </dl>
        </Card>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Scopes autorisés</h2>
        <ul className="space-y-2">
          {key.scopes.map((s: ApiKeyScope) => (
            <li
              key={s}
              className="rounded-lg border bg-card p-3 text-sm flex flex-col gap-1"
            >
              <span className="font-mono text-xs text-primary">{s}</span>
              <span className="text-muted-foreground">{SCOPE_LABELS[s]}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Upgrade */}
      {key.tier === "sandbox" ? (
        <section className="mb-10 rounded-xl border bg-gradient-to-br from-primary/5 to-background p-5">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            Passer en production
            <ArrowUpRight className="size-4" />
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Le tier sandbox expire à J+14 et limite à 60 req/min. Pour un usage
            production, choisis Starter (19 €/mois) ou Pro (99 €/mois).
          </p>
          <Link
            href="/pro/api"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Voir les tarifs B2B
          </Link>
        </section>
      ) : null}

      {/* Révocation */}
      <section className="mb-10 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <h3 className="font-semibold mb-2 text-destructive flex items-center gap-2">
          <Trash2 className="size-4" />
          Zone de danger
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          La révocation est <strong>irréversible</strong>. Toutes les requêtes
          avec cette clé renverront 401 instantanément. Utilise cette action
          si vous soupçonnez une fuite.
        </p>
        {canBeRevoked ? (
          <form action={revokeApiKeyAction}>
            <input type="hidden" name="key_id" value={key.id} />
            <button
              type="submit"
              className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
            >
              Révoquer cette clé
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Clé déjà {key.status === "revoked" ? "révoquée" : "expirée"}.
          </p>
        )}
      </section>
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
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium bg-primary/5 text-primary border-primary/30">
      {tierLabel(tier)}
    </span>
  );
}

function tierLabel(tier: string): string {
  return (
    {
      sandbox: "Sandbox",
      b2b_starter: "Starter",
      b2b_pro: "Pro",
      b2b_enterprise: "Enterprise",
    } as Record<string, string>
  )[tier] ?? tier;
}

function tierLimit(tier: string): string {
  return (
    {
      sandbox: "60 req/min",
      b2b_starter: "500 req/s",
      b2b_pro: "5 000 req/s",
      b2b_enterprise: "20 000 req/s (custom)",
    } as Record<string, string>
  )[tier] ?? "—";
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
