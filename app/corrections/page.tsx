/**
 * /corrections — Journal des corrections (06/10/2026).
 *
 * Tient la promesse de /charte : « Pas de correction silencieuse ». Alimenté par data/corrections.json
 * (date, page, avant, après, nature) ; les entrées du 06/10/2026 sont rétroactives (commit 8d378104 et
 * corrections éditoriales du même jour). Aucune date n'est écrite ici : tout vient du fichier.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { History, Mail } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { graphSchema } from "@/lib/schema";
import { BRAND } from "@/lib/brand";
import { getAllCorrections, type Correction } from "@/lib/corrections";
import { formatDateFr } from "@/lib/engagements";
import { withHreflang } from "@/lib/seo-alternates";
import Breadcrumbs from "@/components/Breadcrumbs";

const PAGE_PATH = "/corrections";
const REPO_URL = "https://github.com/Qlpha-png/cryptoreflex";

export const metadata: Metadata = {
  title: "Journal des corrections",
  description: `Toutes les corrections apportées aux pages de ${BRAND.name} : date, page, texte avant et après, nature de l'erreur. Pas de correction silencieuse.`,
  alternates: withHreflang(`${BRAND.url}${PAGE_PATH}`),
  openGraph: {
    title: `Journal des corrections — ${BRAND.name}`,
    description: "Date, page, avant, après et nature de chaque correction.",
    url: `${BRAND.url}${PAGE_PATH}`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

/** Regroupe les corrections par date (déjà triées de la plus récente à la plus ancienne). */
function groupByDate(list: Correction[]): Array<{ date: string; items: Correction[] }> {
  const groups: Array<{ date: string; items: Correction[] }> = [];
  for (const c of list) {
    const last = groups[groups.length - 1];
    if (last && last.date === c.date) last.items.push(c);
    else groups.push({ date: c.date, items: [c] });
  }
  return groups;
}

export default function CorrectionsPage() {
  const corrections = getAllCorrections();
  const groups = groupByDate(corrections);
  const latest = corrections[0]?.date ?? null;

  const ld = graphSchema([
  ]);

  return (
    <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <StructuredData id="corrections-jsonld" data={ld} />

      <Breadcrumbs chemin="/corrections" />

      <header className="mt-6">
        <h1 className="flex items-center gap-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
          <History className="h-8 w-8 text-primary-soft" aria-hidden="true" />
          Journal des corrections
        </h1>
        <p className="mt-4 text-fg/80 leading-relaxed">
          Depuis le 6 octobre 2026, chaque erreur de fait corrigée sur {BRAND.name} est inscrite ici : la date, la page, le texte avant et
          après, et la nature de l&apos;erreur. Les articles corrigés portent aussi la mention « Corrigé
          le … » en bas de page. Les modifications sont visibles dans l&apos;historique du{" "}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-primary-soft underline hover:text-primary">
            dépôt public du site
          </a>
          .
        </p>
        <p className="mt-3 text-sm text-muted">
          {corrections.length} correction{corrections.length > 1 ? "s" : ""} inscrite
          {corrections.length > 1 ? "s" : ""}
          {latest ? ` · dernière inscription le ${formatDateFr(latest)}` : ""}.
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="mt-10 text-fg/80">Aucune correction inscrite pour le moment.</p>
      ) : (
        groups.map((g) => (
          <section key={g.date} aria-labelledby={`corr-${g.date}`} className="mt-12">
            <h2 id={`corr-${g.date}`} className="text-xl font-bold text-fg">
              <time dateTime={g.date}>{formatDateFr(g.date)}</time>
              <span className="ml-2 text-sm font-normal text-muted">
                ({g.items.length} correction{g.items.length > 1 ? "s" : ""})
              </span>
            </h2>
            <ol className="mt-4 space-y-4">
              {g.items.map((c, i) => (
                <li key={`${c.page}-${i}`} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                  <p className="text-sm">
                    <span className="text-muted">Page : </span>
                    <Link href={c.page} className="font-semibold text-primary-soft underline-offset-4 hover:underline">
                      {c.page}
                    </Link>
                  </p>
                  <p className="mt-1 text-sm font-semibold text-fg">{c.nature}</p>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg border border-danger/20 bg-danger/5 p-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Avant</dt>
                      <dd className="mt-1 text-fg/85">{c.avant}</dd>
                    </div>
                    <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Après</dt>
                      <dd className="mt-1 text-fg/85">{c.après}</dd>
                    </div>
                  </dl>
                  {c.commit && (
                    <p className="mt-2 text-xs text-muted">
                      Modification :{" "}
                      <a
                        href={`${REPO_URL}/commit/${c.commit}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono underline hover:text-fg"
                      >
                        {c.commit}
                      </a>
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))
      )}

      <section className="mt-14 rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-fg">
          <Mail className="h-5 w-5 text-primary-soft" aria-hidden="true" />
          Vous avez repéré une erreur&nbsp;?
        </h2>
        <p className="mt-2 text-sm text-fg/80 leading-relaxed">
          Écrivez à{" "}
          <a href={`mailto:${BRAND.email}`} className="text-primary-soft underline hover:text-primary">
            {BRAND.email}
          </a>{" "}
          avec l&apos;adresse de la page et l&apos;erreur constatée. La façon dont les corrections sont
          traitées est décrite dans la{" "}
          <Link href="/charte" className="text-primary-soft underline hover:text-primary">
            charte éditoriale
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
