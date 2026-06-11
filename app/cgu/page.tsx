import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /cgu — Conditions Générales d'Utilisation du SITE Cryptoreflex.
 *
 * Le site est entièrement gratuit : aucune vente ni abonnement payant.
 * Les CGU couvrent l'usage du site gratuit (consultation, outils,
 * recherche, lecture).
 *
 * FIX LEGAL 2026-05-02 #21 (audit expert legal) — document obligatoire
 * en tant qu'éditeur d'un site français (intermédiaire en ligne au sens
 * L.111-7 du Code de la consommation, au titre des liens d'affiliation).
 */

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: `CGU du site ${BRAND.name} — règles d'utilisation, propriété intellectuelle, responsabilité éditoriale, modération.`,
  alternates: withHreflang(`${BRAND.url}/cgu`),
  robots: { index: true, follow: true },
};

export default function CguPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 prose prose-invert">
      <h1 className="text-4xl font-extrabold tracking-tight text-fg">
        Conditions Générales d&apos;Utilisation
      </h1>
      <p className="text-sm text-muted">Dernière mise à jour : 2 mai 2026</p>

      <p className="text-fg/85 leading-relaxed">
        Les présentes Conditions Générales d&apos;Utilisation (« CGU »)
        régissent l&apos;accès et l&apos;utilisation du site{" "}
        <a href="/" className="text-primary-soft hover:underline">{BRAND.url}</a>{" "}
        édité par {BRAND.name} (Kevin VOISIN, EI, SIREN 103 352 621).
        {" "}{BRAND.name} est un service <strong>entièrement gratuit</strong> :
        l&apos;accès aux contenus et aux outils ne donne lieu à aucune vente,
        aucun abonnement ni aucun paiement de la part de l&apos;utilisateur.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">1. Acceptation</h2>
      <p className="text-fg/85 leading-relaxed">
        L&apos;accès et la navigation sur le Site impliquent acceptation
        sans réserve des présentes CGU. Si vous refusez, merci de quitter
        le Site immédiatement.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">2. Public</h2>
      <p className="text-fg/85 leading-relaxed">
        Le Site est destiné aux <strong>personnes majeures (18 ans et plus)</strong>
        résidant en France ou dans un pays francophone (Belgique, Suisse,
        Canada francophone, Luxembourg, Monaco). L&apos;investissement en
        crypto-actifs n&apos;est pas adapté aux mineurs et certains contenus
        (régulation, fiscalité) supposent une compréhension d&apos;un cadre
        juridique d&apos;adulte.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">3. Description du service</h2>
      <p className="text-fg/85 leading-relaxed">
        Cryptoreflex propose, gratuitement : (1) du contenu éditorial (articles,
        fiches crypto, comparatifs plateformes) ; (2) des outils interactifs
        (calculateurs, simulateurs, convertisseur, glossaire) ; (3) une
        newsletter optionnelle. L&apos;ensemble de ces services est accessible
        sans frais et sans abonnement. Le Site n&apos;est <strong>ni un PSAN
        agréé AMF, ni un CIF, ni un courtier</strong>. Aucun conseil personnalisé
        en investissement n&apos;est fourni.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">4. Responsabilité éditoriale</h2>
      <p className="text-fg/85 leading-relaxed">
        Les contenus sont publiés à titre informatif et pédagogique uniquement.
        L&apos;éditeur s&apos;engage à les rendre exacts et à jour à la date
        de publication mais ne garantit ni leur exhaustivité ni leur pérennité.
        Les performances passées des actifs cités ne préjugent pas des
        performances futures. Toute décision d&apos;investissement relève
        de la seule responsabilité de l&apos;utilisateur.
      </p>
      <p className="text-fg/85 leading-relaxed">
        L&apos;éditeur ne pourra être tenu responsable des pertes financières
        subies par l&apos;utilisateur suite à une décision prise sur la base
        des contenus du Site, conformément à l&apos;article L.111-7 du Code
        de la consommation et aux limites légales de la responsabilité de
        l&apos;intermédiaire en ligne.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">5. Liens d&apos;affiliation</h2>
      <p className="text-fg/85 leading-relaxed">
        Le Site contient des liens d&apos;affiliation rémunérés (signalés
        par la mention « Publicité » ou{" "}
        <code>rel=&quot;sponsored&quot;</code>). L&apos;éditeur perçoit une
        commission lorsqu&apos;un utilisateur ouvre un compte chez l&apos;une
        des plateformes recommandées via ces liens. Ces partenariats financent
        la gratuité du contenu mais{" "}
        <strong>n&apos;influencent pas le classement</strong> :
        la méthodologie est publique sur{" "}
        <a href="/methodologie" className="text-primary-soft hover:underline">/methodologie</a>{" "}
        et le détail des partenariats sur{" "}
        <a href="/transparence" className="text-primary-soft hover:underline">/transparence</a>.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">6. Propriété intellectuelle</h2>
      <p className="text-fg/85 leading-relaxed">
        Tous les contenus du Site (textes, graphismes, logos, scoring,
        méthodologies, illustrations) sont la propriété exclusive de
        l&apos;éditeur ou de leurs auteurs respectifs. Toute reproduction,
        représentation ou exploitation totale ou partielle sans autorisation
        écrite préalable est interdite et constitue une contrefaçon
        sanctionnée par les articles L.335-2 et suivants du Code de la
        propriété intellectuelle. Les marques tierces (Coinbase, Binance,
        Bitpanda, etc.) sont la propriété de leurs détenteurs.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">
        7. Données personnelles
      </h2>
      <p className="text-fg/85 leading-relaxed">
        Le traitement de vos données personnelles est régi par notre{" "}
        <a href="/confidentialite" className="text-primary-soft hover:underline">
          Politique de Confidentialité
        </a>{" "}
        conforme RGPD. En cas de question, contactez{" "}
        <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">
          {BRAND.email}
        </a>.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">8. Compte utilisateur</h2>
      <p className="text-fg/85 leading-relaxed">
        L&apos;ouverture d&apos;un compte gratuit (watchlist, alertes) est
        soumise à fourniture d&apos;une adresse email valide. Vous êtes
        responsable de la confidentialité de vos identifiants. En cas
        d&apos;usage non-autorisé, contactez immédiatement{" "}
        <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">
          {BRAND.email}
        </a>. L&apos;éditeur peut suspendre/supprimer un compte en cas
        d&apos;abus (spam, scraping abusif, contournement des limites
        techniques, contenu illicite).
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">
        9. Modération des contenus utilisateurs
      </h2>
      <p className="text-fg/85 leading-relaxed">
        À ce jour, le Site n&apos;héberge pas de contenus utilisateurs publics
        (commentaires, avis, posts). Si une telle fonctionnalité est introduite
        dans le futur, une charte de modération sera ajoutée et l&apos;éditeur
        appliquera les obligations de retrait des contenus manifestement
        illicites (LCEN art. 6 ; loi SREN 2024).
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">
        10. Disponibilité du service
      </h2>
      <p className="text-fg/85 leading-relaxed">
        L&apos;éditeur s&apos;efforce de maintenir le Site disponible 24/7
        mais ne garantit pas l&apos;absence d&apos;interruptions
        (maintenance, incident technique, force majeure). Le Site étant
        fourni gratuitement, aucune indemnité ne pourra être réclamée en
        cas d&apos;indisponibilité temporaire.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">
        11. Modification des CGU
      </h2>
      <p className="text-fg/85 leading-relaxed">
        L&apos;éditeur se réserve le droit de modifier les CGU à tout moment.
        Les modifications prennent effet à leur publication sur cette page.
        La date de dernière mise à jour figure en haut du document. Pour
        être notifié des changements majeurs, abonnez-vous à la newsletter.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">12. Droit applicable</h2>
      <p className="text-fg/85 leading-relaxed">
        Les CGU sont régies par le droit français. En cas de litige et après
        une tentative de résolution amiable (contact{" "}
        <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">
          {BRAND.email}
        </a>
        ), les tribunaux français sont seuls compétents. Les informations sur
        l&apos;éditeur figurent dans les{" "}
        <a href="/mentions-legales" className="text-primary-soft hover:underline">
          mentions légales
        </a>
        .
      </p>

      <hr className="my-10 border-border" />

      <p className="text-sm text-muted">
        Pour toute question relative aux présentes CGU, contactez{" "}
        <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">
          {BRAND.email}
        </a>{" "}
        ou consultez les pages{" "}
        <Link href="/mentions-legales" className="text-primary-soft hover:underline">
          mentions légales
        </Link>{" "}
        et{" "}
        <Link href="/confidentialite" className="text-primary-soft hover:underline">
          confidentialité
        </Link>.
      </p>
    </article>
  );
}
