/**
 * Support client (relevé du 06/10/2026 sur les pages officielles d'assistance). Les anciennes valeurs de
 * data/platforms.json et data/wallets.json n'avaient jamais été sourcées : Kraken était donné « téléphone FR » et
 * /avis/kraken disait « Vous voulez un support FR par téléphone », alors que Kraken ne publie aucun numéro (l'appel
 * ne s'obtient que depuis l'application, au cas par cas). Règles : toute valeur renseignée (oui, non, canal,
 * délai) porte une source officielle et une date ; une valeur non vérifiée vaut null et s'affiche « Non vérifié ».
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  frenchHelpLabel,
  frenchHelpRank,
  getAllPlatforms,
  getPlatformById,
  supportChatLabel,
  supportDelayLabel,
  supportPhoneLabel,
  type Platform,
} from "@/lib/platforms";
import AvisPage from "@/app/avis/[slug]/page";
import ComparisonPage from "@/app/comparatif/[slug]/page";

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ");

/** Domaine officiel de la plateforme (celui de websiteUrl), ou domaine repris quand la marque a changé. */
const OFFICIAL_DOMAINS: Record<string, string[]> = {
  "anycoin-direct": ["anycoindirect.eu", "finst.com"],
  "paypal-crypto": ["paypal.com"],
  "just-mining": ["meria.com"],
  bybit: ["bybit.com", "bybit.eu"],
};
const domainOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");
const officialDomains = (p: Platform) => OFFICIAL_DOMAINS[p.id] ?? [domainOf(p.websiteUrl)];

describe("données support : source et date obligatoires", () => {
  const all = getAllPlatforms();

  it("couvre les 36 fiches (34 plateformes + 2 portefeuilles)", () => {
    expect(all).toHaveLength(36);
  });

  it("toute valeur true (chat ou téléphone en français) porte une source officielle et une date", () => {
    for (const p of all) {
      const s = p.support;
      if (s.frenchChat === true || s.frenchPhone === true) {
        expect(s.source, `${p.id} : source manquante`).toMatch(/^https:\/\//);
        expect(s.verified, `${p.id} : date manquante`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("toute valeur renseignée (oui, non, canal téléphonique, délai) porte aussi source, date et note", () => {
    for (const p of all) {
      const s = p.support;
      const filled = [s.frenchChat, s.frenchPhone, s.phone, s.responseTime].some((v) => v != null);
      if (!filled) continue;
      expect(s.source, p.id).toMatch(/^https:\/\//);
      expect(s.verified, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.note?.length ?? 0, `${p.id} : note vide`).toBeGreaterThan(20);
    }
  });

  it("chaque source (principale et complémentaires) est une page du domaine officiel, jamais un comparateur ni un blog tiers", () => {
    for (const p of all) {
      for (const url of [p.support.source, ...(p.support.otherSources ?? [])]) {
        if (!url) continue;
        expect(url, p.id).toMatch(/^https:\/\//);
        const host = domainOf(url);
        const ok = officialDomains(p).some((d) => host === d || host.endsWith(`.${d}`));
        expect(ok, `${p.id} : ${host} n'est pas un domaine officiel (${officialDomains(p).join(", ")})`).toBe(true);
      }
    }
  });

  it("aucun numéro de téléphone recopié dans les notes (un numéro périmé peut être repris par un escroc)", () => {
    for (const p of all) expect(p.support.note ?? "", p.id).not.toMatch(/\+\d{2}|\b0\d(?:[ .]?\d{2}){4}\b/);
  });

  it("la date du relevé est plausible (pas avant octobre 2026, jamais dans le futur)", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const p of all) {
      const d = p.support.verified;
      if (!d) continue;
      expect(d >= "2026-10-01" && d <= today, `${p.id} : ${d}`).toBe(true);
    }
  });

  it("cohérence : un téléphone en français suppose un accès téléphonique ; « aucun » exclut le oui", () => {
    for (const p of all) {
      const s = p.support;
      if (s.frenchPhone === true) expect(["numero", "appli", "reserve"], p.id).toContain(s.phone);
      if (s.phone === "aucun") expect(s.frenchPhone, p.id).toBe(false);
    }
  });

  it("aucun délai de réponse estimé (« <12h », « <24h »…) : seulement un délai que la plateforme annonce", () => {
    for (const p of all) {
      const r = p.support.responseTime;
      if (r == null) continue;
      expect(r, p.id).not.toMatch(/^</);
      expect(p.support.note, `${p.id} : le délai annoncé doit être repris dans la note`).toBeTruthy();
    }
  });
});

describe("libellés : jamais de promesse sans relevé", () => {
  const blank: Platform["support"] = {
    frenchChat: null,
    frenchPhone: null,
    phone: null,
    responseTime: null,
    source: null,
    verified: null,
    note: null,
  };

  it("non vérifié s'affiche « Non vérifié », ni oui ni non", () => {
    expect(supportChatLabel(blank)).toBe("Non vérifié");
    expect(supportPhoneLabel(blank)).toBe("Non vérifié");
    expect(supportDelayLabel(blank)).toBe("Non vérifié");
    expect(frenchHelpLabel(blank)).toBe("Non vérifié");
    expect(frenchHelpRank(blank)).toBe(0);
  });

  it("téléphone : numéro publié / appel depuis l'appli / aucun, avec la langue", () => {
    const v = { ...blank, source: "https://x", verified: "2026-10-06", note: "x".repeat(30) };
    expect(supportPhoneLabel({ ...v, phone: "numero", frenchPhone: true })).toBe("Numéro publié, en français");
    expect(supportPhoneLabel({ ...v, phone: "appli", frenchPhone: null })).toBe("Appel possible, sans numéro publié, langue non précisée");
    expect(supportPhoneLabel({ ...v, phone: "reserve", frenchPhone: false })).toBe("Réservé aux offres haut de gamme, pas en français");
    expect(supportPhoneLabel({ ...v, phone: "aucun", frenchPhone: false })).toBe("Aucun numéro publié");
    expect(supportDelayLabel(v)).toBe("Aucun délai annoncé");
    expect(frenchHelpLabel({ ...v, frenchChat: true, frenchPhone: true, phone: "numero" })).toBe("Téléphone et chat");
    expect(frenchHelpLabel({ ...v, frenchChat: false, phone: "aucun" })).toBe("Non");
  });
});

describe("valeurs relevées le 06/10/2026 (pages officielles relues à la source)", () => {
  const s = (id: string) => getPlatformById(id)!.support;

  it("téléphone en français confirmé : Coinbase (numéro), Coinhouse (numéro), Bitpanda (rappel sur rendez-vous), Finst", () => {
    expect([s("coinbase").phone, s("coinbase").frenchPhone]).toEqual(["numero", true]);
    expect([s("coinhouse").phone, s("coinhouse").frenchPhone, s("coinhouse").frenchChat]).toEqual(["numero", true, true]);
    expect([s("bitpanda").phone, s("bitpanda").frenchPhone, s("bitpanda").frenchChat]).toEqual(["appli", true, true]);
    expect([s("anycoin-direct").phone, s("anycoin-direct").frenchPhone]).toEqual(["numero", true]);
  });

  it("pas de téléphone, selon la plateforme : Bitstack, Bitvavo, Bybit EU, Ledger, Binance", () => {
    for (const id of ["bitstack", "bitvavo", "bybit", "ledger", "binance"]) expect(s(id).phone, id).toBe("aucun");
  });

  it("Revolut : appels réservés à Ultra et en anglais seulement ; Trade Republic : langue des conseillers non nommée", () => {
    expect([s("revolut").phone, s("revolut").frenchPhone]).toEqual(["reserve", false]);
    expect(s("trade-republic").frenchPhone).toBeNull();
    expect(s("trade-republic").frenchChat).toBeNull();
  });

  it("délais publiés par la plateforme elle-même seulement", () => {
    const withDelay = getAllPlatforms().filter((p) => p.support.responseTime).map((p) => p.id).sort();
    expect(withDelay).toEqual(["21bitcoin", "bitvavo", "bybit", "deblock", "feel-mining", "just-mining"]);
  });
});

describe("Kraken : aucun numéro publié, appel seulement depuis l'appli", () => {
  const kraken = getPlatformById("kraken")!;

  it("données", () => {
    expect(kraken.support.frenchPhone).not.toBe(true);
    expect(kraken.support.phone).toBe("appli");
    expect(kraken.support.source).toBe(
      "https://support.kraken.com/fr/articles/115013099227-how-to-contact-kraken-phone-support",
    );
    expect(kraken.support.responseTime).toBeNull();
    expect(kraken.strengths.join(" ")).not.toMatch(/t[ée]l[ée]phon/i);
  });

  it("/avis/kraken ne promet plus de support téléphonique en français et cite la page officielle", () => {
    const html = renderToStaticMarkup(AvisPage({ params: { slug: "kraken" } }));
    const t = text(html);
    expect(t).not.toMatch(/support FR par téléphone/i);
    expect(t).not.toMatch(/joindre le support par téléphone, en français/);
    expect(t).not.toMatch(/chat ET téléphone/);
    expect(t).not.toMatch(/délai de réponse moyen/);
    expect(t).toContain("Appel possible, sans numéro publié, langue non précisée");
    expect(t).toMatch(/considérer tout numéro trouvé en ligne à son nom comme une tentative d'hameçonnage potentielle/);
    expect(html).toContain(`href="${kraken.support.source}"`);
    expect(t).toMatch(/relevée le \d{1,2} octobre 2026/);
  });
});

describe("rendu de toutes les fiches /avis", () => {
  for (const p of getAllPlatforms()) {
    it(`/avis/${p.id} : aucune promesse de téléphone ou de chat en français sans relevé`, () => {
      const t = text(renderToStaticMarkup(AvisPage({ params: { slug: p.id } })));
      expect(t).not.toMatch(/chat ET téléphone|délai de réponse moyen|Vous serez redirigé vers l'anglais/);
      if (p.support.frenchPhone !== true) {
        expect(t).not.toMatch(/joindre le support par téléphone, en français|support téléphonique en français révèlent/);
      }
      if (p.support.source) expect(t).toContain("Page d'assistance officielle");
      else expect(t).toContain("Canaux d'assistance non vérifiés");
    });
  }
});

describe("comparatif", () => {
  it("coinbase-vs-kraken : pas de gagnant sur une valeur non vérifiée, sources citées", () => {
    const html = renderToStaticMarkup(ComparisonPage({ params: { slug: "coinbase-vs-kraken" } }));
    const t = text(html);
    expect(t).not.toMatch(/Téléphone FR Oui|Disponible/);
    expect(html).toContain(`href="${getPlatformById("kraken")!.support.source}"`);
    expect(html).toContain(`href="${getPlatformById("coinbase")!.support.source}"`);
  });
});
