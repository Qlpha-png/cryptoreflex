import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MarketCoin } from "@/lib/coingecko";
import { cryptoPagePath } from "@/lib/crypto-page-slug";
import { getCryptoLogo, getCryptoLogoFromSymbol } from "@/lib/crypto-logos";
import { getAllNewsSummaries } from "@/lib/news-mdx";
import HomeLivePrices from "./HomeLivePrices";

/**
 * « Le marché aujourd'hui » : 5 cours en direct + les 3 dernières actus crypto (accueil, Kev 04/10/2026).
 * Les actus viennent des fichiers publiés par le robot (content/news), hors brief quotidien ; aucune actu n'est
 * affichée si la plus récente a plus de 7 jours (pas de « dernières actus » périmées).
 */

const DAY = 86_400_000;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

export default async function HomeMarketToday({ market }: { market: MarketCoin[] }) {
  const coins = market.slice(0, 5).map((m) => ({
    id: m.id,
    symbol: m.symbol,
    name: m.name,
    // le flux de marché arrive parfois sans logo (src vide = 5 images cassées sur l'accueil, audit du 05/10/2026)
    image: m.image || getCryptoLogo(m.id) || getCryptoLogoFromSymbol(m.symbol) || "",
    price: m.currentPrice,
    change24h: m.priceChange24h,
    href: cryptoPagePath(m.id),
  }));
  const news = (await getAllNewsSummaries())
    .filter((n) => !n.isBrief)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 3);
  const fresh = news.length > 0 && Date.now() - Date.parse(news[0].date) < 7 * DAY;

  return (
    <section aria-labelledby="home-market-title" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <h2 id="home-market-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Le marché aujourd&apos;hui
        </h2>
        <Link href="/marche" className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary sm:inline-flex">
          Tout le marché <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {coins.length > 0 ? (
          <HomeLivePrices coins={coins} />
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-fg/75">
            Les cours ne sont pas disponibles pour le moment.{" "}
            <Link href="/marche" className="text-primary-soft underline">Voir le marché en direct</Link>.
          </p>
        )}

        <div>
          <h3 className="text-base font-bold text-fg">Les dernières actus</h3>
          {fresh ? (
            <ul className="mt-3 space-y-3">
              {news.map((n) => (
                <li key={n.slug}>
                  <Link
                    href={`/actualites/${n.slug}`}
                    className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-primary/50"
                  >
                    <span className="text-xs text-fg/60">
                      {fmtDate(n.date)} · {n.category}
                    </span>
                    <span className="mt-1 block text-sm font-semibold leading-snug text-fg">{n.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-fg/70">Pas d&apos;actu récente pour le moment.</p>
          )}
          <Link href="/actualites" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary">
            Toutes les actus <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
