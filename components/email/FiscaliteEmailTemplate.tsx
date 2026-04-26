/**
 * components/email/FiscaliteEmailTemplate.tsx
 * ------------------------------------------------------------------
 * Template React rendant le HTML d'un email de la séquence fiscalité.
 *
 * Pourquoi un composant React plutôt que de cracher la string directement ?
 *  - Permet la composition (header / footer réutilisables) sans concat manuelle.
 *  - Facilite le test visuel via React Email preview / Storybook.
 *  - Sera utilisé par `lib/email-renderer.ts` qui appelle renderToStaticMarkup
 *    pour produire le HTML final injecté dans Resend.
 *
 * Contraintes "email HTML" respectées :
 *  - Inline styles uniquement (pas de classes CSS — Outlook desktop ignore).
 *  - <table role="presentation"> pour le layout (flexbox cassé sur Outlook).
 *  - max-width 600px, dark theme + gold accent (charte Cryptoreflex).
 *  - Pas de JS / pas de <style> dans <head>.
 *  - Lang fr partout.
 *
 * Note : ce composant render le HTML produit par les emails de
 * `fiscalite-crypto-series.ts` — celui-ci contient déjà le wrap complet (header
 * + body + CTA + footer). Le composant sert d'enveloppe DOM pour permettre
 * `renderToStaticMarkup` et garder la porte ouverte à des emails futurs où on
 * passerait directement les blocks props (au lieu d'un HTML pré-construit).
 *
 * Pourquoi `dangerouslySetInnerHTML` ?
 *  - Le HTML body est déjà sanitizé / contrôlé côté `fiscalite-crypto-series.ts`
 *    (aucune entrée utilisateur — tous les CTA sont en dur). Le risque XSS est
 *    nul tant qu'on ne fait pas d'interpolation de données externes.
 *  - On évite les double-encodages lors du render React qui transformerait
 *    nos `&nbsp;` ou `&` en littéraux.
 */

import { EmailFooter } from "@/components/email/EmailFooter";
import type { EmailInSequence } from "@/lib/email-series/fiscalite-crypto-series";

export interface FiscaliteEmailTemplateProps {
  /** Email à rendre (sortie de FISCALITE_EMAIL_SERIES). */
  email: EmailInSequence;
  /** URL de désinscription Beehiiv (remplace le placeholder {{unsubscribe_url}}). */
  unsubscribeUrl?: string;
}

/**
 * Le template délègue au HTML déjà construit par `fiscalite-crypto-series.ts`.
 * On enveloppe dans une div pour produire un mount point React valide, puis
 * on remplace le placeholder Beehiiv `{{unsubscribe_url}}` côté renderer
 * (cf. `lib/email-renderer.ts`) avant l'envoi par Resend.
 *
 * Le `EmailFooter` est imprimé en commentaire HTML pour servir de doc des
 * mentions légales attendues — non rendu visuellement (le footer "live" est
 * déjà inclus dans le wrap HTML de l'email source).
 */
export default function FiscaliteEmailTemplate({
  email,
  unsubscribeUrl,
}: FiscaliteEmailTemplateProps) {
  // Si une URL de désinscription est passée, on la substitue au placeholder.
  const html = unsubscribeUrl
    ? email.htmlBody.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
    : email.htmlBody;

  return (
    <div data-email-id={email.id} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/**
 * Variante "preview" pour Storybook / page admin : ajoute un header de debug.
 * Non utilisée en production (uniquement utilitaire dev).
 */
export function FiscaliteEmailPreview({
  email,
}: {
  email: EmailInSequence;
}) {
  return (
    <div style={{ background: "#0B0D10", minHeight: "100vh", padding: 24 }}>
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto 16px auto",
          background: "#1F2937",
          color: "#F5A524",
          padding: 12,
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        <strong>Preview · {email.id}</strong> — J{email.dayOffset}
        <br />
        Subject : {email.subject}
        <br />
        Preheader : {email.preheader}
      </div>
      <FiscaliteEmailTemplate email={email} />
      {/*
        Footer fragment of reference — jamais rendu en email réel,
        utile en preview pour vérifier que la mention RGPD est cohérente.
      */}
      <div style={{ display: "none" }}>
        <EmailFooter email="preview@cryptoreflex.fr" unsubscribeUrl="#" />
      </div>
    </div>
  );
}
