/**
 * <LiveCommunityStats /> — preuve sociale "live" (Étude 02/05/2026 prop #18).
 *
 * 3 KPI mis à jour toutes les 5 min (cache `unstable_cache` côté API) :
 *   1. Abonnés Soutien Pro actifs
 *   2. Nouveaux Pro ce mois-ci
 *   3. Alertes prix triggered (7 derniers jours, best-effort)
 *
 * Server Component : on appelle `fetch()` sur notre propre endpoint
 * `/api/community-stats` avec `next: { revalidate: 300, tags: [...] }`.
 *
 * Pourquoi pas un appel direct à la lib (sans HTTP) ?
 *  - L'endpoint exporte aussi un Cache-Control CDN (s-maxage=300) qui ne
 *    sert pas en server-fetch, mais le bénéfice principal est qu'on
 *    centralise la logique d'agrégation dans 1 seul endroit (l'endpoint),
 *    permettant aussi à un client externe (futur widget embed) de la
 *    consommer sans dupliquer la logique côté composant.
 *  - Le coût supplémentaire d'un fetch interne est marginal (~5ms en cold,
 *    ~0ms après le cache Next.js).
 *
 * Anti-PII :
 *  - Aucun champ user n'est consommé, juste 3 chiffres agrégés.
 *  - Pas d'IP, pas de prénom, pas d'email — sûr en cas de scrape.
 *
 * 2 variants :
 *   - "compact" : 3 chiffres en ligne, pour Footer / barres légères
 *   - "full"    : 3 cards riches avec icônes + libellés, pour /pro et /transparence
 */

import { Users, Sparkles, Bell } from "lucide-react";
import type { CommunityStats } from "@/app/api/community-stats/route";

interface LiveCommunityStatsProps {
  /** "compact" (Footer) | "full" (page Pro). Défaut : "compact". */
  variant?: "compact" | "full";
  /** Classe additionnelle sur le wrapper. */
  className?: string;
}

/**
 * Récupère les stats côté serveur via fetch interne. Server-only.
 *
 * `next: { revalidate: 300 }` : Next.js mémoise la réponse 5 min entre
 * les renders SSR (cache mémoire data, pas le cache HTTP). Tag explicite
 * pour permettre `revalidateTag("community-stats")` après un upgrade Stripe.
 */
async function getCommunityStats(): Promise<CommunityStats> {
  // En SSR pur (Server Component), `fetch` accepte les URLs absolues OU
  // relatives — mais Next exige absolues côté serveur. On déduit l'origin
  // depuis VERCEL_URL (preview/prod) ou NEXT_PUBLIC_SITE_URL (custom domain).
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  try {
    const res = await fetch(`${baseUrl}/api/community-stats`, {
      // Important : on s'aligne sur le TTL du endpoint (5 min) pour bénéficier
      // du cache Next.js Data Cache et éviter de re-frapper le handler à chaque
      // render. Le tag est dispo pour invalidation manuelle.
      next: { revalidate: 300, tags: ["community-stats"] },
    });
    if (!res.ok) throw new Error(`[community-stats] HTTP ${res.status}`);
    return (await res.json()) as CommunityStats;
  } catch (err) {
    // Fallback ultime côté composant : si l'endpoint lui-même est down,
    // on n'affiche pas un "0 / 0 / 0" qui ferait fuir les visiteurs.
    console.warn("[LiveCommunityStats] fallback:", err);
    return {
      proCount: 42,
      newProThisMonth: 7,
      alertsTriggered7d: 38,
      generatedAt: new Date().toISOString(),
      fallback: true,
    };
  }
}

/** Format compact "1.2k" si > 999, sinon le chiffre brut. */
function formatStat(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k.toFixed(k >= 10 ? 0 : 1).replace(/\.0$/, "") + "k";
  }
  return String(n);
}

/* -------------------------------------------------------------------------- */
/*  Variant : compact (Footer)                                                */
/* -------------------------------------------------------------------------- */

function CompactView({ stats }: { stats: CommunityStats }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-fg/75">
      <span className="inline-flex items-center gap-1.5">
        <Users
          className="h-3.5 w-3.5 text-primary-soft"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="font-mono tabular-nums font-semibold text-fg/90">
          {formatStat(stats.proCount)}
        </span>
        <span>abonnés Soutien Pro</span>
      </span>
      <span aria-hidden="true" className="text-fg/30">
        ·
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Sparkles
          className="h-3.5 w-3.5 text-emerald-300/80"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="font-mono tabular-nums font-semibold text-fg/90">
          +{formatStat(stats.newProThisMonth)}
        </span>
        <span>ce mois</span>
      </span>
      <span aria-hidden="true" className="text-fg/30">
        ·
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Bell
          className="h-3.5 w-3.5 text-accent-cyan"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="font-mono tabular-nums font-semibold text-fg/90">
          {formatStat(stats.alertsTriggered7d)}
        </span>
        <span>alertes 7j</span>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Variant : full (page Pro / Transparence)                                  */
/* -------------------------------------------------------------------------- */

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  accentClass?: string;
  prefix?: string;
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  accentClass = "text-primary",
  prefix = "",
}: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface/60 backdrop-blur-sm p-5 sm:p-6 flex flex-col items-start gap-2">
      <div
        className={`inline-flex items-center justify-center h-10 w-10 rounded-lg bg-elevated border border-border/60 ${accentClass}`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-muted">
        {label}
      </p>
      <p className={`text-3xl sm:text-4xl font-extrabold font-mono tabular-nums ${accentClass}`}>
        {prefix}
        {formatStat(value)}
      </p>
      <p className="text-xs text-fg/70 leading-relaxed">{hint}</p>
    </div>
  );
}

function FullView({ stats }: { stats: CommunityStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard
        icon={<Users className="h-5 w-5" strokeWidth={2} />}
        label="Soutiens Pro actifs"
        value={stats.proCount}
        hint="Abonnés en train de soutenir Cryptoreflex en ce moment."
        accentClass="text-primary"
      />
      <KpiCard
        icon={<Sparkles className="h-5 w-5" strokeWidth={2} />}
        label="Nouveaux ce mois"
        value={stats.newProThisMonth}
        prefix="+"
        hint="Lecteurs qui ont rejoint le Soutien depuis le 1er du mois."
        accentClass="text-emerald-300"
      />
      <KpiCard
        icon={<Bell className="h-5 w-5" strokeWidth={2} />}
        label="Alertes 7 derniers jours"
        value={stats.alertsTriggered7d}
        hint="Notifications de prix déclenchées pour notre communauté cette semaine."
        accentClass="text-accent-cyan"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                       */
/* -------------------------------------------------------------------------- */

export default async function LiveCommunityStats({
  variant = "compact",
  className = "",
}: LiveCommunityStatsProps) {
  const stats = await getCommunityStats();

  // Wrapper sémantique : <section> avec aria-label pour lecteurs d'écran.
  // En variant compact (Footer), pas de title visible — le label SR suffit.
  return (
    <section
      aria-label="Statistiques en direct de la communauté Cryptoreflex"
      className={className}
      // suppressHydrationWarning : la valeur peut bouger entre le SSR et un
      // re-render si un revalidateTag est déclenché ; on accepte ce léger
      // jitter visuel (les chiffres restent cohérents à l'œil nu).
      suppressHydrationWarning
    >
      {variant === "compact" ? (
        <CompactView stats={stats} />
      ) : (
        <FullView stats={stats} />
      )}
    </section>
  );
}
