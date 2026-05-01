"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ShieldCheck, Info, FileText } from "lucide-react";

const STORAGE_KEY = "cryptoreflex_subscription_consent_v1";
const STRIPE_HOST = "buy.stripe.com";

/**
 * GatedProTiers — Client Component qui :
 *  1. Affiche un encart de consentement (checkbox CGV + L221-28 12°) AU-DESSUS
 *     du composant TieredPricing rendu juste après dans le DOM par le parent.
 *  2. Attache un listener global qui intercepte les clicks sur tout `<a href>`
 *     pointant vers buy.stripe.com SI la checkbox n'est pas cochée.
 *
 * Architecture : on ne wrap PAS TieredPricing (qui est Server Component avec
 * des Icon LucideIcon en props — incompatible avec passage à un Client Comp).
 * À la place, on rend la checkbox + on installe un listener `document` qui
 * filtre par hostname Stripe. Plus propre, plus découplé.
 *
 * Conformité juridique :
 *  - L221-18 Code conso → 14j rétractation (mention obligatoire)
 *  - L221-28 12° → exécution immédiate des services numériques avec accord exprès
 *
 * Props :
 *  - enabled: si false (mode pré-launch sans Stripe), pas de gate du tout
 */
export default function GatedProTiers({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const cbRef = useRef<HTMLDivElement>(null);

  // Hydrate l'état depuis sessionStorage
  useEffect(() => {
    setHydrated(true);
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        setChecked(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persiste l'état coché
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, checked ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [checked, hydrated]);

  // Listener global qui intercepte les clicks Stripe externes
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent) => {
      if (checked) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const link = target.closest("a") as HTMLAnchorElement | null;
      if (!link) return;
      try {
        const url = new URL(link.href);
        if (url.host !== STRIPE_HOST) return;
      } catch {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      // Visual feedback : flash + scroll vers la checkbox
      cbRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      cbRef.current?.classList.add("ring-4", "ring-amber-400/60");
      setTimeout(() => {
        cbRef.current?.classList.remove("ring-4", "ring-amber-400/60");
      }, 1400);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [checked, enabled]);

  // Mode pré-launch / waitlist : pas de gate
  if (!enabled) return null;

  return (
    <div
      ref={cbRef}
      id="subscription-consent-cb"
      className={`mx-auto max-w-7xl mb-8 rounded-2xl border-2 p-5 sm:p-6 transition-all ${
        checked
          ? "border-accent-green/40 bg-accent-green/5"
          : "border-amber-500/40 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 grid place-items-center h-10 w-10 rounded-xl transition-colors ${
            checked ? "bg-accent-green/20 text-accent-green" : "bg-amber-500/20 text-amber-400"
          }`}
        >
          {checked ? <ShieldCheck className="h-5 w-5" /> : <Info className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-fg">
            Avant de souscrire — droit de rétractation et exécution immédiate
          </h3>

          <div className="mt-3 space-y-2 text-xs sm:text-sm text-fg/85 leading-relaxed">
            <p>
              <strong className="text-fg">Tu disposes de 14 jours</strong> pour te rétracter
              (art. <abbr title="Code de la consommation">L221-18</abbr>) avec remboursement
              intégral si tu n&apos;as pas significativement utilisé le service.
            </p>
            <p>
              <strong className="text-fg">Mais l&apos;abonnement débute immédiatement</strong>{" "}
              après paiement (portfolio illimité, alertes, glossaire actifs en quelques secondes).
              Conformément à l&apos;art.{" "}
              <abbr title="Code de la consommation">L221-28 12°</abbr>, en cochant la case
              ci-dessous tu <strong className="text-fg">demandes expressément cette exécution
              immédiate</strong> et reconnais que ton droit de rétractation peut être affecté
              pour les services déjà consommés.
            </p>
            <p className="text-muted">
              <Link
                href="/cgv-abonnement"
                className="inline-flex items-center gap-1 text-primary-soft hover:text-primary underline font-semibold"
              >
                <FileText className="h-3.5 w-3.5" />
                Lire les CGV complètes →
              </Link>
            </p>
          </div>

          <label
            className={`mt-4 flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
              checked
                ? "border-accent-green bg-accent-green/15"
                : "border-amber-400 bg-background hover:border-amber-300"
            }`}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => setChecked((v) => !v)}
              className={`relative shrink-0 mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                checked ? "border-accent-green bg-accent-green" : "border-amber-400 bg-background"
              }`}
              aria-label="J'accepte les CGV et l'exécution immédiate"
            >
              {checked && (
                <Check className="h-3.5 w-3.5 text-background" strokeWidth={3} />
              )}
            </button>
            <span className="text-sm leading-snug text-fg select-none">
              <strong>J&apos;ai lu les CGV</strong> et je demande expressément que les services
              numériques débutent immédiatement après paiement. Je reconnais que mon droit de
              rétractation peut être affecté pour les services pleinement exécutés (art. L221-28
              12° Code de la consommation).
            </span>
          </label>

          {hydrated && !checked && (
            <p className="mt-3 text-xs text-amber-300 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Coche la case pour activer les boutons d&apos;abonnement Mensuel / Annuel
              ci-dessous.
            </p>
          )}
          {hydrated && checked && (
            <p className="mt-3 text-xs text-accent-green flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 shrink-0" />
              Consentement enregistré — les boutons d&apos;abonnement sont actifs.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
