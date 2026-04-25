import topCryptosData from "@/data/top-cryptos.json";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";

interface TopCrypto {
  rank: number;
  id: string;
  name: string;
  symbol: string;
  yearCreated: number;
  category: string;
  tagline: string;
  what: string;
  useCase: string;
  beginnerFriendly: number;
  riskLevel: "Très faible" | "Faible" | "Modéré" | "Élevé" | "Très élevé";
  whereToBuy: string[];
  strengths: string[];
}

const RISK_COLORS: Record<string, string> = {
  "Très faible": "text-accent-green",
  Faible: "text-accent-green",
  Modéré: "text-amber-400",
  Élevé: "text-accent-rose",
  "Très élevé": "text-accent-rose",
};

/**
 * Bloc "Top 10 cryptomonnaies expliquées" — éducatif pour débutants FR.
 * Chaque carte = nom + ticker + tagline + explication + risque + où acheter.
 */
export default function Top10CryptosSection() {
  const cryptos = (topCryptosData.topCryptos as TopCrypto[]).slice(0, 10);

  return (
    <section id="top10" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="badge-info">
            <GraduationCap className="h-3.5 w-3.5" />
            Pédagogique
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Top 10 cryptos <span className="gradient-text">expliquées simplement</span>
          </h2>
          <p className="mt-2 text-muted text-sm max-w-2xl">
            Les 10 plus grosses cryptomonnaies du moment, expliquées en 2 phrases pour qu'un
            débutant comprenne ce que c'est et à quoi ça sert. Sans jargon.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {cryptos.map((c) => (
            <CryptoCard key={c.id} crypto={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CryptoCard({ crypto }: { crypto: TopCrypto }) {
  return (
    <article className="glass rounded-2xl p-6 hover:border-primary/50 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold font-mono text-sm shrink-0">
            #{crypto.rank}
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-fg truncate">
              {crypto.name}{" "}
              <span className="text-muted font-mono text-sm">{crypto.symbol}</span>
            </h3>
            <p className="text-xs text-muted truncate">{crypto.category} · {crypto.yearCreated}</p>
          </div>
        </div>

        <span className={`text-xs font-semibold whitespace-nowrap ${RISK_COLORS[crypto.riskLevel]}`}>
          ● {crypto.riskLevel}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-primary-soft italic">{crypto.tagline}</p>

      <p className="mt-3 text-sm text-fg/80 leading-relaxed">{crypto.what}</p>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
          À quoi ça sert
        </div>
        <p className="text-sm text-fg/75 leading-relaxed line-clamp-3">{crypto.useCase}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-xs">
        <div className="inline-flex items-center gap-1 text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-green" />
          <span>Disponible sur :</span>
          <span className="text-fg font-medium">{crypto.whereToBuy.slice(0, 3).join(", ")}</span>
        </div>
        <a
          href={`#plateformes`}
          className="inline-flex items-center gap-1 text-primary-soft font-semibold hover:text-primary"
        >
          Acheter
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}
