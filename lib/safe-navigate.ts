/**
 * lib/safe-navigate.ts — BATCH 53 (2026-05-03).
 *
 * Helper unifie pour les router.push() programmatiques wallet-aware.
 * Sur les pages ou des wallet extensions injectent window.{ethereum,
 * solana, suiWallet, aptos, injectedWeb3} pendant l'hydration React,
 * le router.push() de Next.js App Router silencieusement avorte.
 *
 * ClickFallback global intercepte les <a href> mais PAS les router.push
 * programmatiques (depuis input Enter, dropdown selection, form submit,
 * etc.). Ce helper detecte les wallet extensions au moment du click et
 * bypass router.push avec window.location.assign() = navigation native
 * fiable.
 *
 * Usage :
 *   import { safeNavigate } from "@/lib/safe-navigate";
 *   const router = useRouter();
 *   onClick={() => safeNavigate(router, "/cryptos/bitcoin")}
 *
 * Cout : 1 check de 5 props sur window au moment du click. 0 hydration,
 * 0 dependency.
 */

import type { useRouter } from "next/navigation";

type AppRouter = ReturnType<typeof useRouter>;

/**
 * Detecte si une wallet extension a injecte ses globals dans window.
 * Liste actualisee mai 2026 :
 *   - window.ethereum    -> MetaMask, Rainbow, Coinbase Wallet, etc.
 *   - window.solana      -> Phantom, Solflare, Backpack
 *   - window.suiWallet   -> Sui Wallet
 *   - window.aptos       -> Petra Wallet
 *   - window.injectedWeb3 -> Polkadot.js extension
 */
function hasWalletExtension(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(
    w.ethereum ||
    w.solana ||
    w.suiWallet ||
    w.aptos ||
    w.injectedWeb3
  );
}

/**
 * Navigation safe : router.push si pas de wallet extension, sinon
 * window.location.assign() pour eviter le silent fail.
 *
 * Si l'URL est externe (http(s)://...) ou contient un protocole special
 * (mailto:, tel:, #), on utilise window.location.assign sans verifier
 * l'extension.
 */
export function safeNavigate(router: AppRouter, url: string): void {
  // External / protocol-special URLs : bypass router.push
  if (url.startsWith("http") || url.startsWith("mailto:") || url.startsWith("tel:")) {
    if (typeof window !== "undefined") {
      window.location.assign(url);
    }
    return;
  }

  if (hasWalletExtension()) {
    if (typeof window !== "undefined") {
      window.location.assign(url);
    }
    return;
  }

  router.push(url);
}

/**
 * Navigation safe avec replace (au lieu de push). Utile pour formulaires
 * qui ne doivent pas creer d'entree historique navigation.
 */
export function safeReplace(router: AppRouter, url: string): void {
  if (url.startsWith("http") || url.startsWith("mailto:") || url.startsWith("tel:")) {
    if (typeof window !== "undefined") {
      window.location.replace(url);
    }
    return;
  }

  if (hasWalletExtension()) {
    if (typeof window !== "undefined") {
      window.location.replace(url);
    }
    return;
  }

  router.replace(url);
}
