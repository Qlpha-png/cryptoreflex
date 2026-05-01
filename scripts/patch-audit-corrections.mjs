#!/usr/bin/env node
/**
 * patch-audit-corrections.mjs
 *
 * Applique les corrections P0 + P1 du rapport AUDIT-100-CRYPTOS.md sur
 * data/hidden-gems.json — à exécuter APRÈS que l'agent re-accent ait fini
 * sur les fiches 11-30 (sinon conflit d'écriture).
 *
 * Patches :
 *  P0-01 Hedera        — majorIncidents : 51M$ → 600k$
 *  P0-02 Filecoin      — fundingRaised : précision 52M+205M
 *  P0-03 Curve         — majorIncidents : 73M$ → 70M brut/20M net
 *  P0-04 Bittensor     — majorIncidents : wallet utilisateurs via PyPi
 *  P0-05 Hyperliquid   — majorIncidents : vote validateurs 2 min
 *  P0-06 Pepe          — majorIncidents : août 2024 → août 2023
 *  P0-07 Mantra        — majorIncidents : précision 13 avril 2025 + burn
 *  P0-08 Worldcoin     — whereToBuy : AUCUNE PSAN FR
 *  P0-09 Tether        — whereToBuy : MiCA / délisting EEE
 *  P0-10 KuCoin Token  — whereToBuy : non-PSAN FR + risk
 *  P0-11 Polygon       — coingeckoId : matic-network → polygon-ecosystem-token
 *  P1-01 Hyperliquid   — score 7 → 6
 *  P1-05 Bonk          — score 5 → 4.5
 *  P1-07 Floki         — score 5 → 4
 *  P2-09 Ethena        — risks ajout USDe ≠ USDC
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(__dirname, "..", "data", "hidden-gems.json");

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
const gems = data.hiddenGems;

function patchById(id, patcher) {
  const idx = gems.findIndex((g) => g.id === id);
  if (idx === -1) {
    console.warn(`⚠ id "${id}" not found, skipping`);
    return false;
  }
  patcher(gems[idx]);
  console.log(`✓ patched ${id}`);
  return true;
}

// ── P0-01 Hedera : majorIncidents
patchById("hedera", (g) => {
  g.reliability.majorIncidents =
    "Exploit du Smart Contract Service le 9 mars 2023 (~600k$ détournés sur DEX partenaires Pangolin, SaucerSwap, HeliSwap), réseau en pause environ 36h le temps du correctif. Aucun fonds utilisateur final perdu hors des pools concernés.";
});

// ── P0-02 Filecoin : fundingRaised
patchById("filecoin", (g) => {
  g.reliability.fundingRaised =
    "257M$ (presale advisors ~52M$ + ICO publique ~205M$, septembre 2017)";
});

// ── P0-03 Curve : majorIncidents
patchById("curve-dao", (g) => {
  g.reliability.majorIncidents =
    "Hack juillet 2023 via vulnérabilité reentrancy du compilateur Vyper (versions 0.2.15/0.2.16/0.3.0). Pertes brutes ~70M$ à travers Curve, Alchemix, JPEG'd, Metronome. Whitehats récupèrent ~70%, perte nette finale ~20M$. Le fondateur Egorov a vendu CRV en OTC pour rembourser sa position personnelle leveragée.";
});

// ── P0-04 Bittensor : majorIncidents
patchById("bittensor", (g) => {
  g.reliability.majorIncidents =
    "Juillet 2024 : package PyPi malveillant 'bittensor 6.12.2' (publié entre le 22 et 29 mai 2024) exfiltrait les coldkeys utilisateurs non chiffrées. ~32 000 TAO drainés (~8M$ au cours du jour). Réseau halté par la fondation pour limiter les pertes, recommandation de migration des fonds vers nouveaux wallets.";
});

// ── P0-05 Hyperliquid : majorIncidents + score (P1-01)
patchById("hyperliquid", (g) => {
  g.reliability.majorIncidents =
    "26 mars 2025 : exploit JELLY (memecoin) via short-squeeze coordonné qui a transféré une position perdante de ~4M$ à la HLP vault (drawdown ~13.5M$ non réalisé). Validateurs ont voté la délistage en environ 2 minutes et fermé les positions au prix initial — décision controversée révélant la centralisation effective de la prise de décision malgré l'aspect 'décentralisé' affiché.";
  g.reliability.score = 6; // P1-01 : 7 → 6
  // Ajout disclaimer France dans risks
  if (!g.risks.some((r) => r.toLowerCase().includes("france"))) {
    g.risks.push(
      "France : pas de plateforme PSAN FR ne propose HYPE ; accès uniquement via Bybit/Bitget/OKX (selon juridiction utilisateur), à mesurer fiscalement et juridiquement"
    );
  }
});

// ── P0-06 Pepe : majorIncidents (date) + alerte mémecoin
patchById("pepe", (g) => {
  g.reliability.majorIncidents =
    "Août 2023 : vol de ~16 trillions PEPE (~15M$) par 3 anciens membres de l'équipe ayant abaissé le seuil multisig 5/8 → 2/8 avant transfert vers Binance/OKX/KuCoin/Bybit. L'équipe restante a réduit à nouveau le seuil et changé les signataires.";
});

// ── P0-07 Mantra : majorIncidents
patchById("mantra", (g) => {
  g.reliability.majorIncidents =
    "Crash flash du 13 avril 2025 : OM passe de ~6.21$ à ~0.49$ en environ 1h (~-92%), >5Md$ de capitalisation effacés. L'équipe invoque des liquidations forcées sur exchanges asiatiques ; on-chain montre des dépôts massifs vers exchanges (notamment via wallet attribué à Laser Digital). Le fondateur s'engage à brûler ~16.5% du supply (~160M$) en compensation.";
});

// ── P0-08 Worldcoin : whereToBuy + risks
patchById("worldcoin", (g) => {
  g.whereToBuy = [
    "AUCUNE plateforme PSAN FR ne propose WLD à un résident français (suspension CNIL)",
    "Hors France : Binance, Bybit, OKX, Kraken (selon juridiction)",
  ];
  if (!g.risks.some((r) => r.toLowerCase().includes("cnil") || r.toLowerCase().includes("suspension"))) {
    g.risks.unshift(
      "France : suspension de l'app World en France et en Espagne (CNIL/AEPD), enquête EDPB en cours via BayLDA, statut réglementaire UE non stabilisé — achat de WLD non disponible sur les principales plateformes régulées"
    );
  }
});

// ── P0-09 Tether : whereToBuy
patchById("tether", (g) => {
  g.whereToBuy = [
    "Binance (achat possible mais paires limitées en EEE post-MiCA)",
    "Bitget, Bybit (selon juridiction utilisateur)",
    "Coinbase EU et Kraken EU : délisté pour résidents EEE",
    "Détention OK, swap/conversion vers USDC recommandée pour résidents FR",
  ];
});

// ── P0-10 KuCoin Token : whereToBuy + risks
patchById("kucoin-token", (g) => {
  g.whereToBuy = [
    "AUCUNE plateforme PSAN FR ne liste KCS à ce jour",
    "Plateformes hors PSAN FR (déconseillées) : KuCoin, Gate.io, MEXC, BingX",
    "Bitfinex (statut variable selon juridiction)",
  ];
  if (!g.risks.some((r) => r.toLowerCase().includes("psan"))) {
    g.risks.unshift(
      "France : acheter KCS depuis la France implique de passer par une plateforme non-PSAN, ce qui crée un risque juridique et fiscal personnel à mesurer (blocages AMF observés en 2023 sur KuCoin)"
    );
  }
});

// ── P0-11 Polygon : coingeckoId
patchById("polygon", (g) => {
  g.coingeckoId = "polygon-ecosystem-token";
});
// Polygon peut aussi être indexé sous "matic-network" si l'agent a utilisé ce slug pour id
patchById("matic-network", (g) => {
  g.coingeckoId = "polygon-ecosystem-token";
});

// ── P1-05 Bonk : score 5 → 4.5
patchById("bonk", (g) => {
  g.reliability.score = 4.5;
});

// ── P1-07 Floki : score 5 → 4
patchById("floki", (g) => {
  g.reliability.score = 4;
});

// ── P2-09 Ethena : risk USDe ≠ USDC
patchById("ethena", (g) => {
  if (!g.risks.some((r) => r.toLowerCase().includes("usde"))) {
    g.risks.unshift(
      "USDe n'est PAS un stablecoin classique adossé à du cash : c'est une exposition synthétique (long spot ETH + short perp). En cas de funding rate négatif prolongé ou de défaut d'un CEX hébergeur du collatéral, le peg peut casser. À ne pas considérer comme un stablecoin sans risque."
    );
  }
});

// ── P2-02 Personnalisation des risks memecoins
patchById("shiba-inu", (g) => {
  // Remplace le risk générique par une formulation spécifique
  g.risks = g.risks.map((r) => {
    if (r.toLowerCase().includes("pas de fondamentaux") || r.toLowerCase().includes("speculation") || r.toLowerCase().includes("spéculation")) {
      return "Concentration : Vitalik Buterin a brûlé environ 50% du supply en 2021, mais les top 10 wallets détiennent encore plus de 40% du flottant — risque de dump coordonné";
    }
    return r;
  });
});

patchById("bonk", (g) => {
  g.risks = g.risks.map((r) => {
    if (r.toLowerCase().includes("pas de fondamentaux") || r.toLowerCase().includes("speculation") || r.toLowerCase().includes("spéculation")) {
      return "Corrélation Solana : si SOL chute de plus de 50%, BONK historiquement chute de 80% ou plus (effet beta amplifié) — pas de découplage possible";
    }
    return r;
  });
});

patchById("dogwifhat", (g) => {
  g.risks = g.risks.map((r) => {
    if (r.toLowerCase().includes("pas de fondamentaux") || r.toLowerCase().includes("speculation") || r.toLowerCase().includes("spéculation")) {
      return "Liquidité concentrée sur Bybit/OKX/Binance : slippage supérieur à 5% sur petits ordres post-hype, sortie difficile en cas de panique";
    }
    return r;
  });
});

patchById("floki", (g) => {
  g.risks = g.risks.map((r) => {
    if (r.toLowerCase().includes("pas de fondamentaux") || r.toLowerCase().includes("speculation") || r.toLowerCase().includes("spéculation")) {
      return "Régulateurs UK et UE surveillent activement le marketing après campagne controversée du métro de Londres en 2024 (sanctions FCA possibles, restriction publicitaire UE)";
    }
    return r;
  });
});

// Sauvegarde
fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log("\n✅ All audit patches applied. Total entries:", gems.length);
