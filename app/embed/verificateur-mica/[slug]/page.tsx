import type { Metadata } from "next";
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
      ? "rgba(34,197,94,.4)"
      : color === "amber"
      ? "rgba(245,165,36,.4)"
      : color === "red"
      ? "rgba(239,68,68,.4)"
      : "#262B33";

  const badgeStyle = (() => {
    switch (color) {
      case "green":
        return { color: "#22C55E", background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.4)" };
      case "amber":
        return { color: "#FCD34D", background: "rgba(245,165,36,.1)", border: "1px solid rgba(245,165,36,.4)" };
      case "red":
        return { color: "#EF4444", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.4)" };
      default:
        return { color: "#9BA3AF", background: "rgba(31,36,44,.6)", border: "1px solid #262B33" };
    }
  })();

  return (
    <article
      style={{
        background: "#16191F",
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        padding: 18,
        color: "#F4F5F7",
        boxShadow: "0 8px 24px -8px rgba(0,0,0,.4)",
        maxWidth: 640,
        margin: "0 auto",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
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
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#FFF" }}>
            {platform.name}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9BA3AF" }}>
            {platform.headquarters}
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontSize: 11,
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
          borderTop: "1px solid #262B33",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 11,
          color: "#9BA3AF",
          flexWrap: "wrap",
        }}
      >
        <span>
          Vérifié{" "}
          <time dateTime={platform.lastVerified}>
            {formatMicaDate(platform.lastVerified)}
          </time>
        </span>
        <a
          href={`${BRAND.url}/outils/verificateur-mica?p=${platform.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "#FCD34D",
            textDecoration: "none",
          }}
        >
          Powered by{" "}
          <strong style={{ color: "#F5A524" }}>Cryptoreflex</strong>
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
      ? "#EF4444"
      : highlight === "green"
      ? "#22C55E"
      : "#F4F5F7";
  return (
    <div
      style={{
        background: "rgba(31,36,44,.4)",
        border: "1px solid #262B33",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <dt
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#9BA3AF",
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
          fontSize: 13,
          fontWeight: highlight ? 700 : 500,
          color: valueColor,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
