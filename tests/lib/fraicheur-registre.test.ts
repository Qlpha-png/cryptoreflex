/**
 * Lot Z1 (08/10/2026, architecture 0 € § 6.2) : registre de fraîcheur des 51 familles (+ 18b), calcul des états ✅ / ⚠️ / ❌,
 * expirations, compteur quotidien CoinMarketCap (+ erreur 1009), taille de la base Supabase, empreinte des licences.
 */
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  IDS_ATTENDUS,
  METHODES,
  chargerRegistre,
  compter,
  echeanceJeu,
  evaluerRegistre,
  extrairePage,
  instantDe,
  jugerCmcJour,
  jugerEtat,
  jugerExpiration,
  jugerJourSaison,
  jugerTailleBase,
  lireFamille,
  phrasesLicence,
  rapportHebdo,
  ticketsDefauts,
  validerRegistre,
  valeursChemin,
} from "../../scripts/lib/fraicheur-registre.mjs";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));

const ROOT = path.resolve(__dirname, "../..");
const reg = chargerRegistre(ROOT);
const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 8, 12, 0);
type Famille = { id: string; famille: string; ageMaxH: number; critiqueH: number; lecture: { methode: string } };
const fam = (o: Partial<Famille> = {}): Famille => ({ id: "x", famille: "test", ageMaxH: 24, critiqueH: 48, lecture: { methode: "fichier" }, ...o });

describe("registre data/fraicheur/registre.json", () => {
  it("51 familles de la carte + 18b, chacune avec source, robot, cadence, âge maximal et méthode de lecture", () => {
    expect(validerRegistre(reg)).toEqual([]);
    expect(IDS_ATTENDUS).toHaveLength(57); // lot Z7 : + 56 (propositions de correction des frais, R10/R11) ; lot Z3 : + 52 (liens des fiches) et 53 (archive des cours) ; reprise Z5 : + 54 (robot R8) ; lot Z6 : + 55 (revue périodique, robot R14)
    expect(reg.familles.map((f: Famille) => f.id)).toEqual(IDS_ATTENDUS);
  });

  it("aucune famille sans méthode de lecture de la vraie date (pas de « inconnue »)", () => {
    for (const f of reg.familles) {
      expect(METHODES, f.id).toContain(f.lecture.methode);
      expect(JSON.stringify(f).toLowerCase(), f.id).not.toMatch(/inconnue/);
    }
  });

  it("les familles numérotées reprennent la carte de fraîcheur (contrôle par sondage des intitulés)", () => {
    const parId = Object.fromEntries(reg.familles.map((f: Famille) => [f.id, f.famille]));
    expect(parId["1"]).toMatch(/bandeau/);
    expect(parId["18b"]).toMatch(/Liste noire AMF/);
    expect(parId["25"]).toMatch(/Trustpilot/);
    expect(parId["45"]).toMatch(/Reflex Cards/);
    expect(parId["51"]).toMatch(/Rappels/);
  });

  it("toutes les lectures LOCALES (fichier, constante, dossier, absence) donnent une date aujourd'hui", async () => {
    // les lectures combinées (« et », ex. n° 27 + passage GitHub) sont contrôlées à part
    for (const f of reg.familles.filter((x: Famille & { lecture: { et?: unknown } }) => ["fichier", "constante", "dossier", "absence"].includes(x.lecture.methode) && !x.lecture.et)) {
      const lu = await lireFamille(f, { root: ROOT, now: NOW });
      expect(lu.erreur, `n° ${f.id} : ${lu.erreur}`).toBeUndefined();
      expect(instantDe(lu.date), `n° ${f.id}`).not.toBeNull();
    }
  });

  it("n° 25 Trustpilot : ✅ tant qu'aucun champ de note n'est dans les données", async () => {
    const f = reg.familles.find((x: Famille) => x.id === "25");
    const r = jugerEtat(f, await lireFamille(f, { root: ROOT, now: NOW }), NOW);
    expect(r.etat).toBe("ok");
  });

  it("évaluation complète sans accès réseau : chaque famille a ✅, ⚠️ ou ❌ (jamais « inconnue »)", async () => {
    const res = await evaluerRegistre(reg, { root: ROOT, now: NOW, env: {} });
    expect(res).toHaveLength(57);
    for (const r of res) expect(["ok", "attention", "defaut"], r.id).toContain(r.etat);
    // sans accès (KV, GitHub, Supabase, site), une lecture réseau ne prouve rien : ❌, avec la raison
    expect(res.find((r: { id: string }) => r.id === "1")!.msg).toMatch(/accès KV absent/);
    // lot Z4 : la liste noire AMF est lue par la veille R5 (date du contrôle dans data/psan-registry.json) : plus ❌ d office
    expect(res.find((r: { id: string }) => r.id === "18b")!.msg).not.toMatch(/aucun robot/);
    expect(res.find((r: { id: string }) => r.id === "43")!.msg).toMatch(/recomptage non fait/);
    const n = compter(res);
    expect(n.ok + n.attention + n.defaut).toBe(57);
  });

  it("évaluation avec accès simulés : KV, GitHub, page, Supabase, recomptage", async () => {
    const pages: Record<string, string> = {
      "/marche": 'x\\"asOf\\":\\"2026-10-08T11:50:00Z\\"',
      "/": '"updatedAt":"2026-10-08T11:55:00.000Z"',
      "/marche/fear-greed": 'Valeur du <time dateTime="2026-10-08T00:00:00Z">8 octobre 2026</time> "dateModified":"2026-10-08T00:00:00Z"',
      "/feed.xml": "<pubDate>Thu, 08 Oct 2026 04:33:00 GMT</pubDate>",
      "/analyses-techniques": 'data-calcul="bitcoin|2026-10-08T06:19:37Z" data-calcul="ethereum|2026-10-08T06:19:37Z"',
      "/api/public/platforms": '{"_meta":{"lastUpdated":"2026-10-08"}}',
      "/cartes/jouer": "GAME_DAY=7",
      "/sitemap-index.xml": "<lastmod>2026-10-08T04:33:00.000Z</lastmod>",
    };
    const fetchSimule = vi.fn(async (u: string) => {
      if (u.includes("api.github.com")) return new Response(JSON.stringify({ workflow_runs: [{ created_at: "2026-10-08T06:00:20Z" }] }), { status: 200 });
      if (u.includes("/rest/v1/")) return new Response(JSON.stringify([{ price_updated_at: "2026-10-08T08:00:00Z", last_refreshed_at: "2026-05-09T00:00:00Z" }]), { status: 200 });
      return new Response("", { status: 404 });
    });
    const res = await evaluerRegistre(reg, {
      root: ROOT,
      now: NOW,
      env: { RECOMPTAGE_OK: "true" },
      fetch: fetchSimule,
      kvGet: async (cle: string) => ({ at: "2026-10-08T11:30:00Z", fetchedAt: "2026-10-08T11:50:00Z", ok: true, cle }),
      github: { token: "t", repo: "o/r" },
      supabase: { url: "https://exemple.supabase.co", key: "k" },
      getTexte: async (c: string) => pages[c] ?? null,
    });
    const etat = (id: string) => res.find((r: { id: string }) => r.id === id)!;
    for (const id of ["1", "2", "3", "4", "6", "7", "8", "12", "13", "31", "43", "44", "47", "48", "49", "50", "51"]) expect(etat(id).etat, `${id} : ${etat(id).msg}`).toBe("ok");
    expect(etat("42").etat).toBe("defaut"); // textes LLM du 09/05 : au-delà de 60 jours
    expect(etat("45").msg).toMatch(/échéance/);
    // aucun secret dans les messages
    expect(JSON.stringify(res)).not.toMatch(/"k"|Bearer/);
  });

  it("une colonne absente (migration non lancée) bascule sur la colonne de repli", async () => {
    const f = reg.familles.find((x: Famille) => x.id === "4");
    const fetchSimule = vi.fn(async (u: string) =>
      u.includes("select=price_updated_at")
        ? new Response(JSON.stringify({ code: "42703", message: "column cryptos.price_updated_at does not exist" }), { status: 400 })
        : new Response(JSON.stringify([{ updated_at: "2026-10-08T08:00:00Z" }]), { status: 200 }),
    );
    const lu = await lireFamille(f, { root: ROOT, now: NOW, fetch: fetchSimule, supabase: { url: "https://x.supabase.co", key: "k" } });
    expect(lu.date).toBe("2026-10-08T08:00:00Z");
    expect(lu.detail).toMatch(/repli/);
    // reprise : une colonne de repli (updated_at, rajeunie par d'autres écritures) ne vaut jamais mieux que ⚠️
    expect(jugerEtat(f, lu, NOW).etat).toBe("attention");
  });
});

describe("reprise Z1 : un ✅ ne doit pas mentir", () => {
  const dossierTemp = () => mkdtempSync(path.join(tmpdir(), "fraicheur-"));
  const ecrire = (root: string, rel: string, contenu: string) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), contenu);
  };

  it("valeursChemin : « cle.* » = toutes les valeurs de l'objet", () => {
    expect(valeursChemin({ plateformes: { a: "2026-10-01", b: "2026-10-05" } }, "plateformes.*")).toEqual(["2026-10-01", "2026-10-05"]);
    expect(valeursChemin({ plateformes: {} }, "plateformes.*")).toEqual([]);
  });

  it("n° 16 et 17 (MiCA) : plus ancienne date par plateforme, plateforme sans date = ❌, fichier vide = repli", async () => {
    const f16 = reg.familles.find((x: Famille) => x.id === "16");
    const f17 = reg.familles.find((x: Famille) => x.id === "17");
    expect(f16.lecture.chemin).toBe("plateformes.*");
    expect(f17.lecture.chemin).toBe("plateformes.*");
    const root = dossierTemp();
    try {
      const plateformes = { platforms: [{ id: "a" }, { id: "b" }, { id: "w", category: "wallet" }] };
      ecrire(root, "data/platforms.json", JSON.stringify({ platforms: plateformes.platforms.map((p) => ({ ...p, mica: { lastVerified: "2026-10-02" } })) }));
      // contrôle de la nuit avancé, mais « b » en écart garde sa vieille date : la famille prend la plus ancienne
      ecrire(root, "data/veille/mica-auto.json", JSON.stringify({ controle: "2026-10-08", plateformes: { a: "2026-10-08", b: "2026-09-01" } }));
      let lu = await lireFamille(f16, { root, now: NOW });
      expect(lu.date).toBe("2026-09-01");
      expect(lu.detail).toMatch(/controle = 2026-10-08/);
      // « b » jamais datée (écart dès la première nuit) : ❌ même si « controle » est du jour
      ecrire(root, "data/veille/mica-auto.json", JSON.stringify({ controle: "2026-10-08", plateformes: { a: "2026-10-08" } }));
      lu = await lireFamille(f16, { root, now: NOW });
      const r = jugerEtat(f16, lu, NOW);
      expect(r.etat).toBe("defaut");
      expect(r.msg).toMatch(/1 sur 2 sans date : b/);
      // fichier encore vide (aujourd'hui) : repli sur la plus ancienne relecture humaine
      ecrire(root, "data/veille/mica-auto.json", JSON.stringify({ controle: null, plateformes: {} }));
      lu = await lireFamille(f16, { root, now: NOW });
      expect(lu.date).toBe("2026-10-02");
      expect(lu.detail).toMatch(/repli/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("n° 25 Trustpilot : lit aussi les sources du guide PDF, data/partner-reviews.ts et les articles ; une note = ❌", async () => {
    const f = reg.familles.find((x: Famille) => x.id === "25");
    for (const rel of ["content/lead-magnets/guide-plateformes-crypto-2026.md", "content/lead-magnets/guide-plateformes-crypto-2026-PART-A.md", "content/lead-magnets/guide-plateformes-crypto-2026-PART-B.md", "data/partner-reviews.ts"]) {
      expect(f.lecture.fichiers).toContain(rel);
    }
    expect(f.lecture.dossiers).toEqual([{ dossier: "content/articles", extension: ".mdx" }]);
    const root = dossierTemp();
    try {
      for (const rel of f.lecture.fichiers) ecrire(root, rel, "{}");
      ecrire(root, "content/articles/a.mdx", "Rien à signaler.");
      expect(jugerEtat(f, await lireFamille(f, { root, now: NOW }), NOW).etat).toBe("ok");
      // l'ancienne ligne du guide PDF
      ecrire(root, "content/lead-magnets/guide-plateformes-crypto-2026-PART-A.md", "- Trustpilot : 1,6 / 5 (28 500 avis)");
      let r = jugerEtat(f, await lireFamille(f, { root, now: NOW }), NOW);
      expect(r.etat).toBe("defaut");
      expect(r.msg).toMatch(/PART-A/);
      ecrire(root, "content/lead-magnets/guide-plateformes-crypto-2026-PART-A.md", "rien");
      ecrire(root, "content/articles/a.mdx", "Coinbase est noté Trustpilot 4,0/5 sur 23 213 avis.");
      r = jugerEtat(f, await lireFamille(f, { root, now: NOW }), NOW);
      expect(r.etat).toBe("defaut");
      expect(r.msg).toMatch(/a\.mdx/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("n° 27 (lois) : la plus ancienne de _enregistre et du dernier passage réussi de la veille ; sans GitHub = ❌", async () => {
    const f = reg.familles.find((x: Famille) => x.id === "27");
    expect(f.lecture.et).toEqual([{ methode: "workflow", fichier: "veille-officielle.yml" }]);
    const root = dossierTemp();
    try {
      ecrire(root, "data/veille/etat.json", JSON.stringify({ _enregistre: "2026-10-07" }));
      // « enregistrer » lancé hier, mais la veille échoue depuis 40 jours (Légifrance non lu) : la vieille date l'emporte
      const fetchSimule = vi.fn(async (_u: string) => new Response(JSON.stringify({ workflow_runs: [{ created_at: "2026-08-29T04:40:00Z" }] }), { status: 200 }));
      const lu = await lireFamille(f, { root, now: NOW, fetch: fetchSimule, github: { token: "t", repo: "o/r" } });
      expect(lu.date).toBe("2026-08-29T04:40:00Z");
      expect(jugerEtat(f, lu, NOW).etat).toBe("attention");
      expect(String(fetchSimule.mock.calls[0][0])).toMatch(/workflows\/veille-officielle\.yml\/runs\?status=success/);
      const sans = await lireFamille(f, { root, now: NOW });
      expect(jugerEtat(f, sans, NOW).etat).toBe("defaut");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("n° 44 (jeu) : GAME_DAY comparé au jour attendu (jour 1 = 02/10/2026)", async () => {
    const f = reg.familles.find((x: Famille) => x.id === "44");
    const lire = async (texte: string, now = NOW) => jugerEtat(f, await lireFamille(f, { root: ROOT, now, getTexte: async () => texte }), now);
    expect((await lire("GAME_DAY=7")).etat).toBe("ok");
    expect((await lire("GAME_DAY=5")).etat).toBe("defaut");
    expect(jugerJourSaison(7, "2026-10-02", NOW)).toBeNull();
    // 00:30 à Paris le 09/10 : la page de la veille (jour 7) est encore admise ; à 03:00, non
    expect(jugerJourSaison(7, "2026-10-02", Date.UTC(2026, 9, 8, 22, 30))).toBeNull();
    expect(jugerJourSaison(7, "2026-10-02", Date.UTC(2026, 9, 9, 1, 0))).toMatch(/jour 8 attendu/);
  });

  it("n° 12 et 13 : un jour de publication raté sort du ✅ (seuils 26 h et 28 h)", () => {
    expect(reg.familles.find((x: Famille) => x.id === "12").ageMaxH).toBe(26);
    expect(reg.familles.find((x: Famille) => x.id === "13").ageMaxH).toBe(28);
  });

  it("le registre ne contredit pas les décisions de Kev (Binance et DefiLlama)", () => {
    const texte = JSON.stringify(reg);
    expect(texte).not.toMatch(/à retirer au lot Z2|DefiLlama exclu/);
  });

  it("la référence des licences s'écrit au premier relevé et le workflow la commite", () => {
    const veille = readFileSync(path.join(ROOT, "scripts/veille-officielle.mjs"), "utf8");
    expect(veille).toMatch(/data\/veille\/licences-ref\.json/);
    expect(veille).toMatch(/if \(!ref\) \{\s*LICENCES_REF\.pages\[p\.cle\] = emp;/);
    const wf = readFileSync(path.join(ROOT, ".github/workflows/veille-officielle.yml"), "utf8");
    expect(wf).toMatch(/git add data\/veille\/licences-ref\.json/);
  });

  it("sentinelle.yml : l'étape des tickets « Fraîcheur » n'a pas de continue-on-error", () => {
    const wf = readFileSync(path.join(ROOT, ".github/workflows/sentinelle.yml"), "utf8");
    const etape = wf.slice(wf.indexOf("- name: Tickets « Fraîcheur »"), wf.indexOf("uses:", wf.indexOf("- name: Tickets « Fraîcheur »")));
    expect(etape).toMatch(/if: always\(\)/);
    expect(etape).not.toMatch(/continue-on-error/);
  });
});

describe("jugerEtat (calcul des états)", () => {
  it("✅ sous l'âge maximal, ⚠️ jusqu'à l'âge critique, ❌ au-delà", () => {
    expect(jugerEtat(fam(), { date: new Date(NOW - 23 * H).toISOString() }, NOW).etat).toBe("ok");
    expect(jugerEtat(fam(), { date: new Date(NOW - 24 * H).toISOString() }, NOW).etat).toBe("ok");
    expect(jugerEtat(fam(), { date: new Date(NOW - 30 * H).toISOString() }, NOW).etat).toBe("attention");
    expect(jugerEtat(fam(), { date: new Date(NOW - 49 * H).toISOString() }, NOW).etat).toBe("defaut");
  });
  it("date illisible ou lecture en erreur → ❌ (jamais « inconnue »)", () => {
    expect(jugerEtat(fam(), { erreur: "accès KV absent" }, NOW)).toMatchObject({ etat: "defaut", icone: "❌" });
    expect(jugerEtat(fam(), { date: "pas une date" }, NOW).etat).toBe("defaut");
    expect(jugerEtat(fam(), undefined as never, NOW).etat).toBe("defaut");
  });
  it("robot en échec → ❌ même avec une date récente ; avertissement forcé → au moins ⚠️", () => {
    expect(jugerEtat(fam(), { date: new Date(NOW).toISOString(), etatForce: "defaut", raison: "échec" }, NOW).etat).toBe("defaut");
    expect(jugerEtat(fam(), { date: new Date(NOW).toISOString(), etatForce: "attention" }, NOW).etat).toBe("attention");
  });
  it("date dans le futur (cas de la ligne ESMA au 11/09/2028) → ⚠️", () => {
    expect(jugerEtat(fam(), { date: "2028-09-11" }, NOW).etat).toBe("attention");
  });
  it("mois seul « 2026-04 » = 1er avril (jamais rajeuni)", () => {
    expect(instantDe("2026-04")).toBe(Date.UTC(2026, 3, 1));
    expect(jugerEtat(fam({ ageMaxH: 336, critiqueH: 720 }), { date: "2026-04" }, NOW).etat).toBe("defaut");
  });
  it("échéance (contenu du jeu) : ✅ à plus de 30 j, ⚠️ à 30 j ou moins, ❌ dépassée", () => {
    const f = fam({ ageMaxH: 720, critiqueH: 0 });
    expect(jugerEtat(f, { echeance: new Date(NOW + 60 * 24 * H).toISOString() }, NOW).etat).toBe("ok");
    expect(jugerEtat(f, { echeance: new Date(NOW + 10 * 24 * H).toISOString() }, NOW).etat).toBe("attention");
    expect(jugerEtat(f, { echeance: new Date(NOW - 24 * H).toISOString() }, NOW).etat).toBe("defaut");
  });
  it("échéance du jeu calculée comme la sentinelle (jour 7, éphémères jusqu'au jour 90)", () => {
    const e = echeanceJeu({ eph: { "1": [], "90": [] }, missionsByDate: { "2027-12-31": [] } }, 7, NOW);
    // carte de fraîcheur n° 45 : le jour 90 tombe le 30/12/2026 (Comptoir vide à partir du 31/12)
    expect(e.echeance?.slice(0, 10)).toBe("2026-12-30");
  });
});

describe("lectures de dates", () => {
  it("formats : ISO, jour, RSS, français, secondes et millisecondes", () => {
    expect(instantDe("2026-10-08T06:19:37Z")).toBe(Date.parse("2026-10-08T06:19:37Z"));
    expect(instantDe("2026-10-08")).toBe(Date.UTC(2026, 9, 8));
    expect(instantDe("Thu, 08 Oct 2026 04:33:00 GMT")).toBe(Date.UTC(2026, 9, 8, 4, 33));
    expect(instantDe("08 octobre 2026")).toBe(Date.UTC(2026, 9, 8));
    expect(instantDe("08/10/2026")).toBe(Date.UTC(2026, 9, 8));
    expect(instantDe("1791417600")).toBe(1791417600000);
    expect(instantDe(1791417600000)).toBe(1791417600000);
    expect(instantDe("")).toBeNull();
  });
  it("extrairePage : plus ancienne ou plus récente des dates trouvées ; repère absent → erreur", () => {
    const l = { chemin: "/x", motif: 'data-calcul="[a-z]+\\|([^"]+)"', mode: "plusAncienne" };
    expect(extrairePage('data-calcul="a|2026-10-08T06:00:00Z" data-calcul="b|2026-10-07T06:00:00Z"', l).date).toBe("2026-10-07T06:00:00Z");
    expect(extrairePage("rien", l).erreur).toMatch(/introuvable/);
  });
});

describe("restitution : ticket par famille ❌ et ticket hebdomadaire", () => {
  it("un ticket par famille ❌, titre stable et unique (dédoublonnage)", async () => {
    const res = await evaluerRegistre(reg, { root: ROOT, now: NOW, env: {} });
    const t = ticketsDefauts(res);
    expect(t.length).toBe(res.filter((r: { etat: string }) => r.etat === "defaut").length);
    expect(new Set(t.map((x: { titre: string }) => x.titre)).size).toBe(t.length);
    for (const x of t) expect(x.titre).toMatch(/^\[Fraîcheur\] n° [0-9b]+ — /);
    const t2 = ticketsDefauts(await evaluerRegistre(reg, { root: ROOT, now: NOW + 3_600_000, env: {} }));
    expect(t2.map((x: { titre: string }) => x.titre)).toEqual(t.map((x: { titre: string }) => x.titre));
  });
  it("le ticket hebdomadaire liste toutes les familles (57) avec leur état, sans rien ouvrir", async () => {
    const res = await evaluerRegistre(reg, { root: ROOT, now: NOW, env: {} });
    const md = rapportHebdo(res, NOW);
    for (const r of res) expect(md).toContain(`| ${r.id} | `);
    expect(md).toMatch(/✅ · \d+ ⚠️ · \d+ ❌/);
  });
});

describe("expirations, quotas, licences", () => {
  const gardien = reg.expirations.find((e: { id: string }) => e.id === "gardien-github");
  it("jetons du Gardien : expiration au 06/10/2027, avertissement à J-30, défaut une fois expirés", () => {
    expect(gardien.expire).toBe("2027-10-06");
    expect(jugerExpiration(gardien, NOW).level).toBe("ok");
    expect(jugerExpiration(gardien, Date.UTC(2027, 8, 10)).level).toBe("warn");
    expect(jugerExpiration(gardien, Date.UTC(2027, 9, 7)).level).toBe("fail");
    expect(jugerExpiration({ nom: "cron-job.org", expire: null }, NOW).level).toBe("warn");
  });
  it("CoinMarketCap au quotidien : erreur 1009 de moins de 24 h → ❌ (message stable), 80 % du plafond connu → ⚠️", () => {
    const f1 = jugerCmcJour({ aujourdhui: 12, erreur1009: "2026-10-08T03:00:00Z" }, NOW);
    expect(f1.level).toBe("fail");
    expect(jugerCmcJour({ aujourdhui: 99, erreur1009: "2026-10-08T03:00:00Z" }, NOW).msg).toBe(f1.msg);
    expect(jugerCmcJour({ aujourdhui: 12, erreur1009: "2026-10-06T03:00:00Z" }, NOW).level).toBe("ok");
    expect(jugerCmcJour({ aujourdhui: 400, plafondJour: 480, erreur1009: null }, NOW).level).toBe("warn");
    expect(jugerCmcJour({ aujourdhui: 40, plafondJour: 480, erreur1009: null }, NOW).level).toBe("ok");
    expect(jugerCmcJour({ aujourdhui: 40, plafondJour: null, erreur1009: null }, NOW).msg).toMatch(/non publiée/);
  });
  it("taille de la base : ⚠️ à 60 %, ❌ à 80 % de 500 Mo ; non mesurable → ⚠️ avec la raison, jamais un chiffre supposé", () => {
    const P = reg.quotas.supabase.plafondOctets;
    expect(P).toBe(500 * 1_048_576);
    expect(jugerTailleBase(0.59 * P, P).level).toBe("ok");
    expect(jugerTailleBase(0.6 * P, P).level).toBe("warn");
    expect(jugerTailleBase(0.8 * P, P).level).toBe("fail");
    const nm = jugerTailleBase(null, P, "fonction SQL absente");
    expect(nm).toMatchObject({ level: "warn" });
    expect(nm.msg).toMatch(/non mesurable : fonction SQL absente/);
    expect(reg.quotas.supabase.mesurable).toBe(false);
    expect(reg.quotas.supabase.etat).toMatch(/non mesurable/);
  });
  it("empreinte des licences : seules les phrases de conditions comptent (la valeur du jour n'y entre pas)", () => {
    const page = (valeur: number) => `Indice du jour : ${valeur}. Commercial use is allowed as long as the attribution is given right next to the display of the data. Bitcoin monte.`;
    expect(phrasesLicence(page(64))).toEqual(phrasesLicence(page(31)));
    expect(phrasesLicence(page(64))).toHaveLength(1);
    const dex = (n: number) => `Last updated ${n} years ago API Terms of Use Agreement apply to every commercial use.`;
    expect(phrasesLicence(dex(2))).toEqual(phrasesLicence(dex(3)));
  });
  it("la veille suit les 6 pages de licence S1, S2, S4, S5, S7, S8", () => {
    const sources = JSON.parse(readFileSync(path.join(ROOT, "data/veille/sources.json"), "utf8"));
    expect(sources.licences.pages.map((p: { cle: string }) => p.cle)).toEqual(["S1", "S2", "S4", "S5", "S7", "S8"]);
  });
});

describe("CoinMarketCap : compteur quotidien et erreur 1009 dans le bilan", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.CMC_API_KEY;
    vi.restoreAllMocks();
  });
  const rep = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("plafond quotidien et restant lus seulement s'ils sont renvoyés ; une erreur 1009 est notée et remontée", async () => {
    process.env.CMC_API_KEY = "cle-factice";
    globalThis.fetch = vi.fn(async (u: string | URL | Request) => {
      if (String(u).includes("/v1/key/info"))
        return rep({ status: { error_code: 0 }, data: { plan: { credit_limit_monthly: 15_000, credit_limit_daily: 480 }, usage: { current_day: { credits_used: 30, credits_left: 450 }, current_month: { credits_used: 100, credits_left: 14_900 } } } });
      return rep({ status: { error_code: 1009, error_message: "daily rate limit" } }, 429);
    }) as unknown as typeof fetch;
    const cmc = await import("@/lib/coinmarketcap");
    await cmc.cmcListingsTop().catch(() => null);
    const b = (await cmc.cmcBudgetReport(Date.now())) as { plafondJour: number | null; restantJour: number | null; erreur1009: string | null };
    expect(b.plafondJour).toBe(480);
    expect(b.restantJour).toBe(450);
    expect(b.erreur1009).not.toBeNull();
  });
});
