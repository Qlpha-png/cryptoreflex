/**
 * Outil Succession crypto (lib/succession-crypto.ts) : la lettre ne doit JAMAIS pouvoir contenir une phrase de
 * récupération ou une clé privée écrite telle quelle (ou découpée naïvement), et une saisie ordinaire ne doit pas être
 * bloquée à tort. Vecteurs : BIP39 (trezor/python-mnemonic), SLIP-39 (trezor/python-shamir-mnemonic, vecteur n° 1),
 * WIF d'exemple (wiki Bitcoin), BIP32 test vector 1, SHA-256 (FIPS 180-4). Deux revues adversariales du 05/10/2026.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { findSecret, secretFindings, buildLetter, type SuccessionInput, type WalletEntry } from "@/lib/succession-crypto";
import { BIP39_ENGLISH } from "@/lib/bip39-english";
import { SLIP39_ENGLISH } from "@/lib/slip39-english";
import { sha256, isBase58Check } from "@/lib/sha256-sync";

const SEED_12 = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const SEED_12_B = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const SEED_24 =
  "letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic bless";
const W = SEED_12_B.split(" ");
const HEX = "0c28fca386c7a227600b2fe50b7cae11ec86d3bf1fbe471be89827e19d72aa1d";
const WIF = "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ";
const WIF_COMPRESSED = "KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617";
const XPRV =
  "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi";

function input(over: Partial<SuccessionInput> = {}): SuccessionInput {
  return { ownerName: "", wallets: [], method: "notaire", methodDetail: "", notary: "", trustedPerson: "", will: "non", message: "", ...over };
}
const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const utf8 = (s: string) => new TextEncoder().encode(s);

/** Encodage base58 (alphabet Bitcoin, zéros de tête compris) pour fabriquer des clés de test. */
function base58(bytes: number[] | Uint8Array): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const arr = Array.from(bytes);
  let n = BigInt("0x" + (arr.map((b) => b.toString(16).padStart(2, "0")).join("") || "0"));
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of arr) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}
function base58check(payload: number[]): string {
  const c = sha256(sha256(Uint8Array.from(payload)));
  return base58([...payload, ...c.subarray(0, 4)]);
}

describe("briques : listes de mots et SHA-256", () => {
  it("liste BIP39 officielle (2 048 mots)", () => {
    expect(BIP39_ENGLISH.size).toBe(2048);
    for (const w of ["abandon", "about", "legal", "zoo"]) expect(BIP39_ENGLISH.has(w)).toBe(true);
  });
  it("SHA-256 : vecteurs FIPS 180-4", () => {
    expect(toHex(sha256(utf8("")))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(toHex(sha256(utf8("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(toHex(sha256(utf8("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });
  it("base58check : WIF (non compressée et compressée) et xprv officiels valides, version altérée refusée", () => {
    expect(isBase58Check(WIF, [37, 38])).toBe(true);
    expect(isBase58Check(WIF_COMPRESSED, [37, 38])).toBe(true);
    expect(isBase58Check(XPRV, [82])).toBe(true);
    expect(isBase58Check(WIF.slice(0, -1) + "K", [37, 38])).toBe(false);
  });
});

describe("findSecret — phrases de récupération", () => {
  it("repère une phrase de 12 et de 24 mots", () => {
    expect(findSecret(SEED_12)).toBe("phrase");
    expect(findSecret(SEED_12_B)).toBe("phrase");
    expect(findSecret(SEED_24)).toBe("phrase");
  });
  it("repère une phrase numérotée, en majuscules, sur plusieurs lignes, au milieu d'un texte", () => {
    expect(findSecret(W.map((x, i) => `${i + 1}. ${x.toUpperCase()}`).join("\n"))).toBe("phrase");
    expect(findSecret(`Ma phrase : ${SEED_12_B} — ne la donnez à personne`)).toBe("phrase");
  });
  it("bloque dès 9 mots sur 12 (9 mots connus suffisent presque à reconstituer la phrase), pas à 8", () => {
    expect(findSecret(W.slice(0, 11).join(" "))).toBe("phrase");
    expect(findSecret(W.slice(0, 9).join(" "))).toBe("phrase");
    expect(findSecret(W.slice(0, 8).join(" "))).toBeNull();
  });
  const cases: Array<[string, string]> = [
    ["« Mot 1 : … » une ligne par mot", W.map((x, i) => `Mot ${i + 1} : ${x}`).join("\n")],
    ["« n°1 … »", W.map((x, i) => `n°${i + 1} ${x}`).join(" ")],
    ["« 1er, 2e, 3e … »", W.map((x, i) => `${i + 1}${i === 0 ? "er" : "e"} ${x}`).join(" ")],
    ["« 1st, 2nd, 3rd … »", W.map((x, i) => `${i + 1}${["st", "nd", "rd"][i] ?? "th"} ${x}`).join(" ")],
    ["« 3ème … » (accent)", W.map((x, i) => `${i + 1}ème ${x}`).join(" ")],
    ["ordinaux en lettres « premier legal, deuxième winner… »", ["premier", "deuxième", "troisième", "quatrième", "cinquième", "sixième", "septième", "huitième", "neuvième", "dixième", "onzième", "douzième"].map((o, i) => `${o} ${W[i]}`).join(", ")],
    ["mots reliés par « et »", W.join(" et ")],
    ["deux parties dans le même champ", `Partie 1 : ${W.slice(0, 6).join(" ")} chez moi, partie 2 : ${W.slice(6).join(" ")} à la banque`],
    ["abréviations à 4 lettres (plaque métal)", W.map((x) => x.slice(0, 4)).join(" ")],
    ["deux fautes de frappe", SEED_12_B.replace("sausage", "sausag").replace("useful", "usefull")],
    ["deux mots collés", SEED_12_B.replace("legal winner", "legalwinner")],
  ];
  for (const [label, text] of cases) {
    it(`repère : ${label}`, () => expect(findSecret(text)).toBe("phrase"));
  }
  it("repère 100 % de 2 000 phrases tirées au hasard (12 et 24 mots BIP39, 20 mots SLIP-39)", () => {
    const bip = [...BIP39_ENGLISH];
    const slip = [...SLIP39_ENGLISH];
    let seed = 987654;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const phrase = (list: string[], n: number) => Array.from({ length: n }, () => list[Math.floor(rnd() * list.length)]).join(" ");
    let missed = 0;
    for (let i = 0; i < 2000; i++) {
      const p = i % 3 === 0 ? phrase(bip, 12) : i % 3 === 1 ? phrase(bip, 24) : phrase(slip, 20);
      if (findSecret(p) !== "phrase") missed++;
    }
    expect(missed).toBe(0);
  });

  it("repère une part de sauvegarde SLIP-39 (vecteur officiel n° 1, 20 mots)", () => {
    expect(
      findSecret("duckling enlarge academic academic agency result length solution fridge kidney coal piece deal husband erode duke ajar critical decision keyboard"),
    ).toBe("phrase");
  });
});

describe("findSecret — clés privées", () => {
  it("clé hexadécimale, WIF (deux formats), xprv et Zprv valides", () => {
    expect(findSecret(HEX)).toBe("cle-privee");
    expect(findSecret(`clé : ${WIF}`)).toBe("cle-privee");
    expect(findSecret(WIF_COMPRESSED)).toBe("cle-privee");
    expect(findSecret(XPRV)).toBe("cle-privee");
    const zprvPayload = [0x02, 0xaa, 0x7a, 0x99, ...Array.from({ length: 74 }, (_, i) => (i * 29 + 7) % 256)];
    const zprv = base58check(zprvPayload);
    expect(zprv.startsWith("Zprv")).toBe(true);
    expect(findSecret(zprv)).toBe("cle-privee");
  });
  it("clé hexadécimale coupée : moitiés, paires, groupes de 3 ou 4, avec divers séparateurs", () => {
    expect(findSecret(`${HEX.slice(0, 32)}\n${HEX.slice(32)}`)).toBe("cle-privee");
    expect(findSecret(`${HEX.slice(0, 32)} / ${HEX.slice(32)}`)).toBe("cle-privee");
    expect(findSecret(HEX.match(/.{2}/g)!.join(" "))).toBe("cle-privee");
    expect(findSecret(HEX.match(/.{2}/g)!.join(":"))).toBe("cle-privee");
    expect(findSecret(HEX.match(/.{1,3}/g)!.join(" "))).toBe("cle-privee");
    expect(findSecret(HEX.match(/.{4}/g)!.join("-"))).toBe("cle-privee");
    expect(findSecret(HEX.match(/.{8}/g)!.join(", "))).toBe("cle-privee");
  });
  it("WIF coupée : en deux (espace ou virgule), en groupes de 4", () => {
    expect(findSecret(`${WIF.slice(0, 26)} ${WIF.slice(26)}`)).toBe("cle-privee");
    expect(findSecret(`${WIF.slice(0, 26)}, ${WIF.slice(26)}`)).toBe("cle-privee");
    expect(findSecret(WIF_COMPRESSED.match(/.{1,4}/g)!.join(" "))).toBe("cle-privee");
  });
  it("clé Solana (64 octets en base58) et tableau JSON de 64 octets", () => {
    const bytes = Array.from({ length: 64 }, (_, i) => (i * 37 + 11) % 256);
    expect(findSecret(base58(bytes))).toBe("cle-privee");
    expect(findSecret(JSON.stringify(bytes))).toBe("cle-privee");
  });
});

describe("findSecret — pas de faux blocage", () => {
  it("saisies ordinaires (français, anglais, adresses, montants, IBAN, téléphone)", () => {
    for (const ok of [
      "Mes bitcoins sont sur Coinbase ; les codes sont dans l'enveloppe scellée chez Maître Dupont, à Lyon. Demandez à ma sœur Claire, elle sait se servir du Ledger.",
      "Ledger Nano X rangé dans le tiroir du bureau, code PIN dans l'enveloppe du notaire",
      "My bitcoin is on my Ledger in the safe at the bank, please ask my brother John for help with it",
      "My dear children, I love you all very much. Please take care of your mother, stay close to each other and remember the good times we had together at the beach house every summer.",
      "BTC, ETH, SOL — environ 12 000 € en octobre 2026",
      "Adresse de réception : bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      "Ledger Nano Bitcoin 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "Adresses Solana :\nDRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy\n7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "IBAN FR76 3000 6000 0112 3456 7890 189, téléphone 06 12 34 56 78",
      "",
    ]) {
      expect(findSecret(ok), ok).toBeNull();
    }
  });
  it("au plus 0,1 % des paragraphes des articles du site sont pris pour un secret", () => {
    const dir = join(process.cwd(), "content/articles");
    const paragraphs = readdirSync(dir)
      .filter((f) => f.endsWith(".mdx"))
      .flatMap((f) => readFileSync(join(dir, f), "utf8").split(/\n\s*\n/))
      .filter((p) => p.trim().length > 40);
    const flagged = paragraphs.filter((p) => findSecret(p) !== null);
    expect(paragraphs.length).toBeGreaterThan(3000);
    expect(flagged.length / paragraphs.length).toBeLessThanOrEqual(0.001);
  });
});

describe("secretFindings", () => {
  it("signale le champ fautif, y compris dans un portefeuille", () => {
    const res = secretFindings(
      input({
        wallets: [
          { id: "a", kind: "materiel", name: "Ledger", assets: "BTC", access: "tiroir" },
          { id: "b", kind: "logiciel", name: "MetaMask", assets: "ETH", access: SEED_12_B },
        ],
        message: "Je vous aime",
      }),
    );
    expect(res).toEqual([{ field: "Portefeuille 2 — accès", kind: "phrase" }]);
  });

  it("repère une phrase répartie entre deux champs et dit lesquels", () => {
    const res = secretFindings(
      input({
        wallets: [
          { id: "a", kind: "materiel", name: "Ledger", assets: "BTC", access: W.slice(0, 6).join(" ") },
          { id: "b", kind: "logiciel", name: "MetaMask", assets: "ETH", access: W.slice(6).join(" ") },
        ],
      }),
    );
    expect(res).toEqual([
      { field: "Plusieurs champs (secret réparti : Portefeuille 1 — accès, Portefeuille 2 — accès)", kind: "phrase" },
    ]);
  });

  it("ne bloque pas la lettre réaliste relevée par la revue (Trezor Model T, Ledger Live, ATOM NEAR LINK…)", () => {
    expect(
      secretFindings(
        input({
          ownerName: "Jean Dupont",
          wallets: [
            { id: "a", kind: "materiel", name: "Trezor Model T", assets: "Bitcoin", access: "phrase sur plaque métal au coffre" },
            { id: "b", kind: "logiciel", name: "Ledger Live", assets: "ATOM, NEAR, LINK", access: "code PIN : page 2 du carnet" },
            { id: "c", kind: "logiciel", name: "Trust Wallet", assets: "ETH", access: "double authentification par e-mail" },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("aucun blocage sur 3 000 lettres réalistes tirées au hasard", () => {
    const PLATFORMS = ["Coinbase", "Kraken", "Bitpanda", "Bitstack", "Coinhouse", "Trade Republic", "Revolut", "Bybit", "OKX", "Crypto.com", "SwissBorg", "Bitvavo", "Paymium", "Young Platform", "Nexo"];
    const WALLETS = ["Ledger Nano X", "Ledger Nano S Plus", "Ledger Live", "Trezor Model T", "Trezor Safe 3", "Trust Wallet", "MetaMask", "Exodus", "Phantom", "Rabby", "Coldcard", "BitBox02", "Tangem", "Electrum", "Sparrow", "Atomic Wallet"];
    const TICKERS = ["BTC", "ETH", "SOL", "ADA", "DOT", "AVAX", "LINK", "ATOM", "NEAR", "XRP", "DOGE", "MATIC", "UNI", "AAVE", "ARB", "OP", "TON", "SUI", "INJ", "LTC", "BCH", "XLM", "ALGO", "ICP", "FIL", "SAND", "MANA", "PEPE", "SHIB", "USDC", "USDT", "EURC", "GRT", "ENS", "LDO", "RNDR", "IMX", "APT", "HBAR", "VET"];
    const ACCESS = [
      "phrase sur plaque métal au coffre", "code PIN : page 2 du carnet", "double authentification par e-mail",
      "enveloppe scellée chez Maître Durand", "identifiant dans le classeur bleu", "mot de passe dans le gestionnaire Bitwarden",
      "clé dans le tiroir du bureau, PIN connu de Claire", "sauvegarde papier dans le coffre de la banque",
      "seed sur plaque acier, coffre-fort maison", "accès via l'application sur mon téléphone, code de déverrouillage connu de mon fils",
      "compte au nom de Jean, e-mail jean.dupont@exemple.fr, 2FA Google Authenticator sur l'ancien téléphone",
    ];
    const MESSAGES = [
      "", "Je vous aime très fort, prenez soin les uns des autres.",
      "Merci pour tout, soyez prudents avec ces cryptos et demandez conseil au notaire avant de vendre.",
      "Partagez équitablement, comme prévu dans le testament. Ne vendez pas dans la précipitation.",
      "My dear children, I love you all. Take care of your mother and of each other.",
      "Thank you for everything. Please be careful, never share any secret code with anyone who calls you.",
    ];
    const DETAILS = ["", "Étude de Maître Durand, Nantes, enveloppe n° 12", "Banque Exemple, agence de Lyon centre", "2 clés sur 3 : moi, Claire et le notaire", "3 parts sur 5 : coffre, notaire, Claire, Paul, maison"];
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
    let blocked = 0;
    for (let n = 0; n < 3000; n++) {
      const wallets: WalletEntry[] = Array.from({ length: 1 + Math.floor(rnd() * 5) }, (_, i) => ({
        id: `w${i}`,
        kind: rnd() < 0.5 ? "plateforme" : "materiel",
        name: rnd() < 0.5 ? pick(PLATFORMS) : pick(WALLETS),
        assets: Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => pick(TICKERS)).join(", "),
        access: pick(ACCESS),
      }));
      const res = secretFindings(input({ ownerName: "Jean Dupont", wallets, methodDetail: pick(DETAILS), notary: "Maître Durand, Nantes", trustedPerson: "Claire, ma sœur", message: pick(MESSAGES) }));
      if (res.length) blocked++;
    }
    expect(blocked).toBe(0);
  });
});

describe("buildLetter", () => {
  it("rappelle que ce n'est pas un testament et laisse des blancs quand rien n'est saisi", () => {
    const t = buildLetter(input(), "5 octobre 2026");
    expect(t).toContain("Cette lettre n'est pas un testament");
    expect(t).toContain("Rédigée par : ______________");
    expect(t).toContain("1. CE QUE JE POSSÈDE");
    expect(t).toContain("4. CE QUE JE VOUS DEMANDE DE FAIRE");
    expect(t).not.toContain("5. MESSAGE");
    expect(t).not.toMatch(/undefined|null|NaN|\[object/);
  });

  it("reprend portefeuilles, méthode, contacts et message", () => {
    const t = buildLetter(
      input({
        ownerName: "Jean Martin",
        wallets: [
          { id: "a", kind: "plateforme", name: "Kraken", assets: "BTC, ETH", access: "identifiant dans l'enveloppe" },
          { id: "b", kind: "materiel", name: "", assets: "", access: "" },
        ],
        method: "coffre",
        methodDetail: "Banque Exemple, agence de Nantes",
        notary: "Maître Durand, Nantes",
        trustedPerson: "Claire, ma sœur",
        will: "oui",
        message: "Prenez soin de vous.",
      }),
      "5 octobre 2026",
    );
    expect(t).toContain("- Compte sur une plateforme : Kraken (BTC, ETH)");
    expect(t).toContain("  Pour y accéder : identifiant dans l'enveloppe");
    expect(t).not.toContain("Portefeuille matériel (clé) :"); // ligne vide ignorée
    expect(t).toContain("coffre-fort bancaire");
    expect(t).toContain("Banque Exemple, agence de Nantes");
    expect(t).toContain("- Notaire : Maître Durand, Nantes");
    expect(t).toContain("- J'ai rédigé un testament.");
    expect(t).toContain("5. MESSAGE\nPrenez soin de vous.");
  });
});
