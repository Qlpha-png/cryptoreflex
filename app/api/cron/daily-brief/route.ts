/**
 * GET /api/cron/daily-brief
 * -------------------------
 * Génère le "Café Crypto 7h" — brief quotidien 600-1000 mots qui résume :
 *  1. Top 5 cryptos du jour avec variations 24h (CoinGecko)
 *  2. Tendance générale (Fear & Greed Index si disponible)
 *  3. 1-3 événements clés du jour (lit data/crypto-events.json)
 *  4. 1 question FAQ AEO (rotative)
 *
 * Sortie : MDX écrit dans content/news/daily-brief-YYYY-MM-DD.mdx
 *          (utilise le pipeline news existant pour rendu via /actualites/[slug]).
 *
 * Sécurité : Bearer CRON_SECRET (via verifyBearer).
 *
 * Performance : <5s (pas d'appel LLM, 100% templates + fetch CoinGecko).
 *
 * V2 prévue : push automatique vers Beehiiv (nécessite ajout d'un wrapper
 * createBeehiivPost dans lib/beehiiv.ts — pas dispo aujourd'hui).
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { verifyBearer } from "@/lib/auth";
import { fetchTopMarket } from "@/lib/coingecko";
import { getAllUpcomingEvents } from "@/lib/crypto-events";
import { BRAND } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEWS_DIR = path.join(process.cwd(), "content", "news");

/* -------------------------------------------------------------------------- */
/*  FAQ rotative — change selon le jour de la semaine pour AEO                */
/* -------------------------------------------------------------------------- */

const ROTATING_FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "Quelle est la fiscalité crypto en France en 2026 ?",
    answer:
      "Pour un particulier, les plus-values crypto sont imposées au PFU (Prélèvement Forfaitaire Unique) de 30 % par défaut (12,8 % d'impôt + 17,2 % de prélèvements sociaux), uniquement lors de la conversion en euros (article 150 VH bis du CGI). Tant que tu restes en crypto-vers-crypto, aucun impôt n'est dû. Voir notre /outils/calculateur-fiscalite pour simuler ta note fiscale.",
  },
  {
    question: "MiCA Phase 2 : qu'est-ce qui change le 30 juin 2026 ?",
    answer:
      "Le 30 juin 2026, la fenêtre de transition MiCA s'achève. Les plateformes crypto qui n'ont pas obtenu l'agrément CASP (Crypto-Asset Service Provider) ne pourront plus servir les résidents français. Vérifie le statut de ta plateforme sur /outils/verificateur-mica.",
  },
  {
    question: "Faut-il déclarer ses comptes crypto à l'étranger en France ?",
    answer:
      "Oui, tout compte ouvert chez un exchange étranger (Binance, Coinbase, Bitpanda, Kraken, etc.) doit être déclaré via le formulaire 3916-bis. L'amende est de 750 € par compte oublié (jusqu'à 10 000 € si compte > 50 000 €). Voir /outils/radar-3916-bis pour vérifier ton exposition.",
  },
  {
    question: "Comment choisir une plateforme crypto sécurisée en France ?",
    answer:
      "3 critères clés : (1) statut MiCA / agrément CASP confirmé par l'AMF ou un autre régulateur EU, (2) frais réels (spread + commission, pas juste la commission affichée), (3) support en français + KYC robuste. Voir /comparatif pour le classement actualisé.",
  },
  {
    question: "DCA vs lump sum : quelle stratégie pour débuter ?",
    answer:
      "Le DCA (Dollar Cost Averaging — achats étalés) lisse la volatilité et réduit le risque de mauvais timing. Statistiquement le lump sum (achat unique) bat le DCA ~70 % du temps sur 10 ans, mais avec une volatilité émotionnelle bien plus élevée. Pour un débutant : DCA mensuel sur 12-24 mois est recommandé. Simule sur /outils/simulateur-dca.",
  },
  {
    question: "Bitcoin ou Ethereum : par lequel commencer ?",
    answer:
      "Pour un premier achat crypto en France : Bitcoin reste le plus accessible et le moins risqué (réserve de valeur, ETF spot disponibles, écosystème mature). Ethereum est plus complexe mais ouvre la porte à la DeFi et aux NFT. Beaucoup de portefeuilles débutants détiennent les deux. Comparatif détaillé : /comparer/bitcoin-vs-ethereum.",
  },
  {
    question: "Que faire si une plateforme crypto fait faillite (FTX-style) ?",
    answer:
      "1) Garder ses cryptos sur exchange = plateforme contrôle tes clés → risque max. 2) Au-delà de quelques centaines d'euros que tu ne trades pas, transfère vers un hardware wallet (Ledger, Trezor). 3) Vérifie systématiquement le statut MiCA + Proof-of-Reserves de ta plateforme. Notre méthode complète : /methodologie.",
  },
];

function getFaqOfTheDay(): { question: string; answer: string } {
  // Rotation déterministe sur jour de l'année
  const startOfYear = new Date(new Date().getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (Date.now() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
  );
  return ROTATING_FAQS[dayOfYear % ROTATING_FAQS.length];
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function fmtEur(n: number, compact = false): string {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  });
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)} %`;
}

function fmtDateFrench(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function slugDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* -------------------------------------------------------------------------- */
/*  Génération du brief MDX                                                   */
/* -------------------------------------------------------------------------- */

interface BriefData {
  date: Date;
  topMovers: Array<{
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    id: string;
  }>;
  bestPerformer: { name: string; change24h: number; symbol: string } | null;
  worstPerformer: { name: string; change24h: number; symbol: string } | null;
  totalMarketCap: number;
  upcomingEvents: Array<{
    cryptoName: string;
    title: string;
    daysUntil: number;
    importance: string;
  }>;
  faq: { question: string; answer: string };
}

async function buildBriefData(): Promise<BriefData> {
  const market = await fetchTopMarket(20);
  // Top 5 par variation absolue (positive ou négative) pour donner du dynamisme
  const sorted = [...market].sort(
    (a, b) => Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h),
  );
  const topMovers = sorted.slice(0, 5).map((m) => ({
    name: m.name,
    symbol: m.symbol.toUpperCase(),
    price: m.currentPrice,
    change24h: m.priceChange24h,
    id: m.id,
  }));

  const byChange = [...market].sort((a, b) => b.priceChange24h - a.priceChange24h);
  const bestPerformer = byChange[0]
    ? {
        name: byChange[0].name,
        symbol: byChange[0].symbol.toUpperCase(),
        change24h: byChange[0].priceChange24h,
      }
    : null;
  const worstPerformer = byChange[byChange.length - 1]
    ? {
        name: byChange[byChange.length - 1].name,
        symbol: byChange[byChange.length - 1].symbol.toUpperCase(),
        change24h: byChange[byChange.length - 1].priceChange24h,
      }
    : null;

  const totalMarketCap = market.reduce((sum, m) => sum + (m.marketCap ?? 0), 0);

  // 3 prochains événements (uniquement ceux dans les 30 prochains jours)
  const allEvents = getAllUpcomingEvents(20);
  const upcomingEvents = allEvents
    .filter((e) => e.daysUntil <= 30)
    .slice(0, 3)
    .map((e) => ({
      cryptoName: e.cryptoName,
      title: e.title,
      daysUntil: e.daysUntil,
      importance: e.importance,
    }));

  return {
    date: new Date(),
    topMovers,
    bestPerformer,
    worstPerformer,
    totalMarketCap,
    upcomingEvents,
    faq: getFaqOfTheDay(),
  };
}

function buildMdxContent(data: BriefData): string {
  const dateLong = fmtDateFrench(data.date);
  const slug = slugDate(data.date);

  // Trend label dynamique selon variation moyenne
  const avgChange =
    data.topMovers.reduce((s, m) => s + m.change24h, 0) / data.topMovers.length;
  const trendLabel =
    avgChange >= 1
      ? "**Marché crypto en hausse** 📈"
      : avgChange <= -1
        ? "**Marché crypto sous pression** 📉"
        : "**Marché crypto stable** ➡️";

  const moversTable = data.topMovers
    .map(
      (m) =>
        `| [${m.name} (${m.symbol})](/cryptos/${m.id}) | ${fmtEur(m.price)} | ${m.change24h >= 0 ? "🟢" : "🔴"} ${fmtPct(m.change24h)} |`,
    )
    .join("\n");

  const eventsList =
    data.upcomingEvents.length > 0
      ? data.upcomingEvents
          .map(
            (e) =>
              `- **${e.cryptoName} — ${e.title}** : dans ${e.daysUntil} jour${e.daysUntil > 1 ? "s" : ""} (${e.importance === "high" ? "important" : e.importance === "medium" ? "à suivre" : "notable"})`,
          )
          .join("\n")
      : "_Aucun événement majeur dans les 30 prochains jours._";

  const description = `Brief crypto du ${dateLong} — top movers, tendance générale, événements à venir et FAQ. Lecture 3 minutes.`;

  return `---
title: "Café Crypto 7h — ${dateLong}"
description: "${description.replace(/"/g, '\\"')}"
date: "${data.date.toISOString()}"
author: "kevin-voisin"
category: "actualités"
tags: ["brief quotidien", "marché crypto", "actualité crypto FR"]
slug: "daily-brief-${slug}"
keywords: ["brief crypto", "actualité crypto FR", "marché crypto aujourd'hui", "top crypto ${data.date.getUTCFullYear()}"]
---

import { Callout } from "@/components/mdx/Callout";

<Callout type="info" title="Café Crypto 7h">
  Ton récap quotidien des marchés crypto en France, généré automatiquement à partir des données CoinGecko fiables. ${trendLabel} ce matin.
</Callout>

## 📊 Top 5 mouvements 24h

Variation absolue la plus forte parmi les 20 plus grosses capitalisations.

| Crypto | Prix | Variation 24h |
|---|---|---|
${moversTable}

${
  data.bestPerformer && data.worstPerformer
    ? `**🏆 Meilleure perf 24h** : ${data.bestPerformer.name} (${fmtPct(data.bestPerformer.change24h)})
**📉 Pire perf 24h** : ${data.worstPerformer.name} (${fmtPct(data.worstPerformer.change24h)})
**💰 Capitalisation top 20 cumulée** : ${fmtEur(data.totalMarketCap, true)}`
    : ""
}

## 📅 Événements crypto à surveiller

${eventsList}

## 💡 La question du jour

**${data.faq.question}**

${data.faq.answer}

---

## ⚡ Outils Cryptoreflex

- [📊 100 fiches crypto analysées](/cryptos) — score fiabilité, on-chain live, roadmap
- [⚖️ Comparer 2 cryptos face à face](/comparer) — 105 duels prêts
- [🧮 Calculateur fiscalité PFU 30%](/outils/calculateur-fiscalite) — gratuit
- [🚨 Radar 3916-bis](/outils/radar-3916-bis) — détecte tes amendes potentielles

<Callout type="warning" title="Pas un conseil financier">
  Ce brief est une synthèse pédagogique automatisée des données de marché publiques (CoinGecko). Il ne constitue pas un conseil d'investissement. Cryptoreflex n'est pas Prestataire de Services sur Actifs Numériques (PSAN/CASP). Investir en crypto comporte un risque de perte en capital.
</Callout>

_Brief généré automatiquement le ${dateLong} à 7h00 (Europe/Paris). Source data : CoinGecko, Cryptoreflex éditorial. Disclaimer complet : [/transparence](${BRAND.url}/transparence)._
`;
}

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

interface BriefResponse {
  ok: boolean;
  date: string;
  slug?: string;
  filepath?: string;
  topMoversCount?: number;
  upcomingEventsCount?: number;
  error?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse<BriefResponse>> {
  // Auth Bearer (cron Vercel)
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    return NextResponse.json(
      { ok: false, date: "", error: "Not found" },
      { status: 404 },
    );
  }

  try {
    const data = await buildBriefData();
    const slug = `daily-brief-${slugDate(data.date)}`;
    const mdx = buildMdxContent(data);

    // Write file
    await fs.mkdir(NEWS_DIR, { recursive: true });
    const filepath = path.join(NEWS_DIR, `${slug}.mdx`);
    await fs.writeFile(filepath, mdx, "utf8");

    console.log(`[daily-brief] ✓ Brief généré : ${slug} (${mdx.length} chars)`);

    return NextResponse.json({
      ok: true,
      date: data.date.toISOString(),
      slug,
      filepath,
      topMoversCount: data.topMovers.length,
      upcomingEventsCount: data.upcomingEvents.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[daily-brief] Error:", msg);
    return NextResponse.json(
      { ok: false, date: new Date().toISOString(), error: msg },
      { status: 500 },
    );
  }
}
