/**
 * /admin/usine — L'USINE : salle de contrôle des robots, agents IA et gardes-fous de cryptoreflex.fr (09/10/2026).
 *
 * Kev : « une vraie usine autonome d'agents… une application sur mon bureau où je peux voir une usine réelle d'agents qui
 * travaillent avec un vrai processus et une vraie ligne de gestion, et un endroit où des agents font de la R&D ».
 * Cette page est l'application : installable depuis Chrome ou Edge (manifeste /admin/usine/app.webmanifest, fenêtre
 * autonome sans l'en-tête du site), relue toutes les 60 s. Elle montre : la ligne de production du jour (plan → agents
 * au travail, étape par étape → contrôles → propositions prêtes ou à relire → fusionnées → vérifiées par la sentinelle),
 * la ligne de gestion (à faire, en cours, à décider avec les boutons Fusionner / Retour arrière, fait), le plan du jour
 * calculé par le dépôt, les 5 ateliers poste par poste, le laboratoire R&D, la production, la protection, le journal.
 *
 * Données : lib/usine/etat.ts (API GitHub, KV, fichiers du dépôt, CoinMarketCap) ; registre : scripts/lib/usine-registre.mjs.
 * Accès : administrateurs seulement (ADMIN_EMAILS), 404 strict sinon — même règle que /admin. Page noindex.
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
  FlaskConical,
  Gauge,
  GitPullRequest,
  ListChecks,
  MonitorDown,
  Newspaper,
  ShieldCheck,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { DEPOT_ROBOTS } from "@/lib/gardien";
import { lireEtatUsine } from "@/lib/usine/etat";
import type { AtelierId, EtatChaine, EtatUsine, Idee, Jugement, PullRequestUsine, Run, Statut } from "@/lib/usine/types";
import AutoRefresh from "@/components/admin/usine/AutoRefresh";
import BoutonLancer from "@/components/admin/usine/BoutonLancer";
import { BoutonFusionner, BoutonRetourArriere } from "@/components/admin/usine/BoutonAction";
import UsineChrome from "@/components/admin/usine/UsineChrome";
import { estLancable } from "@/scripts/lib/usine-registre.mjs";
import { STATUTS, dateHeureParis, dateParis, depuis, heureParis } from "@/scripts/lib/usine-etat.mjs";

export const metadata: Metadata = {
  title: "Admin — L'Usine",
  description: "Salle de contrôle des robots, agents IA et gardes-fous de Cryptoreflex (réservé éditeur).",
  robots: { index: false, follow: false },
  manifest: "/admin/usine/app.webmanifest",
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
  rnd: FlaskConical,
};

const GENRE_LIBELLE = { robot: "robot", "agent-ia": "agent IA", "garde-fou": "garde-fou" } as const;

const STATUT_IDEE: Record<Idee["statut"], { libelle: string; ton: Ton }> = {
  proposee: { libelle: "proposée", ton: "info" },
  retenue: { libelle: "retenue", ton: "ok" },
  "en-cours": { libelle: "prototype en cours", ton: "attention" },
  faite: { libelle: "faite", ton: "ok" },
  ecartee: { libelle: "écartée", ton: "neutre" },
};

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
const JOUR = 86_400_000;
const titreCourt = (p: PullRequestUsine) => p.titre.replace(/^Usine IA — \[[^\]]+\]\s*/, "");
const lienDepot = (chemin: string) => `https://github.com/${DEPOT_ROBOTS}/blob/main/${chemin}`;

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function UsinePage() {
  const user = await getUser();
  if (!user || !user.isAdmin) notFound();

  const etat = await lireEtatUsine();
  const now = Date.parse(etat.genereLe);
  const parAtelier = (id: AtelierId) => etat.jugements.filter((j) => j.poste.atelier === id);
  const mesures = etat.jugements.filter((j) => j.poste.genre !== "garde-fou" && typeof j.poste.ageMaxH === "number");
  const aLHeure = mesures.filter((j) => j.statut === "ok" || j.statut === "en-cours").length;
  const pretes = etat.prs.ouvertes.filter((p) => p.etiquette === "prete");
  const aRelire = etat.prs.ouvertes.filter((p) => p.etiquette !== "prete");
  const fusionnees7j = etat.prs.fusionnees.filter((p) => p.fusionneLe && now - Date.parse(p.fusionneLe) <= 7 * JOUR);
  const zonesContenu = ["pages", "chiffres", "fiscal", "partenaires", "plans du site", "dates vérifiées"];
  const sentinelleRougeContenu = (etat.sentinelle.dernier?.defauts ?? []).some((d) => zonesContenu.includes(d.area));
  const retourRecommande =
    etat.gardeFou?.action === "revert" && etat.gardeFou.simulation !== false && now - Date.parse(etat.gardeFou.at) < 12 * 3_600_000 && sentinelleRougeContenu;

  return (
    <article className="py-10 sm:py-14">
      <UsineChrome />
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
              <span className="usine-app-seulement items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold text-fg/80">
                <MonitorDown className="h-3 w-3" aria-hidden />
                application installée
              </span>
            </span>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              <Factory className="h-8 w-8 text-primary" aria-hidden />
              L&apos;Usine <span className="gradient-text">{BRAND.name}</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              {etat.jugements.length} postes dans 5 ateliers. Chaque robot prouve son travail ; chaque agent IA suit un plan du jour calculé par le dépôt
              et finit par une proposition « prête » ou « à relire » ; tu fusionnes en un clic ; la sentinelle vérifie après chaque déploiement.
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Sur l&apos;ordinateur : menu de Chrome ou Edge → « Installer l&apos;application » pour ouvrir l&apos;Usine dans sa propre fenêtre.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <AutoRefresh intervalleS={60} genereLe={etat.genereLe} />
            <Sources sources={etat.sources} />
          </div>
        </header>

        <Verdict etat={etat} />

        {retourRecommande && etat.gardeFou?.sha && (
          <div className={`mt-4 rounded-2xl border p-4 ${TON_CLASSES.attention}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-sm">
                <strong>↩️ Retour arrière recommandé</strong> {depuis(etat.gardeFou.at, now)} : la sentinelle voit un défaut de contenu après la fusion{" "}
                <code className="font-mono">{etat.gardeFou.sha.slice(0, 10)}</code>
                {etat.gardeFou.message ? ` « ${etat.gardeFou.message} »` : ""}.
                {etat.gardeFou.raisons?.length ? <ul className="mt-1 list-inside list-disc text-xs opacity-90">{etat.gardeFou.raisons.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}</ul> : null}
                <p className="mt-1 text-xs opacity-90">Un clic annule cette fusion et redéploie l&apos;état précédent ; la sentinelle rejuge ensuite.</p>
              </div>
              <BoutonRetourArriere sha={etat.gardeFou.sha} />
            </div>
          </div>
        )}

        {/* Indicateurs */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Indicateur label="Actus publiées · 7 j" valeur={nb(etat.production.totaux.j7.actus)} accent="primary" detail={`${nb(etat.production.totaux.j30.actus)} sur 30 j`} />
          <Indicateur label="Analyses calculées · 7 j" valeur={nb(etat.production.totaux.j7.analyses)} accent="ice" detail={`${etat.analyses.length} pages vivantes`} />
          <Indicateur label="Agents au travail" valeur={nb(etat.enDirect.length)} accent={etat.enDirect.length ? "purple" : "emerald"} detail={etat.enDirect.length ? etat.enDirect.map((a) => a.run.name.replace(/^Usine IA — /, "")).join(", ") : "aucun passage en cours"} />
          <Indicateur label="Postes à l'heure" valeur={`${aLHeure}/${mesures.length}`} accent={aLHeure === mesures.length ? "emerald" : "amber"} detail={`${etat.verdict.echecs} en échec, ${etat.verdict.retards} à surveiller`} />
          <Indicateur label="Propositions à décider" valeur={nb(etat.prs.ouvertes.length)} accent={pretes.length ? "emerald" : "purple"} detail={`${pretes.length} prête(s), ${aRelire.length} à relire · ${fusionnees7j.length} fusionnée(s) sur 7 j`} />
          <Indicateur
            label="Budget CoinMarketCap"
            valeur={etat.budget.lu && typeof etat.budget.moisUtilises === "number" && etat.budget.moisPlafond ? `${Math.round((etat.budget.moisUtilises / etat.budget.moisPlafond) * 100)} %` : "—"}
            accent={etat.budget.niveau === "alerte" ? "amber" : "emerald"}
            detail={etat.budget.lu ? `${nb(etat.budget.moisUtilises)} / ${nb(etat.budget.moisPlafond)} crédits, frein ${etat.budget.frein?.etat ?? "non lu"}` : `non mesuré : ${etat.budget.raison ?? "?"}`}
          />
        </div>

        {/* Ligne de production */}
        <Section titre="Ligne de production" Icone={Workflow} sousTitre="Le processus des agents, de gauche à droite : plan du jour → travail (étape par étape, en direct) → contrôles et build → proposition prête ou à relire → fusion par toi → déploiement Vercel et vérification par la sentinelle.">
          <LigneProduction etat={etat} pretes={pretes} aRelire={aRelire} fusionnees7j={fusionnees7j} />
        </Section>

        {etat.enDirect.length > 0 && (
          <Section titre="Agents au travail, en direct" Icone={Activity} sousTitre="Étape courante de chaque passage d'agent en cours (relu toutes les 60 s).">
            <AgentsEnDirect etat={etat} />
          </Section>
        )}

        {/* Ligne de gestion */}
        <Section titre="Ligne de gestion" Icone={ListChecks} sousTitre="À faire (le plan calculé par le dépôt), en cours, à décider (un clic pour fusionner une proposition prête), fait sur 7 jours.">
          <LigneGestion etat={etat} pretes={pretes} aRelire={aRelire} fusionnees7j={fusionnees7j} />
        </Section>

        {/* Chaîne du jour */}
        <Section titre="Chaîne du jour, poste par poste" Icone={Activity} sousTitre={`Heure de Paris · jour UTC ${dateParis(etat.genereLe)} · les postes en continu (${etat.chaine.continus.map((p) => p.nom).join(", ") || "aucun"}) tournent toute la journée.`}>
          <TableauChaine etat={etat} />
        </Section>

        {/* Ateliers */}
        {etat.ateliers.map((atelier) => {
          const Icone = ICONES_ATELIER[atelier.id];
          const juges = parAtelier(atelier.id);
          return (
            <Section key={atelier.id} titre={`Atelier ${atelier.nom}`} Icone={Icone} sousTitre={atelier.description}>
              {atelier.id === "rnd" && <LaboratoireRnd etat={etat} />}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {juges.map((j) => (
                  <CartePoste key={j.poste.id} jugement={j} />
                ))}
              </div>
            </Section>
          );
        })}

        {/* Production */}
        <Section titre="Production des 14 derniers jours" Icone={Newspaper} sousTitre="Ce que l'usine a réellement fabriqué, jour par jour (jours UTC) : actualités, analyses techniques recalculées, articles de fond, corrections journalisées, propositions d'agents fusionnées.">
          <TableauProduction etat={etat} />
        </Section>

        {/* Protection */}
        <Section titre="Protection : sentinelle, fraîcheur, budget" Icone={ShieldCheck} sousTitre="Ce que la sentinelle a vu à son dernier passage, l'état des 51 familles de données et la consommation du mois (0 € de dépassement, site jamais coupé).">
          <div className="grid gap-4 lg:grid-cols-2">
            <BlocSentinelle etat={etat} />
            <BlocConsommation etat={etat} />
          </div>
        </Section>

        {/* Journal */}
        <Section titre="Journal des 40 derniers passages" Icone={Gauge} sousTitre={`Tous les workflows du dépôt ${DEPOT_ROBOTS}, du plus récent au plus ancien.`}>
          <Journal runs={etat.journal} disponible={etat.sources.github} />
        </Section>

        <section className="mt-12 rounded-2xl border border-border bg-elevated/40 p-5 text-sm text-fg/80">
          <h3 className="mb-2 font-bold text-fg">📚 Comment lire cette page</h3>
          <ul className="list-inside list-disc space-y-1.5">
            <li>Un poste est <strong>à l&apos;heure</strong> quand son dernier passage a réussi depuis moins que son délai maximal ; <strong>en retard</strong> au-delà ; <strong>en échec</strong> si le dernier passage achevé a échoué.</li>
            <li>Les <strong>agents IA</strong> tournent à leurs horaires. Pour les arrêter : variable de dépôt GitHub <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">USINE_IA</code> = <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">off</code>. Plafond quotidien : <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">USINE_IA_MAX_PAR_JOUR</code> (4 par défaut).</li>
            <li>Une proposition est <strong>prête</strong> quand elle ne touche aucun fait (texte, SEO, liens internes, rapport, idée) et que garde-fou des contenus, audit de qualité, types, tests et build complet sont au vert ; sinon elle est <strong>à relire</strong>. Dans les deux cas, c&apos;est toi qui fusionnes.</li>
            <li>Après chaque déploiement, la sentinelle contrôle le site ; si elle voit un défaut de contenu juste après une fusion de l&apos;Usine, le <strong>garde-fou</strong> recommande un retour arrière, que tu lances en un clic.</li>
            <li>« Lancer maintenant » demande à GitHub de démarrer le workflow avec les entrées sûres du Gardien ; « Fusionner » et « Retour arrière » passent par le jeton <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">GITHUB_GARDIEN_TOKEN</code> (droit « Pull requests » en écriture pour la fusion).</li>
            <li>Documentation : <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">usine/README.md</code> · ligne de commande : <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">npm run usine</code> · laboratoire : <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">usine/rnd/</code>.</li>
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

function Chip({ ton, children }: { ton: Ton; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TON_CLASSES[ton]}`}>{children}</span>;
}

function LienPr({ p }: { p: PullRequestUsine }) {
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-fg hover:text-primary">
      #{p.numero} {titreCourt(p)}
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}

/* ------------------------------------------------------------------ ligne de production */

function LigneProduction({ etat, pretes, aRelire, fusionnees7j }: { etat: EtatUsine; pretes: PullRequestUsine[]; aRelire: PullRequestUsine[]; fusionnees7j: PullRequestUsine[] }) {
  const now = Date.parse(etat.genereLe);
  const agentsDuJour = etat.chaine.lignes.filter((l) => l.genre === "agent-ia");
  const faits = agentsDuJour.filter((l) => l.etat === "fait" || l.etat === "echec").length;
  const s = etat.sentinelle.dernier;
  const etapes: { titre: string; valeur: string; detail: string; ton: Ton }[] = [
    {
      titre: "1 · Plan du jour",
      valeur: `${faits}/${agentsDuJour.length}`,
      detail: agentsDuJour.length ? agentsDuJour.map((l) => `${heureParis(l.heure)} ${l.nom.replace(/^Agent /, "")} (${ETAT_CHAINE[l.etat].libelle})`).join(" · ") : "aucun agent programmé aujourd'hui",
      ton: "neutre",
    },
    {
      titre: "2 · Travail",
      valeur: nb(etat.enDirect.length),
      detail: etat.enDirect.length ? etat.enDirect.map((a) => `${a.run.name.replace(/^Usine IA — /, "")} : ${a.etape ?? a.job}`).join(" · ") : "aucun agent en train de travailler",
      ton: etat.enDirect.length ? "info" : "neutre",
    },
    {
      titre: "3 · Contrôles",
      valeur: nb(etat.enDirect.filter((a) => /Garde-fou|Audit|Types|Tests|Build|Classement/.test(a.etape ?? "")).length),
      detail: "garde-fou des contenus, audit de qualité, types, tests, build complet pour une proposition sans fait",
      ton: "neutre",
    },
    {
      titre: "4 · À décider",
      valeur: `${pretes.length} + ${aRelire.length}`,
      detail: `${pretes.length} prête(s) à fusionner en un clic, ${aRelire.length} à relire`,
      ton: pretes.length ? "ok" : aRelire.length ? "attention" : "neutre",
    },
    {
      titre: "5 · Fusionné · 7 j",
      valeur: nb(fusionnees7j.length),
      detail: fusionnees7j.length ? fusionnees7j.slice(0, 3).map((p) => `#${p.numero} ${titreCourt(p).slice(0, 40)}`).join(" · ") : "rien de fusionné cette semaine",
      ton: fusionnees7j.length ? "ok" : "neutre",
    },
    {
      titre: "6 · Déployé et vérifié",
      valeur: s ? (s.fails > 0 ? `${s.fails} ❌` : "✅") : "—",
      detail: s ? `sentinelle ${depuis(s.at, now)} : ${s.fails} défaut(s), ${s.warns} à surveiller` : "sentinelle non encore lue",
      ton: s ? (s.fails > 0 ? "defaut" : "ok") : "neutre",
    },
  ];
  return (
    <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {etapes.map((e, i) => (
        <li key={e.titre} className={`relative rounded-2xl border p-3 ${TON_CLASSES[e.ton]}`}>
          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{e.titre}</div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums">{e.valeur}</div>
          <p className="mt-1 text-[11px] leading-snug opacity-90" title={e.detail}>{e.detail.length > 140 ? `${e.detail.slice(0, 140)}…` : e.detail}</p>
          {i < etapes.length - 1 && <span aria-hidden className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-muted xl:block">›</span>}
        </li>
      ))}
    </ol>
  );
}

function AgentsEnDirect({ etat }: { etat: EtatUsine }) {
  const now = Date.parse(etat.genereLe);
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {etat.enDirect.map((a) => {
        const pct = a.total ? Math.round((a.numero / a.total) * 100) : 0;
        return (
          <li key={a.run.id} className={`rounded-2xl border p-4 ${TON_CLASSES.info}`}>
            <div className="flex items-center justify-between gap-2">
              <a href={a.run.html_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-bold hover:underline">
                {a.run.name.replace(/^Usine IA — /, "")} <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
              <span className="text-[11px] opacity-90">lancé {depuis(a.run.created_at, now)}</span>
            </div>
            <p className="mt-1 text-xs">
              <span className="opacity-80">étape {a.numero}/{a.total || "?"} :</span> <strong>{a.etape ?? a.job}</strong>
              {a.depuis ? <span className="opacity-80"> · depuis {depuis(a.depuis, now)}</span> : null}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-elevated" aria-hidden>
              <div className="h-full rounded bg-info" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ ligne de gestion */

function LigneGestion({ etat, pretes, aRelire, fusionnees7j }: { etat: EtatUsine; pretes: PullRequestUsine[]; aRelire: PullRequestUsine[]; fusionnees7j: PullRequestUsine[] }) {
  const now = Date.parse(etat.genereLe);
  const plan = etat.plan;
  const enCours = etat.chaine.lignes.filter((l) => l.etat === "en-cours");
  const Colonne = ({ titre, compte, children }: { titre: string; compte: number; children: React.ReactNode }) => (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-3">
      <h3 className="flex items-center justify-between text-sm font-bold text-fg">
        {titre}
        <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] tabular-nums text-muted">{compte}</span>
      </h3>
      <ul className="mt-2 space-y-2 text-xs">{children}</ul>
    </div>
  );
  const Carte = ({ children, ton = "neutre" }: { children: React.ReactNode; ton?: Ton }) => <li className={`rounded-xl border p-2.5 ${TON_CLASSES[ton]}`}>{children}</li>;
  const aFaire = [
    plan.reviseur ? { ton: "neutre" as Ton, texte: <>Relire <code className="font-mono">{plan.reviseur.slug}</code> <span className="opacity-80">(mis à jour le {plan.reviseur.updatedAt ?? "?"}{plan.reviseur.revisionUsine ? `, relu le ${plan.reviseur.revisionUsine}` : ", jamais relu par l'Usine"})</span></> } : { ton: "ok" as Ton, texte: <>Aucun article à relire : tous relus depuis moins de 60 jours.</> },
    { ton: plan.seo.length ? ("neutre" as Ton) : ("ok" as Ton), texte: plan.seo.length ? <>SEO : {plan.seo.length} page(s) à optimiser <span className="opacity-80">({plan.seo.slice(0, 3).map((p) => p.slug).join(", ")}{plan.seo.length > 3 ? "…" : ""})</span></> : <>SEO : aucune page candidate.</> },
    { ton: plan.correcteur.depot.length ? ("attention" as Ton) : ("ok" as Ton), texte: plan.correcteur.depot.length ? <>Corriger {plan.correcteur.depot.length} défaut(s) du dépôt <span className="opacity-80">({plan.correcteur.depot.slice(0, 2).map((d) => d.msg.slice(0, 60)).join(" · ")})</span>{plan.correcteur.horsDepot ? <span className="opacity-80"> · {plan.correcteur.horsDepot} hors dépôt</span> : null}</> : <>Aucun défaut du dépôt vu par la sentinelle{plan.correcteur.horsDepot ? ` (${plan.correcteur.horsDepot} hors dépôt)` : ""}.</> },
    { ton: plan.rnd.retenues.length ? ("info" as Ton) : ("neutre" as Ton), texte: plan.rnd.retenues.length ? <>R&amp;D : {plan.rnd.retenues.length} idée(s) retenue(s) à prototyper <span className="opacity-80">({plan.rnd.retenues[0].titre})</span></> : <>R&amp;D : aucune idée retenue (retenir une idée dans <code className="font-mono">usine/rnd/registre.json</code>).</> },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Colonne titre="À faire (plan du jour)" compte={aFaire.length}>
        {aFaire.map((a, i) => (
          <Carte key={i} ton={a.ton}>{a.texte}</Carte>
        ))}
      </Colonne>
      <Colonne titre="En cours" compte={etat.enDirect.length + enCours.length}>
        {etat.enDirect.map((a) => (
          <Carte key={a.run.id} ton="info">
            <a href={a.run.html_url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{a.run.name.replace(/^Usine IA — /, "")}</a>
            <div className="opacity-90">{a.etape ?? a.job} · lancé {depuis(a.run.created_at, now)}</div>
          </Carte>
        ))}
        {enCours.filter((l) => l.genre !== "agent-ia").map((l) => (
          <Carte key={`${l.posteId}-${l.heure}`} ton="info">{l.nom} <span className="opacity-80">· {heureParis(l.heure)}</span></Carte>
        ))}
        {etat.enDirect.length + enCours.length === 0 && <Carte>Rien en cours.</Carte>}
      </Colonne>
      <Colonne titre="À décider" compte={etat.prs.ouvertes.length}>
        {pretes.map((p) => (
          <Carte key={p.numero} ton="ok">
            <Chip ton="ok">prête</Chip> <LienPr p={p} />
            <div className="mt-1 opacity-80">{etat.missions.find((m) => m.id === p.mission)?.nom ?? p.mission} · ouverte {depuis(p.creeLe, now)}</div>
            <div className="mt-2"><BoutonFusionner numero={p.numero} titre={titreCourt(p)} /></div>
          </Carte>
        ))}
        {aRelire.map((p) => (
          <Carte key={p.numero} ton="attention">
            <Chip ton="attention">à relire</Chip> <LienPr p={p} />
            <div className="mt-1 opacity-80">{etat.missions.find((m) => m.id === p.mission)?.nom ?? p.mission} · ouverte {depuis(p.creeLe, now)} · relis sur GitHub, puis fusionne ou refuse</div>
          </Carte>
        ))}
        {etat.prs.ouvertes.length === 0 && <Carte>{etat.sources.github ? "Aucune proposition en attente." : "API GitHub indisponible pour le moment."}</Carte>}
      </Colonne>
      <Colonne titre="Fait · 7 jours" compte={fusionnees7j.length}>
        {fusionnees7j.map((p) => (
          <Carte key={p.numero} ton="ok">
            <LienPr p={p} />
            <div className="mt-1 opacity-80">fusionnée {p.fusionneLe ? depuis(p.fusionneLe, now) : ""}</div>
          </Carte>
        ))}
        {fusionnees7j.length === 0 && <Carte>Rien de fusionné cette semaine.</Carte>}
        {etat.gardeFou && (
          <Carte ton={etat.gardeFou.action === "revert" ? "attention" : "neutre"}>
            Garde-fou {depuis(etat.gardeFou.at, now)} : {etat.gardeFou.action === "revert" ? `retour arrière ${etat.gardeFou.simulation === false ? (etat.gardeFou.pousse === false ? "échoué" : "exécuté") : "recommandé"} (${String(etat.gardeFou.sha ?? "").slice(0, 10)})` : etat.gardeFou.raison ?? "rien à annuler"}
          </Carte>
        )}
      </Colonne>
    </div>
  );
}

/* ------------------------------------------------------------------ R&D */

function LaboratoireRnd({ etat }: { etat: EtatUsine }) {
  const r = etat.plan.rnd;
  const proto = etat.jugements.find((j) => j.poste.id === "usine-prototypeur");
  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="text-sm font-bold text-fg">Registre des idées</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(STATUT_IDEE) as Idee["statut"][]).map((s) => (
            <Chip key={s} ton={STATUT_IDEE[s].ton}>{r.parStatut[s] ?? 0} {STATUT_IDEE[s].libelle}</Chip>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          {r.total === 0 ? "Aucune idée encore : l'agent chercheur passe le jeudi (ou lance-le maintenant)." : `${r.total} idée(s) au registre.`} Pour retenir ou écarter une idée : changer son statut dans{" "}
          <a href={lienDepot("usine/rnd/registre.json")} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-primary">usine/rnd/registre.json</a>.
        </p>
        {r.erreurs.length > 0 && <p className="mt-2 text-xs text-danger-fg">Registre invalide : {r.erreurs.slice(0, 3).join(" ; ")}</p>}
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4 lg:col-span-2">
        <h3 className="text-sm font-bold text-fg">Idées récentes {r.retenues.length ? `· ${r.retenues.length} retenue(s) en attente de prototype` : ""}</h3>
        {r.recentes.length === 0 ? (
          <p className="mt-2 text-xs text-muted">Les fiches apparaîtront ici : problème ou opportunité avec preuves, proposition, impact, effort, risques et plan de prototype.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-xs">
            {r.recentes.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <Chip ton={STATUT_IDEE[i.statut]?.ton ?? "neutre"}>{STATUT_IDEE[i.statut]?.libelle ?? i.statut}</Chip>
                <a href={lienDepot(i.fichier)} target="_blank" rel="noopener noreferrer" className="font-semibold text-fg hover:text-primary">{i.titre}</a>
                <span className="text-muted">{i.date}{i.impact ? ` · impact ${i.impact}` : ""}{i.effort ? ` · effort ${i.effort}` : ""}</span>
                {i.resume && <span className="w-full text-muted">{i.resume}</span>}
              </li>
            ))}
          </ul>
        )}
        {r.retenues.length > 0 && proto && estLancable(proto.poste) && (
          <div className="mt-2 text-xs text-muted">
            Prototyper la plus ancienne idée retenue maintenant :
            <BoutonLancer posteId="usine-prototypeur" nom="Agent prototypeur R&D" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ postes */

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
            · mission <a href={lienDepot(`usine/missions/${poste.mission}.md`)} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-primary">{poste.mission}.md</a>
          </span>
        )}
      </div>
      {estLancable(poste) && <BoutonLancer posteId={poste.id} nom={poste.nom} />}
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
                <td className="px-3 py-2 capitalize text-muted">{l.atelier === "rnd" ? "R&D" : l.atelier}</td>
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
    { cle: "prs", label: "Propositions fusionnées", ton: "bg-emerald-500/60" },
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
