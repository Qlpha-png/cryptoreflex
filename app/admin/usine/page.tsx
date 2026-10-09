/**
 * /admin/usine — L'USINE : salle de contrôle des robots, agents IA et gardes-fous de cryptoreflex.fr (09/10/2026).
 *
 * Kev : « une vraie usine autonome d'agents pour le site, qui actualise, entretient, protège, améliore… un système
 * avec une application où je vois comment ça avance et la production ». Cette page est l'application : un seul écran,
 * lu toutes les 60 s, qui montre les 4 ateliers (Actualiser, Entretenir, Protéger, Améliorer), la chaîne du jour, la
 * production, la protection (sentinelle, budget, fraîcheur) et les pull requests des agents IA.
 *
 * Données : lib/usine/etat.ts (API GitHub, KV, fichiers du dépôt, CoinMarketCap) ; registre : scripts/lib/usine-registre.mjs.
 * Accès : administrateurs seulement (ADMIN_EMAILS), 404 strict sinon — même règle que /admin. Page noindex.
 * Rendu : Server Component, un seul îlot client pour le rafraîchissement et un pour les boutons « Lancer ».
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Bot,
  Crown,
  ExternalLink,
  Factory,
  Gauge,
  GitPullRequest,
  Newspaper,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { DEPOT_ROBOTS } from "@/lib/gardien";
import { lireEtatUsine } from "@/lib/usine/etat";
import type { AtelierId, EtatChaine, EtatUsine, Jugement, Run, Statut } from "@/lib/usine/types";
import AutoRefresh from "@/components/admin/usine/AutoRefresh";
import BoutonLancer from "@/components/admin/usine/BoutonLancer";
import { estLancable } from "@/scripts/lib/usine-registre.mjs";
import { STATUTS, dateHeureParis, dateParis, depuis, heureParis } from "@/scripts/lib/usine-etat.mjs";

export const metadata: Metadata = {
  title: "Admin — L'Usine",
  description: "Salle de contrôle des robots, agents IA et gardes-fous de Cryptoreflex (réservé éditeur).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/*  Apparence                                                                 */
/* -------------------------------------------------------------------------- */

type Ton = "ok" | "attention" | "defaut" | "info" | "neutre";

const TON_CLASSES: Record<Ton, string> = {
  ok: "border-success-border bg-success-soft text-success-fg",
  attention: "border-warning-border bg-warning-soft text-warning-fg",
  defaut: "border-danger-border bg-danger-soft text-danger-fg",
  info: "border-info-border bg-info-soft text-info-fg",
  neutre: "border-border bg-elevated text-muted",
};

const STATUT_INFO = STATUTS as Record<string, { icone: string; libelle: string; ton: Ton }>;

const ETAT_CHAINE: Record<EtatChaine, { libelle: string; ton: Ton }> = {
  fait: { libelle: "fait", ton: "ok" },
  echec: { libelle: "échec", ton: "defaut" },
  "en-cours": { libelle: "en cours", ton: "info" },
  attendu: { libelle: "attendu", ton: "neutre" },
  manque: { libelle: "manqué", ton: "attention" },
  veille: { libelle: "en veille", ton: "neutre" },
  inconnu: { libelle: "non lu", ton: "neutre" },
};

const ICONES_ATELIER: Record<AtelierId, LucideIcon> = {
  actualiser: Newspaper,
  entretenir: Wrench,
  proteger: ShieldCheck,
  ameliorer: Bot,
};

const GENRE_LIBELLE = { robot: "robot", "agent-ia": "agent IA", "garde-fou": "garde-fou" } as const;

function tonConclusion(run: Run): { libelle: string; ton: Ton } {
  if (run.status !== "completed") return { libelle: run.status === "queued" ? "en attente" : "en cours", ton: "info" };
  switch (run.conclusion) {
    case "success":
      return { libelle: "réussi", ton: "ok" };
    case "failure":
    case "timed_out":
      return { libelle: run.conclusion === "failure" ? "échec" : "délai dépassé", ton: "defaut" };
    case "skipped":
      return { libelle: "sauté", ton: "neutre" };
    case "cancelled":
      return { libelle: "annulé", ton: "neutre" };
    default:
      return { libelle: run.conclusion ?? "?", ton: "neutre" };
  }
}

const nb = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("fr-FR") : "—");

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function UsinePage() {
  const user = await getUser();
  if (!user || !user.isAdmin) notFound();

  const etat = await lireEtatUsine();
  const parAtelier = (id: AtelierId) => etat.jugements.filter((j) => j.poste.atelier === id);
  const mesures = etat.jugements.filter((j) => j.poste.genre !== "garde-fou" && typeof j.poste.ageMaxH === "number");
  const aLHeure = mesures.filter((j) => j.statut === "ok" || j.statut === "en-cours").length;
  const agents = etat.jugements.filter((j) => j.poste.genre === "agent-ia");
  const agentsEnVeille = agents.filter((j) => j.statut === "veille" || j.statut === "jamais").length;

  return (
    <article className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/admin" className="hover:text-fg">Admin</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">L&apos;Usine</span>
        </nav>

        <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-glow/40 bg-primary-glow/10 px-3 py-1 text-xs font-bold text-primary-soft">
              <Crown className="h-3.5 w-3.5" aria-hidden />
              ADMIN — salle de contrôle
            </span>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              <Factory className="h-8 w-8 text-primary" aria-hidden />
              L&apos;Usine <span className="gradient-text">{BRAND.name}</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              {etat.jugements.length} postes dans 4 ateliers. Chaque robot prouve son travail ; chaque agent IA propose une pull request que
              tu relis ; rien ne part en ligne sans toi.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <AutoRefresh intervalleS={60} genereLe={etat.genereLe} />
            <Sources sources={etat.sources} />
          </div>
        </header>

        <Verdict etat={etat} />

        {/* Indicateurs */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Indicateur label="Actus publiées · 7 j" valeur={nb(etat.production.totaux.j7.actus)} accent="primary" detail={`${nb(etat.production.totaux.j30.actus)} sur 30 j`} />
          <Indicateur label="Analyses calculées · 7 j" valeur={nb(etat.production.totaux.j7.analyses)} accent="ice" detail={`${etat.analyses.length} pages vivantes`} />
          <Indicateur label="Articles de fond · 30 j" valeur={nb(etat.production.totaux.j30.articles)} accent="purple" detail={`${nb(Number(etat.compteurs.articles))} au total`} />
          <Indicateur label="Postes à l'heure" valeur={`${aLHeure}/${mesures.length}`} accent={aLHeure === mesures.length ? "emerald" : "amber"} detail={`${etat.verdict.echecs} en échec, ${etat.verdict.retards} à surveiller`} />
          <Indicateur label="PR des agents ouvertes" valeur={nb(etat.prs.ouvertes.length)} accent="purple" detail={`${nb(etat.prs.fusionnees.length)} fusionnées récemment`} />
          <Indicateur
            label="Budget CoinMarketCap"
            valeur={etat.budget.lu && typeof etat.budget.moisUtilises === "number" && etat.budget.moisPlafond ? `${Math.round((etat.budget.moisUtilises / etat.budget.moisPlafond) * 100)} %` : "—"}
            accent={etat.budget.niveau === "alerte" ? "amber" : "emerald"}
            detail={etat.budget.lu ? `${nb(etat.budget.moisUtilises)} / ${nb(etat.budget.moisPlafond)} crédits, frein ${etat.budget.frein?.etat ?? "non lu"}` : `non mesuré : ${etat.budget.raison ?? "?"}`}
          />
        </div>

        {/* Chaîne du jour */}
        <Section titre="Chaîne de production du jour" Icone={Activity} sousTitre={`Heure de Paris · jour UTC ${dateParis(etat.genereLe)} · les postes en continu (${etat.chaine.continus.map((p) => p.nom).join(", ") || "aucun"}) tournent toute la journée.`}>
          <TableauChaine etat={etat} />
        </Section>

        {/* Ateliers */}
        {etat.ateliers.map((atelier) => {
          const Icone = ICONES_ATELIER[atelier.id];
          const juges = parAtelier(atelier.id);
          return (
            <Section key={atelier.id} titre={`Atelier ${atelier.nom}`} Icone={Icone} sousTitre={atelier.description}>
              {atelier.id === "ameliorer" && <NoteAgents etat={etat} enVeille={agentsEnVeille} total={agents.length} />}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {juges.map((j) => (
                  <CartePoste key={j.poste.id} jugement={j} />
                ))}
              </div>
            </Section>
          );
        })}

        {/* Production */}
        <Section titre="Production des 14 derniers jours" Icone={Newspaper} sousTitre="Ce que l'usine a réellement fabriqué, jour par jour (jours UTC) : actualités, analyses techniques recalculées, articles de fond, corrections journalisées, pull requests d'agents fusionnées.">
          <TableauProduction etat={etat} />
        </Section>

        {/* Protection */}
        <Section titre="Protection : sentinelle, fraîcheur, budget" Icone={ShieldCheck} sousTitre="Ce que la sentinelle a vu à son dernier passage, l'état des 51 familles de données et la consommation du mois (0 € de dépassement, site jamais coupé).">
          <div className="grid gap-4 lg:grid-cols-2">
            <BlocSentinelle etat={etat} />
            <BlocConsommation etat={etat} />
          </div>
        </Section>

        {/* Agents IA */}
        <Section titre="Agents IA : ce qu'ils proposent" Icone={GitPullRequest} sousTitre="Chaque passage d'agent se termine par une pull request préfixée « Usine IA ». Tu relis, tu fusionnes ou tu refuses ; l'agent n'écrit jamais sur main.">
          <BlocPullRequests etat={etat} />
        </Section>

        {/* Journal */}
        <Section titre="Journal des 40 derniers passages" Icone={Gauge} sousTitre={`Tous les workflows du dépôt ${DEPOT_ROBOTS}, du plus récent au plus ancien.`}>
          <Journal runs={etat.journal} disponible={etat.sources.github} />
        </Section>

        <section className="mt-12 rounded-2xl border border-border bg-elevated/40 p-5 text-sm text-fg/80">
          <h3 className="mb-2 font-bold text-fg">📚 Comment lire cette page</h3>
          <ul className="list-inside list-disc space-y-1.5">
            <li>Un poste est <strong>à l&apos;heure</strong> quand son dernier passage a réussi depuis moins que son délai maximal ; <strong>en retard</strong> au-delà ; <strong>en échec</strong> si le dernier passage achevé a échoué.</li>
            <li>Les <strong>agents IA</strong> restent <strong>en veille</strong> tant que la variable de dépôt <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">USINE_IA</code> n&apos;est pas à <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">on</code> sur GitHub ; un lancement manuel marche toujours. Plafond quotidien : <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">USINE_IA_MAX_PAR_JOUR</code> (4 par défaut).</li>
            <li>« Lancer maintenant » demande à GitHub de démarrer le workflow avec les mêmes entrées sûres que le Gardien (jeton <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">GITHUB_GARDIEN_TOKEN</code>).</li>
            <li>Le détail des défauts reste dans les tickets du dépôt privé ; ici, un résumé sans secret ni donnée personnelle. Documentation : <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">usine/README.md</code> · ligne de commande : <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">npm run usine</code>.</li>
          </ul>
        </section>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Blocs                                                                     */
/* -------------------------------------------------------------------------- */

function Sources({ sources }: { sources: EtatUsine["sources"] }) {
  const Puce = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${ok ? TON_CLASSES.ok : TON_CLASSES.neutre}`}>
      <span aria-hidden>{ok ? "●" : "○"}</span>
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap justify-end gap-1.5 text-[11px]">
      <Puce ok={sources.github} label="GitHub" />
      <Puce ok={sources.kv} label="KV" />
      <Puce ok={sources.cmc} label="CoinMarketCap" />
      <Puce ok={sources.jetonGardien} label="jeton Gardien" />
    </div>
  );
}

function Verdict({ etat }: { etat: EtatUsine }) {
  const v = etat.verdict;
  const ton: Ton = v.niveau === "rouge" ? "defaut" : v.niveau === "orange" ? "attention" : "ok";
  const titre = v.niveau === "rouge" ? "Usine en défaut" : v.niveau === "orange" ? "Usine à surveiller" : "Usine à l'heure";
  const s = etat.sentinelle.dernier;
  return (
    <div className={`mt-6 rounded-2xl border p-4 sm:p-5 ${TON_CLASSES[ton]}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">
            <span aria-hidden className="mr-2">{v.niveau === "rouge" ? "🔴" : v.niveau === "orange" ? "🟠" : "🟢"}</span>
            {titre}
          </div>
          <p className="mt-1 text-sm opacity-90">{v.resume}.</p>
        </div>
        <div className="text-xs opacity-90">
          {s ? (
            <>
              Sentinelle ({s.full ? "contrôle complet" : "contrôle léger"}) {depuis(s.at, Date.parse(etat.genereLe))} : <strong>{s.fails}</strong> défaut(s), <strong>{s.warns}</strong> à surveiller, {s.oks} contrôles réussis.
            </>
          ) : (
            <>Résumé de la sentinelle non encore écrit dans le KV (premier passage attendu après la mise en ligne).</>
          )}
        </div>
      </div>
    </div>
  );
}

function Indicateur({ label, valeur, accent, detail }: { label: string; valeur: string; accent: "primary" | "emerald" | "purple" | "amber" | "ice"; detail?: string }) {
  const bg = { primary: "from-primary/15", emerald: "from-emerald-500/15", purple: "from-purple-500/15", amber: "from-warning/15", ice: "from-ice/15" }[accent];
  const text = { primary: "text-primary", emerald: "text-emerald-400", purple: "text-purple-400", amber: "text-primary-glow", ice: "text-ice-fg" }[accent];
  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${bg} to-transparent p-4`}>
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold tabular-nums sm:text-3xl ${text}`}>{valeur}</div>
      {detail && <div className="mt-1 truncate text-[11px] text-muted" title={detail}>{detail}</div>}
    </div>
  );
}

function Section({ titre, sousTitre, Icone, children }: { titre: string; sousTitre?: string; Icone: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="mt-12" aria-labelledby={`section-${titre}`}>
      <h2 id={`section-${titre}`} className="flex items-center gap-2 text-xl font-bold text-fg">
        <Icone className="h-5 w-5 text-primary" aria-hidden />
        {titre}
      </h2>
      {sousTitre && <p className="mt-1 mb-4 max-w-4xl text-sm text-muted">{sousTitre}</p>}
      {children}
    </section>
  );
}

function Pastille({ statut }: { statut: Statut }) {
  const s = STATUT_INFO[statut] ?? STATUT_INFO.inconnu;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TON_CLASSES[s.ton]}`}>
      <span aria-hidden>{s.icone}</span>
      {s.libelle}
    </span>
  );
}

function CartePoste({ jugement }: { jugement: Jugement }) {
  const { poste, statut, raison, dernier } = jugement;
  const run = dernier && typeof dernier === "object" && "html_url" in dernier ? (dernier as Run) : null;
  const bordure = statut === "echec" ? "border-danger-border" : statut === "retard" || statut === "attention" ? "border-warning-border" : "border-border";
  return (
    <div className={`flex flex-col rounded-2xl border bg-surface p-4 ${bordure}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-fg" title={poste.nom}>{poste.nom}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <span className="rounded bg-elevated px-1.5 py-0.5">{GENRE_LIBELLE[poste.genre]}</span>
            <span>{poste.moteur === "github" ? "GitHub Actions" : poste.moteur === "vercel" ? "Vercel" : "intégré"}</span>
            <span aria-hidden>·</span>
            <span>{poste.cadence}</span>
          </div>
        </div>
        <Pastille statut={statut} />
      </div>
      <p className="mt-2 text-xs text-fg/80">{raison}</p>
      <p className="mt-2 text-xs text-muted"><span className="font-semibold text-fg/70">Produit :</span> {poste.produit}</p>
      <p className="mt-1 text-xs text-muted">{poste.description}</p>
      <div className="mt-auto pt-2 text-[11px] text-muted">
        {run?.html_url ? (
          <a href={run.html_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
            dernier passage : {dateHeureParis(run.created_at)}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : dernier && typeof dernier === "object" && "at" in dernier ? (
          <span>dernière trace : {dateHeureParis(String((dernier as { at?: string }).at ?? ""))}</span>
        ) : (
          <span>déclencheur : {poste.declencheur}</span>
        )}
        {poste.mission && (
          <span className="ml-2">
            · mission <code className="font-mono">usine/missions/{poste.mission}.md</code>
          </span>
        )}
      </div>
      {estLancable(poste) && <BoutonLancer posteId={poste.id} nom={poste.nom} />}
    </div>
  );
}

function NoteAgents({ etat, enVeille, total }: { etat: EtatUsine; enVeille: number; total: number }) {
  const ton: Ton = enVeille === total ? "neutre" : "info";
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-xs ${TON_CLASSES[ton]}`}>
      {enVeille === total ? (
        <>
          <strong>Les {total} agents sont en veille.</strong> Pour les mettre en route : sur GitHub, Settings → Secrets and variables → Actions → Variables, créer{" "}
          <code className="font-mono">USINE_IA</code> = <code className="font-mono">on</code> (et vérifier que le secret <code className="font-mono">ANTHROPIC_API_KEY</code> a du crédit). Chaque agent peut aussi être lancé à la main dès maintenant.
        </>
      ) : (
        <>
          <strong>{total - enVeille} agent(s) actif(s)</strong> sur {total}. Missions : {etat.missions.map((m) => `${m.nom} (${m.resume})`).join(" · ")}.
        </>
      )}
    </div>
  );
}

function TableauChaine({ etat }: { etat: EtatUsine }) {
  const lignes = etat.chaine.lignes;
  if (!lignes.length) return <p className="text-sm text-muted">Aucun poste programmé aujourd&apos;hui.</p>;
  const now = Date.parse(etat.genereLe);
  const prochaine = lignes.find((l) => Date.parse(l.heure) > now);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full text-left text-xs">
        <thead className="bg-elevated/60 text-[11px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-3 py-2">Heure (Paris)</th>
            <th className="px-3 py-2">Poste</th>
            <th className="px-3 py-2">Atelier</th>
            <th className="px-3 py-2">État</th>
            <th className="px-3 py-2">Passage</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => {
            const e = ETAT_CHAINE[l.etat] ?? ETAT_CHAINE.attendu;
            const estProchaine = prochaine && prochaine.heure === l.heure && prochaine.posteId === l.posteId;
            return (
              <tr key={`${l.posteId}-${l.heure}-${i}`} className={`border-t border-border/60 ${estProchaine ? "bg-primary/5" : ""}`}>
                <td className="px-3 py-2 font-mono tabular-nums text-fg">{heureParis(l.heure)}{estProchaine ? <span className="ml-2 text-[10px] text-primary">prochaine</span> : null}</td>
                <td className="px-3 py-2 text-fg">{l.nom}{l.genre === "agent-ia" ? <span className="ml-1.5 rounded bg-elevated px-1 py-0.5 text-[10px] text-muted">IA</span> : null}</td>
                <td className="px-3 py-2 capitalize text-muted">{l.atelier}</td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TON_CLASSES[e.ton]}`}>{e.libelle}</span></td>
                <td className="px-3 py-2 text-muted">
                  {l.run?.html_url ? (
                    <a href={l.run.html_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                      {l.run.titre.slice(0, 60)} <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableauProduction({ etat }: { etat: EtatUsine }) {
  const lignes = etat.production.parJour;
  const colonnes: { cle: keyof Omit<EtatUsine["production"]["parJour"][number], "jour">; label: string; ton: string }[] = [
    { cle: "actus", label: "Actus", ton: "bg-primary/60" },
    { cle: "analyses", label: "Analyses", ton: "bg-ice/60" },
    { cle: "articles", label: "Articles", ton: "bg-purple-500/60" },
    { cle: "corrections", label: "Corrections", ton: "bg-warning/60" },
    { cle: "prs", label: "PR IA fusionnées", ton: "bg-emerald-500/60" },
  ];
  const max = Math.max(1, ...lignes.flatMap((l) => colonnes.map((c) => l[c.cle])));
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full text-left text-xs">
        <thead className="bg-elevated/60 text-[11px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-3 py-2">Jour</th>
            {colonnes.map((c) => (
              <th key={c.cle} className="px-3 py-2">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.jour} className="border-t border-border/60">
              <td className="px-3 py-2 font-mono tabular-nums text-fg">{dateParis(`${l.jour}T12:00:00Z`)}</td>
              {colonnes.map((c) => (
                <td key={c.cle} className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 tabular-nums text-fg">{l[c.cle]}</span>
                    <span className={`h-2 rounded ${c.ton}`} style={{ width: `${Math.round((l[c.cle] / max) * 80)}px` }} aria-hidden />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-elevated/40 text-[11px] text-muted">
          <tr>
            <td className="px-3 py-2">Total 30 j</td>
            {colonnes.map((c) => (
              <td key={c.cle} className="px-3 py-2 tabular-nums text-fg">{etat.production.totaux.j30[c.cle]}</td>
            ))}
          </tr>
        </tfoot>
      </table>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border/60 px-3 py-2 text-[11px] text-muted">
        <span>Dernière actu : {etat.derniereActu ? dateParis(`${etat.derniereActu}T12:00:00Z`) : "—"}</span>
        <span>Analyses : {etat.analyses.map((a) => `${a.slug} ${a.ageH === null ? "—" : `${Math.round(a.ageH)} h`}`).join(" · ") || "—"}</span>
        <span>Registre MiCA contrôlé le {etat.micaControle ? dateParis(`${etat.micaControle}T12:00:00Z`) : "—"}</span>
        <span>Chiffres du site : {nb(Number(etat.compteurs.cryptos))} fiches, {nb(Number(etat.compteurs.platforms))} plateformes, {nb(Number(etat.compteurs.tools))} outils, {nb(Number(etat.compteurs.cards))} cartes (recomptés le {String(etat.compteurs.updatedAt ?? "—")})</span>
      </div>
    </div>
  );
}

function BlocSentinelle({ etat }: { etat: EtatUsine }) {
  const s = etat.sentinelle.dernier;
  const c = etat.sentinelle.complet;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-bold text-fg">Sentinelle</h3>
      {!s ? (
        <p className="mt-2 text-xs text-muted">Pas encore de résumé dans le KV : la sentinelle l&apos;écrira à son prochain passage (toutes les heures).</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            Dernier passage ({s.full ? "complet" : "léger"}) : {dateHeureParis(s.at)} · {s.fails} défaut(s) · {s.warns} à surveiller · {s.oks} réussis
          </p>
          {s.defauts.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {s.defauts.slice(0, 12).map((d, i) => (
                <li key={i} className="flex gap-1.5 text-danger-fg"><span aria-hidden>❌</span><span><span className="rounded bg-elevated px-1 text-[10px] text-muted">{d.area}</span> {d.msg}</span></li>
              ))}
              {s.defauts.length > 12 && <li className="text-muted">… et {s.defauts.length - 12} autre(s) dans le ticket privé.</li>}
            </ul>
          )}
          {s.surveiller.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {s.surveiller.slice(0, 8).map((d, i) => (
                <li key={i} className="flex gap-1.5 text-warning-fg"><span aria-hidden>⚠️</span><span><span className="rounded bg-elevated px-1 text-[10px] text-muted">{d.area}</span> {d.msg}</span></li>
              ))}
              {s.surveiller.length > 8 && <li className="text-muted">… et {s.surveiller.length - 8} autre(s).</li>}
            </ul>
          )}
          {s.defauts.length === 0 && s.surveiller.length === 0 && <p className="mt-2 text-xs text-success-fg">✅ Rien à signaler au dernier passage.</p>}
        </>
      )}
      <div className="mt-3 border-t border-border/60 pt-3 text-xs text-muted">
        <span className="font-semibold text-fg/80">51 familles de données : </span>
        {c?.fraicheur ? (
          <>
            {c.fraicheur.ok} ✅ · {c.fraicheur.attention} ⚠️ · {c.fraicheur.defaut} ❌ (contrôle complet {depuis(c.at, Date.parse(etat.genereLe))})
          </>
        ) : (
          "état non encore écrit par la sentinelle complète."
        )}
        {c?.tailleBase && (
          <span className="ml-2">
            · base Supabase : {c.tailleBase.octets === null ? `non mesurée (${c.tailleBase.raison ?? "?"})` : `${Math.round(c.tailleBase.octets / 1_048_576)} Mo sur ${Math.round(c.tailleBase.plafond / 1_048_576)} Mo`}
          </span>
        )}
      </div>
    </div>
  );
}

function BlocConsommation({ etat }: { etat: EtatUsine }) {
  const conso = etat.sentinelle.complet?.consommation;
  const b = etat.budget;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-bold text-fg">Consommation du mois</h3>
      <p className="mt-1 text-xs text-muted">
        CoinMarketCap en direct :{" "}
        {b.lu ? (
          <>
            {nb(b.moisUtilises)} / {nb(b.moisPlafond)} crédits, besoin d&apos;ici la fin du mois ≈ {nb(b.besoinFinDeMois)}, mode {b.mode}
            {b.epuisementPrevu ? <span className="text-danger-fg"> · épuisement prévu le {dateParis(`${b.epuisementPrevu}T12:00:00Z`)}</span> : null}
          </>
        ) : (
          <>non mesuré ({b.raison ?? "?"})</>
        )}
        {b.frein ? (
          <>
            {" "}· frein {b.frein.etat === "actif" ? <strong className="text-warning-fg">actif</strong> : <strong className="text-success-fg">inactif</strong>}
            {typeof b.frein.projectionPct === "number" ? ` (projection ${Math.round(b.frein.projectionPct)} %)` : ""}
          </>
        ) : null}
      </p>
      {conso?.services?.length ? (
        <table className="mt-3 w-full text-left text-xs">
          <thead className="text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="py-1 pr-2">Service</th>
              <th className="py-1 pr-2">Consommé</th>
              <th className="py-1 pr-2">Limite</th>
              <th className="py-1 pr-2">Projection</th>
              <th className="py-1">État</th>
            </tr>
          </thead>
          <tbody>
            {conso.services.map((s) => {
              const u = (v: number | null) => (v === null ? "—" : s.unite === "octets" ? `${Math.round(v / 1_048_576)} Mo` : `${nb(Math.round(v))}${s.unite ? ` ${s.unite}` : ""}`);
              return (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="py-1.5 pr-2 text-fg">{s.nom}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{u(s.consomme)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{s.etat === "non-mesure" ? "—" : u(s.limite)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{s.projection === null ? (s.etat === "non-mesure" ? "—" : "sans objet") : `≈ ${nb(Math.round(s.projection))}${s.pct !== null ? ` (${Math.round(s.pct)} %)` : ""}`}</td>
                  <td className="py-1.5" title={s.msg}><span aria-hidden>{s.icone}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="mt-3 text-xs text-muted">Tableau des services (CoinMarketCap, Supabase, GitHub Actions, Upstash, Vercel) écrit par la sentinelle complète, chaque nuit.</p>
      )}
      {conso?.le && <p className="mt-2 text-[11px] text-muted">Mesuré le {dateHeureParis(conso.le)} (mois {conso.mois}).</p>}
    </div>
  );
}

function BlocPullRequests({ etat }: { etat: EtatUsine }) {
  const nomMission = (id: string | null) => etat.missions.find((m) => m.id === id)?.nom ?? (id ?? "mission inconnue");
  const Liste = ({ titre, prs, vide }: { titre: string; prs: EtatUsine["prs"]["ouvertes"]; vide: string }) => (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-bold text-fg">{titre}</h3>
      {prs.length === 0 ? (
        <p className="mt-2 text-xs text-muted">{vide}</p>
      ) : (
        <ul className="mt-2 space-y-2 text-xs">
          {prs.map((p) => (
            <li key={p.numero} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-fg hover:text-primary">
                #{p.numero} {p.titre}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
              <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted">{nomMission(p.mission)}</span>
              <span className="text-muted">{p.etat === "fusionnee" && p.fusionneLe ? `fusionnée ${depuis(p.fusionneLe, Date.parse(etat.genereLe))}` : `ouverte ${depuis(p.creeLe, Date.parse(etat.genereLe))}`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Liste titre={`À relire (${etat.prs.ouvertes.length})`} prs={etat.prs.ouvertes} vide={etat.sources.github ? "Aucune pull request d'agent en attente." : "API GitHub indisponible pour le moment."} />
      <Liste titre={`Fusionnées récemment (${etat.prs.fusionnees.length})`} prs={etat.prs.fusionnees} vide="Aucune pull request d'agent fusionnée récemment." />
    </div>
  );
}

function Journal({ runs, disponible }: { runs: Run[]; disponible: boolean }) {
  if (!disponible) return <p className="text-sm text-muted">API GitHub indisponible (limite de 60 lectures par heure sans jeton, ou panne) : réessaie dans quelques minutes.</p>;
  if (!runs.length) return <p className="text-sm text-muted">Aucun passage récent.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full text-left text-xs">
        <thead className="bg-elevated/60 text-[11px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-3 py-2">Quand (Paris)</th>
            <th className="px-3 py-2">Workflow</th>
            <th className="px-3 py-2">Passage</th>
            <th className="px-3 py-2">Déclencheur</th>
            <th className="px-3 py-2">Résultat</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const c = tonConclusion(r);
            return (
              <tr key={`${r.id}-${r.attempt}`} className="border-t border-border/60">
                <td className="px-3 py-2 font-mono tabular-nums text-fg">{dateHeureParis(r.created_at)}</td>
                <td className="px-3 py-2 text-fg">{r.name}</td>
                <td className="px-3 py-2 text-muted">
                  <a href={r.html_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                    {r.titre.slice(0, 70)}{r.attempt > 1 ? ` (tentative ${r.attempt})` : ""}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </td>
                <td className="px-3 py-2 text-muted">{r.event}</td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TON_CLASSES[c.ton]}`}>{c.libelle}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
