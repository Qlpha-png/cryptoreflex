import { Banknote, CircleDollarSign, Coins, Wallet, Bitcoin, ShieldCheck } from "lucide-react";
import PlatformCard, { type Platform } from "./PlatformCard";
import AmfDisclaimer from "./AmfDisclaimer";

/**
 * Liens directs vers les plateformes pour le moment (pas de programme affilié actif).
 * Quand un programme sera signé, il suffira d'ajouter `?ref=...` à l'URL concernée.
 *
 * Pour faciliter le tracking pré-affiliation, on ajoute déjà des UTM internes
 * pour mesurer le volume de clics par carte (utilisable dans Plausible/GA).
 *
 * Le rendu utilise `<AffiliateLink>` (via PlatformCard) qui :
 *  - applique automatiquement rel="sponsored nofollow noopener noreferrer"
 *  - tracke chaque clic dans Plausible avec l'event "Affiliate Click"
 *    et les props { platform, placement: "home-platforms" }.
 */
import { BRAND } from "@/lib/brand";

const utm = (source: string) =>
  `utm_source=${BRAND.utmSource}&utm_medium=affiliate-card&utm_campaign=${source}`;

const PLATFORMS: Platform[] = [
  {
    id: "revolut",
    name: "Revolut",
    tagline:
      "L'app bancaire qui permet aussi d'acheter de la crypto en quelques secondes — idéal pour démarrer.",
    rating: 4.5,
    // Audit P1-9 (2026-04-26) : bonus chiffrés obsolètes en zone UE post-MiCA.
    // On affiche un libellé générique pour rester conforme à la loi commerciale FR
    // (pas de promesse engageante non vérifiée). Détails à voir sur la plateforme.
    bonus: "Bonus actuel — voir conditions sur la plateforme",
    features: [
      "Achat de 100+ cryptos en un clic",
      "Compte multi-devises",
      "Pas de minimum de dépôt",
    ],
    affiliateUrl: `https://www.revolut.com/?${utm("revolut")}`,
    Icon: Banknote,
    gradient: "from-slate-700 to-slate-900",
    badge: "Pour débutants",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    tagline:
      "L'une des plateformes les plus régulées au monde, parfaite pour acheter ses premières cryptos en toute sérénité.",
    rating: 4.6,
    bonus: "Bonus actuel — voir conditions sur la plateforme",
    features: [
      "Régulée aux US et en Europe",
      "Interface ultra simple",
      "Coinbase Earn : crypto gratuite",
    ],
    affiliateUrl: `https://www.coinbase.com/?${utm("coinbase")}`,
    Icon: CircleDollarSign,
    gradient: "from-blue-500 to-indigo-600",
    badge: "Recommandé",
  },
  {
    id: "binance",
    name: "Binance",
    tagline:
      "Le plus grand exchange au monde — frais bas et catalogue de cryptos imbattable pour aller plus loin.",
    rating: 4.7,
    bonus: "Bonus actuel — voir conditions sur la plateforme",
    features: [
      "Frais à partir de 0,1%",
      "+350 cryptos disponibles",
      "Staking, Earn, Futures…",
    ],
    affiliateUrl: `https://www.binance.com/?${utm("binance")}`,
    Icon: Coins,
    gradient: "from-yellow-400 to-amber-600",
  },
  {
    id: "bitpanda",
    name: "Bitpanda",
    tagline:
      "Plateforme européenne 100% régulée — crypto, actions et métaux précieux dans la même app.",
    rating: 4.4,
    bonus: "Bonus actuel — voir conditions sur la plateforme",
    features: [
      "Basée en Autriche, conforme MiCA",
      "Investissement programmé (DCA)",
      "Carte Bitpanda VISA disponible",
    ],
    affiliateUrl: `https://www.bitpanda.com/?${utm("bitpanda")}`,
    Icon: ShieldCheck,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "kraken",
    name: "Kraken",
    tagline:
      "Pionnier du secteur, réputé pour sa sécurité et sa transparence — un favori des investisseurs sérieux.",
    rating: 4.5,
    bonus: "Bonus actuel — voir conditions sur la plateforme",
    features: [
      "Réserves prouvées (Proof of Reserves)",
      "Interface Pro pour traders",
      "Staking sécurisé",
    ],
    affiliateUrl: `https://www.kraken.com/?${utm("kraken")}`,
    Icon: Wallet,
    gradient: "from-purple-600 to-fuchsia-600",
  },
  {
    id: "ledger",
    name: "Ledger",
    tagline:
      "Le portefeuille matériel le plus vendu au monde — pour stocker tes cryptos hors ligne, en sécurité.",
    rating: 4.8,
    bonus: "Promotions matériel — voir boutique officielle",
    features: [
      "Sécurité hardware niveau bancaire",
      "Compatible 5 500+ cryptos",
      "App Ledger Live intégrée",
    ],
    affiliateUrl: `https://shop.ledger.com/?${utm("ledger")}`,
    Icon: Bitcoin,
    gradient: "from-rose-500 to-pink-600",
    badge: "Sécurité",
  },
];

export default function PlatformsSection() {
  return (
    <section id="plateformes" className="relative py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1 text-xs font-semibold text-accent-cyan">
            Top 6
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Les meilleures <span className="gradient-text">plateformes crypto</span>
          </h2>
          <p className="mt-3 text-base sm:text-base text-white/70 leading-relaxed">
            Sélection des exchanges et wallets les plus fiables. Cliquer sur une carte
            ouvre la plateforme partenaire (vérifie les bonus en cours sur place).
          </p>
        </div>

        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {PLATFORMS.map((p) => (
            // `placement` est tracké côté analytics — utile pour comparer
            // le CTR de la home vs comparatifs vs reviews.
            <PlatformCard key={p.name} platform={p} placement="home-platforms" />
          ))}
        </div>

        <p className="mt-6 sm:mt-8 text-xs text-muted leading-relaxed">
          Liens d'affiliation : nous touchons une commission si tu t'inscris via ces
          liens, sans surcoût pour toi. Cela nous permet de garder le site gratuit.
        </p>

        {/* Avertissement AMF — article 222-15 */}
        <AmfDisclaimer variant="comparatif" className="mt-6" />
      </div>
    </section>
  );
}
