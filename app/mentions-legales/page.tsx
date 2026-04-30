import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: `Mentions légales de ${BRAND.name} : éditeur, hébergeur, contact, propriété intellectuelle.`,
  // Fix audit SEO 30/04/2026 — `follow: true` permet au PageRank de circuler
  // vers /confidentialite et /transparence linkés depuis cette page.
  robots: { index: true, follow: true },
};

export default function MentionsLegalesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 prose prose-invert">
      <h1 className="text-4xl font-extrabold tracking-tight text-fg">Mentions légales</h1>
      <p className="text-sm text-muted">Dernière mise à jour : 25 avril 2026</p>

      <h2 className="mt-10 text-2xl font-bold text-fg">1. Éditeur du site</h2>
      <ul className="text-fg/85 leading-relaxed">
        <li><strong>Nom du site</strong> : {BRAND.name}</li>
        <li><strong>URL</strong> : {BRAND.url}</li>
        <li><strong>Éditeur</strong> : Kevin VOISIN, Entrepreneur Individuel</li>
        <li><strong>Statut juridique</strong> : Entrepreneur Individuel (EI)</li>
        <li><strong>SIREN</strong> : 103 352 621</li>
        <li><strong>SIRET du siège social</strong> : 103 352 621 00017</li>
        <li><strong>Activité principale</strong> : Portails Internet (NAF 63.12Z) — édition de contenus éditoriaux et comparateurs en ligne</li>
        <li><strong>Régime de TVA</strong> : Franchise en base de TVA (article 293 B du CGI) — TVA non applicable</li>
        <li><strong>Date d'immatriculation au RNE (INPI)</strong> : 15 avril 2026</li>
        <li><strong>Adresse postale</strong> : communiquée sur demande à <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">{BRAND.email}</a> (réponse sous 48h ouvrées). L'adresse complète est consultable sur l'<a href="https://annuaire-entreprises.data.gouv.fr/entreprise/103352621" target="_blank" rel="noopener noreferrer" className="text-primary-soft hover:underline">Annuaire des Entreprises (data.gouv.fr)</a> via le SIREN ci-dessus.</li>
        <li><strong>Directeur de la publication</strong> : Kevin VOISIN</li>
        <li><strong>Contact</strong> : <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">{BRAND.email}</a></li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">2. Hébergeur</h2>
      <ul className="text-fg/85 leading-relaxed">
        <li><strong>Société</strong> : Vercel Inc.</li>
        <li><strong>Adresse</strong> : 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</li>
        <li><strong>Site web</strong> : <a href="https://vercel.com" className="text-primary-soft hover:underline">vercel.com</a></li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">3. Propriété intellectuelle</h2>
      <p className="text-fg/85 leading-relaxed">
        L'ensemble des contenus (textes, graphismes, logos, icônes, photographies, vidéos, sons,
        données structurées) présents sur {BRAND.name} sont la propriété exclusive de l'éditeur ou
        de leurs auteurs respectifs et sont protégés par le Code de la propriété intellectuelle.
      </p>
      <p className="text-fg/85 leading-relaxed">
        Toute reproduction, représentation, modification, publication, adaptation totale ou
        partielle du site, quel que soit le moyen ou le procédé utilisé, est interdite sauf
        autorisation écrite préalable de l'éditeur. Les marques mentionnées (Coinbase, Binance,
        Bitpanda, etc.) sont la propriété de leurs détenteurs respectifs.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">4. Avertissement sur les contenus</h2>
      <p className="text-fg/85 leading-relaxed">
        {BRAND.name} a vocation purement informative et pédagogique. Les contenus publiés
        <strong> ne constituent en aucun cas un conseil en investissement financier</strong> au
        sens de l'article L.321-1 du Code monétaire et financier. {BRAND.name} n'est pas un
        conseiller en investissements financiers (CIF) ni un prestataire de services
        d'investissement (PSI).
      </p>
      <p className="text-fg/85 leading-relaxed">
        L'investissement en cryptoactifs comporte un <strong>risque élevé de perte partielle ou
        totale du capital investi</strong>. Les performances passées ne préjugent pas des
        performances futures. Avant toute décision d'investissement, vous devez consulter un
        professionnel qualifié (CIF, conseiller en gestion de patrimoine).
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">5. Liens d'affiliation</h2>
      <p className="text-fg/85 leading-relaxed">
        Conformément à nos engagements de transparence, nous précisons que certains liens
        figurant sur ce site sont des <strong>liens d'affiliation</strong>. Nous percevons une
        commission lorsqu'un utilisateur s'inscrit à un service via ces liens, sans surcoût pour
        lui. Notre politique d'affiliation est détaillée dans la page{" "}
        <a href="/affiliations" className="text-primary-soft hover:underline">Affiliations</a>.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">6. Données personnelles</h2>
      <p className="text-fg/85 leading-relaxed">
        Le traitement de vos données personnelles est régi par notre{" "}
        <a href="/confidentialite" className="text-primary-soft hover:underline">Politique de confidentialité</a>,
        conforme au Règlement Général sur la Protection des Données (RGPD).
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">7. Droit applicable</h2>
      <p className="text-fg/85 leading-relaxed">
        Les présentes mentions légales sont régies par le droit français. En cas de litige et après
        une tentative de résolution amiable, les juridictions françaises sont compétentes.
      </p>
    </article>
  );
}
