/**
 * Partnership / contact form handling — server actions partagées par
 * /ambassadeurs, /sponsoring et /contact.
 *
 * Pattern :
 *  - Validation Zod-like maison (zéro dépendance, on garde le bundle léger).
 *  - Email envoyé via `lib/email.ts` (Resend ou mock si pas de credentials).
 *  - Pas de stockage côté Cryptoreflex : RGPD by design (les leads
 *    arrivent uniquement dans la boîte du destinataire, pas dans une DB).
 *  - Rate-limit best-effort par IP : on s'appuie sur l'IP du middleware
 *    Next.js (dispo dans les Server Actions via headers()).
 *
 * Pourquoi pas un endpoint REST ?
 *  - Server Actions = progressive enhancement (le form fonctionne sans JS
 *    si on lui passe `action` directement) et zéro fetch côté client.
 *  - Plus simple à instrumenter (analytics côté client → action serveur).
 */
"use server";

import { headers } from "next/headers";
import { sendEmail } from "@/lib/email";
import { isValidEmail } from "@/lib/newsletter";
import { createRateLimiter } from "@/lib/rate-limit";
import { BRAND } from "@/lib/brand";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type FormResult =
  | { ok: true; mocked: boolean }
  | { ok: false; error: string };

/* -------------------------------------------------------------------------- */
/*  Rate limiters dédiés (10 req/min/IP par formulaire)                       */
/* -------------------------------------------------------------------------- */

const ambassadeurLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60_000,
  key: "ambassadeur-form",
});
const sponsoringLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60_000,
  key: "sponsoring-form",
});
const contactLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60_000,
  key: "contact-form",
});

/** Récupère l'IP cliente depuis les headers de la requête (server action). */
function getActionIp(): string {
  const h = headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** Échappe les caractères HTML dans un input user pour insertion en HTML email. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Tronque + nettoie un input texte pour éviter les abus (DDoS via long strings). */
function clean(input: unknown, maxLen = 2000): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLen);
}

/* -------------------------------------------------------------------------- */
/*  1. Programme ambassadeurs                                                 */
/* -------------------------------------------------------------------------- */

export async function submitAmbassadeur(
  formData: FormData
): Promise<FormResult> {
  const ip = getActionIp();
  const rl = await ambassadeurLimiter(ip);
  if (!rl.ok) {
    return { ok: false, error: "Trop de tentatives. Réessaie dans une minute." };
  }

  const email = clean(formData.get("email"), 200);
  const name = clean(formData.get("name"), 120);
  const profileUrl = clean(formData.get("profileUrl"), 500);
  const channel = clean(formData.get("channel"), 80);
  const audience = clean(formData.get("audience"), 200);
  const message = clean(formData.get("message"), 2000);
  const consent = formData.get("consent") === "on";

  if (!email || !isValidEmail(email)) {
    return { ok: false, error: "Email invalide." };
  }
  if (!name) return { ok: false, error: "Le nom est obligatoire." };
  if (!profileUrl) {
    return { ok: false, error: "Indique le lien vers ton profil ou ta chaîne." };
  }
  if (!consent) {
    return {
      ok: false,
      error: "Tu dois accepter le traitement de tes données pour soumettre.",
    };
  }

  const html = `
    <h2>Nouvelle candidature ambassadeur</h2>
    <ul>
      <li><strong>Nom :</strong> ${escapeHtml(name)}</li>
      <li><strong>Email :</strong> ${escapeHtml(email)}</li>
      <li><strong>Profil :</strong> <a href="${escapeHtml(profileUrl)}">${escapeHtml(profileUrl)}</a></li>
      <li><strong>Canal principal :</strong> ${escapeHtml(channel || "non renseigné")}</li>
      <li><strong>Audience :</strong> ${escapeHtml(audience || "non renseignée")}</li>
    </ul>
    <h3>Message</h3>
    <p>${escapeHtml(message || "(aucun message)").replace(/\n/g, "<br>")}</p>
    <hr>
    <p style="color:#888;font-size:12px">
      IP : ${escapeHtml(ip)}<br>
      Soumis depuis : /ambassadeurs<br>
      Source : ${BRAND.url}/ambassadeurs
    </p>
  `;

  const result = await sendEmail({
    to: BRAND.partnersEmail,
    subject: `[Ambassadeurs] Candidature de ${name}`,
    html,
    tag: "ambassadeur",
    replyTo: email,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, mocked: "mocked" in result ? result.mocked : false };
}

/* -------------------------------------------------------------------------- */
/*  2. Sponsoring                                                             */
/* -------------------------------------------------------------------------- */

export async function submitSponsoring(formData: FormData): Promise<FormResult> {
  const ip = getActionIp();
  const rl = await sponsoringLimiter(ip);
  if (!rl.ok) {
    return { ok: false, error: "Trop de tentatives. Réessaie dans une minute." };
  }

  const email = clean(formData.get("email"), 200);
  const company = clean(formData.get("company"), 120);
  const contact = clean(formData.get("contact"), 120);
  const offer = clean(formData.get("offer"), 80);
  const budget = clean(formData.get("budget"), 80);
  const message = clean(formData.get("message"), 2000);
  const consent = formData.get("consent") === "on";

  if (!email || !isValidEmail(email)) {
    return { ok: false, error: "Email invalide." };
  }
  if (!company) {
    return { ok: false, error: "Indique le nom de la marque/société." };
  }
  if (!consent) {
    return {
      ok: false,
      error: "Tu dois accepter le traitement de tes données pour soumettre.",
    };
  }

  const html = `
    <h2>Nouvelle demande de sponsoring</h2>
    <ul>
      <li><strong>Société :</strong> ${escapeHtml(company)}</li>
      <li><strong>Contact :</strong> ${escapeHtml(contact || "non renseigné")}</li>
      <li><strong>Email :</strong> ${escapeHtml(email)}</li>
      <li><strong>Offre demandée :</strong> ${escapeHtml(offer || "non précisée")}</li>
      <li><strong>Budget indicatif :</strong> ${escapeHtml(budget || "non précisé")}</li>
    </ul>
    <h3>Brief</h3>
    <p>${escapeHtml(message || "(aucun brief)").replace(/\n/g, "<br>")}</p>
    <hr>
    <p style="color:#888;font-size:12px">
      IP : ${escapeHtml(ip)}<br>
      Soumis depuis : /sponsoring
    </p>
  `;

  const result = await sendEmail({
    to: BRAND.partnersEmail,
    subject: `[Sponsoring] Demande de ${company}`,
    html,
    tag: "sponsoring",
    replyTo: email,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, mocked: "mocked" in result ? result.mocked : false };
}

/* -------------------------------------------------------------------------- */
/*  3. Contact général (dispatch selon type de demande)                       */
/* -------------------------------------------------------------------------- */

const CONTACT_TYPE_TO_EMAIL: Record<string, string> = {
  general: BRAND.email,
  partenariats: BRAND.partnersEmail,
  presse: "presse@cryptoreflex.fr",
};

export async function submitContact(formData: FormData): Promise<FormResult> {
  const ip = getActionIp();
  const rl = await contactLimiter(ip);
  if (!rl.ok) {
    return { ok: false, error: "Trop de tentatives. Réessaie dans une minute." };
  }

  const email = clean(formData.get("email"), 200);
  const name = clean(formData.get("name"), 120);
  const subject = clean(formData.get("subject"), 200);
  const message = clean(formData.get("message"), 4000);
  const typeRaw = clean(formData.get("type"), 32);
  const consent = formData.get("consent") === "on";

  const type = typeRaw in CONTACT_TYPE_TO_EMAIL ? typeRaw : "general";
  const recipient = CONTACT_TYPE_TO_EMAIL[type];

  if (!email || !isValidEmail(email)) {
    return { ok: false, error: "Email invalide." };
  }
  if (!message) {
    return { ok: false, error: "Le message est obligatoire." };
  }
  if (!consent) {
    return {
      ok: false,
      error: "Tu dois accepter le traitement de tes données pour soumettre.",
    };
  }

  const labelMap: Record<string, string> = {
    general: "Question générale",
    partenariats: "Partenariats",
    presse: "Presse",
  };

  const html = `
    <h2>Nouveau message contact (${escapeHtml(labelMap[type] ?? "Autre")})</h2>
    <ul>
      <li><strong>Nom :</strong> ${escapeHtml(name || "non renseigné")}</li>
      <li><strong>Email :</strong> ${escapeHtml(email)}</li>
      <li><strong>Sujet :</strong> ${escapeHtml(subject || "(sans sujet)")}</li>
    </ul>
    <h3>Message</h3>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
    <hr>
    <p style="color:#888;font-size:12px">
      IP : ${escapeHtml(ip)}<br>
      Type : ${escapeHtml(type)}<br>
      Soumis depuis : /contact
    </p>
  `;

  const result = await sendEmail({
    to: recipient,
    subject: `[${labelMap[type]}] ${subject || "Nouveau message"}`,
    html,
    tag: "contact",
    replyTo: email,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, mocked: "mocked" in result ? result.mocked : false };
}
