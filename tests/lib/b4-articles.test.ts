/**
 * Lot B4 (10/10/2026) — articles et rendu MDX : encadré de confiance, rémunération, sources, encadrés (Callout),
 * newsletter. Garde-fous bloquants :
 *  - la ligne « Rémunération » reprend EXACTEMENT les formulations de lib/partnerships.ts, choisies selon les liens
 *    rémunérés réellement présents dans l'article (jamais « aucun lien publicitaire » si l'article en porte un) ;
 *  - les sources ne sont que des sites officiels déjà cités dans l'article (liste fermée de domaines) ;
 *  - aucun MDX n'est modifié : AuthorBox délègue à TrustBox ;
 *  - quatre encadrés lisibles (≥ 4,5:1) dans les deux thèmes, mesurés sur les jetons de app/styles/tokens.css ;
 *  - un seul texte de newsletter, sans rythme promis.
 */
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TrustBox from "@/components/ui/TrustBox";
import AuthorBox from "@/components/mdx/AuthorBox";
import AuthorCard from "@/components/AuthorCard";
import Callout from "@/components/mdx/Callout";
import NewsletterInline from "@/components/NewsletterInline";
import { lignesRemuneration, REMUNERATION } from "@/lib/partnerships";
import { estSourceOfficielle, sourcesOfficielles, typesRemuneres } from "@/lib/article-confiance";

const texte = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, " ");

describe("rémunération lue dans les liens de l'article", () => {
  it("aucun lien rémunéré : ensemble vide, ligne « Aucun lien publicitaire dans cet article. »", () => {
    const md = "Voir [Kraken](https://www.kraken.com/) et [l'avis](/avis/kraken).\n\n<AffiliateLink href=\"https://www.coinbase.com\">Coinbase</AffiliateLink>";
    expect(typesRemuneres(md).size).toBe(0);
    expect(lignesRemuneration(typesRemuneres(md))).toEqual([REMUNERATION.aucune]);
  });

  it("Ledger (commission) et Bitpanda (parrainage personnel) : les deux formulations exactes, dans cet ordre", () => {
    const md = `<AffiliateLink platform="ledger">Ledger</AffiliateLink> puis [Bitpanda](https://www.bitpanda.com/?ref=146755795768201190)`;
    const types = typesRemuneres(md);
    expect([...types].sort()).toEqual(["affiliate", "referral"]);
    const lignes = lignesRemuneration(types);
    expect(lignes).toEqual([REMUNERATION.affiliate, REMUNERATION.referral]);
    expect(REMUNERATION.affiliate).toBe(
      "Publicité — Cryptoreflex perçoit une commission si vous achetez ou vous abonnez par ce lien. Cela ne change ni l’ordre ni la note.",
    );
    expect(REMUNERATION.referral).toBe(
      "Publicité — lien de parrainage personnel : Kevin Voisin, fondateur, peut toucher une prime si vous ouvrez un compte par ce lien. Cela ne change ni l’ordre ni la note.",
    );
  });

  it("redirection /go/ledger et CTABox : commission", () => {
    expect([...typesRemuneres('<CTABox title="t" description="d" ctaText="Voir" ctaUrl="/go/ledger" />')]).toEqual(["affiliate"]);
    expect([...typesRemuneres("[acheter](/go/trezor)")]).toEqual(["affiliate"]);
  });

  it("un lien interne vers la fiche d'un partenaire n'est pas rémunéré", () => {
    expect(typesRemuneres("[avis Ledger](/avis/ledger) et [Bitpanda](/avis/bitpanda)").size).toBe(0);
  });
});

describe("sources : sites officiels déjà cités, rien d'inventé", () => {
  it("garde les liens officiels, écarte plateformes et blogs, sans doublon", () => {
    const md = [
      "[article 150 VH bis](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038612228)",
      "[formulaire 2086](https://www.impots.gouv.fr/formulaire/2086/x)",
      "[Kraken](https://www.kraken.com/)",
      "[même loi](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038612228)",
      "[faux](https://legifrance.gouv.fr.evil.example/x)",
    ].join("\n");
    const s = sourcesOfficielles(md);
    expect(s.map((x) => x.url)).toEqual([
      "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038612228",
      "https://www.impots.gouv.fr/formulaire/2086/x",
    ]);
    expect(estSourceOfficielle("https://legifrance.gouv.fr.evil.example/x")).toBe(false);
  });
  it("aucun lien officiel : liste vide (la rubrique n'est pas affichée)", () => {
    expect(sourcesOfficielles("Rien à citer, voir [Kraken](https://www.kraken.com/).")).toEqual([]);
  });
});

describe("TrustBox", () => {
  const complet = renderToStaticMarkup(
    createElement(TrustBox, {
      variante: "complet",
      publieLe: "2026-05-30",
      misAJourLe: "2026-10-02",
      remuneration: lignesRemuneration(["affiliate"]),
      sources: [{ label: "Article 150 VH bis du CGI", url: "https://www.legifrance.gouv.fr/x" }],
      sourcesTitre: "Textes officiels cités",
      retour: { href: "/blog", label: "Tous les articles" },
    }),
  );
  it("rédaction = auteur réel de lib/authors, dates, méthode, rémunération exacte, sources cliquables", () => {
    const t = texte(complet);
    expect(t).toContain("Kevin Voisin");
    expect(t).toContain("Publié le 30/05/2026");
    expect(t).toContain("Mis à jour le 02/10/2026");
    expect(t).toContain("Comment nous vérifions");
    expect(complet).toContain('href="/methodologie"');
    expect(t).toContain(REMUNERATION.affiliate.replace(/ /g, " "));
    expect(complet).toContain('href="https://www.legifrance.gouv.fr/x"');
    expect(complet).toContain("data-verifie-le");
  });
  it("jamais de signature collective, d'affiliation, de bouclier ni de déclaration sur l'IA", () => {
    expect(complet).not.toMatch(/La rédaction|Équipe éditoriale|affiliation|lucide-shield|intelligence artificielle|rédigé par une IA/i);
  });
  it("sans rémunération fournie, la rubrique n'est pas affichée (rien n'est annoncé par défaut)", () => {
    const html = renderToStaticMarkup(createElement(TrustBox, { variante: "complet", publieLe: "2026-05-30" }));
    expect(html).not.toContain("Rémunération");
    expect(html).not.toContain("Aucun lien publicitaire");
  });
  it("AuthorBox (MDX) et AuthorCard délèguent à TrustBox", () => {
    expect(texte(renderToStaticMarkup(createElement(AuthorBox, { author: "Kevin Voisin", publishedAt: "1 mai 2026" })))).toContain("comment nous vérifions");
    const ligne = renderToStaticMarkup(createElement(AuthorCard, { variant: "compact", date: "2026-05-30", dateModified: "2026-10-02" }));
    expect(texte(ligne)).toContain("Kevin Voisin");
    expect(texte(ligne)).toContain("Publié le 30/05/2026");
    const plein = renderToStaticMarkup(createElement(AuthorCard, { variant: "full", date: "2026-05-30" }));
    expect(plein).toContain("data-trust-box");
  });
});

describe("Callout : quatre états, aucun rouge pour « warning »", () => {
  const rendu = (type: string) => renderToStaticMarkup(createElement(Callout, { type: type as never, children: "Texte" }));
  it("info, success, warning (alerte), danger, tip (info « Astuce »)", () => {
    expect(rendu("info")).toContain("bg-info-soft");
    expect(rendu("success")).toContain("bg-success-soft");
    expect(rendu("warning")).toContain("bg-warning-soft");
    expect(rendu("warning")).not.toContain("danger");
    expect(rendu("danger")).toContain("bg-danger-soft");
    expect(rendu("tip")).toContain("bg-info-soft");
    expect(texte(rendu("tip"))).toContain("Astuce");
  });
});

describe("contraste des encadrés ≥ 4,5:1 dans Encre et Papier (jetons de app/styles/tokens.css)", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "app/styles/tokens.css"), "utf8");
  const bloc = (ouvrant: RegExp) => {
    const i = css.search(ouvrant);
    return css.slice(i, css.indexOf("\n}", i));
  };
  const themes: Record<string, string> = { encre: bloc(/^:root\s*\{/m), papier: bloc(/^:root\[data-theme="light"\]\s*\{/m) };
  const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a: number[], b: number[]) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const jeton = (bl: string, nom: string): number[] => {
    const m = new RegExp(`--c-${nom}:\\s*([^;]+);`).exec(bl);
    if (!m) throw new Error(`jeton ${nom} absent`);
    const v = m[1].trim();
    const f = /^rgba?\(([^)]+)\)/.exec(v);
    return (f ? f[1].split(",") : v.split(/\s+/)).slice(0, 3).map(Number);
  };
  for (const [theme, bl] of Object.entries(themes)) {
    for (const etat of ["info", "success", "warning", "danger"]) {
      it(`${theme} · ${etat} : titre et corps sur le fond doux`, () => {
        const soft = jeton(bl, `${etat}-soft`);
        expect(ratio(jeton(bl, etat), soft)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(jeton(bl, "fg"), soft)).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${theme} · À retenir : texte fg et pastille d'action sur gold-soft`, () => {
      expect(ratio(jeton(bl, "fg"), jeton(bl, "gold-soft"))).toBeGreaterThanOrEqual(4.5);
      expect(ratio(jeton(bl, "on-action"), jeton(bl, "action"))).toBeGreaterThanOrEqual(4.5);
      expect(ratio(jeton(bl, "primary"), jeton(bl, "gold-soft"))).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("newsletter : texte unique, aucun rythme promis", () => {
  it("la phrase de la spec, quel que soit le titre ou le thème demandé par l'appelant", () => {
    const html = renderToStaticMarkup(
      createElement(NewsletterInline, {
        source: "bottom-article",
        context: "fiscalite",
        title: "Gardez une longueur d'avance",
        subtitle: "1 envoi par trimestre, 0 spam.",
        ctaLabel: "M'abonner à la veille fiscale",
      }),
    );
    const t = texte(html);
    expect(t).toContain("Nous n’écrivons que quand une information compte. Désinscription en un clic.");
    expect(t).toContain("Newsletter");
    expect(t).toContain("M’inscrire");
    expect(t).not.toMatch(/par trimestre|quotidien|hebdo|chaque (lundi|mardi|semaine)|7\s?h|1 envoi/i);
  });
});

/* ---------------------------------------------------------------------------------------------------------------------
 * Reprise ronde 1 du jury (10/10/2026)
 * ------------------------------------------------------------------------------------------------------------------- */
import { derniereModification } from "@/lib/article-dates";
import CalloutActualite from "@/components/news/CalloutActualite";
import { typoFrRiche } from "@/lib/typo-fr";

describe("date de dernière modification : celle de la signature, du JSON-LD et des corrections sont une seule date", () => {
  it("une correction publiée après la mise à jour déclarée l'emporte (Ledger vs Trezor : correction du 06/10/2026)", () => {
    expect(derniereModification({ slug: "ledger-vs-trezor-duel-objectif-2026-par-profil", date: "2026-04-26", lastUpdated: "2026-04-26" })).toBe("2026-10-06");
  });
  it("sans correction : la mise à jour du frontmatter, valeur inchangée", () => {
    expect(derniereModification({ slug: "slug-sans-correction", date: "2026-04-26", lastUpdated: "2026-10-02" })).toBe("2026-10-02");
    expect(derniereModification({ slug: "slug-sans-correction", date: "2026-04-26" })).toBe("2026-04-26");
  });
});

describe("actualités : avertissement au vouvoiement sans toucher aux fichiers de contenu", () => {
  it("« tu peux perdre… consulte… » est rendu « vous pouvez perdre… consultez… » (même texte)", () => {
    const html = renderToStaticMarkup(
      createElement(CalloutActualite, {
        type: "warning",
        title: "Avertissement",
        children: "Les marchés des crypto-actifs sont hautement volatils : tu peux perdre tout ou partie du capital investi. Avant toute décision financière, consulte un conseiller.",
      }),
    );
    const t = texte(html);
    expect(t).toContain("vous pouvez perdre tout ou partie du capital investi");
    expect(t).toContain("consultez un conseiller en investissements financiers");
    expect(t).not.toMatch(/\btu\b|consulte un/i);
  });
  it("un autre encadré passe tel quel", () => {
    expect(texte(renderToStaticMarkup(createElement(CalloutActualite, { type: "info", children: "Rien à changer." })))).toContain("Rien à changer.");
  });
});

describe("typographie française au rendu : apostrophes, guillemets, cadratin", () => {
  it("le composant Callout applique ’ et « » à son texte", () => {
    const html = renderToStaticMarkup(createElement(Callout, { type: "info", children: "L'astuce : \"mot de passe oublié\" — piège." }));
    expect(html).toContain("L’astuce");
    expect(html).toContain("«\u202Fmot de passe oublié\u202F»");
    expect(html).toContain("\u00A0— piège");
    expect(html).not.toContain("'");
  });
  it("apostrophe en fin de morceau de texte (« l'<lien> ») et apostrophes simples en guillemets", () => {
    expect(typoFrRiche("lisez l'")).toBe("lisez l’");
    expect(typoFrRiche("Mon Ledger peut-il être 'piraté à distance' ?")).toContain("«" + String.fromCharCode(0x202f) + "piraté à distance" + String.fromCharCode(0x202f) + "»");
    expect(typoFrRiche("d'un coup, l'1er jour")).toBe("d’un coup, l’1er jour");
  });
  it("cadratin en tête de morceau de texte (après une balise) : espace insécable aussi", () => {
    expect(typoFrRiche(" — suite")).toBe(String.fromCharCode(0xa0) + "— suite");
  });
  it("idempotente et sans effet sur le texte déjà composé", () => {
    const t = typoFrRiche("« Not your keys » — l'essentiel : 1 500 € (31,4 %)");
    expect(typoFrRiche(t)).toBe(t);
  });
  it("le titre d'un article ne commence jamais une ligne par un cadratin", () => {
    expect(typoFrRiche("Acheter BNB en France 2026 — Guide pratique")).toContain("2026\u00A0— Guide");
  });
});
