"use client";

import { useEffect, useState } from "react";
import { BEGINNER_STEPS } from "@/lib/beginner-journey";

/**
 * BeginnerJourneyTracker — composant client séparé qui gère :
 *  - lecture localStorage `cr:journey:visited` (steps complétés)
 *  - injection de classes data-attributes sur les cards parentes
 *    (matched par data-journey-step={"01"|"02"...} + data-active="true"
 *    sur l'étape suivante à faire)
 *  - badge ✓ checkmark sur chaque card complétée
 *  - live region pour annonce SR de la progression
 *
 * Architecture (Audit Block 3 RE-AUDIT, Agent Performance P0 RR1) :
 *  - Isolated client component (mounted via dynamic ssr:false depuis le parent
 *    ou directement comme sibling). Préserve le score perf 9.5/10 du Server
 *    Component principal en n'ajoutant aucune hydration sur le composant statique.
 *  - Coût client : ~2 KB JS gzip + 0 IO + 0 render parasite (1 mount, state pur).
 *
 * Tracking automatique :
 *  - Chaque <Link href={step.href}> du composant parent doit avoir
 *    data-journey-step={step.step} et onClick handler ajouté par le tracker via
 *    event delegation (querySelectorAll au mount).
 *
 * A11y :
 *  - Live region role="status" aria-live="polite" pour annoncer changement.
 *  - aria-current="step" sur la card "à faire ensuite".
 */

const STORAGE_KEY = "cr:journey:visited:v1";

function readVisited(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeVisited(visited: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visited));
  } catch {
    /* localStorage peut être bloqué (Safari private mode) */
  }
}

export default function BeginnerJourneyTracker() {
  const [visited, setVisited] = useState<string[]>([]);
  const [progressMessage, setProgressMessage] = useState("");

  useEffect(() => {
    setVisited(readVisited());
  }, []);

  // Calcule la prochaine étape à faire (current).
  const currentStep =
    BEGINNER_STEPS.find((s) => !visited.includes(s.step))?.step ?? null;
  const allComplete = currentStep === null && visited.length >= BEGINNER_STEPS.length;

  // Effet : applique les data-attributes sur les <a> du parent + checkmarks.
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLAnchorElement>(
      "[data-journey-step]",
    );
    cards.forEach((card) => {
      const step = card.getAttribute("data-journey-step");
      if (!step) return;

      const isVisited = visited.includes(step);
      const isCurrent = step === currentStep;

      card.dataset.visited = isVisited ? "true" : "false";
      card.dataset.active = isCurrent ? "true" : "false";

      if (isCurrent) {
        card.setAttribute("aria-current", "step");
      } else {
        card.removeAttribute("aria-current");
      }
    });

    // Annonce SR du changement de progression.
    if (allComplete) {
      setProgressMessage("Bravo, tu as parcouru les 4 étapes du parcours débutant !");
    } else if (currentStep && visited.length > 0) {
      const next = BEGINNER_STEPS.find((s) => s.step === currentStep);
      setProgressMessage(
        `${visited.length}/${BEGINNER_STEPS.length} étapes terminées. Prochaine : ${next?.title ?? ""}.`,
      );
    }
  }, [visited, currentStep, allComplete]);

  // Click handler delegation : marque l'étape visitée au clic.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest<HTMLAnchorElement>("[data-journey-step]");
      if (!card) return;
      const step = card.getAttribute("data-journey-step");
      if (!step) return;
      setVisited((prev) => {
        if (prev.includes(step)) return prev;
        const next = [...prev, step];
        writeVisited(next);
        // Tracking Plausible (si dispo)
        try {
          const plausible = (window as { plausible?: (e: string, o?: object) => void }).plausible;
          if (typeof plausible === "function") {
            plausible("Beginner Journey Step Click", { props: { step } });
          }
        } catch {
          /* analytics never blocks UX */
        }
        return next;
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      {/* Live region pour annonce SR de la progression. sr-only. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {progressMessage}
      </div>

      {/* Confetti si parcours complet (4/4) — sparks gold qui partent du
          fond de la dernière card. CSS pur, animation 1.4s one-shot. */}
      {allComplete && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed bottom-20 right-4 z-30 h-16 w-32"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="sparkle"
              style={{
                left: `${20 + i * 14}%`,
                animationDelay: `${i * 90}ms`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
