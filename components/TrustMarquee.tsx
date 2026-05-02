/**
 * TrustMarquee — BATCH 41b (audit Motion Expert).
 *
 * Bandeau régulateurs/sources qui défilent en marquee infini lent (40s).
 * Référence : Stripe Press logos strip, Vercel "trusted by" customers.
 *
 * À insérer entre Hero et ReassuranceSection pour combler la "zone morte"
 * narrative (signal "ces 8 sources nous surveillent en continu").
 *
 * Pause au hover/focus pour permettre au lecteur de fixer un nom.
 * Composant Server (pas de state, pas d'interactivité) — tout en CSS.
 */

const TRUST_ITEMS = [
  "AMF",
  "ESMA",
  "MiCA",
  "TRACFIN",
  "BOFIP",
  "DGCCRF",
  "CoinGecko",
  "ESMA Register",
  "Trustpilot",
  "BOFIP RPPM",
] as const;

export default function TrustMarquee() {
  // Doublé pour boucle infinie sans saut visible.
  const items = [...TRUST_ITEMS, ...TRUST_ITEMS];
  return (
    <div
      className="marquee-trust"
      aria-label="Régulateurs et sources surveillés en continu"
      role="region"
    >
      {/* Edge fades — signal visuel "il y a plus de contenu", pattern Apple Music */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-12 z-10"
        style={{ background: "linear-gradient(to right, var(--background, #0B0D10), transparent)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-12 z-10"
        style={{ background: "linear-gradient(to left, var(--background, #0B0D10), transparent)" }}
      />
      <div className="marquee-trust-track" aria-hidden="true">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center font-mono text-xs uppercase tracking-[0.18em] text-muted/60 hover:text-primary-soft transition-colors shrink-0"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
