"use client";

import { avecTypoSync } from "@/components/ui/Typo";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import VerifieLe from "@/components/ui/VerifieLe";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Search,
  ShieldCheck,
  ShieldOff,
  XCircle,
} from "lucide-react";
import {
  formatMicaDate,
  getAllMicaPlatforms,
  getMicaMeta,
  getMicaStatusByName,
  getPsanLabel,
  getStatusBadgeClasses,
  getStatusColor,
  getStatusLabel,
  type PlatformMica,
} from "@/lib/mica";
import { BRAND } from "@/lib/brand";

interface Props {
  /** Optionnel : pré-sélectionner une plateforme (utilisé sur les pages détail). */
  initialPlatformId?: string;
}

function MicaVerifier({ initialPlatformId }: Props) {
  const allPlatforms = useMemo(() => getAllMicaPlatforms(), []);
  const meta = useMemo(() => getMicaMeta(), []);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState<PlatformMica | null>(() =>
    initialPlatformId
      ? allPlatforms.find((p) => p.id === initialPlatformId) ?? null
      : null
  );
  const [copied, setCopied] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLFormElement>(null);

  // Filtrage tolérant
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPlatforms.slice(0, 12);
    return allPlatforms
      .filter((p) => {
        const haystack = [p.name, p.id, p.websiteUrl, ...p.aliases]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [query, allPlatforms]);

  // Click outside pour fermer le menu
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleSelect(p: PlatformMica) {
    setSelected(p);
    setQuery(p.name);
    setOpen(false);
    setCopied(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (suggestions[highlight]) {
      handleSelect(suggestions[highlight]);
      return;
    }
    const found = getMicaStatusByName(query);
    if (found) handleSelect(found);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Combobox autocomplete */}
      <form onSubmit={handleSubmit} className="relative" ref={containerRef}>
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-fg-max/90 mb-2"
        >
          Nom de la plateforme ou URL
        </label>
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted pointer-events-none"
            aria-hidden
          />
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="Ex : Binance, coinbase.com, Kraken…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-border bg-elevated/70 backdrop-blur-xl pl-12 pr-32 py-4 text-fg-max placeholder:text-fg-4 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition"
          />
          <button
            type="submit"
            className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 text-sm"
          >
            Vérifier
          </button>
        </div>

        {open && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-2 w-full max-h-80 overflow-auto rounded-xl border border-border bg-surface shadow-card divide-y divide-border/60"
          >
            {suggestions.map((p, idx) => {
              const color = getStatusColor(p);
              return (
                <li
                  key={p.id}
                  role="option"
                  aria-selected={highlight === idx}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => handleSelect(p)}
                  className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition ${
                    highlight === idx ? "bg-elevated" : "hover:bg-elevated/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-semibold text-fg-max truncate">
                      {p.name}
                    </span>
                    <span className="text-xs text-muted truncate">
                      {p.headquarters}
                    </span>
                  </div>
                  <span
                    className={`badge shrink-0 ${getStatusBadgeClasses(color)}`}
                  >
                    {getStatusLabel(p)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {open && suggestions.length === 0 && query.trim() && (
          <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            Aucune plateforme trouvée pour « {query} ». Vérifiez l'orthographe ou
            essayez l'URL complète.
          </div>
        )}
      </form>

      {/* Card résultat */}
      {selected && (
        <ResultCard
          platform={selected}
          onCopyEmbed={() => setCopied(true)}
          copied={copied}
        />
      )}

      {/* Méthodologie collapsible */}
      <div className="glass rounded-2xl">
        <button
          type="button"
          onClick={() => setShowMethodology((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-5 py-4 text-left"
          aria-expanded={showMethodology}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-fg-max">
            <Info className="h-4 w-4 text-primary" />
            Méthodologie & sources
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted transition-transform ${
              showMethodology ? "rotate-180" : ""
            }`}
          />
        </button>
        {showMethodology && (
          <div className="border-t border-border px-5 py-4 text-sm text-fg-max/75 space-y-3">
            <p>
              Notre registre repose sur deux sources officielles : le registre
              intérimaire MiCA de l'ESMA (prestataires agréés, autorité, date
              d'agrément et pays couverts par passeport) et la liste blanche de
              l'AMF (numéros d'agrément des prestataires français).
            </p>
            <p>
              Depuis le 1er juillet 2026, fin de la période transitoire, seul un
              prestataire agréé MiCA, en France ou dans un autre pays de l'UE
              avec un passeport vers la France, peut servir des clients
              français. Une plateforme absente du registre est indiquée « non
              autorisée en France ».
            </p>
            <p className="text-xs text-muted">
              Sources :{" "}
              <a
                href={meta.officialSources.amf}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-soft hover:underline"
              >
                AMF
              </a>
              {" · "}
              <a
                href={meta.officialSources.esma}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-soft hover:underline"
              >
                ESMA
              </a>
              .
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        {/* 08/10/2026 (lot fraîcheur A) : plus de « mise à jour mensuelle » (aucun robot ne la tenait) */}
        <VerifieLe date={meta.lastUpdated} famille="mica" label="Fiches vérifiées" inconnue="Date de vérification inconnue" age={false} /> · Registre
        de l&apos;ESMA relu chaque nuit pour les plateformes de nos comparatifs
        {meta.amf ? (
          <>
            {" · "}
            <a href={meta.amf.url} target="_blank" rel="noopener noreferrer" className="text-primary-soft hover:underline">
              Source : AMF
            </a>
            , liste blanche <VerifieLe date={meta.amf.publication} famille="amf" label="mise à jour" age={false} />
          </>
        ) : null}
        . Information à titre indicatif — ne constitue pas un conseil en investissement.
      </p>
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function ResultCardBase({
  platform,
  onCopyEmbed,
  copied,
}: {
  platform: PlatformMica;
  onCopyEmbed: () => void;
  copied: boolean;
}) {
  const color = getStatusColor(platform);
  const StatusIcon =
    color === "green"
      ? ShieldCheck
      : color === "red"
      ? ShieldOff
      : color === "amber"
      ? AlertTriangle
      : Info;

  function copyEmbed() {
    const url = `${BRAND.url}/embed/verificateur-mica/${platform.id}`;
    const code = `<iframe src="${url}" width="100%" height="320" frameborder="0" loading="lazy" title="Statut MiCA — ${platform.name} | Cryptoreflex"></iframe>`;
    navigator.clipboard.writeText(code).then(onCopyEmbed);
  }

  return (
    <article className="glass glow-border rounded-2xl p-6 sm:p-8 animate-fade-in-up">
      {/* En-tête */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg-max truncate">
              {platform.name}
            </h2>
            <span
              className={`badge ${getStatusBadgeClasses(color)} shrink-0`}
              role="status"
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {getStatusLabel(platform)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {platform.legalEntity} · {platform.headquarters}
          </p>
        </div>
        <a
          href={platform.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost text-sm py-2 px-3"
        >
          <Globe className="h-4 w-4" />
          Site officiel
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      {/* Grille statuts */}
      <dl className="mt-6 grid sm:grid-cols-2 gap-4">
        <Field
          icon={ShieldCheck}
          label="Statut en France"
          value={getPsanLabel(platform)}
          mono={Boolean(platform.amfRegistration)}
        />
        <Field
          icon={ShieldCheck}
          label="Agrément MiCA (CASP)"
          value={getStatusLabel(platform)}
        />
        <Field
          icon={Globe}
          label="Juridiction MiCA"
          value={platform.micaJurisdiction ?? "—"}
        />
        <Field
          icon={CalendarCheck}
          label="Date d'enregistrement / agrément"
          value={
            formatMicaDate(
              platform.micaAuthorizationDate ?? platform.registrationDate
            )
          }
        />
      </dl>

      {/* Passporting */}
      {platform.micaPassporting.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-elevated/40 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wide">
            <Globe className="h-3.5 w-3.5" />
            Pays UE couverts par passeport
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {platform.micaPassporting.map((c) => (
              <span
                key={c}
                className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-mono text-fg-max/80"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Accès à la France (fin de la période transitoire le 1er juillet 2026) */}
      <div
        className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${
          platform.atRiskJuly2026
            ? "border-accent-rose/40 bg-accent-rose/10"
            : "border-accent-green/40 bg-accent-green/10"
        }`}
      >
        {platform.atRiskJuly2026 ? (
          <AlertTriangle className="h-5 w-5 text-accent-rose shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-accent-green shrink-0 mt-0.5" />
        )}
        <div className="text-sm">
          <div
            className={`font-semibold ${
              platform.atRiskJuly2026 ? "text-danger-fg" : "text-accent-green"
            }`}
          >
            Peut servir des clients en France ?{" "}
            {platform.atRiskJuly2026 ? "NON" : "OUI"}
          </div>
          <p className="mt-0.5 text-fg-max/75">
            {platform.atRiskJuly2026
              ? "Depuis le 1er juillet 2026, fin de la période transitoire, seul un prestataire agréé MiCA avec accès à la France peut y fournir des services sur crypto-actifs. Cette plateforme n'en fait pas partie à la date de notre vérification."
              : platform.micaStatus === "out_of_scope"
                ? "Hors champ de l'agrément MiCA (portefeuille en auto-conservation ou protocole décentralisé) : vous gardez vous-même vos clés."
                : "Agréée MiCA avec accès à la France à la date de notre vérification. L'agrément encadre la plateforme ; il ne protège pas contre les pertes liées aux marchés."}
          </p>
        </div>
      </div>

      {/* Restrictions */}
      {platform.restrictions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-fg-max/90 mb-2">
            Restrictions et points d'attention
          </h3>
          <ul className="space-y-1.5">
            {platform.restrictions.map((r) => (
              <li
                key={r}
                className="flex items-start gap-2 text-sm text-fg-max/80"
              >
                <XCircle className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {platform.notes && (
        <p className="mt-4 text-sm text-muted italic">{platform.notes}</p>
      )}

      {/* Sources */}
      <footer className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <a
            href={platform.publicSource}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-soft hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            Licences publiées par {platform.name}
          </a>
          {platform.amf && getMicaMeta().amf ? (
            <span>
              <a href={getMicaMeta().amf!.url} target="_blank" rel="noopener noreferrer" className="text-primary-soft hover:underline">
                Liste blanche de l&apos;AMF
              </a>{" "}
              ({platform.amf.noAmf ? `n° ${platform.amf.noAmf}` : "agrément par passeport"}),{" "}
              <VerifieLe date={getMicaMeta().amf!.publication} famille="amf" label="mise à jour" age={false} />
            </span>
          ) : null}
          <span>
            <VerifieLe date={platform.lastVerified} famille="mica" label="Vérifié" inconnue="Date de vérification inconnue" age={false} />
          </span>
        </div>

        <button
          type="button"
          onClick={copyEmbed}
          className="btn-ghost text-xs py-2 px-3"
          aria-label="Copier le code embed iframe"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Code copié !" : "Partager (embed iframe)"}
        </button>
      </footer>
    </article>
  );
}

function FieldBase({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated/40 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd
        className={`mt-1 text-fg-max ${
          mono ? "font-mono text-sm" : "text-sm font-medium"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

const ResultCard = avecTypoSync(ResultCardBase);
const Field = avecTypoSync(FieldBase);

export default avecTypoSync(MicaVerifier);
