import type { Metadata } from "next";
import { Mail, Users, TrendingUp, Megaphone, ShieldCheck, Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Partenariats & Sponsors",
  description:
    "Tu es une plateforme crypto, un wallet ou un projet Web3 ? Découvre nos formats sponsorisés, audience et tarifs.",
};

const STATS = [
  { value: "—", label: "Visiteurs uniques / mois", Icon: Users, hint: "À mesurer" },
  { value: "—", label: "Pages vues / mois", Icon: TrendingUp, hint: "À mesurer" },
  { value: "FR + EU", label: "Audience principale", Icon: Megaphone, hint: "Investisseurs débutants à confirmés" },
  { value: "100 %", label: "Contenu original", Icon: ShieldCheck, hint: "Aucun copier-coller" },
];

const FORMATS = [
  {
    title: "Carte plateforme sponsorisée",
    description:
      "Ta plateforme mise en avant en page d'accueil avec badge dédié, bonus de bienvenue et CTA tracé.",
    deliverables: ["Carte premium en home", "Badge \"Partenaire\"", "Lien d'affiliation tracé", "Reporting mensuel"],
  },
  {
    title: "Article de fond dédié",
    description:
      "Un guide approfondi (1 500–2 500 mots) sur ton produit, optimisé SEO sur les requêtes de ta cible.",
    deliverables: ["Article original ≥ 1 500 mots", "Optimisation SEO", "Mise à jour 1×/an incluse", "Disclosure transparent"],
  },
  {
    title: "Newsletter sponsor",
    description:
      "Encart dédié dans la newsletter mensuelle envoyée aux lecteurs les plus engagés.",
    deliverables: ["Encart 200 mots", "Image / logo", "Lien tracé", "Stats d'ouverture & clics"],
  },
];

export default function PartenariatsPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Sparkles className="h-3.5 w-3.5" />
            Pour les marques
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Touchez une audience <span className="gradient-text">crypto francophone qualifiée</span>
          </h1>
          <p className="mt-4 text-white/70 text-lg">
            {BRAND.name} aide les Français à choisir où acheter leurs cryptos. Si ta
            plateforme veut être recommandée à des investisseurs en phase de décision,
            discutons-en.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(({ value, label, Icon, hint }) => (
            <div key={label} className="glass rounded-2xl p-5">
              <Icon className="h-6 w-6 text-accent-cyan mb-3" />
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-sm text-white/80 mt-1">{label}</div>
              <div className="text-xs text-muted mt-1">{hint}</div>
            </div>
          ))}
        </div>

        {/* Formats */}
        <div className="mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold">Formats disponibles</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {FORMATS.map((f) => (
              <div key={f.title} className="glass glow-border rounded-2xl p-6">
                <h3 className="font-semibold text-lg text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-white/70">{f.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-white/80">
                  {f.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-cyan shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 glass glow-border rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-extrabold">
              Discutons d'un <span className="gradient-text">partenariat</span>
            </h2>
            <p className="mt-3 text-white/70">
              Envoie un email avec ton brief — taille de la marque, objectif (acquisition,
              awareness, lancement) et budget approximatif. Réponse sous 48h.
            </p>
            <a
              href={`mailto:${BRAND.partnersEmail}?subject=Partenariat%20${BRAND.name}`}
              className="btn-primary mt-6"
            >
              <Mail className="h-4 w-4" />
              {BRAND.partnersEmail}
            </a>
            <p className="mt-4 text-xs text-muted">
              Tous les contenus sponsorisés sont signalés avec mention « Sponsorisé » et
              respectent la charte ARPP / autorité des marchés.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
