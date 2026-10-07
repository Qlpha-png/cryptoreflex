/**
 * <EmbedFooter /> — attribution dofollow obligatoire dans chaque widget.
 *
 * Affiché en bas de chaque page /embed/* — pousse 2 signaux :
 *  - Backlink dofollow vers /outils/<slug> (CC-BY clause d'attribution).
 *  - Disclaimer YMYL "Pas un conseil d'investissement" (le widget peut
 *    être affiché en isolation par un site tiers, donc le disclaimer
 *    voyage avec lui).
 *
 * `target="_top"` : si l'utilisateur clique le lien depuis un iframe,
 * on ouvre cryptoreflex.fr dans la fenêtre principale, pas dans l'iframe.
 */

import { ExternalLink, AlertTriangle } from "lucide-react";
import { BRAND } from "@/lib/brand";

interface EmbedFooterProps {
  /** Slug du widget pour pointer vers la version normale. */
  toolSlug: string;
  /** YMYL court — "Pas un conseil d'investissement". Défaut : true. */
  ymyl?: boolean;
}

export default function EmbedFooter({
  toolSlug,
  ymyl = true,
}: EmbedFooterProps) {
  return (
    <footer
      style={{
        marginTop: 16,
        paddingTop: 12,
        borderTop: "1px solid rgb(var(--c-border))",
        fontSize: 11,
        color: "rgb(var(--c-fg-4))",
        fontFamily: '"Cryptoreflex NNBSP", var(--font-sans), Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {ymyl && (
        <p
          style={{
            margin: "0 0 8px",
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            color: "rgb(var(--c-warning-fg))",
            lineHeight: 1.4,
          }}
        >
          <AlertTriangle size={12} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            Outil pédagogique — ne constitue pas un conseil en investissement
            ni un conseil fiscal. Consultez un professionnel pour votre situation.
          </span>
        </p>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span>Licence CC-BY 4.0</span>
        <a
          href={`${BRAND.url}/outils/${toolSlug}?utm_source=embed&utm_medium=iframe&utm_campaign=${toolSlug}`}
          target="_top"
          rel="noopener"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "rgb(var(--c-primary))",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Proposé par{" "}
          <strong style={{ color: "rgb(var(--c-primary-soft))" }}>{BRAND.name}</strong>
          <ExternalLink size={11} />
        </a>
      </div>
    </footer>
  );
}
