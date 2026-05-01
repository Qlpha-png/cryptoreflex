/**
 * lib/cmdk-actions.ts — Registry d'actions exécutables pour la Command Palette.
 *
 * Étude 02/05/2026 — proposition #7 :
 *   La palette ⌘K était jusqu'à présent purement navigationnelle (search → click
 *   → push). On la transforme en cockpit : actions exécutables (ajouter holding,
 *   créer alerte, basculer thème, déconnexion, navigation rapide, admin).
 *
 * Conception :
 *  - Chaque action expose `id`, `label`, `keywords` (boost de scoring), `group`
 *    (rendering groupé), `icon` (composant Lucide), `run(ctx)` (exécutable).
 *  - Actions navigation pure → `run` push via `ctx.router`.
 *  - Actions effets de bord (event, fetch) → `run` async (await close palette).
 *  - Filtres `requiresAuth` / `adminOnly` pour scoper la liste rendue.
 *
 * Pattern event :
 *  - Pour ouvrir un dialog d'un autre composant (AddHolding, AlertsManager) sans
 *    coupler la palette à leur state, on émet un CustomEvent `cmdk:*` que le
 *    composant cible écoute via useEffect. Si l'utilisateur est sur une autre
 *    page, on navigate d'abord via query param (?add=1 / ?new=1) qui sera
 *    interprété au mount.
 */

import type { LucideIcon } from "lucide-react";
import type { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Coins,
  Eye,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Repeat,
  Send,
  Star,
  Sun,
  UserCircle2,
  Wrench,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type CmdkGroup = "Actions" | "Navigation" | "Admin";

export interface CmdkRunContext {
  /** Router Next.js (pour les push de navigation). */
  router: ReturnType<typeof useRouter>;
  /** Pathname courant (utile pour décider event vs navigate+param). */
  pathname: string;
  /** Ferme la palette. À appeler avant tout effet de bord pour éviter la
   *  perception d'un freeze. */
  close: () => void;
}

export interface CmdkAction {
  id: string;
  /** Libellé visible dans la palette. */
  label: string;
  /** Sous-titre optionnel (court, descriptif). */
  hint?: string;
  /** Icône Lucide affichée à gauche. */
  icon: LucideIcon;
  /** Mots-clés boostant le scoring fuse (synonymes, abréviations). */
  keywords: string[];
  /** Groupe pour le rendering (3 buckets). */
  group: CmdkGroup;
  /** Exécution. Peut être sync ou async. */
  run: (ctx: CmdkRunContext) => void | Promise<void>;
  /** Filtre : ne rendu que si user authentifié. */
  requiresAuth?: boolean;
  /** Filtre : ne rendu que si user admin. */
  adminOnly?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Toggle la classe `.dark` sur <html> + persist localStorage. */
function toggleTheme(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const wasDark = root.classList.contains("dark");
  if (wasDark) {
    root.classList.remove("dark");
    try {
      window.localStorage.setItem("cr:theme", "light");
    } catch {
      /* Safari privé / quota */
    }
  } else {
    root.classList.add("dark");
    try {
      window.localStorage.setItem("cr:theme", "dark");
    } catch {
      /* noop */
    }
  }
}

/** Émet un CustomEvent pour découpler la palette des composants cibles. */
function emit(event: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(event));
}

/* -------------------------------------------------------------------------- */
/*  Liste des actions                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Toutes les actions exécutables. L'ordre dans le tableau ne détermine PAS
 * l'ordre dans l'UI : la palette regroupe par `group` et trie par score.
 *
 * Pour ajouter une action :
 *  1. Ajouter une entrée dans CMDK_ACTIONS avec un `id` unique
 *  2. Choisir un `group` ("Actions" pour effet de bord, "Navigation" pour push)
 *  3. Garnir `keywords` (synonymes, abréviations FR + EN, jargon utilisateur)
 *  4. Si l'action ouvre un dialog d'un autre composant : utiliser `emit("cmdk:xxx")`
 *     puis ajouter un useEffect listener dans le composant cible qui set le state.
 */
export const CMDK_ACTIONS: CmdkAction[] = [
  /* ============================== ACTIONS ============================== */
  {
    id: "add-holding",
    label: "Ajouter au portefeuille…",
    hint: "Crée une nouvelle position (qty, PRU)",
    icon: Plus,
    keywords: [
      "portefeuille",
      "portfolio",
      "position",
      "holding",
      "tracker",
      "btc",
      "bitcoin",
      "eth",
      "achat",
      "buy",
      "ajouter",
      "add",
      "track",
    ],
    group: "Actions",
    requiresAuth: false,
    run: ({ router, pathname, close }) => {
      close();
      // Si déjà sur la page portefeuille → event direct (dialog s'ouvre).
      // Sinon : navigate avec ?add=1 ; le PortfolioView lit le param au mount.
      if (pathname === "/portefeuille" || pathname.startsWith("/portefeuille/")) {
        // Petit délai pour laisser la palette se fermer avant d'ouvrir le dialog
        // (évite un flash de double overlay focus-trap).
        setTimeout(() => emit("cmdk:open-add-holding"), 50);
      } else {
        router.push("/portefeuille?add=1");
      }
    },
  },
  {
    id: "create-alert",
    label: "Créer une alerte prix…",
    hint: "Reçois un email si une crypto franchit un seuil",
    icon: Bell,
    keywords: [
      "alerte",
      "alert",
      "notification",
      "prix",
      "price",
      "seuil",
      "threshold",
      "trigger",
      "watcher",
      "notif",
    ],
    group: "Actions",
    run: ({ router, pathname, close }) => {
      close();
      if (pathname === "/alertes") {
        setTimeout(() => emit("cmdk:open-create-alert"), 50);
      } else {
        router.push("/alertes?new=1");
      }
    },
  },
  {
    id: "convert",
    label: "Convertir des cryptos…",
    hint: "Calcul rapide entre BTC, ETH, fiat…",
    icon: Repeat,
    keywords: [
      "conversion",
      "convertir",
      "convert",
      "swap",
      "echange",
      "exchange",
      "calcul",
      "btc eur",
      "eur btc",
      "fiat",
      "calculator",
    ],
    group: "Actions",
    run: ({ router, close }) => {
      close();
      router.push("/convertisseur");
    },
  },
  {
    id: "toggle-theme",
    label: "Basculer thème clair / sombre",
    hint: "Force le contraste opposé (persisté localStorage)",
    icon: Moon,
    keywords: [
      "theme",
      "dark",
      "light",
      "sombre",
      "clair",
      "mode",
      "contraste",
      "couleur",
      "switch",
      "toggle",
      "night",
      "jour",
    ],
    group: "Actions",
    run: ({ close }) => {
      toggleTheme();
      close();
    },
  },
  {
    id: "enable-push",
    label: "Activer les notifications push",
    hint: "Reçois les alertes en temps réel sur ce navigateur",
    icon: Send,
    keywords: [
      "push",
      "notification",
      "notif",
      "browser",
      "navigateur",
      "permission",
      "subscribe",
      "abonner",
      "service worker",
      "real time",
    ],
    group: "Actions",
    run: ({ router, close }) => {
      close();
      router.push("/mon-compte#notifications");
    },
  },
  {
    id: "logout",
    label: "Se déconnecter",
    hint: "Termine ta session sur cet appareil",
    icon: LogOut,
    keywords: [
      "logout",
      "deconnexion",
      "signout",
      "sign out",
      "exit",
      "quitter",
      "compte",
      "session",
    ],
    group: "Actions",
    requiresAuth: true,
    run: async ({ router, close }) => {
      close();
      try {
        // POST /api/auth/logout → Set-Cookie de purge + redirect 307.
        // On force `redirect: "manual"` pour ne pas suivre le redirect côté
        // fetch (Safari bloque parfois les redirects POST→GET silencieusement).
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          redirect: "manual",
        });
      } catch {
        /* Best-effort : on tente la redirect même si le fetch a foiré
           (le serveur peut répondre 502 si Supabase est down — on ne veut
           pas bloquer l'utilisateur sur la page connectée pour autant). */
      }
      // Navigate vers home après logout. Refresh côté client pour purger
      // les caches /api/me (cf. lib/use-user-plan).
      router.push("/");
      router.refresh();
    },
  },

  /* ============================ NAVIGATION ============================ */
  {
    id: "goto-portfolio",
    label: "Mon portefeuille",
    icon: Briefcase,
    keywords: ["portefeuille", "portfolio", "positions", "holdings", "tracker", "wallet"],
    group: "Navigation",
    run: ({ router, close }) => {
      close();
      router.push("/portefeuille");
    },
  },
  {
    id: "goto-watchlist",
    label: "Ma watchlist",
    icon: Star,
    keywords: ["watchlist", "favoris", "favorite", "suivre", "watch", "liste"],
    group: "Navigation",
    run: ({ router, close }) => {
      close();
      router.push("/watchlist");
    },
  },
  {
    id: "goto-alerts",
    label: "Mes alertes",
    icon: Bell,
    keywords: ["alertes", "alerts", "notifications", "prix", "price"],
    group: "Navigation",
    run: ({ router, close }) => {
      close();
      router.push("/alertes");
    },
  },
  {
    id: "goto-cryptos",
    label: "Top cryptos",
    icon: Coins,
    keywords: ["cryptos", "marche", "market", "top", "ranking", "classement", "prix"],
    group: "Navigation",
    run: ({ router, close }) => {
      close();
      router.push("/marche");
    },
  },
  {
    id: "goto-comparer",
    label: "Comparateur de plateformes",
    icon: GitCompareArrows,
    keywords: [
      "comparer",
      "compare",
      "comparatif",
      "platforms",
      "plateformes",
      "exchange",
      "binance",
      "kraken",
      "coinbase",
    ],
    group: "Navigation",
    run: ({ router, close }) => {
      close();
      router.push("/comparatif");
    },
  },
  {
    id: "goto-outils",
    label: "Outils crypto",
    icon: Wrench,
    keywords: ["outils", "tools", "calculateur", "simulator", "fiscalite", "dca", "convertisseur"],
    group: "Navigation",
    run: ({ router, close }) => {
      close();
      router.push("/outils");
    },
  },
  {
    id: "goto-pro",
    label: "Soutien Pro",
    icon: Building2,
    keywords: ["pro", "soutien", "premium", "abonnement", "subscription", "stripe", "paiement"],
    group: "Navigation",
    run: ({ router, close }) => {
      close();
      router.push("/pro");
    },
  },
  {
    id: "goto-mon-compte",
    label: "Mon compte",
    icon: UserCircle2,
    keywords: ["compte", "account", "profil", "profile", "parametres", "settings"],
    group: "Navigation",
    requiresAuth: false,
    run: ({ router, close }) => {
      close();
      router.push("/mon-compte");
    },
  },
  {
    id: "goto-academie",
    label: "Académie crypto",
    icon: BookOpen,
    keywords: ["academie", "academy", "apprendre", "learn", "cours", "tutorial", "guide"],
    group: "Navigation",
    run: ({ router, close }) => {
      close();
      router.push("/academie");
    },
  },

  /* ================================ ADMIN ============================== */
  {
    id: "force-refresh",
    label: "Forcer rebuild ISR",
    hint: "Bust cache homepage (Bearer CRON_SECRET requis)",
    icon: RefreshCw,
    keywords: ["isr", "revalidate", "cache", "rebuild", "refresh", "force", "purge", "admin"],
    group: "Admin",
    adminOnly: true,
    run: async ({ close }) => {
      close();
      const secret = (typeof window !== "undefined" &&
        window.prompt("CRON_SECRET (laisser vide pour utiliser le cookie session admin)")) || "";
      try {
        await fetch(`/api/revalidate?path=${encodeURIComponent("/")}`, {
          method: "POST",
          headers: secret ? { authorization: `Bearer ${secret}` } : {},
          credentials: "include",
        });
      } catch {
        /* noop : best-effort, pas de UI confirm pour rester minimal */
      }
    },
  },
  {
    id: "goto-admin-dashboard",
    label: "Dashboard admin",
    icon: LayoutDashboard,
    keywords: ["admin", "dashboard", "stats", "kpi", "metrics"],
    group: "Admin",
    adminOnly: true,
    run: ({ router, close }) => {
      close();
      router.push("/admin");
    },
  },
  {
    id: "goto-admin-vitals",
    label: "Web vitals (admin)",
    icon: Eye,
    keywords: ["vitals", "performance", "lcp", "inp", "cls", "perf", "admin"],
    group: "Admin",
    adminOnly: true,
    run: ({ router, close }) => {
      close();
      router.push("/admin/vitals");
    },
  },
];

/* -------------------------------------------------------------------------- */
/*  Suggestions par défaut (quand query vide)                                 */
/* -------------------------------------------------------------------------- */

/** IDs des actions affichées en haut de la palette quand la query est vide. */
export const DEFAULT_SUGGESTION_IDS: ReadonlyArray<string> = [
  "add-holding",
  "create-alert",
  "convert",
  "toggle-theme",
];

/* -------------------------------------------------------------------------- */
/*  Filtres                                                                   */
/* -------------------------------------------------------------------------- */

export interface CmdkFilterContext {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/** Filtre la liste d'actions selon le contexte user (auth + admin). */
export function filterActions(
  actions: CmdkAction[],
  ctx: CmdkFilterContext
): CmdkAction[] {
  return actions.filter((a) => {
    if (a.adminOnly && !ctx.isAdmin) return false;
    if (a.requiresAuth && !ctx.isAuthenticated) return false;
    // Cas spécial logout : visible UNIQUEMENT si authentifié
    // (déjà couvert par requiresAuth: true ci-dessus).
    return true;
  });
}

/** Convertit une action en "doc" indexable par fuse.js (label + keywords + group). */
export interface CmdkSearchDoc {
  id: string;
  label: string;
  keywords: string;
  group: CmdkGroup;
}

export function actionsToSearchDocs(actions: CmdkAction[]): CmdkSearchDoc[] {
  return actions.map((a) => ({
    id: a.id,
    label: a.label,
    keywords: a.keywords.join(" "),
    group: a.group,
  }));
}

/** Lookup une action par id. O(n) acceptable (~20 actions max). */
export function getActionById(id: string): CmdkAction | undefined {
  return CMDK_ACTIONS.find((a) => a.id === id);
}
