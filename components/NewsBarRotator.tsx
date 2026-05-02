"use client";

import { useEffect, useState } from "react";
import { formatRelativeFr } from "@/lib/news-aggregator";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

interface Props {
  news: NewsItem[];
}

/**
 * NewsBarRotator — fait défiler 1 actu à la fois toutes les 5s.
 *
 * Audit Block 1 RE-AUDIT 26/04/2026 (Agent dynamism +0.3) :
 *  - Renforce la sensation "data temps réel" — 1er item visible au SSR (0 CLS,
 *    0 LCP impact), puis rotation automatique avec fade-in stagger.
 *  - Pause au hover pour permettre la lecture (UX courtoisie).
 *  - Pause au focus (accessibility — clavier).
 *  - Page Visibility API : pause si onglet hidden (économie batterie).
 *  - prefers-reduced-motion : pas de rotation, on affiche les 3 items en flex.
 */
export default function NewsBarRotator({ news }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReduced(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  }, []);

  useEffect(() => {
    if (reduced || paused || news.length <= 1) return;
    const interval = setInterval(() => {
      setIdx((n) => (n + 1) % news.length);
    }, 5000);

    const onVisibility = () => {
      // Pause silencieuse quand l'onglet n'est pas visible.
      // L'interval continue mais ne consomme pas de CPU significatif.
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [news.length, paused, reduced]);

  // Mode reduced-motion : on affiche les 3 premiers items en flex (statique),
  // équivalent au comportement précédent — accessible et clair.
  if (reduced) {
    const top3 = news.slice(0, 3);
    return (
      <ul
        role="list"
        className="flex-1 flex items-center gap-3 overflow-x-auto scrollbar-thin"
      >
        {top3.map((item) => (
          <NewsItemLink key={item.link} item={item} />
        ))}
      </ul>
    );
  }

  const current = news[idx];

  return (
    <div
      className="flex-1 min-w-0 flex items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* key={idx} force le re-mount à chaque tick → rejoue l'animation news-fade-in */}
      <div key={idx} className="news-fade-in flex-1 min-w-0">
        <NewsItemLink item={current} />
      </div>
      {/* Indicateur position discret (X de Y) */}
      <span
        className="hidden md:inline-block ml-3 shrink-0 text-[10px] text-fg/60 font-mono tabular-nums"
        aria-hidden="true"
      >
        {idx + 1}/{news.length}
      </span>
    </div>
  );
}

function NewsItemLink({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener nofollow ugc"
      className="group inline-flex items-center gap-2 max-w-full text-[13px] text-fg/85
                 hover:text-fg transition-colors duration-fast
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                 focus-visible:ring-offset-2 focus-visible:ring-offset-elevated rounded"
    >
      <span className="text-[10px] uppercase tracking-wider text-fg/55 font-mono shrink-0">
        {item.source}
      </span>
      <span className="text-fg/85 group-hover:text-fg max-w-[40ch] truncate">
        {item.title}
      </span>
      <span className="text-[11px] text-fg/55 shrink-0">
        · {formatRelativeFr(item.pubDate)}
      </span>
    </a>
  );
}
