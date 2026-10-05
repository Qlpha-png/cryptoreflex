/**
 * Partnership / contact form handling — server actions partagées par
 * /sponsoring et /contact (programme ambassadeurs retiré le 05/10/2026 : il promettait 50 % de
 * commission alors que le site est entièrement gratuit).
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
import { sendEmail } from "@/lib/email/client";
import { isValidEmail } from "@/lib/newsletter";
import { createRateLimiter, createRecipientLimiter } from "@/lib/rate-limit";
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

/**
 * Accusés de réception envoyés à l'adresse SAISIE (donc potentiellement celle
 * d'un tiers) : 3 / adresse / 24 h (seul le formulaire sponsoring envoie un accusé).
 */
const confirmationRecipientLimiter = createRecipientLimiter({
  limit: 3,
  windowSec: 24 * 3600,
  key: "partnership-confirm",
});

/**
 * Récupère l'IP cliente depuis les headers de la requête (server action).
 * Même ordre de confiance que lib/ip.ts : `x-vercel-forwarded-for` (non
 * usurpable sur Vercel) d'abord.
 */
function getActionIp(): string {
  const h = headers();
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** Retire CR/LF (sujet d'email construit avec une saisie utilisateur). */
function oneLine(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
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

/**
 * Strip HTML → texte plain pour la version `text` requise par lib/email/client.
 * Migration 27/04 : la nouvelle signature impose `text` (anti-spam scoring Gmail).
 * Conversion best-effort : suffisant pour nos emails de notif interne.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6]|tr|br|hr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* -------------------------------------------------------------------------- */
/*  1. Sponsoring                                                             */
/* -------------------------------------------------------------------------- */

export async function submitSponsoring(formData: FormData): Promise<FormResult> {
  const ip = getActionIp();
  const rl = await sponsoringLimiter(ip);
  if (!rl.ok) {
    return { ok: false, error: "Trop de tentatives. Réessayez dans une minute." };
  }

  // Honeypot — bot guard sans alerter le bot qu'il s'est fait choper.
  if (clean(formData.get("website"), 50)) {
    return { ok: true, mocked: true };
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
      error: "Vous devez accepter le traitement de vos données pour soumettre.",
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
    subject: oneLine(`[Sponsoring] Demande de ${company}`),
    html,
    text: htmlToPlainText(html),
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Envoi email impossible." };

  // Confirmation au demandeur (best-effort).
  // AUDIT 2026-10-02 : texte FIXE — la société / l'offre / le budget saisis ne
  // sont plus recopiés (vecteur de phishing vers une adresse non vérifiée,
  // ex. société « crypto-bonus.com ») + plafond par destinataire.
  const rcpt = await confirmationRecipientLimiter(email);
  if (rcpt.ok) {
    const confirmHtml = `
      <h2>Merci pour votre intérêt</h2>
      <p>${BRAND.name} a bien reçu votre demande de sponsoring.</p>
      <p>Notre équipe partenariats te répond <strong>sous 48 h ouvrées</strong> depuis ${BRAND.partnersEmail} avec :
      un devis détaillé, un calendrier de publication, et la procédure de validation MiCA si l'offre concerne un PSAN.</p>
      <p style="color:#888;font-size:12px">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
      <hr>
      <p style="color:#888;font-size:12px">${BRAND.name} est un éditeur web indépendant — pas un PSAN ni un CIF.
      Tout contenu sponsorisé est explicitement signalé conformément à l'art. 222-15 du règlement général AMF
      et à la charte ARPP. ${BRAND.url}</p>
    `;
    await sendEmail({
      to: email,
      subject: `Votre demande de sponsoring ${BRAND.name} est en file de traitement`,
      html: confirmHtml,
      text: htmlToPlainText(confirmHtml),
    });
  }

  return { ok: true, mocked: false };
}

/* -------------------------------------------------------------------------- */
/*  2. Contact général (dispatch selon type de demande)                       */
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
    return { ok: false, error: "Trop de tentatives. Réessayez dans une minute." };
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
      error: "Vous devez accepter le traitement de vos données pour soumettre.",
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
    subject: oneLine(`[${labelMap[type]}] ${subject || "Nouveau message"}`),
    html,
    text: htmlToPlainText(html),
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Envoi email impossible." };
  return { ok: true, mocked: false };
}
