"use client";

import { useEffect, useRef, useState } from "react";

/**
 * DigitFlip — BATCH 41b (audit Motion Expert).
 *
 * Effet "digit flip" Apple Stocks / Robinhood iOS : chaque chiffre qui
 * change individuellement flip vertical (top→bottom translateY) au lieu
 * du sec snap. Crée une sensation "vivant" forte sur compteurs live.
 *
 * Performance : transform compositor only (pas de re-layout). Anim 350ms
 * cubic-bezier(0.22, 1, 0.36, 1) emphasized par chiffre. Stagger natural
 * via re-render React individuel par digit.
 *
 * Usage : <DigitFlip value={42} /> ou <DigitFlip value={1234} suffix=" €" />
 */
interface Props {
  value: number;
  /** Suffixe optionnel (ex: " %", " €", "/100"). */
  suffix?: string;
  /** Préfixe optionnel (ex: "+", "-"). */
  prefix?: string;
  /** Classes CSS sur le wrapper. */
  className?: string;
  /** Format custom (override toString). */
  formatter?: (n: number) => string;
}

export default function DigitFlip({
  value,
  suffix = "",
  prefix = "",
  className = "",
  formatter,
}: Props) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }
    if (value === prevRef.current) return;
    setDisplayValue(value);
    prevRef.current = value;
  }, [value]);

  const formatted = formatter ? formatter(displayValue) : String(displayValue);
  const characters = formatted.split("");

  return (
    <span className={`inline-flex tabular-nums ${className}`} aria-label={`${prefix}${formatted}${suffix}`}>
      {prefix && <span aria-hidden="true">{prefix}</span>}
      {characters.map((char, i) => (
        <DigitCell key={`${i}-${char}`} char={char} />
      ))}
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </span>
  );
}

/**
 * DigitCell — un seul caractère qui flip vertical quand sa key change.
 * React re-monte le span à chaque changement de char → animation rejoue.
 */
function DigitCell({ char }: { char: string }) {
  return (
    <span
      aria-hidden="true"
      className="digit-flip-cell"
      style={{
        display: "inline-block",
        animation: "digit-flip-in 350ms cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      {char}
    </span>
  );
}
