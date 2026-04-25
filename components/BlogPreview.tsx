import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  /** Tailwind gradient utilities used for the cover */
  gradient: string;
}

export const ARTICLES: Article[] = [
  {
    slug: "guide-debutant-bitcoin",
    title: "Bitcoin : le guide complet pour débuter en 2026",
    excerpt:
      "Comprendre Bitcoin sans jargon, choisir sa plateforme, faire son premier achat et stocker ses BTC en sécurité.",
    category: "Débutant",
    readTime: "8 min",
    date: "2026-04-12",
    gradient: "from-amber-500/40 to-orange-600/40",
  },
  {
    slug: "wallet-froid-vs-chaud",
    title: "Wallet froid vs wallet chaud : que choisir ?",
    excerpt:
      "Différences entre les deux, cas d'usage concrets et comment combiner les deux pour une sécurité optimale.",
    category: "Sécurité",
    readTime: "6 min",
    date: "2026-04-05",
    gradient: "from-cyan-500/40 to-blue-600/40",
  },
  {
    slug: "fiscalite-crypto-france",
    title: "Fiscalité crypto en France : ce qu'il faut savoir",
    excerpt:
      "Flat tax, déclaration des comptes étrangers, plus-values, NFT… tout ce qui change pour 2026.",
    category: "Fiscalité",
    readTime: "10 min",
    date: "2026-03-28",
    gradient: "from-emerald-500/40 to-teal-600/40",
  },
];

export default function BlogPreview() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-rose/30 bg-accent-rose/10 px-3 py-1 text-xs font-semibold text-accent-rose">
              <BookOpen className="h-3.5 w-3.5" />
              Blog & Guides
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Apprenez la crypto, <span className="gradient-text">étape par étape</span>
            </h2>
          </div>
          <Link href="/blog" className="btn-ghost text-sm py-2.5 self-start">
            Tous les articles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ARTICLES.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group glass rounded-2xl overflow-hidden hover:translate-y-[-2px] transition-transform"
            >
              <div className={`relative h-40 bg-gradient-to-br ${a.gradient}`}>
                <div className="absolute inset-0 bg-grid opacity-30" />
                <span className="absolute top-3 left-3 rounded-full bg-background/70 backdrop-blur px-2.5 py-1 text-xs font-semibold">
                  {a.category}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg text-white group-hover:text-primary-glow transition-colors">
                  {a.title}
                </h3>
                <p className="mt-2 text-sm text-white/70 line-clamp-3">{a.excerpt}</p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {a.readTime}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(a.date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
