/**
 * Newsletter — intégration Beehiiv (mode dual : prod ou mock).
 *
 * Pourquoi Beehiiv ?
 *  - Free tier généreux jusqu'à 2500 subs (largement le runway pour Cryptoreflex)
 *  - API REST simple, webhooks, automations natives
 *  - Délivrabilité supérieure à Mailchimp/Brevo sur le segment newsletter SaaS/finance
 *  - Pas de "from address" verification chiante au démarrage
 *
 * Mode fallback :
 *  - Si BEEHIIV_API_KEY ou BEEHIIV_PUBLICATION_ID manquent, on log + on retourne
 *    `{ ok: true, mocked: true }`. Le formulaire affiche un succès, mais on
 *    sait côté serveur qu'aucun vrai abonnement n'a eu lieu. Ça permet de :
 *      1. Développer / tester l'UX sans compte Beehiiv
 *      2. Ne pas casser la prod si la clé expire un jour
 *      3. Garder un fallback "best effort" — un user qui s'inscrit reste informé
 *         côté UI ; le dev voit l'erreur dans les logs Vercel.
 *
 * Doc API : https://developers.beehiiv.com/docs/v2/2krgmq6m4nkb1-create-subscription
 */

export type SubscribeSource =
  | "inline"
  | "popup"
  | "newsletter-page"
  | "footer"
  | "blog-cta"
  | "pro-waitlist"
  | "quiz-exchange"
  | "unknown";

export type SubscribeInput = {
  email: string;
  /** UTM / source de capture pour segmenter les performances dans Beehiiv. */
  source?: SubscribeSource;
  /** Custom fields à pousser (ex : lead_magnet_id). */
  customFields?: Record<string, string>;
  /** Tracking marketing optionnel. */
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** IP cliente (uniquement pour Beehiiv anti-fraude, pas stocké côté Cryptoreflex). */
  ip?: string;
};

export type SubscribeResult =
  | { ok: true; mocked: false; subscriberId: string }
  | { ok: true; mocked: true; reason: string }
  | { ok: false; error: string; status?: number };

const BEEHIIV_BASE = "https://api.beehiiv.com/v2";

/**
 * Inscrit un email à la newsletter principale.
 * - En prod : appel direct à l'API Beehiiv.
 * - En dev / fallback : log + succès mocké.
 */
export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId = process.env.BEEHIIV_PUBLICATION_ID;

  // ---- Fallback mock : pas de credentials configurés ----
  if (!apiKey || !pubId) {
    // Volontairement console.info (pas warn) pour ne pas polluer les alertes
    // Vercel quand on est en dev ou que le user n'a pas encore branché Beehiiv.
    console.info(
      "[newsletter] mode mock — Beehiiv non configuré. Inscription simulée :",
      {
        email: input.email,
        source: input.source ?? "unknown",
        utmCampaign: input.utmCampaign,
      }
    );
    return {
      ok: true,
      mocked: true,
      reason: "BEEHIIV_API_KEY ou BEEHIIV_PUBLICATION_ID manquant",
    };
  }

  // ---- Mode réel : POST vers Beehiiv ----
  const url = `${BEEHIIV_BASE}/publications/${encodeURIComponent(pubId)}/subscriptions`;

  const body = {
    email: input.email,
    // `reactivate_existing: true` -> si l'user s'était désinscrit, on le réactive
    // proprement plutôt que de renvoyer une erreur 409. Évite de blâmer l'user
    // pour une action passée qu'il a peut-être oubliée.
    reactivate_existing: true,
    // `send_welcome_email: true` -> Beehiiv envoie son template de bienvenue.
    // À désactiver si on veut piloter le welcome via une automation custom.
    send_welcome_email: true,
    utm_source: input.utmSource ?? "cryptoreflex",
    utm_medium: input.utmMedium ?? "website",
    utm_campaign: input.utmCampaign ?? input.source ?? "newsletter",
    referring_site: "cryptoreflex.fr",
    custom_fields: input.customFields
      ? Object.entries(input.customFields).map(([name, value]) => ({ name, value }))
      : undefined,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      // Pas de cache : c'est une mutation.
      cache: "no-store",
      // Timeout dur côté Next runtime ; 8s suffit largement pour Beehiiv (~300ms typique).
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // Beehiiv renvoie un body JSON `{ errors: [...] }` en cas d'erreur.
      // On log le détail mais on reste prudent côté message public (pas de PII).
      const text = await res.text().catch(() => "");
      console.error("[newsletter] Beehiiv error", {
        status: res.status,
        body: text.slice(0, 500),
      });
      return {
        ok: false,
        error: "Inscription impossible — réessaie dans un instant.",
        status: res.status,
      };
    }

    const json = (await res.json()) as {
      data?: { id?: string; email?: string; status?: string };
    };

    return {
      ok: true,
      mocked: false,
      subscriberId: json.data?.id ?? "unknown",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[newsletter] Beehiiv fetch failed", { message });
    return {
      ok: false,
      error: "Service temporairement indisponible. Réessaie dans un instant.",
    };
  }
}

/**
 * Validation email côté serveur.
 * - RFC 5322 simplifiée (pragmatique, pas full RFC qui a des cas pourris).
 * - Refuse les espaces, exige un point dans le domaine, max 254 chars.
 * - On NE vérifie pas la résolution MX (laisse Beehiiv gérer + ralentit).
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  // Regex pragmatique : local@domain.tld
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}
