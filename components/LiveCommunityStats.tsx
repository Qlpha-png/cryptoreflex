/**
 * <LiveCommunityStats /> — preuve sociale "live" (Étude 02/05/2026 prop #18).
 *
 * 3 KPI mis à jour toutes les 5 min (cache mémoire Next.js Data Cache via
 * `unstable_cache` côté lib) :
 *   1. Abonnés Soutien Pro actifs
 *   2. Nouveaux Pro ce mois-ci
 *   3. Alertes prix triggered (7 derniers jours, best-effort)
 *
 * Audit Kev Phase 4 (19/05/2026) — REFACTOR :
 *   Avant : Server Component qui faisait `fetch("$SITE_URL/api/community-stats")`
 *   à chaque render → ce Footer étant rendu sur ~1191 pages SSG, c'était 1191
 *   appels HTTP internes pendant le build + chacun frappait Supabase →
 *   cause directe du build fail Phase 3 (Supabase rate-limit + OOM Hetzner).
 *
 *   Maintenant : appel direct `getCommunityStatsSafe()` (lib in-process), avec
 *   timeout 5 s + fallback `earlyAccess` garanti. Plus aucun fetch HTTP, plus
 *   aucune chance de bloquer un build, plus aucun spam Supabase.
 *
 * Anti-PII : aucun champ user n'est consommé, juste 3 chiffres agrégés.
 *
 * 2 variants :
 *   - "compact" : 3 chiffres en ligne, pour Footer / barres légères
 *   - "full"    : 3 cards riches avec icônes + libellés, pour /pro et /transparence
 */

import { unstable_cache } from "next/cache";
import { Users, Sparkles, Bell } from "lucide-react";
import {
  getCommunityStatsSafe,
  type CommunityStats,
} from "@/lib/community-stats";

// Audit H (2026-05-31) — Ce composant vit dans le Footer, rendu sur 1000+ pages.
// getCommunityStatsSafe() interroge Supabase à CHAQUE render → spam Supabase +
// CPU Vercel (dépassement Hobby). On met en cache via unstable_cache : 1 lecture
// Supabase / 5 min max, partagée par toutes les pages. Tag "community-stats" pour
// invalidation on-demand (revalidateTag) ex. à l'arrivée d'un nouvel abonné Pro.
// NB : la lib reste inchangée (13 tests + param timeout en dépendent) — on cache
// uniquement le chemin composant ; la route /api a déjà son propre unstable_cache.
const getCommunityStatsCached = unstable_cache(
  async (): Promise<CommunityStats> => getCommunityStatsSafe(),
  ["community-stats-footer-v1"],
  { revalidate: 300, tags: ["community-stats"] },
);

interface LiveCommunityStatsProps {
  /** "compact" (Footer) | "full" (page Pro). Défaut : "compact". */
  variant?: "compact" | "full";
  /** Classe additionnelle sur le wrapper. */
  className?: string;
}

// La récupération des stats est désormais déléguée à `getCommunityStatsSafe`
// (lib in-process). Ce composant n'a plus de logique d'agrégation propre.

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
  // FIX 2026-05-09 — état "early access" élégant quand toutes les stats sont
  // à 0 (DB fraîche, pas encore d'abonnés Pro). On évite ainsi d'afficher
  // "0 abonnés Soutien Pro · +0 ce mois · 0 alertes 7j" qui sentirait
  // l'abandon, sans pour autant mentir avec un fallback fake (charte éthique).
  if (stats.earlyAccess) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[12px] text-fg/75">
        <Sparkles
          className="h-3.5 w-3.5 text-primary-soft"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span>
          Communauté en construction —{" "}
          <span className="text-fg/90 font-semibold">deviens l&apos;un·e des premier·es</span>{" "}
          à soutenir l&apos;indépendance éditoriale.
        </span>
      </div>
    );
  }
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
  // FIX 2026-05-09 — bandeau "early access" honnête plutôt qu'une grille
  // de 3 zéros bruts (charte éthique : transparence sur les chiffres).
  if (stats.earlyAccess) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6 flex items-start gap-4">
        <div
          className="inline-flex items-center justify-center h-10 w-10 shrink-0 rounded-lg bg-elevated border border-primary/40 text-primary"
          aria-hidden="true"
        >
          <Sparkles className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">
            Communauté en construction
          </p>
          <p className="mt-1 text-[13px] text-fg/75 leading-relaxed">
            Cryptoreflex est en early access depuis 2026. Les premiers
            abonnés Soutien financent l&apos;indépendance éditoriale du site
            (zéro pub display, méthodologie 100 % publique). Les statistiques
            communauté seront affichées ici dès qu&apos;elles seront
            statistiquement parlantes.
          </p>
        </div>
      </div>
    );
  }
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
  // Appel direct lib in-process. Garanties :
  //   - jamais ne throw (try/catch global dans la lib)
  //   - timeout 5 s (Promise.race) → impossible de bloquer un render
  //   - fallback `earlyAccess:true` si Supabase down → bandeau honnête.
  // Aucun fetch HTTP : aucune chance de spammer Supabase ni de bloquer le
  // build SSG, quel que soit le nombre de pages dans lesquelles ce Footer
  // se retrouve.
  const stats: CommunityStats = await getCommunityStatsCached();

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
