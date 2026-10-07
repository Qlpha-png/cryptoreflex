import type { Metadata } from "next";
import Link from "next/link";

import { getAllPlatforms, getPlatformById, isAvailableFr } from "@/lib/platforms";
import { computeGlobalScore, SCORING_WEIGHTS } from "@/lib/scoring";
import { PARTNERSHIPS } from "@/lib/partnerships";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";

/**
 * Rubrique « Fonctionnement du comparateur » — article D111-7 du Code de la consommation (version en vigueur depuis le
 * 09/07/2024, relue sur Légifrance le 07/10/2026) et article L111-7, II (version en vigueur, relue le même jour).
 * Le I de D111-7 exige une rubrique accessible depuis toutes les pages (lien du pied de page, components/Footer.tsx)
 * avec 7 mentions ; le II exige 3 informations en haut de chaque page de résultats (components/ComparateurNotice.tsx).
 *
 * Chaque phrase décrit le code tel qu'il tourne : lib/comparateur.ts (tri du comparatif), app/comparatif/frais/page.tsx,
 * app/comparatif/[slug]/page.tsx (duels), lib/platform-filter.ts (filtre), lib/scoring.ts (note sur 5),
 * lib/partnerships.ts (relations rémunérées), scripts/veille-officielle.mjs (veille). Les nombres et les dates sont
 * calculés depuis les données au moment de la génération de la page : aucun chiffre écrit à la main.
 * Tests : tests/lib/fonctionnement-comparateur.test.ts.
 */

export const revalidate = 86400;

const PAGE_PATH = "/fonctionnement-du-comparateur";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Fonctionnement du comparateur";
const DESCRIPTION = `Comment ${BRAND.name} compare et classe les plateformes crypto : critères de classement, plateformes étudiées, rémunérations et leur effet sur le classement, mise à jour des données.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "article" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

function range(dates: (string | null | undefined)[]): string | null {
  const d = dates.filter((x): x is string => !!x).map((x) => x.slice(0, 10)).sort();
  if (!d.length) return null;
  return d[0] === d[d.length - 1] ? `le ${fmtDate(d[0])}` : `entre le ${fmtDate(d[0])} et le ${fmtDate(d[d.length - 1])}`;
}

const pct = (w: number) => `${Math.round(w * 100)} %`;

const H2 = "mt-12 text-2xl font-bold text-fg";
const P = "mt-4 text-fg/85 leading-relaxed";
const UL = "mt-4 space-y-2 text-fg/85 leading-relaxed";

export default function FonctionnementComparateurPage() {
  const all = getAllPlatforms();
  const exchanges = all.filter((p) => p.category !== "wallet");
  const wallets = all.filter((p) => p.category === "wallet");
  const ranked = exchanges.filter(isAvailableFr);
  const excluded = exchanges.filter((p) => !isAvailableFr(p));
  const drift = ranked.filter((p) => Math.abs(p.scoring.global - computeGlobalScore(p.scoring)) > 0.05);
  const feeDates = range(ranked.map((p) => p.fees.cost?.date));
  const pctDates = range(ranked.map((p) => p.fees.verified?.date));
  const micaDates = range(ranked.map((p) => p.mica.lastVerified));

  const live = Object.entries(PARTNERSHIPS).filter(([, m]) => m.status === "live");
  const nameOf = (id: string) => getPlatformById(id)?.name ?? id.charAt(0).toUpperCase() + id.slice(1);
  const affiliates = live.filter(([, m]) => m.kind === "affiliate").map(([id]) => nameOf(id));
  const referrals = live.filter(([, m]) => m.kind === "referral").map(([id]) => nameOf(id));
  const rankedIds = new Set(ranked.map((p) => p.id));
  const paidRanked = live.filter(([id]) => rankedIds.has(id)).map(([id]) => nameOf(id));
  const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`);

  const schema = graphSchema([
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${PAGE_URL}#page`,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "fr-FR",
    },
    breadcrumbSchema([{ name: "Accueil", url: "/" }, { name: TITLE, url: PAGE_PATH }]),
  ]);

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <StructuredData data={schema} id="fonctionnement-comparateur" />
      <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
        <Link href="/" className="hover:text-fg">Accueil</Link>
        <span className="mx-2">/</span>
        <span className="text-fg/80">{TITLE}</span>
      </nav>

      <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-fg">{TITLE}</h1>
      <p className="mt-4 text-fg/85 leading-relaxed">
        Cette page explique comment {BRAND.name} compare les plateformes crypto : ce qui est comparé, dans quel ordre, qui
        nous rémunère et ce que cela change, et comment les données sont tenues à jour. Elle répond à l&apos;article
        D111-7 du Code de la consommation. Elle décrit le code du site tel qu&apos;il fonctionne, limites comprises.
      </p>
      <p className="mt-3 text-sm text-muted">
        Pages concernées : <Link href="/comparatif" className="underline hover:text-fg">comparatif</Link>,{" "}
        <Link href="/comparatif/frais" className="underline hover:text-fg">frais</Link>, duels « A vs B » et{" "}
        <Link href="/quiz/plateforme" className="underline hover:text-fg">filtre des plateformes</Link>.
      </p>

      <h2 id="plateformes-comparees" className={H2}>Plateformes comparées : une liste non exhaustive</h2>
      <ul className={UL}>
        <li>
          • Notre base compte <strong className="text-fg">{exchanges.length} plateformes d&apos;achat</strong> (bourses et
          courtiers) et <strong className="text-fg">{wallets.length} portefeuilles matériels</strong>. Elle ne couvre pas
          tout le marché : d&apos;autres prestataires agréés peuvent servir la France sans y figurer.
        </li>
        <li>
          • <strong className="text-fg">{ranked.length} plateformes sont classées</strong> : celles qui sont agréées MiCA
          avec un accès à la France (registre de l&apos;ESMA, liste blanche de l&apos;AMF).
        </li>
        <li>
          • {excluded.length} plateformes de la base sont hors classement, parce qu&apos;elles ne peuvent pas (ou plus)
          servir les résidents français. Leur fiche reste en ligne et explique pourquoi ; elle ne porte aucun lien
          rémunéré.
        </li>
        <li>
          • Référencement et déréférencement : la liste est établie par la rédaction. Aucune plateforme ne paie pour y
          entrer ni pour y rester. Une plateforme sort du classement quand nos données la marquent comme non autorisée à
          servir la France.
        </li>
      </ul>

      <h2 id="criteres-de-classement" className={H2}>Critères de classement et leur définition</h2>
      <h3 className="mt-6 text-lg font-bold text-fg">Comparatif des plateformes</h3>
      <ul className={UL}>
        <li>
          • <strong className="text-fg">Par défaut, « Le moins cher »</strong> : le coût d&apos;un achat de Bitcoin de
          100 € (ou 1 000 €) par le chemin le plus simple de l&apos;appli, depuis le solde en euros après un virement. Ce
          coût vient de la grille tarifaire officielle de chaque plateforme (source et date sous chaque ligne).
        </li>
        <li>
          • Ordre : d&apos;abord les coûts publiés en entier ou plafonnés (« au plus » : le plafond publié est compté),
          puis les coûts auxquels s&apos;ajoute une marge que la plateforme ne chiffre pas, puis les coûts non publiés.
          Dans chaque groupe, du moins cher au plus cher ; à coût égal, la note sur 5 départage.
        </li>
        <li>• « Je paie par carte » : même règle sur le coût d&apos;un achat payé par carte, sans les plateformes qui n&apos;acceptent pas la carte.</li>
        <li>
          • « Je débute » : d&apos;abord l&apos;aide en français (téléphone, puis chat), relevée sur la page d&apos;assistance
          officielle ; puis la sous-note « expérience utilisateur » ; puis le coût.
        </li>
        <li>• « Français » : seulement les plateformes agréées par l&apos;AMF, classées par coût.</li>
      </ul>

      <h3 className="mt-6 text-lg font-bold text-fg">La note sur 5</h3>
      <p className={P}>
        La note sur 5 est la moyenne pondérée de six sous-notes : frais {pct(SCORING_WEIGHTS.fees)}, sécurité{" "}
        {pct(SCORING_WEIGHTS.security)}, conformité MiCA {pct(SCORING_WEIGHTS.mica)}, expérience utilisateur{" "}
        {pct(SCORING_WEIGHTS.ux)}, support {pct(SCORING_WEIGHTS.support)}, catalogue et services{" "}
        {pct(SCORING_WEIGHTS.catalogue)} (détail sur la page{" "}
        <Link href="/methodologie" className="underline hover:text-fg">méthodologie</Link>). Les cinq premières sous-notes
        sont attribuées par la rédaction : c&apos;est un jugement, pas une mesure. La sous-note « catalogue » est
        calculée à partir du nombre de cryptos, du staking, du nombre de moyens de paiement et d&apos;une liste de
        courtiers multi-actifs.
      </p>
      {drift.length > 0 && (
        <p className={P} data-testid="limite-note">
          <strong className="text-fg">Limite connue :</strong> pour {drift.length} des {ranked.length} plateformes classées,
          la note enregistrée s&apos;écarte de cette formule. Elle reste affichée en attendant sa correction. Dans le
          comparatif, elle figure sur chaque ligne et ne sert au tri qu&apos;à départager deux coûts identiques ; elle
          désigne aussi le verdict des duels.
        </p>
      )}

      <h3 className="mt-6 text-lg font-bold text-fg">Page des frais</h3>
      <p className={P}>
        Le tableau va du frais le plus bas au plus élevé, en pourcentage du montant acheté : frais « taker » d&apos;un ordre
        au marché pour une plateforme à carnet d&apos;ordres, frais d&apos;achat simple pour un courtier ou une appli. Seul
        ce pourcentage sert au tri ; une marge (spread), publiée ou non, n&apos;y est pas ajoutée.
      </p>

      <h3 className="mt-6 text-lg font-bold text-fg">Duels « A vs B »</h3>
      <p className={P}>
        Pas de classement général : sur chaque ligne du tableau, la meilleure des deux valeurs relevées est signalée. Le
        verdict retient la plateforme qui a la meilleure note sur 5 (à égalité, la première nommée) ; une
        plateforme non autorisée en France n&apos;est jamais retenue.
      </p>

      <h3 className="mt-6 text-lg font-bold text-fg">Filtre des plateformes</h3>
      <p className={P}>
        Aucun classement : la liste garde, par ordre alphabétique, les plateformes autorisées en France qui remplissent
        les critères cochés (carte, aide en français, coût publié). Ce n&apos;est pas un conseil personnalisé.
      </p>

      <h2 id="elements-du-prix" className={H2}>Ce que comprend le coût affiché</h2>
      <ul className={UL}>
        <li>
          • Compté : les frais que la plateforme publie pour ce chemin d&apos;achat (commission, marge quand elle est
          chiffrée, frais de carte pour un paiement par carte).
        </li>
        <li>
          • Non compté : une marge que la plateforme ne chiffre pas (la ligne l&apos;indique : « + marge non publiée »),
          les frais de retrait en euros ou en cryptos et les frais de réseau d&apos;une blockchain. Ces frais peuvent
          s&apos;ajouter au coût affiché.
        </li>
      </ul>

      <h2 id="garanties-commerciales" className={H2}>Garanties commerciales</h2>
      <p className={P}>Sans objet : le comparateur ne compare pas de garanties commerciales.</p>

      <h2 id="relations-et-remuneration" className={H2}>Relations avec les plateformes et rémunération</h2>
      <ul className={UL}>
        <li>
          • Liens capitalistiques : {BRAND.name} est édité par un entrepreneur individuel (voir les{" "}
          <Link href="/mentions-legales" className="underline hover:text-fg">mentions légales</Link>) ; aucune plateforme
          ne détient de part de son capital.
        </li>
        {affiliates.length > 0 && (
          <li>
            • Contrats d&apos;affiliation : {list(affiliates)}. {BRAND.name} perçoit une commission sur les achats ou
            abonnements faits depuis ses liens.
          </li>
        )}
        {referrals.length > 0 && (
          <li>
            • Codes de parrainage personnels : {list(referrals)}. La prime est versée au fondateur, selon les conditions de
            chaque programme.
          </li>
        )}
        <li>
          • Détail et montants : page <Link href="/transparence" className="underline hover:text-fg">transparence</Link>.
          Chaque lien rémunéré porte la mention « Publicité ».
        </li>
        <li data-testid="offre-sponsoring">
          • Offre publicitaire : la page <Link href="/sponsoring" className="underline hover:text-fg">sponsoring</Link>{" "}
          propose aux plateformes un article sponsorisé et un encart payant sur le comparatif et sur leur fiche
          d&apos;avis. Cet encart serait signalé « Sponsorisé » et placé à part du classement, sans changer ni la liste
          ni l&apos;ordre. Au 7 octobre 2026, aucun encart ni article sponsorisé n&apos;est vendu ni affiché.
        </li>
      </ul>
      <p className={P}>
        <strong className="text-fg">Effet sur le classement : aucun.</strong> Les calculs de classement (coût, note sur 5,
        filtre) ne lisent aucune donnée de partenariat ; un test du code le vérifie. Une
        relation rémunérée change seulement l&apos;adresse du lien vers le site de la plateforme et ajoute la mention
        « Publicité ».
        {paidRanked.length > 0 ? ` Parmi les plateformes classées, ${list(paidRanked)} ${paidRanked.length > 1 ? "sont concernées" : "est concernée"}, à la même place qu'avec un lien sans parrainage.` : ""}{" "}
        Aucune place n&apos;étant achetée, aucun résultat ne porte la mention « Annonces ».
      </p>

      <h2 id="mise-a-jour" className={H2}>Mise à jour des données</h2>
      <ul className={UL}>
        {feeDates && <li>• Comparatif : coût d&apos;un achat relevé {feeDates} ; la date et la source figurent sous chaque ligne.</li>}
        {pctDates && <li>• Page des frais : frais en pourcentage vérifiés {pctDates} ; la source et la date figurent sur chaque ligne.</li>}
        {micaDates && <li>• Autorisations MiCA vérifiées {micaDates}.</li>}
        <li>
          • Une veille automatique compare chaque nuit le registre MiCA de l&apos;ESMA et les grilles tarifaires citées à
          leur dernier état relu. Un écart ouvre une alerte. La veille ne modifie aucune donnée : la correction est faite
          après relecture de la source officielle.
        </li>
        <li>
          • Pas de fréquence fixe de mise à jour : une donnée est mise à jour quand la veille ou un contrôle signale un
          changement. Le journal des corrections du site est sur la page{" "}
          <Link href="/corrections" className="underline hover:text-fg">corrections</Link>.
        </li>
      </ul>

      <p className="mt-12 text-xs leading-relaxed text-muted">
        Textes de référence : articles L111-7 et D111-7 du Code de la consommation (Légifrance). Investir dans les
        crypto-actifs comporte un risque de perte en capital ; ce comparateur ne constitue pas un conseil en
        investissement.
      </p>
    </article>
  );
}
