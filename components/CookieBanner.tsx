"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Cookie, Settings2, X, Check, ShieldOff } from "lucide-react";
import {
  DEFAULT_CONSENT,
  acceptAll,
  getConsent,
  hasConsentDecision,
  rejectAll,
  setConsent,
  type ConsentState,
} from "@/lib/consent";

/**
 * Bandeau cookies RGPD/CNIL — Cryptoreflex.
 *
 * Conformité :
 * - 3 actions de même proéminence : Accepter / Refuser / Personnaliser
 * - Aucun cookie/traceur déposé tant que l'utilisateur n'a pas tranché
 *   (sauf catégorie "Essentiels" — strictement nécessaires)
 * - Mémorisation du choix : 13 mois (gérée dans lib/consent.ts)
 * - Accessibilité WCAG AA : focus trap, role="dialog", aria-labelledby,
 *   focus-visible, contraste >= 4.5:1, target tactile >= 44px
 * - Mobile-first : sheet bas d'écran, full-width sur petit écran
 *
 * Pas de dépendance externe (pas de Cookiebot/Klaro/OneTrust).
 */
export default function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [prefs, setPrefs] = useState<ConsentState>(DEFAULT_CONSENT);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  // Affichage initial : seulement si pas encore de décision.
  useEffect(() => {
    setMounted(true);
    // Widgets /embed (iframe sur des sites tiers) : pas de bandeau. Le stockage y est cloisonné par
    // site hôte, le bandeau réapparaîtrait sur chaque site par-dessus le widget ; aucun traceur
    // soumis à consentement n'y est chargé sans décision.
    if (window.location.pathname.startsWith("/embed")) return;
    if (!hasConsentDecision()) {
      setOpen(true);
    } else {
      const c = getConsent();
      if (c) setPrefs(c.state);
    }

    // Permet de rouvrir le bandeau depuis la page "Confidentialité"
    // via : window.dispatchEvent(new Event("cr-open-cookie-banner"))
    const reopen = () => {
      const c = getConsent();
      setPrefs(c ? c.state : DEFAULT_CONSENT);
      setCustomizing(true);
      setOpen(true);
    };
    window.addEventListener("cr-open-cookie-banner", reopen);
    return () => window.removeEventListener("cr-open-cookie-banner", reopen);
  }, []);

  // Focus initial sur le DIALOGUE à l'ouverture (accessibilité), pas sur
  // « Tout accepter » : l'anneau de focus donnait au bouton d'acceptation un
  // aspect différent de « Tout refuser » (CNIL : même niveau, même aspect —
  // audit 03/10/2026). Tab mène ensuite au premier bouton.
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus({ preventScroll: true });
    }
  }, [open, customizing]);

  // Échap = équivalent "Refuser" (pas de cookie tant que pas de choix
  // explicite serait l'idéal, mais l'utilisateur peut aussi simplement
  // cliquer ailleurs ; on choisit ici de ne RIEN faire sur Échap pour
  // ne pas piéger l'utilisateur. Conforme CNIL : la croix = refus).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") trapFocus(e, dialogRef.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted || !open) return null;

  const handleAcceptAll = () => {
    acceptAll();
    setOpen(false);
  };

  const handleRejectAll = () => {
    rejectAll();
    setOpen(false);
  };

  const handleSavePrefs = () => {
    setConsent(prefs);
    setOpen(false);
  };

  return (
    <div
      // Wrapper plein écran semi-transparent (juste un voile léger pour le focus visuel,
      // sans bloquer le scroll : le contenu reste accessible).
      className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none"
      aria-live="polite"
    >
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="pointer-events-auto mx-auto w-full max-w-3xl m-0 sm:m-4 sm:rounded-2xl
                   border-t sm:border border-border bg-surface/95 backdrop-blur-md
                   shadow-card text-fg animate-fade-in-up"
      >
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="hidden min-[420px]:grid shrink-0 place-items-center h-10 w-10 rounded-xl
                         bg-primary/15 text-primary border border-primary/30"
            >
              <Cookie className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="text-base sm:text-lg font-bold tracking-tight"
              >
                Nous respectons votre vie privée
              </h2>
              <p
                id={descId}
                className="mt-1 text-sm text-muted leading-relaxed max-[389px]:text-xs max-[389px]:leading-snug"
              >
                {/* Jury B1 (mobile) : le bandeau couvrait 56 à 62 % de l'écran sous 390 px. Texte resserré (mêmes
                    informations), icône masquée sous 420 px, « Personnaliser » en lien dans la phrase sur téléphone. */}
                Nous mesurons l'audience avec{" "}
                <strong className="text-fg">Vercel Web Analytics</strong> :
                statistiques anonymes et agrégées, sans cookie, que vous pouvez
                refuser. Aucun pixel publicitaire ni enregistrement de session.
                Choix modifiables à tout moment :{" "}
                {!customizing && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCustomizing(true)}
                      aria-expanded={false}
                      className="sm:hidden font-semibold text-fg underline decoration-primary/60 underline-offset-2
                                 hover:text-primary-soft focus-visible:outline-none
                                 focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      personnaliser
                    </button>
                    <span className="sm:hidden" aria-hidden="true">{" · "}</span>
                  </>
                )}
                page{" "}
                <a
                  href="/confidentialite"
                  className="underline decoration-primary/60 underline-offset-2
                             hover:text-primary-soft focus-visible:outline-none
                             focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  Confidentialité
                </a>
                .
              </p>
            </div>
          </div>

          {/* Mode personnalisation */}
          {customizing && (
            <fieldset className="mt-5 space-y-3">
              <legend className="sr-only">Préférences de cookies</legend>

              <CategoryRow
                title="Essentiels"
                description="Strictement nécessaires au fonctionnement du site (préférences d'affichage, consentement). Toujours actifs."
                checked
                disabled
              />
              <CategoryRow
                title="Mesure d'audience"
                description="Vercel Web Analytics : statistiques anonymes et agrégées, sans cookie ni profilage. Nous aide à améliorer le contenu."
                checked={prefs.analytics}
                onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
              />
              <CategoryRow
                title="Marketing / affiliation"
                description="Aucun outil publicitaire n'est actif aujourd'hui. Si nous en ajoutons un, il ne sera chargé qu'avec votre accord."
                checked={prefs.marketing}
                onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
              />
            </fieldset>
          )}

          {/* Actions */}
          <div
            className="mt-2 min-[360px]:mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:flex sm:flex-row sm:items-center
                       sm:justify-end sm:gap-3"
          >
            {!customizing ? (
              <>
                <button
                  ref={firstFocusRef}
                  type="button"
                  onClick={handleAcceptAll}
                  className={btn.primary}
                >
                  <Check className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                  Tout accepter
                </button>
                {/* CNIL : « Tout refuser » au même niveau et avec le même aspect que « Tout accepter »
                    (même style de bouton). Audit 03/10/2026. */}
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className={btn.primary}
                >
                  <ShieldOff className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                  Tout refuser
                </button>
                <button
                  type="button"
                  onClick={() => setCustomizing(true)}
                  className={`${btn.outline} hidden sm:inline-flex sm:col-auto`}
                  aria-expanded={false}
                >
                  <Settings2 className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                  Personnaliser
                </button>
              </>
            ) : (
              <>
                <button
                  ref={firstFocusRef}
                  type="button"
                  onClick={handleSavePrefs}
                  className={`${btn.primary} col-span-2 sm:col-auto`}
                >
                  <Check className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                  Enregistrer mes choix
                </button>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className={btn.outline}
                >
                  Tout refuser
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className={btn.outline}
                >
                  Tout accepter
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bouton fermer (= refus, conforme CNIL : croix doit refuser) */}
        <button
          type="button"
          onClick={handleRejectAll}
          aria-label="Fermer et refuser les cookies optionnels"
          className="absolute top-3 right-3 grid place-items-center h-9 w-9 rounded-lg
                     text-muted hover:text-fg hover:bg-elevated/60
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sous-composants & helpers                                                  */
/* -------------------------------------------------------------------------- */

function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-xl border border-border
                  bg-elevated/40 p-3 sm:p-4 transition-colors
                  ${disabled ? "opacity-80" : "cursor-pointer hover:border-primary/40"}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-border bg-background
                   text-primary accent-primary
                   focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-primary focus-visible:ring-offset-2
                   focus-visible:ring-offset-surface
                   disabled:cursor-not-allowed"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">
          {title}
          {disabled && (
            <span className="ml-2 text-xs uppercase tracking-wider text-muted font-medium">
              Toujours actif
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-muted leading-relaxed">
          {description}
        </span>
      </span>
    </label>
  );
}

const baseBtn =
  "inline-flex items-center justify-center gap-2 min-h-[44px] px-3 py-2.5 sm:px-4 " +
  "rounded-xl text-sm font-semibold transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const btn = {
  primary: `${baseBtn} bg-primary text-background hover:bg-primary-glow`,
  outline: `${baseBtn} border border-border bg-transparent text-fg hover:border-primary/50 hover:text-primary-soft`,
  ghost: `${baseBtn} bg-elevated text-fg hover:bg-elevated/70`,
};

/** Piège le focus dans le dialog (accessibilité). */
function trapFocus(e: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  // Éléments visibles seulement : « personnaliser » existe en lien (téléphone) ET en bouton (ordinateur), l'un des deux
  // est en display:none selon la largeur.
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.getClientRects().length > 0);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}
