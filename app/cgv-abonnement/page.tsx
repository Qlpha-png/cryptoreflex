import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ShieldCheck, RotateCcw, CreditCard, FileText } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "CGV abonnement Soutien — Cryptoreflex",
  description:
    "Conditions Générales de Vente de l'abonnement Soutien Cryptoreflex (Mensuel 2,99 € / Annuel 28,99 €) : services inclus, paiement Stripe, droit de rétractation L221-18, exécution immédiate, annulation et remboursement.",
  alternates: { canonical: `${BRAND.url}/cgv-abonnement` },
  robots: { index: true, follow: true },
};

export default function CgvAbonnementPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted">
        <Link href="/" className="hover:text-fg">Accueil</Link>
        <span className="mx-2">/</span>
        <Link href="/pro" className="hover:text-fg">Pro</Link>
        <span className="mx-2">/</span>
        <span className="text-fg/80">CGV abonnement</span>
      </nav>

      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-fg">
        Conditions Générales de Vente — Abonnement Soutien
      </h1>
      <p className="mt-2 text-sm text-muted">
        Dernière mise à jour : 1<sup>er</sup> mai 2026
      </p>

      {/* Summary box — TL;DR juridique en 30 secondes */}
      <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <h2 className="text-lg font-bold flex items-center gap-2 text-fg">
          <FileText className="h-5 w-5 text-primary" /> En résumé (TL;DR)
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-fg/85 leading-relaxed">
          <li className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Renonciation au droit de rétractation 14 jours :</strong> en cochant la
              case obligatoire avant le paiement, tu renonces expressément à ton droit de
              rétractation de 14 jours pour bénéficier immédiatement des services numériques
              (art. L221-28 12° Code de la consommation) — pratique standard chez Netflix,
              Spotify, Notion, etc.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
            <span>
              <strong>Annulation 1 clic à tout moment</strong> depuis ton portail Stripe (lien
              dans /mon-compte). Ton accès reste actif jusqu&apos;à la fin de la période déjà
              payée — aucune facture future émise.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
            <span>
              <strong>Garantie commerciale 7 jours :</strong> même si tu as renoncé au droit
              légal de rétractation, on s&apos;engage volontairement à te rembourser dans les
              7 jours suivant ton premier paiement si la plateforme ne te convient pas — sur
              simple demande à <a href="mailto:contact@cryptoreflex.fr" className="text-primary-soft underline">contact@cryptoreflex.fr</a>,
              sans justification.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
            <span>
              <strong>Paiement 100 % sécurisé Stripe</strong> (PCI-DSS niveau 1). Aucune donnée
              bancaire stockée sur nos serveurs.
            </span>
          </li>
        </ul>
      </div>

      <p className="mt-8 text-sm text-fg/80 leading-relaxed">
        Les présentes Conditions Générales de Vente (« CGV ») régissent la souscription à
        l&apos;abonnement « Soutien » proposé par {BRAND.name}, édité par Kevin VOISIN
        (Entrepreneur Individuel, SIREN 103 352 621). En souscrivant, tu acceptes
        l&apos;intégralité des présentes CGV.
      </p>

      {/* 1. Services inclus */}
      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        1. Services inclus dans l&apos;abonnement Soutien
      </h2>
      <p className="mt-3 text-sm text-fg/85 leading-relaxed">
        L&apos;abonnement Soutien donne accès aux fonctionnalités numériques suivantes du
        site {BRAND.name}, hébergé sur {BRAND.url} :
      </p>
      <ul className="mt-3 space-y-2 text-sm text-fg/85 list-disc list-inside leading-relaxed">
        <li>Portfolio crypto illimité (vs 10 lignes en gratuit)</li>
        <li>Alertes prix illimitées par email (vs 3 en gratuit)</li>
        <li>Watchlist illimitée (vs 10 cryptos en gratuit)</li>
        <li>Glossaire complet 250+ termes crypto</li>
        <li>Export CSV de l&apos;historique du portfolio (utile pour la fiscalité)</li>
        <li>Accès anticipé aux nouvelles fonctionnalités (≈ 2 semaines avant le grand public)</li>
      </ul>
      <p className="mt-3 text-sm text-muted leading-relaxed">
        Tous ces services sont 100 % numériques, fournis exclusivement en ligne via
        l&apos;interface web responsive {BRAND.url}.
      </p>

      {/* 2. Tarifs */}
      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-primary" />
        2. Tarifs et modalités de paiement
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-fg/85 list-disc list-inside leading-relaxed">
        <li><strong>Mensuel</strong> : 2,99 € TTC / mois — débité automatiquement chaque mois sur la carte bancaire enregistrée</li>
        <li><strong>Annuel</strong> : 28,99 € TTC / an — débité une seule fois pour 12 mois (≈ 19 % d&apos;économie vs mensuel)</li>
      </ul>
      <p className="mt-3 text-sm text-fg/85 leading-relaxed">
        Le paiement est traité par <strong>Stripe Inc.</strong> (PCI-DSS niveau 1).
        Moyens acceptés : carte bancaire (Visa, Mastercard, American Express), Apple Pay,
        Google Pay, virement SEPA. {BRAND.name} ne stocke <strong>aucune donnée bancaire</strong>
        sur ses serveurs : seul un identifiant client Stripe opaque est conservé pour la
        gestion de l&apos;abonnement.
      </p>
      <p className="mt-3 text-sm text-muted leading-relaxed">
        Les prix sont exprimés en euros TTC. {BRAND.name} bénéficie de la franchise en
        base de TVA (article 293 B du CGI) — mention « TVA non applicable, art. 293 B
        du CGI » figurant sur les factures Stripe.
      </p>

      {/* 3. Renonciation au droit de rétractation */}
      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <RotateCcw className="h-6 w-6 text-primary" />
        3. Renonciation expresse au droit de rétractation
      </h2>

      <h3 className="mt-6 text-lg font-bold text-fg">3.1 Le principe légal</h3>
      <p className="mt-3 text-sm text-fg/85 leading-relaxed">
        L&apos;<strong>article L221-18 du Code de la consommation</strong> prévoit un délai
        de 14 jours calendaires pour se rétracter d&apos;un contrat à distance, sans avoir à
        motiver sa décision. Ce délai court à compter de la date de conclusion du contrat
        (premier paiement).
      </p>

      <h3 className="mt-6 text-lg font-bold text-fg">
        3.2 La renonciation expresse à ce droit (case à cocher obligatoire)
      </h3>
      <div className="mt-3 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-5">
        <p className="text-sm text-fg leading-relaxed">
          <strong className="text-amber-300">⚠ Important — comme sur Netflix, Spotify ou Notion :</strong>
        </p>
        <p className="mt-3 text-sm text-fg/90 leading-relaxed">
          L&apos;abonnement Soutien donne accès à des <strong>contenus numériques fournis
          immédiatement après paiement</strong> (en quelques secondes : portfolio illimité,
          alertes, glossaire, etc.). Pour pouvoir te livrer ce service immédiatement, nous
          devons obtenir ton <strong>accord exprès préalable et ta renonciation
          expresse à ton droit de rétractation</strong>.
        </p>
        <p className="mt-3 text-sm text-fg/90 leading-relaxed">
          C&apos;est pourquoi, <strong>avant de pouvoir cliquer sur « Soutenir »</strong>,
          tu dois cocher une case dans laquelle tu déclares :
        </p>
        <blockquote className="mt-3 ml-2 border-l-4 border-amber-400 pl-4 py-1 text-sm italic text-fg/95">
          « Je renonce expressément à mon droit de rétractation de 14 jours et je demande à
          bénéficier immédiatement des services numériques de l&apos;abonnement Soutien
          (art. L221-28 12° Code de la consommation). »
        </blockquote>
        <p className="mt-3 text-sm text-fg/85 leading-relaxed">
          Cette renonciation est conforme à l&apos;<strong>article L221-28 12°</strong> du
          Code de la consommation, qui prévoit explicitement cette exception pour les
          contenus numériques non fournis sur support matériel.
        </p>
      </div>

      <h3 className="mt-6 text-lg font-bold text-fg">3.3 Conséquences pratiques</h3>
      <ul className="mt-3 space-y-2 text-sm text-fg/85 list-disc list-inside leading-relaxed">
        <li>
          <strong>Sans cocher la case → impossible de payer.</strong> Le bouton de paiement
          est techniquement bloqué tant que tu n&apos;as pas exprimé ton accord exprès.
        </li>
        <li>
          <strong>En cochant la case → renonciation valable.</strong> Ton paiement Stripe
          est immédiat et tes services Pro sont activés en quelques secondes. Aucun
          remboursement légal au titre du droit de rétractation ne pourra ensuite être
          réclamé.
        </li>
        <li>
          <strong>Annulation à tout moment :</strong> tu peux toujours annuler ton abonnement
          en 1 clic depuis ton portail Stripe (cf. § 4). Aucune facture future ne sera
          émise. Cette annulation n&apos;est pas un remboursement de la période en cours.
        </li>
      </ul>

      <h3 className="mt-6 text-lg font-bold text-fg">
        3.4 Garantie commerciale satisfait-ou-remboursé 7 jours (volontaire)
      </h3>
      <div className="mt-3 rounded-xl border border-accent-green/30 bg-accent-green/5 p-5">
        <p className="text-sm text-fg/90 leading-relaxed">
          <strong className="text-accent-green">Engagement Cryptoreflex au-delà de la loi :</strong>{" "}
          même si tu as juridiquement renoncé à ton droit de rétractation, on s&apos;engage
          volontairement à te <strong>rembourser intégralement</strong> ton premier paiement
          si tu nous le demandes <strong>dans les 7 jours suivant la souscription</strong>,
          sans avoir à fournir de justification.
        </p>
        <p className="mt-3 text-sm text-fg/85 leading-relaxed">
          Pour activer cette garantie, envoie un email à{" "}
          <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline font-semibold">
            {BRAND.email}
          </a>{" "}
          avec l&apos;objet « Satisfait ou remboursé » et ton email Stripe. Réponse et
          remboursement sous 5 jours ouvrés.
        </p>
        <p className="mt-3 text-xs text-muted leading-relaxed">
          Cette garantie est un engagement contractuel volontaire de Cryptoreflex au-delà
          du cadre légal. Elle n&apos;est applicable qu&apos;une seule fois par compte
          Stripe. En cas d&apos;abus manifeste (exports CSV massifs, scraping, etc.), on se
          réserve le droit de la refuser.
        </p>
      </div>

      {/* 4. Résiliation */}
      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <RotateCcw className="h-6 w-6 text-primary" />
        4. Résiliation et fin d&apos;abonnement
      </h2>
      <p className="mt-3 text-sm text-fg/85 leading-relaxed">
        Tu peux annuler ton abonnement <strong>à tout moment, sans frais ni justification</strong>,
        en 1 clic depuis ton portail Stripe (lien d&apos;accès dans la page <Link href="/mon-compte" className="text-primary-soft hover:underline">/mon-compte</Link>).
      </p>
      <p className="mt-3 text-sm text-fg/85 leading-relaxed">
        Après annulation : ton accès aux fonctionnalités Soutien <strong>reste actif
        jusqu&apos;à la fin de la période déjà payée</strong> (jusqu&apos;à la fin du
        mois pour le mensuel, jusqu&apos;à la fin de l&apos;année pour l&apos;annuel).
        Aucune nouvelle facture ne sera émise.
      </p>
      <p className="mt-3 text-sm text-muted leading-relaxed">
        À l&apos;issue de la période payée, ton compte revient automatiquement au plan
        gratuit : tes données restent conservées (portfolio, alertes au-dessus du
        seuil 10 sont désactivées mais non supprimées) — tu peux te réabonner à tout
        moment et tout retrouver intact.
      </p>

      {/* 5. RGPD */}
      <h2 className="mt-12 text-2xl font-bold text-fg">
        5. Données personnelles (RGPD)
      </h2>
      <p className="mt-3 text-sm text-fg/85 leading-relaxed">
        Le traitement de tes données personnelles est régi par notre <Link href="/confidentialite" className="text-primary-soft hover:underline">Politique de confidentialité</Link>.
        Tu peux à tout moment exercer tes droits d&apos;accès, rectification, portabilité
        et suppression depuis <Link href="/mon-compte" className="text-primary-soft hover:underline">/mon-compte</Link> (bouton « Supprimer mon compte » =
        endpoint conforme art. 17 RGPD, suppression effective sous 30 jours).
      </p>

      {/* 6. Loi applicable */}
      <h2 className="mt-12 text-2xl font-bold text-fg">
        6. Loi applicable et règlement des litiges
      </h2>
      <p className="mt-3 text-sm text-fg/85 leading-relaxed">
        Les présentes CGV sont régies par le droit français. En cas de litige, tu
        disposes d&apos;un droit de recours auprès du Médiateur de la consommation
        (CMAP — <a href="https://www.cmap.fr" className="text-primary-soft hover:underline" target="_blank" rel="noopener noreferrer">cmap.fr</a>) conformément à l&apos;article L612-1 du Code de la consommation,
        avant toute saisine des tribunaux français.
      </p>
      <p className="mt-3 text-sm text-fg/85 leading-relaxed">
        Plateforme européenne de règlement des litiges en ligne (RLL) :{" "}
        <a href="https://ec.europa.eu/consumers/odr" className="text-primary-soft hover:underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>
      </p>

      {/* 7. Contact */}
      <h2 className="mt-12 text-2xl font-bold text-fg">
        7. Contact
      </h2>
      <p className="mt-3 text-sm text-fg/85 leading-relaxed">
        Pour toute question relative aux présentes CGV ou à ton abonnement, contacte
        le service client à <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">{BRAND.email}</a>.
        Réponse sous 48 heures ouvrées.
      </p>

      {/* CTA retour */}
      <div className="mt-16 flex flex-wrap gap-4">
        <Link
          href="/pro"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-background hover:bg-primary/90"
        >
          ← Retour à la page Soutien
        </Link>
        <Link
          href="/mentions-legales"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-fg hover:border-primary/40"
        >
          Mentions légales
        </Link>
        <Link
          href="/confidentialite"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-fg hover:border-primary/40"
        >
          Politique de confidentialité
        </Link>
      </div>
    </article>
  );
}
