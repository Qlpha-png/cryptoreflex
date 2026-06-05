import { describe, it, expect } from "vitest";
import { lintText } from "../scripts/audit-quality.mjs";

/**
 * Tests de la famille de règles `fiscal-*` (anti-régression doctrine fiscale).
 * On lint un texte fixture avec onlyBroad:true (n'exécute que les règles fiscales),
 * sur un chemin NON whitelisté (pas un guide fiscal dédié).
 *
 * Doctrine de référence : échange sans soulte entre actifs numériques = sursis
 * (art. 150 VH bis CGI / BOFiP BOI-RPPM-PVBMC-30-30) ; staking/airdrop = moment
 * d'imposition non tranché par une doctrine officielle dédiée.
 */
const FIXTURE = "content/articles/_fixture-test.mdx";
const lint = (txt: string) =>
  (lintText as (s: string, p: string, o?: { onlyBroad?: boolean }) => Array<{ rule: string }>)(
    txt,
    FIXTURE,
    { onlyBroad: true },
  );
const rules = (txt: string) => lint(txt).map((f) => f.rule);

describe("audit:quality — anti-régression fiscale (fiscal-*)", () => {
  it("FLAG : swap crypto→crypto présenté comme cession imposable sans nuance", () => {
    expect(rules("Un swap crypto vers crypto est une cession imposable.")).toContain(
      "fiscal-swap-cession-sans-nuance",
    );
  });

  it("OK : swap crypto→crypto avec sursis / sans soulte / 150 VH bis", () => {
    expect(
      lint(
        "Un swap crypto vers crypto sans soulte n'est pas imposable (sursis, art. 150 VH bis CGI).",
      ),
    ).toHaveLength(0);
  });

  it("FLAG : conversion crypto→stablecoin présentée comme cession taxable sans nuance", () => {
    expect(
      rules("Une conversion crypto vers stablecoin est une cession taxable."),
    ).toContain("fiscal-swap-cession-sans-nuance");
  });

  it("OK : stablecoin = actif numérique, sursis, sans soulte", () => {
    expect(
      lint(
        "Une conversion crypto vers stablecoin sans soulte n'est pas imposable : le stablecoin est un actif numérique (sursis, 150 VH bis).",
      ),
    ).toHaveLength(0);
  });

  it("OK : cession contre euro correctement présentée comme imposable", () => {
    expect(
      lint(
        "La conversion d'un stablecoin contre euro reste une cession imposable d'actif numérique.",
      ),
    ).toHaveLength(0);
  });

  it("FLAG : staking imposé à la réception (BNC) comme règle acquise", () => {
    expect(
      rules("Les récompenses de staking sont imposées à la réception en BNC."),
    ).toContain("fiscal-staking-reception-sans-nuance");
  });

  it("OK : staking avec « non tranché / à vérifier »", () => {
    expect(
      lint(
        "Le staking est imposé à la réception selon une interprétation, mais ce n'est pas tranché officiellement — à vérifier selon la situation.",
      ),
    ).toHaveLength(0);
  });

  it("FLAG : airdrop = BNC à la réception sans nuance", () => {
    expect(rules("L'airdrop est un revenu BNC à la réception, à la valeur du jour.")).toContain(
      "fiscal-staking-reception-sans-nuance",
    );
  });

  it("FLAG : fausse date BOFiP 14 août 2025", () => {
    expect(rules("Selon le BOFiP du 14 août 2025, le staking est imposé.")).toContain(
      "fiscal-fake-bofip-date",
    );
  });

  it("FLAG : fausse référence BOFIP 2024", () => {
    expect(rules("Mise à jour BOFIP 2024 sur la fiscalité du staking.")).toContain(
      "fiscal-fake-bofip-date",
    );
  });

  it("FLAG : seuil inventé 10 swaps/an", () => {
    expect(rules("Au-delà de 10 swaps/an, tu bascules en activité professionnelle.")).toContain(
      "fiscal-invented-threshold",
    );
  });

  it("FLAG : seuil inventé 5 000 €/an", () => {
    expect(rules("Un seuil de 5 000 €/an déclenche le régime professionnel.")).toContain(
      "fiscal-invented-threshold",
    );
  });

  it("FLAG : fausse doctrine dans un GUIDE fiscal dédié (whitelist retiré — audit Codex)", () => {
    const findings = (
      lintText as (s: string, p: string, o?: { onlyBroad?: boolean }) => Array<{ rule: string }>
    )(
      "Un swap crypto vers crypto est une cession imposable.",
      "content/articles/fiscalite-staking-eth-sol-ada-france-2026-guide-complet.mdx",
      { onlyBroad: true },
    );
    expect(findings.map((f) => f.rule)).toContain("fiscal-swap-cession-sans-nuance");
  });

  it("OK : formulation pédagogique qui RÉFUTE la fausse doctrine (ne pas flaguer — audit Codex)", () => {
    expect(lint("Ne dites pas que le swap crypto vers crypto est une cession imposable.")).toHaveLength(0);
    expect(
      lint("Il est faux de dire qu'une conversion crypto vers stablecoin est une cession taxable."),
    ).toHaveLength(0);
    expect(
      lint("Contrairement à une idée reçue, un swap crypto vers crypto n'est pas une cession imposable."),
    ).toHaveLength(0);
  });

  it("OK : contenu neutre sans doctrine fiscale", () => {
    expect(lint("Bitcoin est une cryptomonnaie. Le staking permet un rendement passif.")).toHaveLength(
      0,
    );
  });

  /* ----------------------------------------------------------------------- */
  /*  Anti-régression Codex (juin 2026) — durcissement FISCAL_NUANCE         */
  /*  La nuance trop large `actifs? numériques?` a été retirée : c'est une   */
  /*  catégorie descriptive, pas une nuance fiscale (sursis/sans soulte/     */
  /*  150 VH bis). Le pattern accueille aussi « déclenche l'impôt ».         */
  /* ----------------------------------------------------------------------- */

  it("FLAG (Codex) : « échange entre actifs numériques est une cession imposable » (sans vraie nuance)", () => {
    expect(rules("Un échange entre actifs numériques est une cession imposable.")).toContain(
      "fiscal-swap-cession-sans-nuance",
    );
  });

  it("OK (Codex) : échange entre actifs numériques sans soulte + sursis + 150 VH bis", () => {
    expect(
      lint(
        "Un échange entre actifs numériques sans soulte bénéficie du sursis d'imposition prévu par l'article 150 VH bis du CGI.",
      ),
    ).toHaveLength(0);
  });

  it("FLAG (Codex) : arbitrage entre deux actifs numériques déclenche une cession imposable", () => {
    expect(
      rules("Un arbitrage entre deux actifs numériques déclenche une cession imposable."),
    ).toContain("fiscal-swap-cession-sans-nuance");
  });

  it("OK (Codex) : cession contre monnaie ayant cours légal + échange sans soulte = sursis", () => {
    expect(
      lint(
        "Une cession contre monnaie ayant cours légal peut constituer un fait générateur fiscal, tandis qu'un échange entre actifs numériques sans soulte relève du sursis prévu par l'article 150 VH bis.",
      ),
    ).toHaveLength(0);
  });

  it("FLAG (Codex) : « Passer de Bitcoin vers un stablecoin déclenche automatiquement l'impôt »", () => {
    expect(
      rules("Passer de Bitcoin vers un stablecoin déclenche automatiquement l'impôt."),
    ).toContain("fiscal-swap-cession-sans-nuance");
  });

  it("OK (Codex) : crypto vers stablecoin sans soulte = sursis (analyse prudente)", () => {
    expect(
      lint(
        "Un échange crypto vers stablecoin doit être analysé comme un échange entre actifs numériques ; sans soulte, le sursis d'imposition prévu par l'article 150 VH bis peut s'appliquer selon la situation.",
      ),
    ).toHaveLength(0);
  });
});
