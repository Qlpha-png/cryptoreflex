"use client";

import { useEffect, useRef } from "react";

/**
 * ClickFallback — BATCH 44g (initial) + 44h (2026-05-03 deep fix).
 *
 * SAFETY NET pour les pages ou Next.js App Router router.push() echoue
 * silencieusement.
 *
 * Cause racine confirmee Chrome MCP debug systematique :
 *   Sur les fiches /cryptos/[slug] dont le slug correspond a une chaine
 *   ayant une wallet extension qui injecte window.{property} :
 *     - ethereum  -> MetaMask injecte window.ethereum
 *     - solana    -> Phantom injecte window.solana
 *     - sui       -> Sui Wallet injecte window.suiWallet
 *     - aptos     -> Petra injecte window.aptos
 *     - polkadot  -> Polkadot.js injecte window.injectedWeb3
 *   L'injection se fait pendant l'hydration React. Les Link Next.js
 *   restent en etat partial-hydrate : preventDefault fonctionne mais
 *   router.push() ne navigue pas. 95+ autres fiches (BTC, XRP, BNB,
 *   DOGE, CARDANO, TRON, AVAX, LINK, TON, etc.) navigation SPA OK.
 *
 * Mecanisme :
 *  1. Listener click capture-phase au niveau document.
 *  2. Si la cible est un <a href="/..."> interne sans target ni modifier,
 *     on memorise pathname AVANT le click.
 *  3. Apres timeout adaptatif :
 *       - 80ms si wallet extension detectee (window.ethereum/solana/etc.)
 *       - 350ms sinon (cas normal pour la grande majorite des users)
 *     si pathname inchange -> window.location.assign(href) hard reload.
 *
 * Detection wallet extension : capture les properties au mount + listener
 * sur ethereum#initialized + check periodique sur 1s (les extensions
 * peuvent injecter avec un delai variable selon le browser).
 *
 * Cas normal (user sans extension wallet) : 350ms timeout, jamais
 * declenche car Next.js Link change l'URL en <50ms.
 *
 * Cas wallet detected (user avec MetaMask/Phantom/etc.) : 80ms timeout,
 * declenche sur les 5 fiches problematiques. Flash visible ~80ms au lieu
 * de 350ms = quasi imperceptible (un blink humain = ~100-150ms).
 *
 * Couts :
 *  - 1 listener click capture (negligeable)
 *  - 1 setTimeout par click sur <a> interne (auto-cleanup)
 *  - Aucun effet sur clics modifies (cmd/ctrl/middle = browser default)
 *
 * Ne pas confondre avec une regression : si Next.js fonctionne, ce
 * fallback ne s'active jamais (pathname change avant le timeout).
 */
export default function ClickFallback() {
  const hasWalletExtensionRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detection initiale : check si une wallet extension a deja injecte.
    const detectWallet = (): boolean => {
      const w = window as unknown as Record<string, unknown>;
      return !!(
        w.ethereum ||
        w.solana ||
        w.suiWallet ||
        w.aptos ||
        w.injectedWeb3 ||
        // MetaMask sometimes uses a non-enumerable getter, check via
        // a try/catch get to avoid false negative.
        (() => {
          try {
            return Object.getOwnPropertyDescriptor(window, "ethereum") !== undefined;
          } catch {
            return false;
          }
        })()
      );
    };

    hasWalletExtensionRef.current = detectWallet();

    // Re-check periodique pendant 1.5s (extensions peuvent injecter avec
    // delai variable). Apres 1.5s on stop : si extension pas detectee
    // d'ici la, c'est qu'elle ne sera pas un probleme pour cette session.
    const intervalId = window.setInterval(() => {
      if (detectWallet()) {
        hasWalletExtensionRef.current = true;
        window.clearInterval(intervalId);
      }
    }, 250);
    window.setTimeout(() => window.clearInterval(intervalId), 1500);

    // Listener ethereum#initialized event (MetaMask EIP-6963 standard)
    const onEthInit = () => {
      hasWalletExtensionRef.current = true;
    };
    window.addEventListener("ethereum#initialized", onEthInit, { once: true });

    const handler = (e: MouseEvent) => {
      // Skip si modifier keys ou middle-click ou bouton non-gauche
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      if (!target) return;
      const link = target.closest("a") as HTMLAnchorElement | null;
      if (!link) return;

      // Skip target=_blank, download, externe
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;

      // Memorise pathname AVANT click
      const beforePath = window.location.pathname + window.location.search;
      const targetHref = link.href;

      // Timeout adaptatif : court si wallet extension detectee (haut risque
      // de bug router.push), long sinon (UX preserve pour 95% des users).
      const timeoutMs = hasWalletExtensionRef.current ? 80 : 350;

      window.setTimeout(() => {
        const nowPath = window.location.pathname + window.location.search;
        if (nowPath === beforePath) {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.warn(
              `[ClickFallback] router.push silencieux echec apres ${timeoutMs}ms (wallet=${hasWalletExtensionRef.current}), fallback hard reload vers`,
              targetHref,
            );
          }
          window.location.assign(targetHref);
        }
      }, timeoutMs);
    };

    document.addEventListener("click", handler, { capture: true, passive: true });
    return () => {
      document.removeEventListener("click", handler, { capture: true } as AddEventListenerOptions);
      window.removeEventListener("ethereum#initialized", onEthInit);
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
