import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

/**
 * /accessibilite — Déclaration d'accessibilité (RGAA 4.1 + EAA 2025).
 *
 * Cette page est OBLIGATOIRE :
 *  - en France pour tout site privé > 250 M€ CA OU tout service public ;
 *  - depuis le 28/06/2025 dans toute l'UE pour les services e-commerce/fintech
 *    qui touchent les consommateurs (European Accessibility Act, directive
 *    2019/882). Cryptoreflex n'est pas tenu juridiquement avant le seuil
 *    micro-entreprise EAA, mais on publie une déclaration honnête de niveau
 *    de conformité pour la transparence + la confiance utilisateur.
 *
 * Audit user 2026-05-02 : ce slug était linké 184 fois depuis le footer
 * global mais la page n'existait pas (404 sur quasi toutes les pages du
 * site). Création pour résoudre l'erreur et clarifier notre engagement.
 */

export const metadata: Metadata = {
  title: "Déclaration d'accessibilité",
  description: `Engagement et niveau de conformité d'accessibilité numérique de ${BRAND.name} (RGAA, WCAG 2.1, European Accessibility Act).`,
  robots: { index: true, follow: true },
};

export default function AccessibilitePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 prose prose-invert">
      <h1 className="text-4xl font-extrabold tracking-tight text-fg">
        Déclaration d&apos;accessibilité
      </h1>
      <p className="text-sm text-muted">Dernière mise à jour : 2 mai 2026</p>

      <p className="text-fg/85 leading-relaxed mt-6">
        {BRAND.name} s&apos;engage à rendre son site accessible aux personnes
        en situation de handicap conformément à l&apos;article 47 de la loi
        n° 2005-102 du 11 février 2005 et au cadre du{" "}
        <a
          href="https://accessibilite.numerique.gouv.fr/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-soft hover:underline"
        >
          Référentiel Général d&apos;Amélioration de l&apos;Accessibilité (RGAA 4.1)
        </a>
        , basé sur le standard international{" "}
        <a
          href="https://www.w3.org/TR/WCAG21/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-soft hover:underline"
        >
          WCAG 2.1 niveau AA
        </a>
        . Cette déclaration s&apos;applique au site {BRAND.url}.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">
        1. État de conformité
      </h2>
      <p className="text-fg/85 leading-relaxed">
        {BRAND.name} est en conformité <strong>partielle</strong> avec le RGAA
        4.1 et les WCAG 2.1 niveau AA. Un audit interne a été mené le 1er mai
        2026 sur les pages les plus consultées (accueil, fiches crypto, blog,
        outils, espace personnel). Les points conformes et les points en cours
        de correction sont listés ci-dessous en toute transparence.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">
        2. Ce qui est conforme
      </h2>
      <ul className="text-fg/85 leading-relaxed">
        <li>
          <strong>Contraste</strong> — couleurs de texte vérifiées AA (rapport
          ≥ 4.5:1) sur les fonds opaques principaux (background + surface).
        </li>
        <li>
          <strong>Navigation clavier</strong> — l&apos;ensemble des composants
          interactifs (menus, boutons, formulaires, modales, palette ⌘K) sont
          utilisables au clavier seul. Indicateur de focus visible
          (focus-visible:ring) systématique.
        </li>
        <li>
          <strong>Sémantique HTML</strong> — usage de balises landmark
          (<code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>,{" "}
          <code>&lt;main&gt;</code>, <code>&lt;footer&gt;</code>), hiérarchie
          de titres respectée (un seul H1 par page, H2 et H3 imbriqués sans
          saut).
        </li>
        <li>
          <strong>Alternatives textuelles</strong> — toutes les images
          informatives ont un attribut <code>alt</code>. Les icônes
          décoratives sont marquées <code>aria-hidden=&quot;true&quot;</code>.
        </li>
        <li>
          <strong>Formulaires</strong> — chaque champ a un <code>label</code>{" "}
          associé, les messages d&apos;erreur sont annoncés via{" "}
          <code>role=&quot;alert&quot;</code>.
        </li>
        <li>
          <strong>Mouvement</strong> — les animations respectent la requête
          CSS <code>prefers-reduced-motion</code> (classes{" "}
          <code>motion-safe:</code> et <code>motion-reduce:</code>).
        </li>
        <li>
          <strong>Responsive</strong> — site utilisable sur écran 320×480 px
          minimum, sans scroll horizontal forcé.
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">
        3. Ce qui n&apos;est pas encore conforme
      </h2>
      <p className="text-fg/85 leading-relaxed">
        Les éléments suivants sont en cours de correction :
      </p>
      <ul className="text-fg/85 leading-relaxed">
        <li>
          Certains <strong>graphiques de prix</strong> (TradingView, sparklines)
          ne disposent pas encore d&apos;équivalent textuel synthétique pour
          les utilisateurs de lecteur d&apos;écran. Une description ARIA
          dynamique est en cours d&apos;intégration.
        </li>
        <li>
          Le <strong>contenu vidéo embarqué</strong> (rares occurrences,
          principalement YouTube) n&apos;a pas systématiquement de transcription
          textuelle.
        </li>
        <li>
          Quelques <strong>termes techniques crypto</strong> (jargon : MiCA,
          PFU, Nakamoto coefficient, FDV…) apparaissent sans tooltip
          explicatif. Une généralisation du composant{" "}
          <code>GlossaryTooltip</code> est planifiée pour mai-juin 2026.
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">
        4. Technologies utilisées
      </h2>
      <ul className="text-fg/85 leading-relaxed">
        <li>HTML5</li>
        <li>CSS3 (Tailwind CSS)</li>
        <li>JavaScript / TypeScript (React 18, Next.js 14)</li>
        <li>SVG (icônes Lucide, graphiques sparkline custom)</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">
        5. Méthodologie de l&apos;audit
      </h2>
      <p className="text-fg/85 leading-relaxed">
        L&apos;audit interne a été conduit avec :
      </p>
      <ul className="text-fg/85 leading-relaxed">
        <li>Lighthouse (Chrome DevTools) — score Accessibility</li>
        <li>axe DevTools (Deque) — détection automatique violations WCAG</li>
        <li>
          Tests manuels au clavier seul (navigation Tab + Shift+Tab + Enter +
          Esc)
        </li>
        <li>
          Test au lecteur d&apos;écran (NVDA sous Windows, VoiceOver sous
          macOS) sur les parcours principaux
        </li>
        <li>
          Test contraste à l&apos;outil{" "}
          <a
            href="https://webaim.org/resources/contrastchecker/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-soft hover:underline"
          >
            WebAIM Contrast Checker
          </a>
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">
        6. Signaler un défaut d&apos;accessibilité
      </h2>
      <p className="text-fg/85 leading-relaxed">
        Si vous rencontrez une difficulté d&apos;accès à un contenu ou à un
        service, contactez-nous à{" "}
        <a
          href={`mailto:${BRAND.email}`}
          className="text-primary-soft hover:underline"
        >
          {BRAND.email}
        </a>{" "}
        en précisant la page concernée et la nature du blocage. Nous nous
        engageons à répondre sous 5 jours ouvrés et à proposer une alternative
        si la correction immédiate n&apos;est pas possible.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">7. Voies de recours</h2>
      <p className="text-fg/85 leading-relaxed">
        Si vous constatez un défaut d&apos;accessibilité vous empêchant
        d&apos;accéder à un contenu ou à une fonctionnalité, et que vous nous
        l&apos;avez signalé sans obtenir de réponse satisfaisante, vous êtes en
        droit de saisir le Défenseur des droits :
      </p>
      <ul className="text-fg/85 leading-relaxed">
        <li>
          Formulaire en ligne :{" "}
          <a
            href="https://formulaire.defenseurdesdroits.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-soft hover:underline"
          >
            formulaire.defenseurdesdroits.fr
          </a>
        </li>
        <li>
          Adresse postale : Défenseur des droits, Libre réponse 71120, 75342
          Paris CEDEX 07
        </li>
      </ul>

      <hr className="my-10 border-border" />

      <p className="text-sm text-muted">
        Cette déclaration est mise à jour à chaque audit majeur. Pour toute
        question relative à nos engagements,{" "}
        <Link href="/contact" className="text-primary-soft hover:underline">
          contactez-nous
        </Link>
        .
      </p>
    </article>
  );
}
