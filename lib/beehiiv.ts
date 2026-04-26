/**
 * lib/beehiiv.ts — Helpers Beehiiv API V2 (segmentation et custom fields).
 *
 * Ce module COMPLÈTE `lib/newsletter.ts` (qui gère l'inscription POST initiale).
 * Il ajoute les opérations en lecture / mise à jour utilisées par les crons :
 *   - getSubscribersBySource(source) : liste les abonnés filtrés par UTM source
 *   - updateSubscriberCustomField(email, fieldName, value) : MAJ d'un custom field
 *
 * Pourquoi un fichier dédié plutôt qu'étendre `newsletter.ts` ?
 *  - Sépare l'inscription (POST public, hot path) de l'admin (lecture/MAJ, cron).
 *  - Permet de désactiver / mocker indépendamment ces helpers en dev.
 *  - Facilite le tree-shaking : les routes API qui font juste subscribe ne
 *    chargent pas le code de listing/MAJ.
 *
 * Mode mock (cohérent avec `newsletter.ts`) :
 *  - Si BEEHIIV_API_KEY ou BEEHIIV_PUBLICATION_ID manquent, on log et on
 *    retourne des structures vides / no-op pour ne JAMAIS casser un cron.
 *
 * Doc API V2 : https://developers.beehiiv.com/docs/v2/
 *   - GET /publications/{id}/subscriptions (list, filter par tag, paginé)
 *   - PATCH /publications/{id}/subscriptions/{subId} (update custom_fields)
 */

const BEEHIIV_BASE = "https://api.beehiiv.com/v2";

/** Limite par page côté Beehiiv (max 100 selon doc API V2). */
const PAGE_LIMIT = 100;

/** Timeout dur des requêtes admin (cron tolère 8 s, pas plus). */
const REQUEST_TIMEOUT_MS = 8000;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Custom field tel qu'exposé par l'API Beehiiv. */
export interface BeehiivCustomField {
  name: string;
  value: string | number | boolean | null;
}

/** Représentation minimale d'un abonné, telle qu'utilisée par les crons. */
export interface BeehiivSubscriber {
  /** ID Beehiiv interne (sub_xxx). */
  id: string;
  /** Email (toujours en minuscules normalisées). */
  email: string;
  /** "active" | "validating" | "inactive" | "pending" — on garde un simple string. */
  status: string;
  /** Timestamp d'inscription (epoch seconds Beehiiv). */
  createdAt: number;
  /** UTM source enregistré à l'inscription. */
  utmSource: string | null;
  /** UTM campaign enregistré à l'inscription (= source applicative). */
  utmCampaign: string | null;
  /** Custom fields (peut contenir flags d'envoi de la séquence fiscalité). */
  customFields: BeehiivCustomField[];
}

/* -------------------------------------------------------------------------- */
/*  Helpers privés                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Renvoie les credentials Beehiiv si configurés, sinon null.
 * Centralise le check pour éviter la duplication dans chaque helper.
 */
function getCreds(): { apiKey: string; pubId: string } | null {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !pubId) return null;
  return { apiKey, pubId };
}

/**
 * Normalise la réponse API Beehiiv en `BeehiivSubscriber`.
 * Tolère les champs manquants (Beehiiv peut omettre custom_fields/utm si vides).
 */
function normalize(raw: unknown): BeehiivSubscriber | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.email !== "string") return null;

  const fields = Array.isArray(r.custom_fields)
    ? (r.custom_fields as Array<Record<string, unknown>>).map((f) => ({
        name: String(f.name ?? ""),
        value: (f.value ?? null) as BeehiivCustomField["value"],
      }))
    : [];

  return {
    id: r.id,
    email: r.email.toLowerCase(),
    status: typeof r.status === "string" ? r.status : "unknown",
    createdAt:
      typeof r.created === "number"
        ? r.created
        : typeof r.subscribed_at === "number"
        ? r.subscribed_at
        : 0,
    utmSource: typeof r.utm_source === "string" ? r.utm_source : null,
    utmCampaign: typeof r.utm_campaign === "string" ? r.utm_campaign : null,
    customFields: fields,
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers publics                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Liste tous les abonnés ayant une UTM source ou campaign correspondant à `source`.
 *
 * Implémentation : pagine `/subscriptions` (max 100/page) jusqu'à épuisement.
 * Filtre côté client par `utm_source === source || utm_campaign === source` car
 * l'API Beehiiv V2 ne propose pas (encore) un filtre `utm_*` natif fiable.
 *
 * Hardening :
 *  - Limite hard à 50 pages (5 000 abonnés) pour éviter de bloquer un cron.
 *    À revoir quand on dépassera cette volumétrie sur la séquence fiscalité.
 *  - Retourne `[]` (pas `null`) en mode mock — le caller boucle sans crasher.
 *
 * @param source — valeur attendue pour `utm_source` OU `utm_campaign`
 *                 (ex: "calculateur-fiscalite-pdf").
 */
export async function getSubscribersBySource(
  source: string,
): Promise<BeehiivSubscriber[]> {
  const creds = getCreds();
  if (!creds) {
    console.info(
      "[beehiiv] mode mock — getSubscribersBySource() retourne [] (credentials absents).",
    );
    return [];
  }

  const all: BeehiivSubscriber[] = [];
  let page = 1;
  const maxPages = 50;

  while (page <= maxPages) {
    const url =
      BEEHIIV_BASE +
      "/publications/" +
      encodeURIComponent(creds.pubId) +
      "/subscriptions?limit=" +
      PAGE_LIMIT +
      "&page=" +
      page +
      "&expand[]=custom_fields";

    let json: { data?: unknown[]; total_results?: number } = {};
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + creds.apiKey,
          accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[beehiiv] list page error", {
          status: res.status,
          page,
          body: body.slice(0, 300),
        });
        break;
      }
      json = (await res.json()) as { data?: unknown[]; total_results?: number };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.error("[beehiiv] list fetch failed", { page, message: msg });
      break;
    }

    const items = Array.isArray(json.data) ? json.data : [];
    if (items.length === 0) break;

    for (const raw of items) {
      const sub = normalize(raw);
      if (!sub) continue;
      // Filtre par utm_source ou utm_campaign (selon ce qu'a stocké Beehiiv).
      if (sub.utmSource === source || sub.utmCampaign === source) {
        all.push(sub);
      }
    }

    // Si moins que la page complète, on est à la fin.
    if (items.length < PAGE_LIMIT) break;
    page++;
  }

  return all;
}

/**
 * Met à jour (ou crée) un custom field pour un abonné identifié par email.
 *
 * Beehiiv API : il faut d'abord récupérer le `subscription_id` à partir de
 * l'email (GET ?email=…), puis PATCH avec le custom_fields[]. On fait les deux
 * appels ici pour offrir une signature simple côté caller.
 *
 * Retourne `true` si MAJ effective, `false` si abonné introuvable / mock /
 * erreur réseau. Les crons doivent traiter `false` comme "n'a pas envoyé l'email"
 * et retenter au prochain run.
 *
 * @param email — adresse email de l'abonné (case-insensitive)
 * @param fieldName — nom du custom field (ex: "fiscalite_j0_sent")
 * @param value — valeur (string, number, boolean) — sera sérialisée par Beehiiv
 */
export async function updateSubscriberCustomField(
  email: string,
  fieldName: string,
  value: string | number | boolean,
): Promise<boolean> {
  const creds = getCreds();
  if (!creds) {
    console.info("[beehiiv] mode mock — updateSubscriberCustomField() no-op", {
      email,
      fieldName,
      value,
    });
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1) Récupère le subscription_id via filtre par email
  let subId: string | null = null;
  try {
    const lookupUrl =
      BEEHIIV_BASE +
      "/publications/" +
      encodeURIComponent(creds.pubId) +
      "/subscriptions?email=" +
      encodeURIComponent(normalizedEmail);
    const res = await fetch(lookupUrl, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + creds.apiKey,
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("[beehiiv] lookup error", { status: res.status, email: normalizedEmail });
      return false;
    }
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    subId = json.data?.[0]?.id ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[beehiiv] lookup fetch failed", { email: normalizedEmail, message: msg });
    return false;
  }

  if (!subId) {
    console.warn("[beehiiv] subscriber not found", { email: normalizedEmail });
    return false;
  }

  // 2) PATCH le custom field
  try {
    const patchUrl =
      BEEHIIV_BASE +
      "/publications/" +
      encodeURIComponent(creds.pubId) +
      "/subscriptions/" +
      encodeURIComponent(subId);
    const res = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + creds.apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        custom_fields: [{ name: fieldName, value: String(value) }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[beehiiv] patch error", {
        status: res.status,
        email: normalizedEmail,
        body: body.slice(0, 300),
      });
      return false;
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[beehiiv] patch fetch failed", { email: normalizedEmail, message: msg });
    return false;
  }
}

/**
 * Désinscrit un email de la newsletter Beehiiv (status=inactive).
 *
 * RGPD : cet endpoint sert le droit de retrait (art. 21 RGPD). Il est appelé
 * depuis `/api/newsletter/unsubscribe` après vérification d'un token HMAC.
 *
 * Implémentation :
 *  1. Lookup du subscription_id via `?email=`
 *  2. PUT (Beehiiv documente PUT en V2 pour status update) sur l'endpoint
 *     /subscriptions/{subId} avec body { status: "inactive" }
 *
 * Mode mock (BEEHIIV_API_KEY absente) : retourne `{ ok: true }` pour ne pas
 * bloquer les tests locaux. Le caller affichera quand même la confirmation
 * utilisateur (pas de leak si l'email n'existait pas → security through
 * obscurity, on confirme toujours pour ne pas permettre l'enumération).
 *
 * @param email — adresse à désinscrire (case-insensitive)
 * @returns `{ ok: true }` si succès ou mode mock, `{ ok: false }` sinon
 */
export async function unsubscribeFromBeehiiv(email: string): Promise<{ ok: boolean }> {
  const creds = getCreds();
  if (!creds) {
    console.info("[beehiiv] mode mock — unsubscribeFromBeehiiv() no-op", { email });
    return { ok: true };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) return { ok: false };

  // 1) Lookup subscription_id
  let subId: string | null = null;
  try {
    const lookupUrl =
      BEEHIIV_BASE +
      "/publications/" +
      encodeURIComponent(creds.pubId) +
      "/subscriptions?email=" +
      encodeURIComponent(normalizedEmail);
    const res = await fetch(lookupUrl, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + creds.apiKey,
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("[beehiiv] unsubscribe lookup error", {
        status: res.status,
        email: normalizedEmail,
      });
      return { ok: false };
    }
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    subId = json.data?.[0]?.id ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[beehiiv] unsubscribe lookup fetch failed", {
      email: normalizedEmail,
      message: msg,
    });
    return { ok: false };
  }

  if (!subId) {
    // Email pas trouvé → on retourne ok pour ne pas leaker (anti-enumeration).
    // Côté UX c'est une confirmation : "vous êtes bien désinscrit".
    console.info("[beehiiv] unsubscribe — subscriber not found (anti-enum, returning ok)", {
      email: normalizedEmail,
    });
    return { ok: true };
  }

  // 2) PUT status=inactive
  try {
    const putUrl =
      BEEHIIV_BASE +
      "/publications/" +
      encodeURIComponent(creds.pubId) +
      "/subscriptions/" +
      encodeURIComponent(subId);
    const res = await fetch(putUrl, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + creds.apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ status: "inactive" }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[beehiiv] unsubscribe PUT error", {
        status: res.status,
        email: normalizedEmail,
        body: body.slice(0, 300),
      });
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[beehiiv] unsubscribe PUT fetch failed", {
      email: normalizedEmail,
      message: msg,
    });
    return { ok: false };
  }
}

/**
 * Vérifie si un email est un abonné actif.
 * Utilisé par /api/lead-magnet/[id] pour gater les téléchargements.
 *
 * En mode mock : retourne `true` (on ne casse pas les téléchargements en dev).
 * En prod : appelle `?email=` puis vérifie `status === "active"`.
 */
export async function isActiveSubscriber(email: string): Promise<boolean> {
  const creds = getCreds();
  if (!creds) {
    // Permissif en dev / fallback : autorise le téléchargement plutôt que de bloquer.
    return true;
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) return false;

  try {
    const url =
      BEEHIIV_BASE +
      "/publications/" +
      encodeURIComponent(creds.pubId) +
      "/subscriptions?email=" +
      encodeURIComponent(normalizedEmail);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + creds.apiKey,
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { data?: Array<{ status?: string }> };
    const sub = json.data?.[0];
    return sub?.status === "active" || sub?.status === "validating";
  } catch {
    return false;
  }
}
