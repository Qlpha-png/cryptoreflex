import type { Metadata } from "next";
import VerifieLe from "@/components/ui/VerifieLe";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  formatMicaDate,
  getAllMicaPlatforms,
  getMicaPlatformById,
  getPsanLabel,
  getStatusColor,
  getStatusLabel,
} from "@/lib/mica";
import { BRAND } from "@/lib/brand";

interface Params {
  params: { slug: string };
}

/** Pré-génère une page statique pour chaque plateforme (SSG). */
export function generateStaticParams() {
  return getAllMicaPlatforms().map((p) => ({ slug: p.id }));
}

export function generateMetadata({ params }: Params): Metadata {
  const platform = getMicaPlatformById(params.slug);
  if (!platform) return { title: "Statut MiCA" };
  return {
    title: `Statut MiCA — ${platform.name}`,
    description: `${platform.name} : statut PSAN AMF et agrément MiCA, vérifié par ${BRAND.name}.`,
    robots: { index: false, follow: true },
  };
}

export default function EmbedPage({ params }: Params) {
  const platform = getMicaPlatformById(params.slug);
  if (!platform) notFound();

  const color = getStatusColor(platform);
  const StatusIcon =
    color === "green"
      ? ShieldCheck
      : color === "red" || color === "amber"
      ? AlertTriangle
      : CheckCircle2;

  const borderColor =
    color === "green"
      ? "rgb(var(--c-success) / 0.4)"
      : color === "amber"
      ? "rgb(var(--c-primary) / 0.4)"
      : color === "red"
      ? "rgb(var(--c-danger) / 0.4)"
      : "rgb(var(--c-border))";

  const badgeStyle = (() => {
    switch (color) {
      case "green":
        return { color: "rgb(var(--c-success))", background: "rgb(var(--c-success) / 0.1)", border: "1px solid rgb(var(--c-success) / 0.4)" };
      case "amber":
        return { color: "rgb(var(--c-warning-fg))", background: "rgb(var(--c-primary) / 0.1)", border: "1px solid rgb(var(--c-primary) / 0.4)" };
      case "red":
        return { color: "rgb(var(--c-danger))", background: "rgb(var(--c-danger) / 0.1)", border: "1px solid rgb(var(--c-danger) / 0.4)" };
      default:
        return { color: "rgb(var(--c-fg-4))", background: "rgb(var(--c-elevated) / 0.6)", border: "1px solid rgb(var(--c-border))" };
    }
  })();

  return (
    <article
      style={{
        background: "rgb(var(--c-surface))",
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        padding: 18,
        color: "rgb(var(--c-fg))",
        boxShadow: "0 8px 24px -8px rgb(var(--c-scrim) / 0.4)",
        maxWidth: 640,
        margin: "0 auto",
        fontFamily: '"Cryptoreflex NNBSP", var(--font-sans), Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: 14,
        lineHeight: 1.4,
        boxSizing: "border-box",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "rgb(var(--c-fg-max))" }}>
            {platform.name}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "rgb(var(--c-fg-4))" }}>
            {platform.headquarters}
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 999,
            whiteSpace: "nowrap",
            ...badgeStyle,
          }}
        >
          <StatusIcon size={14} />
          {getStatusLabel(platform)}
        </span>
      </header>

      <dl
        style={{
          margin: "16px 0 0",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          gap: 8,
        }}
      >
        <FieldBox label="PSAN" value={getPsanLabel(platform)} />
        <FieldBox
          label="Juridiction MiCA"
          value={platform.micaJurisdiction ?? "—"}
        />
        <FieldBox
          label="Date"
          value={formatMicaDate(
            platform.micaAuthorizationDate ?? platform.registrationDate
          )}
        />
        <FieldBox
          label="Risque juillet 2026"
          value={platform.atRiskJuly2026 ? "OUI" : "NON"}
          highlight={platform.atRiskJuly2026 ? "red" : "green"}
        />
      </dl>

      <footer
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgb(var(--c-border))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 14,
          color: "rgb(var(--c-fg-4))",
          flexWrap: "wrap",
        }}
      >
        <span>
          <VerifieLe date={platform.lastVerified} famille="mica" label="Vérifié" inconnue="Date de vérification inconnue" />
        </span>
        <a
          href={`${BRAND.url}/outils/verificateur-mica?p=${platform.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "rgb(var(--c-link))",
            textDecoration: "none",
          }}
        >
          Proposé par{" "}
          <strong style={{ color: "rgb(var(--c-primary))" }}>Cryptoreflex</strong>
          <ExternalLink size={12} />
        </a>
      </footer>
    </article>
  );
}

function FieldBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "red" | "green";
}) {
  const valueColor =
    highlight === "red"
      ? "rgb(var(--c-danger))"
      : highlight === "green"
      ? "rgb(var(--c-success))"
      : "rgb(var(--c-fg))";
  return (
    <div
      style={{
        background: "rgb(var(--c-elevated) / 0.4)",
        border: "1px solid rgb(var(--c-border))",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <dt
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "rgb(var(--c-fg-4))",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          margin: 0,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          margin: "4px 0 0",
          fontSize: 14,
          fontWeight: highlight ? 700 : 500,
          color: valueColor,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
