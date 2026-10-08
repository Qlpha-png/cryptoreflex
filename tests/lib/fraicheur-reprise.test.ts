/**
 * Lot fraîcheur A, reprise du 08/10/2026 : défauts du juré (B1, I1 à I7).
 * Les contrôles au rendu réel (avis/kraken à J+15, hydratation à +200 jours) sont rejoués au banc
 * (scratchpad fraicheur-a/reprise-banc.mjs) ; ici, les règles qui les rendent impossibles à casser en silence.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import VerifieLe from "@/components/ui/VerifieLe";
import { texteAge } from "@/components/ui/VerifieLeAge";
import { SEUILS_JOURS } from "@/lib/fraicheur";
import { etatCours, releveDuCours } from "@/lib/cours-fiche";
import { LIBELLE_MICA_AUTO, dateStatutMica } from "@/lib/mica-auto";
import { PAGES_DATES, jugerPageDates, pagesDatesDuJour } from "../../scripts/lib/inventaire-dates.mjs";
import { CADENCE } from "../../scripts/lib/sentinelle-robots.mjs";
import { ROBOTS_GARDIEN } from "@/lib/gardien";

const ROOT = path.resolve(__dirname, "../..");
const lire = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");
const T = (iso: string) => Date.parse(iso);
const html = (p: Parameters<typeof VerifieLe>[0]) => renderToStaticMarkup(createElement(VerifieLe, p));

afterEach(() => {
  vi.useRealTimers();
});

describe("B1 — mention d'âge neutre, une seule par page sur /avis, jamais sur « hors champ MiCA »", () => {
  it("suffixe = constat neutre « relevé il y a plus de N jours », jamais « à revérifier »", () => {
    const h = html({ date: "2026-10-02", famille: "mica", label: "Statut MiCA vérifié", maintenant: T("2026-10-25T10:00:00Z") });
    expect(h).toContain(texteAge(SEUILS_JOURS.mica));
    expect(h).toContain("relevé il y a plus de 14 jours");
    expect(h).not.toMatch(/revérifier/);
    expect(lire("components/ui/VerifieLeAge.tsx")).not.toMatch(/à revérifier"/);
  });
  it("age={false} : date seule, même très ancienne", () => {
    const h = html({ date: "2026-06-13", famille: "mica", label: "vérifié", maintenant: T("2026-10-25T10:00:00Z"), age: false });
    expect(h).toContain("vérifié le 13/06/2026");
    expect(h).not.toContain("data-a-reverifier");
    expect(h).not.toContain("relevé il y a");
  });
  it("/avis/[slug] : une seule <VerifieLe> peut porter une mention d'âge, et ce n'est pas celle d'un portefeuille", () => {
    const src = lire("app/avis/[slug]/page.tsx");
    const avecAge = [...src.matchAll(/<VerifieLe\b[^>]*\/>/g)].map((m) => m[0]).filter((t) => !/age=\{false\}/.test(t));
    expect(avecAge).toHaveLength(1);
    expect(avecAge[0]).toContain('famille="mica"');
    expect(src).toMatch(/famille="wallets" label="Statut MiCA vérifié" age=\{false\}/);
  });
  it("le badge « Agréé MiCA » n'affiche jamais d'âge", () => {
    expect(lire("components/MiCAComplianceBadge.tsx")).toMatch(/famille="mica" label="vérifié" age=\{false\}/);
  });
});

describe("B1 / L6 — date du contrôle automatique du registre ESMA", () => {
  it("le fichier de la veille existe et ne contient que des dates AAAA-MM-JJ", () => {
    const j = JSON.parse(lire("data/veille/mica-auto.json"));
    expect(j).toHaveProperty("plateformes");
    for (const v of Object.values(j.plateformes)) expect(v).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("sans contrôle automatique : la relecture humaine et son libellé", () => {
    expect(dateStatutMica("plateforme-inconnue", "2026-10-02", "Statut MiCA vérifié")).toEqual({ date: "2026-10-02", label: "Statut MiCA vérifié", auto: false });
  });
  it("la veille écrit la date du jour pour chaque plateforme SANS écart, et garde l'ancienne date sinon", () => {
    const src = lire("scripts/veille-officielle.mjs");
    expect(src).toMatch(/else sansEcart\[p\.id\] = AUJ;/);
    expect(src).toMatch(/plateformes = \{ \.\.\.\(avant\.plateformes \|\| \{\}\), \.\.\.nouvelles \}/);
    // écrite seulement quand le registre a été lu (les sorties « illisible » / « anormalement court » font return avant)
    const i = src.indexOf("ecrireMicaAuto(sansEcart)");
    expect(i).toBeGreaterThan(src.indexOf("anormalement court"));
  });
  it("le workflow de la veille commite data/veille/mica-auto.json chaque nuit (pas seulement avec « enregistrer »)", () => {
    const wf = parse(lire(".github/workflows/veille-officielle.yml"));
    const steps = Object.values(wf.jobs as Record<string, { steps: { name?: string; if?: string; run?: string }[] }>).flatMap((j) => j.steps);
    const pub = steps.find((s) => /mica-auto\.json/.test(s.run ?? ""));
    expect(pub).toBeTruthy();
    expect(pub!.if ?? "").not.toMatch(/ENREGISTRER/);
    expect(pub!.run).toMatch(/git add data\/veille\/mica-auto\.json/);
  });
  it("libellé honnête : jamais présenté comme une relecture humaine", () => {
    expect(LIBELLE_MICA_AUTO).toBe("Registre ESMA contrôlé automatiquement");
  });
});

describe("I5 — aucun Date.now() au rendu de <VerifieLe> (hydratation des composants client)", () => {
  it("sans « maintenant », le HTML est identique avec l'horloge du serveur et celle du navigateur à +200 jours", () => {
    const props = { date: "2026-10-02", famille: "mica" as const, label: "Vérifié" };
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
    const serveur = html(props);
    vi.setSystemTime(new Date("2027-04-24T12:00:00Z"));
    const navigateur = html(props);
    expect(navigateur).toBe(serveur);
    expect(serveur).not.toContain("data-a-reverifier");
  });
  it("le code de <VerifieLe> n'appelle pas Date.now()", () => {
    const code = lire("components/ui/VerifieLe.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/Date\.now\(\)/);
  });
});

describe("I1 — le cours se date avec price_updated_at, jamais avec updated_at seul", () => {
  it("fiche figée qui reçoit un UPDATE needs_review (updated_at = maintenant) : cours toujours masqué", () => {
    const maintenant = T("2026-10-25T08:00:00Z");
    const fiche = { updated_at: "2026-10-25T07:00:00Z", price_updated_at: "2026-05-11T06:00:00Z" };
    const e = etatCours(releveDuCours(fiche), maintenant);
    expect(e.suivi).toBe(false);
    expect(e.depuis).toBe("11/05/2026");
  });
  it("colonne présente mais nulle : pas de date de cours, donc masqué", () => {
    expect(etatCours(releveDuCours({ updated_at: "2026-10-25T07:00:00Z", price_updated_at: null }), T("2026-10-25T08:00:00Z")).suivi).toBe(false);
  });
  it("avant la migration (colonne absente) : updated_at, seul repère", () => {
    expect(releveDuCours({ updated_at: "2026-10-25T07:00:00Z" })).toBe("2026-10-25T07:00:00Z");
  });
  it("refresh-prices écrit price_updated_at ; la vue de fiche lit releveDuCours ; migration SQL fournie", () => {
    expect(lire("app/api/cron/refresh-prices/route.ts")).toMatch(/price_updated_at: releveCours/);
    expect(lire("components/crypto-detail/LLMFicheView.tsx")).toMatch(/etatCours\(releveDuCours\(fiche\), Date\.now\(\)\)/);
    const sql = lire("supabase/migrations/20261008_cryptos_price_updated_at.sql");
    expect(sql).toMatch(/add column price_updated_at timestamptz/);
    expect(sql).toMatch(/disable trigger trg_cryptos_updated_at/);
  });
  it("aucune autre écriture que refresh-prices ne pose price_updated_at", () => {
    const fichiers = ["app", "lib", "scripts"].flatMap((d) => fs.readdirSync(path.join(ROOT, d), { recursive: true, withFileTypes: false }) as string[]).map(String);
    const ecrivains = fichiers
      .filter((f) => /\.(ts|tsx|mjs)$/.test(f))
      .filter((f) => {
        const p = ["app", "lib", "scripts"].map((d) => path.join(ROOT, d, f)).find((x) => fs.existsSync(x));
        return p ? /price_updated_at\s*:/.test(fs.readFileSync(p, "utf8")) : false;
      });
    expect(ecrivains.map((f) => f.replace(/\\/g, "/"))).toEqual(["api/cron/refresh-prices/route.ts"]);
  });
  it("le plan du site date les fiches générées par leur texte (last_refreshed_at), pas par updated_at", () => {
    const src = lire("app/sitemap.ts");
    expect(src).toMatch(/toLastModified\(r\.last_refreshed_at\)/);
    expect(src).not.toMatch(/toLastModified\(r\.updated_at\)/);
  });
});

describe("I2 — aucune promesse de fréquence sans robot", () => {
  it("API publique, page de documentation et registre : plus de mensuel ni de trimestriel, plus de nextReviewDate", () => {
    for (const f of ["app/api-publique/page.tsx", "app/api/public/route.ts", "data/psan-registry.json", "app/api/public/psan-registry/route.ts", "lib/mica.ts"]) {
      const s = lire(f);
      expect(s, f).not.toMatch(/"(Mensuelle|Trimestrielle|monthly|quarterly)"/);
      expect(s, f).not.toMatch(/nextReviewDate\s*[:?]/);
    }
    expect(JSON.parse(lire("data/psan-registry.json"))._meta.updateFrequency).toBe("Date de mise à jour : _meta.lastUpdated");
  });
});

describe("I3 / I4 — convertisseur", () => {
  const src = lire("app/convertisseur/[pair]/page.tsx");
  it("aucun âge « il y a » calculé côté serveur (page en cache 1 h)", () => {
    expect(src).not.toMatch(/il y a \$\{/);
    expect(src).not.toMatch(/fmtRelative/);
    expect(src).toMatch(/heure de Paris/);
  });
  it("plus de « mis à jour chaque jour » ni « à la seconde » ; deux devises = taux de référence, pas « temps réel »", () => {
    expect(src).not.toMatch(/mis à jour chaque jour/);
    expect(src).not.toMatch(/à la seconde/);
    expect(src).toMatch(/deuxDevises\s*\?\s*`Convertir \$\{fromUp\} en \$\{toUp\} \(\$\{fromName\}\) au taux de référence`/);
  });
});

describe("I6 — détecteur de dates hors composant", () => {
  it("voit « contrôle du 06/10/2026 » et « mise à jour avr. 2026 »", () => {
    expect(jugerPageDates("<p>Frais (contrôle du 06/10/2026)</p>")).toHaveLength(1);
    expect(jugerPageDates("<p>Données : mise à jour avr. 2026</p>")).toHaveLength(1);
    expect(jugerPageDates('<p><span data-verifie-le="2026-10-06">Registre ESMA contrôlé automatiquement le 06/10/2026</span></p>')).toHaveLength(0);
  });
  it("pages contrôlées : les gabarits demandés + 5 avis tournants, déterministes sur un jour", () => {
    for (const p of ["/methodologie", "/api-publique", "/top", "/partenaires/waltio", "/impots", "/transparence", "/quiz/plateforme", "/outils/succession-crypto"]) {
      expect(PAGES_DATES).toContain(p);
    }
    const slugs = ["kraken", "coinbase", "bitpanda", "binance", "bitstack", "revolut", "ledger", "trade-republic"];
    const jour = pagesDatesDuJour(slugs, T("2026-10-08T10:00:00Z"));
    const avis = jour.filter((p: string) => p.startsWith("/avis/") && p !== "/avis/kraken");
    expect(avis).toHaveLength(5);
    expect(pagesDatesDuJour(slugs, T("2026-10-08T22:00:00Z"))).toEqual(jour);
  });
  it("les phrases générées (lib/platforms.ts, quiz) ne portent plus de date", () => {
    const p = lire("lib/platforms.ts");
    expect(p).not.toMatch(/relevé du \$\{dateFr/);
    expect(p).not.toMatch(/vérifié le \$\{dateFr/);
    expect(p).not.toMatch(/Frais relevés le \$\{dateFr/);
    expect(lire("components/PlatformQuiz.tsx")).not.toMatch(/releveText\(/);
    expect(lire("data/airdrops.json")).not.toMatch(/Vérifié le \d/);
  });
});

describe("I7 — robots qui ne finissent plus verts sans travail", () => {
  it("daily-content : 0 actu = échec, moins de 5 analyses traitées = échec", () => {
    const steps = parse(lire(".github/workflows/daily-content.yml")).jobs.generate.steps as { name?: string; run?: string; if?: string }[];
    const s = steps.find((x) => /travail du jour manque/.test(x.name ?? ""));
    expect(s).toBeTruthy();
    expect(s!.run).toMatch(/\[ "\$NEWS_CREATED" = "0" \]/);
    expect(s!.run).toMatch(/-lt 5/);
    expect(s!.if).toMatch(/steps\.gen\.outcome == 'success'/);
  });
  it("refresh-prices-db : 95 % des fiches traitées doivent être écrites", () => {
    expect(lire(".github/workflows/refresh-prices-db.yml")).toMatch(/\$\(\( UPD \* 100 \)\) -ge \$\(\( PROC \* 95 \)\)/);
  });
  it("sentinelle des cours : échec (et non avertissement) si aucune fiche générée n'est contrôlée", () => {
    const s = lire("scripts/sentinelle.mjs");
    expect(s).toMatch(/aucune fiche générée contrôlée/);
    expect(s).toMatch(/repère data-cours-\* absent/);
  });
  it("weekly-events : lancement manuel seulement (ni horaire GitHub, ni gardien, ni cadence)", () => {
    const on = parse(lire(".github/workflows/weekly-events.yml")).on;
    expect(on).toHaveProperty("workflow_dispatch");
    expect(on).not.toHaveProperty("schedule");
    expect(ROBOTS_GARDIEN.map((r) => r.workflow)).not.toContain("weekly-events.yml");
    expect(CADENCE.map((c: [string, string, number]) => c[0])).not.toContain("weekly-events.yml");
    expect(lire("vercel.json")).not.toMatch(/gardien\/weekly-events/);
  });
});
