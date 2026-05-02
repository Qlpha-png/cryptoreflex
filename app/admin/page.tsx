/**
 * /admin — Dashboard administrateur Cryptoreflex.
 *
 * Accès STRICTEMENT réservé aux emails listés dans ADMIN_EMAILS env var
 * (fallback : kevinvoisin2016@gmail.com + contact@cryptoreflex.fr).
 *
 * Si non-admin → 404 strict (pas de redirect vers /pro qui révélerait
 * l'existence de la page).
 *
 * Contenu : raccourcis vers tous les outils de gestion + stats live :
 *  - Vue rapide compteurs (Stripe, Supabase users count si dispo)
 *  - Liens vers : portail Stripe, debug-auth, sitemap, méthodologie
 *  - Liens vers : revalidate cache, voir logs Vercel
 *  - Aperçu : abonnés Pro (via /api/me), config Beehiiv
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Crown,
  Settings,
  CreditCard,
  Users,
  FileText,
  RefreshCw,
  Mail,
  ShieldCheck,
  ExternalLink,
  Activity,
  Database,
  Zap,
  Bell,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { getAllCryptos } from "@/lib/cryptos";
import { getAllArticleSummaries } from "@/lib/mdx";

export const metadata: Metadata = {
  title: "Admin Cryptoreflex — Dashboard interne",
  description: "Espace administrateur Cryptoreflex (réservé éditeur).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface AdminLinkProps {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  external?: boolean;
  variant?: "default" | "danger" | "primary";
}

const ADMIN_LINKS_GROUPS: Array<{
  label: string;
  links: AdminLinkProps[];
}> = [
  {
    label: "🚨 Outils prioritaires",
    links: [
      // FIX SEC 2026-05-02 #15 (audit expert backend) — `/api/admin/debug-auth`
      // SUPPRIMÉ : leakait des prefixes d'env vars en prod même protégé par
      // x-admin-secret (verbose dans les logs Vercel). Pour debug auth en
      // local, utiliser `npx supabase status` ou les Supabase logs directement.
      {
        href: "/api/cron/daily-orchestrator",
        title: "Lancer le cron orchestrator",
        description: "Force l'exécution manuelle (alerts + news + brief)",
        Icon: RefreshCw,
        variant: "primary",
      },
      {
        href: "/api/revalidate?secret=...",
        title: "Revalidate ISR cache",
        description: "Force le rebuild d'une page (param `path` requis)",
        Icon: Zap,
        variant: "primary",
      },
    ],
  },
  {
    label: "💳 Stripe & abonnés",
    links: [
      {
        href: "https://dashboard.stripe.com/test/customers",
        title: "Stripe Dashboard (test)",
        description: "Customers, subscriptions, paiements",
        Icon: CreditCard,
        external: true,
      },
      {
        href: "https://dashboard.stripe.com/payments",
        title: "Stripe paiements (live)",
        description: "Historique transactions live",
        Icon: CreditCard,
        external: true,
      },
      {
        href: "/api/me",
        title: "/api/me — mon profil",
        description: "Voir le plan + limits exposés à mon propre compte",
        Icon: Users,
      },
    ],
  },
  {
    label: "📊 Vercel & infra",
    links: [
      {
        href: "https://vercel.com/dashboard",
        title: "Vercel Dashboard",
        description: "Deployments, analytics, logs",
        Icon: Activity,
        external: true,
      },
      {
        href: "https://console.upstash.com/redis",
        title: "Upstash KV (rate limits)",
        description: "Vérifier les compteurs IA, alertes, etc.",
        Icon: Database,
        external: true,
      },
      {
        href: "https://supabase.com/dashboard",
        title: "Supabase Dashboard",
        description: "Auth users + table users + RLS",
        Icon: Database,
        external: true,
      },
    ],
  },
  {
    label: "📧 Email & newsletter",
    links: [
      {
        href: "https://app.beehiiv.com",
        title: "Beehiiv (newsletter)",
        description: "Audience, broadcasts, segments",
        Icon: Mail,
        external: true,
      },
      {
        href: "https://resend.com/emails",
        title: "Resend (transactionnel)",
        description: "Magic links, welcome, alertes prix",
        Icon: Mail,
        external: true,
      },
      {
        href: "/api/cron/email-series-fiscalite",
        title: "Force cron email-series",
        description: "Trigger manuel séquence fiscalité J0-J14",
        Icon: RefreshCw,
      },
    ],
  },
  {
    label: "📈 Analytics & contenu",
    links: [
      {
        href: "https://plausible.io/cryptoreflex.fr",
        title: "Plausible Analytics",
        description: "Trafic, sources, top pages",
        Icon: TrendingUp,
        external: true,
      },
      {
        href: "/sitemap.xml",
        title: "Sitemap.xml",
        description: "Vérifier les routes indexées",
        Icon: FileText,
      },
      {
        href: "/methodologie",
        title: "Page méthodologie",
        description: "Contenu E-E-A-T public",
        Icon: FileText,
      },
      {
        href: "/transparence",
        title: "Page transparence",
        description: "Affiliés vs codes parrainage",
        Icon: FileText,
      },
    ],
  },
  {
    label: "🔧 Outils contenu (raccourcis)",
    links: [
      {
        href: "/cryptos",
        title: "100 fiches crypto",
        description: "Hub /cryptos",
        Icon: FileText,
      },
      {
        href: "/comparer",
        title: "105 comparatifs crypto",
        description: "Hub /comparer",
        Icon: FileText,
      },
      {
        href: "/outils/cerfa-2086-auto",
        title: "Cerfa 2086 PDF auto",
        description: "Tester le générateur PDF",
        Icon: FileText,
      },
      {
        href: "/outils",
        title: "Tous les outils",
        description: "16 outils Cryptoreflex",
        Icon: Settings,
      },
    ],
  },
];

export default async function AdminDashboard() {
  const user = await getUser();

  // Triple gate strict :
  if (!user || !user.isAdmin) {
    notFound();
  }

  // Stats rapides (calculées au render, pas de DB queries lourdes)
  const cryptosCount = getAllCryptos().length;
  const articles = await getAllArticleSummaries();
  const articlesCount = articles.length;

  return (
    <article className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/mon-compte" className="hover:text-fg">Mon compte</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Admin</span>
        </nav>

        <header className="mt-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
              <Crown className="h-3.5 w-3.5" />
              ADMIN — Accès interne Kevin
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Dashboard <span className="gradient-text">{BRAND.name}</span>
            </h1>
            <p className="mt-2 text-sm text-muted">
              Connecté : <strong className="text-fg/85">{user.email}</strong> · Plan effectif :{" "}
              <strong className="text-fg/85">{user.plan}</strong>{" "}
              {user.plan === "pro_annual" && user.isAdmin && "(override admin)"}
            </p>
          </div>
        </header>

        {/* Stats live */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Fiches crypto" value={String(cryptosCount)} accent="primary" />
          <StatBox label="Articles MDX" value={String(articlesCount)} accent="emerald" />
          <StatBox label="Outils" value="16" accent="purple" />
          <StatBox label="Cryptos avec roadmap" value="31" accent="amber" />
        </div>

        {/* Sections de liens admin */}
        <div className="mt-12 space-y-10">
          {ADMIN_LINKS_GROUPS.map((group) => (
            <section key={group.label} aria-labelledby={`group-${group.label}`}>
              <h2
                id={`group-${group.label}`}
                className="text-lg font-bold text-fg mb-4"
              >
                {group.label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.links.map((link) => (
                  <AdminLink key={link.href} {...link} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer doc */}
        <section className="mt-16 rounded-2xl border border-border bg-elevated/40 p-5 text-sm text-fg/80">
          <h3 className="font-bold text-fg mb-2">📚 Doc rapide</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              Pour ajouter un admin : ajouter l&apos;email à <code className="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded">ADMIN_EMAILS</code> dans Vercel env vars (séparés par virgule).
            </li>
            <li>
              Les admins ont automatiquement <strong>plan = pro_annual</strong> + accès gratuit
              à toutes les features (Cerfa 2086 PDF, IA Q&amp;A 20/jour, portfolio 500, alertes 100).
            </li>
            <li>
              Cron orchestrator : tourne automatiquement à <strong>7h Paris</strong> chaque
              jour (alerts + news + TA + events + daily brief).
            </li>
            <li>
              Cette page est en <code className="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded">noindex follow:false</code>{" "}
              + 404 strict pour non-admin (pas de leak d&apos;existence).
            </li>
          </ul>
        </section>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "primary" | "emerald" | "purple" | "amber";
}) {
  const bg = {
    primary: "from-primary/15",
    emerald: "from-emerald-500/15",
    purple: "from-purple-500/15",
    amber: "from-amber-500/15",
  }[accent];
  const text = {
    primary: "text-primary",
    emerald: "text-emerald-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
  }[accent];
  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${bg} to-transparent p-4`}>
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-2xl sm:text-3xl font-extrabold tabular-nums ${text}`}>
        {value}
      </div>
    </div>
  );
}

function AdminLink({
  href,
  title,
  description,
  Icon,
  external,
  variant = "default",
}: AdminLinkProps) {
  const variantClass =
    variant === "primary"
      ? "border-primary/30 hover:border-primary/60 bg-primary/5"
      : variant === "danger"
        ? "border-accent-rose/30 hover:border-accent-rose/60 bg-accent-rose/5"
        : "border-border hover:border-primary/40 bg-surface";

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(245,165,36,0.3)] ${variantClass}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-elevated text-fg/85 group-hover:bg-primary/15 group-hover:text-primary transition-colors">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-fg text-sm flex items-center gap-1.5">
            {title}
            {external && <ExternalLink className="h-3 w-3 text-muted" aria-hidden />}
          </h3>
          <p className="mt-1 text-xs text-fg/70 leading-snug">{description}</p>
        </div>
      </div>
    </a>
  );
}
