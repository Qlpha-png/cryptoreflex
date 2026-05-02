"use client";

import { useEffect, useState } from "react";

/**
 * SimpleConfetti — BATCH 39 (audit Motion Expert /compte).
 *
 * Confetti CSS-only zéro dépendance pour célébration post-paiement Stripe
 * (/pro/welcome) ou opt-in newsletter (/merci). Pattern Linear / Notion :
 * 30 particules colorées qui tombent en cascade pendant 3s puis disparaissent.
 *
 * - 0 lib externe (pas de canvas-confetti = pas de bundle bloat)
 * - Respecte prefers-reduced-motion (rend null si utilisateur l'a activé)
 * - Auto-cleanup : se démonte après 3s
 * - z-index élevé pour passer au-dessus de tout (popup-like)
 * - Render only client-side (SSR-safe via useState mount)
 */
const COLORS = ["#F5A524", "#FBBF24", "#10B981", "#22C55E", "#FFFFFF"];

export default function SimpleConfetti() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 3500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  // 30 particules avec positions/délais/couleurs randomisées au mount
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.8}s`,
    duration: `${2 + Math.random() * 1.5}s`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 720}deg`,
  }));

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          70% { opacity: 1; }
          100% {
            transform: translateY(100vh) rotate(var(--rotate, 360deg));
            opacity: 0;
          }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      >
        {particles.map((p) => (
          <span
            key={p.id}
            style={{
              position: "absolute",
              top: "-20px",
              left: p.left,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: "2px",
              animation: `confetti-fall ${p.duration} ease-in ${p.delay} forwards`,
              ["--rotate" as string]: p.rotate,
            }}
          />
        ))}
      </div>
    </>
  );
}
