import Link from "next/link";
import { ShieldCheck, ExternalLink, Smartphone, HardDrive, Globe } from "lucide-react";
import type { WalletRecommendation } from "@/lib/crypto-wallets";

interface Props {
  cryptoName: string;
  cryptoSymbol: string;
  chain: string;
  recommendations: WalletRecommendation[];
}

/**
 * Section "Wallets recommandés" :
 * - Affiche 3 à 4 wallets adaptés à la chain de la crypto
 * - Distingue hardware / browser / mobile / custodial
 * - Liens internes vers /avis/ledger ou /avis/trezor (vrais affiliés)
 *
 * Section pédagogique post-acheter : "tu as acheté, maintenant où le sécuriser ?"
 */
export default function RecommendedWallets({
  cryptoName,
  cryptoSymbol,
  chain,
  recommendations,
}: Props) {
  if (!recommendations.length) return null;

  return (
    <section id="wallets" className="scroll-mt-24">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Où stocker tes {cryptoSymbol} en sécurité ?
        </h2>
        <span className="text-xs text-muted font-mono">
          Chain : <span className="text-fg/70">{chain}</span>
        </span>
      </div>
      <p className="mt-2 text-sm text-muted max-w-3xl">
        Acheter sur une plateforme régulée, c&apos;est l&apos;étape 1. L&apos;étape 2 — souvent
        oubliée — c&apos;est <strong className="text-fg">retirer ses cryptos vers un wallet
        dont tu contrôles les clés</strong>. Voici les wallets compatibles avec {cryptoName} adaptés à
        chaque profil.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {recommendations.map((w) => (
          <WalletRow key={w.name} wallet={w} />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-elevated/40 p-4 text-xs text-muted leading-relaxed">
        <strong className="text-fg">Règle d&apos;or :</strong> au-delà de quelques centaines
        d&apos;euros que tu ne comptes pas trader, transfère vers un hardware wallet (Ledger ou
        Trezor). Garder &quot;sur la plateforme&quot; = la plateforme contrôle tes clés. En cas
        de hack, faillite ou gel de compte, tu perds tout.
      </div>
    </section>
  );
}

function iconForType(type: string) {
  const t = type.toLowerCase();
  if (t.includes("hardware")) return <HardDrive className="h-4 w-4" />;
  if (t.includes("mobile") || t.includes("phone")) return <Smartphone className="h-4 w-4" />;
  if (t.includes("browser") || t.includes("desktop") || t.includes("extension"))
    return <Globe className="h-4 w-4" />;
  if (t.includes("custodial")) return <ShieldCheck className="h-4 w-4" />;
  return <Globe className="h-4 w-4" />;
}

function levelColor(level: string): string {
  const l = level.toLowerCase();
  if (l.includes("recommandé")) return "text-accent-green border-accent-green/30 bg-accent-green/10";
  if (l.includes("alternative")) return "text-fg/70 border-border bg-surface/40";
  if (l.includes("court terme") || l.includes("uniquement"))
    return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-fg/70 border-border bg-surface/40";
}

function WalletRow({ wallet }: { wallet: WalletRecommendation }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-fg/60">{iconForType(wallet.type)}</span>
            <h3 className="text-base font-bold text-fg">{wallet.name}</h3>
          </div>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">
            {wallet.type}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${levelColor(wallet.level)}`}
        >
          {wallet.level}
        </span>
      </div>

      <p className="mt-3 text-xs text-muted leading-relaxed flex-1">{wallet.note}</p>

      {wallet.url && (
        <Link
          href={wallet.url}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Lire notre avis détaillé
          <ExternalLink className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
