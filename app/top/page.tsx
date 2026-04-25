import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";

import { ALL_LISTICLES } from "@/lib/listicles";
import { BRAND } from "@/lib/brand";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Tous les classements crypto Cryptoreflex 2026",
  description:
    "Tous nos classements et tops crypto 2026 : meilleures plateformes, hidden gems, exchanges les moins chers, plateformes pour débuter, etc.",
  alternates: { canonical: `${BRAND.url}/top` },
};

export default function TopIndexPage() {
  const platformLists = ALL_LISTICLES.filter((l) => l.kind === "platform");
  const cryptoLists = ALL_LISTICLES.filter((l) => l.kind === "crypto");

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Trophy className="h-3.5 w-3.5" />
            Classements Cryptoreflex
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Tous les <span className="gradient-text">classements crypto</span> 2026
          </h1>
          <p className="mt-3 text-fg/70">
            Tops data-driven mis à jour automatiquement quand un scoring change. Pas de pseudo-classements promotionnels.
          </p>
        </div>

        <ListiclesGroup title="Plateformes" items={platformLists} />
        <ListiclesGroup title="Cryptomonnaies" items={cryptoLists} />
      </div>
    </section>
  );
}

function ListiclesGroup({
  title,
  items,
}: {
  title: string;
  items: typeof ALL_LISTICLES;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold text-fg">{title}</h2>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((l) => (
          <Link
            key={l.slug}
            href={`/top/${l.slug}`}
            className="group glass rounded-2xl p-6 hover:border-primary/50 transition-colors flex flex-col"
          >
            <h3 className="font-bold text-lg text-fg group-hover:text-primary-glow transition-colors">
              {l.h1}
            </h3>
            <p className="mt-2 text-sm text-fg/70 flex-1 leading-relaxed">{l.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-soft">
              Voir le classement
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
