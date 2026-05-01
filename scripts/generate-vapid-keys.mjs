/**
 * scripts/generate-vapid-keys.mjs
 *
 * Génère une paire de clés VAPID (P-256 ECDSA) à coller dans Vercel env :
 *   - VAPID_PUBLIC_KEY            (côté serveur, pour signer les notifs)
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY (optionnel — actuellement le client la lit
 *                                   via /api/push/vapid-key, donc pas requis,
 *                                   mais utile pour SSR ou pré-render)
 *   - VAPID_PRIVATE_KEY           (NE JAMAIS exposer côté client)
 *
 * Usage :
 *   node scripts/generate-vapid-keys.mjs
 *
 * Sécurité :
 *  - Une fois générées, la rotation invalide TOUTES les subscriptions existantes
 *    (chaque sub est liée à la clé publique au moment du subscribe). Donc on
 *    génère 1 fois, on garde les valeurs en lieu sûr (Vercel env + 1Password).
 *  - Pas de gen automatique en CI : 100% manuel pour éviter qu'un déploiement
 *    foireux invalide tout l'écosystème push.
 */

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\n=== VAPID keys générées ===\n");
console.log("À copier dans Vercel → Project Settings → Environment Variables :\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:contact@cryptoreflex.fr`);
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);
console.log(
  "ATTENTION : la rotation invalide toutes les subscriptions existantes.",
);
console.log(
  "Stocker la PRIVATE key en lieu sûr (1Password) — elle ne doit JAMAIS",
);
console.log("être exposée côté client ou dans le repo Git.\n");
