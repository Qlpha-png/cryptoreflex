/**
 * Données de sécurité des plateformes (06/10/2026) : coldStoragePct, insurance et lastIncident s'affichent sur /avis,
 * /comparatif, /comparatif/securite, les classements et le quiz. Jusqu'ici aucune n'était sourcée : « 95 % » et « aucun
 * piratage depuis 2011 » pour Kraken (sa page sécurité ne donne ni l'un ni l'autre), « aucun incident » pour SwissBorg
 * (touchée en septembre 2025)…
 * Règle : toute valeur non nulle porte une source (URL) et une date de relevé ; sinon elle vaut null et le site écrit
 * « non communiqué par la plateforme ». Une absence d'incident ne s'écrit jamais dans les données.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import platformsData from "@/data/platforms.json";
import walletsData from "@/data/wallets.json";
import { coldStorageLabel, insuranceLabel, type Platform } from "@/lib/platforms";

type Sec = Platform["security"];
type P = Pick<Platform, "id" | "name" | "category" | "strengths" | "weaknesses" | "tagline" | "idealFor"> & { security: Sec };

const all: P[] = [
  ...(platformsData as unknown as { platforms: P[] }).platforms,
  ...(walletsData as unknown as { platforms: P[] }).platforms,
];

const isUrl = (u: unknown) => typeof u === "string" && /^https:\/\/[^\s]+$/.test(u);
const today = new Date().toISOString().slice(0, 10);

describe("sécurité des plateformes : chaque valeur affichée est sourcée et datée", () => {
  it("couvre les 36 plateformes (34 + 2 portefeuilles)", () => {
    expect(all.length).toBe(36);
  });

  it.each(all.map((p) => [p.id, p] as const))("%s : source et date pour toute valeur non nulle", (_id, p) => {
    const s = p.security;
    const bad: string[] = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.verified ?? "") || Number.isNaN(Date.parse(s.verified)) || s.verified > today) {
      bad.push(`verified invalide (${s.verified})`);
    }
    if (!s.source || typeof s.source !== "object") bad.push("source manquante");
    const src = s.source ?? {};

    if (s.coldStoragePct != null) {
      if (typeof s.coldStoragePct !== "number" || s.coldStoragePct < 0 || s.coldStoragePct > 100) bad.push("coldStoragePct hors 0-100");
    }
    if ((s.coldStoragePct != null || s.coldStorageNote) && !isUrl(src.coldStoragePct)) bad.push("coldStoragePct sans source");
    if (s.coldStoragePct == null && !s.coldStorageNote && src.coldStoragePct) bad.push("source.coldStoragePct sans valeur");

    if (s.insurance != null && typeof s.insurance !== "boolean") bad.push("insurance doit être true, false ou null");
    if (s.insurance != null && !isUrl(src.insurance)) bad.push("insurance sans source");
    if (s.insurance == null && (s.insuranceNote || src.insurance)) bad.push("insuranceNote/source sans valeur d'assurance");

    if (s.lastIncident != null) {
      const urls = src.lastIncident;
      if (!Array.isArray(urls) || urls.length === 0 || !urls.every(isUrl)) bad.push("lastIncident sans source (tableau d'URL)");
      // Une source par fait daté cité (« En mai 2025 », « Fin 2019 »…).
      const dated = (s.lastIncident.match(/\b(?:en|fin|début|mi-)\s?(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)?\s?\d{4}\b/gi) ?? []).length;
      if (Array.isArray(urls) && urls.length < Math.min(dated, 2)) bad.push(`${dated} faits datés pour ${urls.length} source(s)`);
      if (/^\s*aucun|aucun (incident|piratage|hack)|jamais (été )?(piraté|hacké)/i.test(s.lastIncident)) {
        bad.push(`lastIncident affirme une absence d'incident : « ${s.lastIncident} »`);
      }
    } else if (src.lastIncident) bad.push("source.lastIncident sans incident");

    expect(bad).toEqual([]);
  });

  it("les textes des plateformes ne promettent ni absence d'incident ni pourcentage hors ligne non publié", () => {
    const bad: string[] = [];
    for (const p of all) {
      const texts = [p.tagline, p.idealFor, ...(p.strengths ?? []), ...(p.weaknesses ?? [])].filter(Boolean) as string[];
      for (const t of texts) {
        if (/(aucun|jamais|sans)\s[^.]{0,30}(hack|pirat|incident)/i.test(t)) bad.push(`${p.id} : « ${t} »`);
        for (const m of t.matchAll(/(\d+(?:[.,]\d+)?)\s?%[^.]{0,25}(cold|froid|hors ligne|offline)/gi)) {
          const v = parseFloat(m[1].replace(",", "."));
          if (p.security.coldStoragePct !== v) bad.push(`${p.id} : « ${t} » (${v} % non publié)`);
        }
        if (/\bassurances?\b|fonds assurés|\binsurance\b/i.test(t) && p.security.insurance == null) bad.push(`${p.id} : « ${t} » (assurance non sourcée)`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("libellés affichés quand la plateforme ne publie rien", () => {
  const base = { category: "exchange" as const, security: { coldStoragePct: null, insurance: null, twoFA: true, lastIncident: null, source: {}, verified: "2026-10-06" } };

  it("« Non communiqué(e) par la plateforme », jamais un chiffre par défaut", () => {
    expect(coldStorageLabel(base)).toBe("Non communiqué par la plateforme");
    expect(insuranceLabel(base)).toBe("Non communiquée par la plateforme");
  });

  it("formule publiée affichée telle quelle, pourcentage au format français", () => {
    expect(coldStorageLabel({ ...base, security: { ...base.security, coldStoragePct: 98 } })).toBe("98 %");
    expect(coldStorageLabel({ ...base, security: { ...base.security, coldStorageNote: "« La majorité », selon X" } })).toBe("« La majorité », selon X");
  });

  it("portefeuille matériel : sans objet", () => {
    expect(coldStorageLabel({ ...base, category: "wallet" })).toMatch(/^Sans objet/);
    expect(insuranceLabel({ ...base, category: "wallet" })).toMatch(/^Sans objet/);
  });
});

describe("le code d'affichage ne réintroduit pas les anciennes promesses", () => {
  const root = path.resolve(__dirname, "..", "..");
  const files = [
    "app/avis/[slug]/page.tsx",
    "app/comparatif/[slug]/page.tsx",
    "app/comparatif/securite/page.tsx",
    "app/staking/[slug]/page.tsx",
    "lib/comparison-content.ts",
    "lib/listicles.ts",
    "components/comparison/SideBySideTable.tsx",
  ];
  it.each(files)("%s", (f) => {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    const banned = [
      /Aucun incident de sécurité majeur n'est documenté/,
      /police dédiée/,
      /Aucun à date/,
      /n'a connu aucun incident majeur/,
      /n&apos;ont jamais été victimes/,
      /aucun piratage majeur/,
      /security\.coldStoragePct\)\}\s*%/,
    ];
    expect(banned.filter((re) => re.test(src)).map(String)).toEqual([]);
  });
});
