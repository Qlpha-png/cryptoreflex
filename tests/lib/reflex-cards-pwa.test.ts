/**
 * Reflex Cards — la PWA du jeu (option A, 03/10/2026) : la page du jeu est installable avec sa propre identité, sans que le
 * gabarit généré soit modifié ; le manifest dédié et ses icônes existent ; le script d'installation est autonome.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { gameHtml } from "@/lib/reflex-cards/game";
import { GAME_TEMPLATE } from "@/lib/reflex-cards/game/template";
import { GAME_ICONS, GAME_MANIFEST_PATH, GAME_SHORTCUT, PWA_SCRIPT_VERSION, gameManifest, pwaHead } from "@/lib/reflex-cards/pwa";
import { GET as manifestGet } from "@/app/cartes/manifest.webmanifest/route";
import siteManifest from "@/app/manifest";

const pub = (p: string) => path.join(process.cwd(), "public", p);

describe("Reflex Cards — PWA du jeu", () => {
  it("la page du jeu lie le manifest dédié, les métas iOS, l'icône PNG et le script d'installation, avant </head>", () => {
    const html = gameHtml(1);
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain(`<link rel="manifest" href="${GAME_MANIFEST_PATH}">`);
    expect(head).toContain('<meta name="apple-mobile-web-app-capable" content="yes">');
    expect(head).toContain('<meta name="apple-mobile-web-app-status-bar-style" content="black">');
    expect(head).toContain('<meta name="apple-mobile-web-app-title" content="Reflex Cards">');
    expect(head).toContain(`<link rel="apple-touch-icon" href="${GAME_ICONS.apple180}">`);
    expect(head).toContain(`<script defer src="/reflex-cards/pwa.js?v=${PWA_SCRIPT_VERSION}"`);
    expect(html.split('rel="manifest"').length).toBe(2);
    /* le point d'injection reste intact pour le voile des comptes (lib/reflex-cards/game.ts) */
    expect(html).toContain("</head>\n<body");
  });

  it("le service worker n'est demandé qu'en production (data-sw)", () => {
    expect(pwaHead(true)).toContain('data-sw="1"');
    expect(pwaHead(false)).not.toContain("data-sw");
    expect(pwaHead(false).endsWith("\n")).toBe(true);
  });

  it("le gabarit généré n'a ni manifest ni script PWA : tout vient de l'injection (un seul point d'injection)", () => {
    expect(GAME_TEMPLATE).not.toContain('rel="manifest"');
    expect(GAME_TEMPLATE).not.toContain("pwa.js");
    expect(GAME_TEMPLATE.split("</head>\n<body>").length).toBe(2);
  });

  it("manifest : identité propre au jeu, démarrage sur /cartes/jouer, scope « / », icônes PNG présentes, orientation libre", () => {
    const m = gameManifest();
    expect(m.id).toBe("/cartes/jouer");
    expect(m.start_url).toBe("/cartes/jouer#booster"); // l'app s'ouvre sur les boosters, pas sur l'accueil
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.orientation).toBe("any");
    expect(m.short_name).toBe("Reflex Cards");
    expect(m.theme_color).toBe(m.background_color);
    expect(m.icons.length).toBeGreaterThanOrEqual(3);
    for (const i of m.icons) {
      expect(i.type).toBe("image/png");
      expect(existsSync(pub(i.src)), i.src).toBe(true);
      expect(i.src).toMatch(/\.png$/);
    }
    expect(m.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512")).toBe(true);
    expect(m.icons.some((i) => i.sizes === "192x192")).toBe(true);
    expect(m.shortcuts.length).toBeGreaterThan(0);
    for (const s of m.shortcuts) expect(s.url.startsWith("/cartes/jouer")).toBe(true);
    /* les icônes sont de vrais PNG (signature) */
    for (const src of Object.values(GAME_ICONS)) expect(readFileSync(pub(src)).subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  it("route /cartes/manifest.webmanifest : le manifest en JSON, type MIME dédié ; 404 quand le jeu est coupé", async () => {
    const prev = { on: process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED, env: process.env.NEXT_PUBLIC_VERCEL_ENV };
    try {
      process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED = "true";
      const res = manifestGet();
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/manifest+json");
      expect(await res.json()).toEqual(gameManifest());
      process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED = "false";
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      expect(manifestGet().status).toBe(404);
    } finally {
      if (prev.on === undefined) delete process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED; else process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED = prev.on;
      if (prev.env === undefined) delete process.env.NEXT_PUBLIC_VERCEL_ENV; else process.env.NEXT_PUBLIC_VERCEL_ENV = prev.env;
    }
  });

  it("le manifest du site propose « Jouer à Reflex Cards » en premier raccourci quand le jeu est activé", () => {
    const prev = process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED;
    try {
      process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED = "true";
      const on = siteManifest();
      expect(on.shortcuts?.[0]).toEqual(GAME_SHORTCUT);
      expect(on.shortcuts?.[0]?.url).toBe("/cartes/jouer#booster");
      process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED = "false";
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      expect(siteManifest().shortcuts?.some((s) => s.url.startsWith("/cartes/jouer"))).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED; else process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED = prev;
    }
  });

  it("public/reflex-cards/pwa.js : script autonome et valide, sujet « cartes » fusionné, vouvoiement, service worker du site", () => {
    const src = readFileSync(pub("reflex-cards/pwa.js"), "utf8");
    expect(() => new Function(src)).not.toThrow();
    expect(src).toContain('topics: [TOPIC], merge: true');
    expect(src).toContain('var TOPIC = "cartes"');
    expect(src).toContain('register("/sw.js"');
    expect(src).toContain("/api/push/vapid-key");
    expect(src).toContain("window.ReflexPWA");
    /* seules des préférences en mémoire locale (préfixe rc9:pwa:), jamais la partie */
    for (const k of src.match(/"rc9:[a-z:]+"/g) ?? []) expect(k.startsWith('"rc9:pwa:')).toBe(true);
    /* vouvoiement dans les textes affichés */
    for (const t of src.match(/"[^"\n]*(?:\bt(?:u|on|a|es)\b)[^"\n]*"/gi) ?? []) expect(t, "tutoiement").toBe("");
  });
});
