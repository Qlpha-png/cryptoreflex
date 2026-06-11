/**
 * components/email/EmailFooter.tsx
 * ------------------------------------------------------------------
 * Footer commun à tous les emails Cryptoreflex.
 *
 * Mentions légales obligatoires :
 *  - Raison de l'envoi (RGPD : transparence sur l'origine du consentement).
 *  - Lien désinscription one-click (Beehiiv {{unsubscribe_url}} ou réel URL).
 *  - Identité de l'éditeur + SIRET (mentions légales art. 6 LCEN).
 *  - Lien vers la politique de confidentialité.
 *
 * Style : inline pour compat clients email (Outlook desktop, GMail, Apple Mail).
 *
 * Note : ce composant est principalement utilisé par les emails RENDUS via
 * React (via lib/email-renderer.ts). La séquence fiscalité actuelle inclut
 * déjà un footer équivalent dans son HTML brut (fiscalite-crypto-series.ts)
 * pour éviter une double inclusion. À utiliser pour les futurs templates qui
 * partiraient d'une composition React pure.
 */

import { BRAND } from "@/lib/brand";

export interface EmailFooterProps {
  /** Email du destinataire (affiché pour rappel de l'inscription). */
  email: string;
  /** URL de désinscription one-click (Beehiiv ou interne). */
  unsubscribeUrl: string;
  /** Texte de raison personnalisable (par défaut : générique newsletter). */
  reason?: string;
}

const FOOTER_STYLES = {
  table: {
    width: "100%",
    marginTop: "24px",
    borderTop: "1px solid #374151",
    paddingTop: "16px",
  } as const,
  cell: {
    fontFamily: "Arial, sans-serif",
    fontSize: "11px",
    lineHeight: "1.6",
    color: "#9CA3AF",
    textAlign: "center" as const,
  } as const,
  link: {
    color: "#F5A524",
    textDecoration: "underline",
  } as const,
};

export function EmailFooter({
  email,
  unsubscribeUrl,
  reason = "Vous recevez cet email car vous êtes abonné·e à la newsletter Cryptoreflex.",
}: EmailFooterProps) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={FOOTER_STYLES.table}
    >
      <tbody>
        <tr>
          <td style={FOOTER_STYLES.cell}>
            {reason}
            <br />
            Adresse d'inscription : {email}
            <br />
            Cryptoreflex — Édition indépendante française — SIRET 103 352 621
            <br />
            <a href={unsubscribeUrl} style={FOOTER_STYLES.link}>
              Se désinscrire en 1 clic
            </a>
            {" · "}
            <a
              href={BRAND.url + "/confidentialite"}
              style={FOOTER_STYLES.link}
            >
              Confidentialité (RGPD)
            </a>
            {" · "}
            <a
              href={BRAND.url + "/mentions-legales"}
              style={FOOTER_STYLES.link}
            >
              Mentions légales
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default EmailFooter;
