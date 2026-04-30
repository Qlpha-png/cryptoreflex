import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Comment ${BRAND.name} collecte, utilise et protège vos données personnelles.`,
  // Fix audit SEO 30/04/2026 — avant `follow: false` brûlait le PageRank
  // vers /transparence et /mentions-legales linkés depuis cette page.
  robots: { index: true, follow: true },
};

export default function ConfidentialitePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 prose prose-invert">
      <h1 className="text-4xl font-extrabold tracking-tight text-fg">Politique de confidentialité</h1>
      <p className="text-sm text-muted">Dernière mise à jour : 25 avril 2026 — Conforme RGPD (UE 2016/679)</p>

      <h2 className="mt-10 text-2xl font-bold text-fg">1. Responsable de traitement</h2>
      <p className="text-fg/85 leading-relaxed">
        Le responsable du traitement des données personnelles collectées sur {BRAND.name} est
        l'éditeur du site, dont les coordonnées figurent dans les{" "}
        <a href="/mentions-legales" className="text-primary-soft hover:underline">Mentions légales</a>.
        Pour toute question : <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">{BRAND.email}</a>.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">2. Données collectées</h2>
      <p className="text-fg/85 leading-relaxed">Nous collectons les données suivantes :</p>
      <ul className="text-fg/85 leading-relaxed">
        <li><strong>Données de navigation</strong> : adresse IP anonymisée, type de navigateur, pages visitées, durée de visite, source de trafic. Collectées via Plausible Analytics (RGPD-compliant, sans cookie).</li>
        <li><strong>Données de newsletter</strong> : adresse e-mail (si vous vous inscrivez volontairement), date d'inscription, ouverture/clic des emails. Collectées via Beehiiv.</li>
        <li><strong>Données de contact</strong> : informations que vous nous transmettez via formulaire ou e-mail.</li>
        <li><strong>Liens d'affiliation</strong> : aucune donnée personnelle n'est partagée avec les plateformes partenaires. Le tracking d'affiliation se fait via cookie de la plateforme partenaire (ex: Binance, Bitpanda) une fois sur leur site, hors de notre contrôle.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">3. Finalités</h2>
      <ul className="text-fg/85 leading-relaxed">
        <li>Mesurer l'audience du site (statistiques anonymisées)</li>
        <li>Améliorer la qualité de nos contenus</li>
        <li>Vous envoyer la newsletter à laquelle vous êtes inscrit</li>
        <li>Répondre à vos demandes de contact</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">4. Bases légales</h2>
      <ul className="text-fg/85 leading-relaxed">
        <li><strong>Intérêt légitime</strong> : statistiques anonymisées (Plausible)</li>
        <li><strong>Consentement</strong> : inscription newsletter, formulaires</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">5. Durée de conservation</h2>
      <ul className="text-fg/85 leading-relaxed">
        <li>Données analytics : 12 mois maximum</li>
        <li>Données newsletter : tant que vous restez abonné, supprimées dans les 30 jours après désinscription</li>
        <li>Demandes de contact : 3 ans</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">6. Vos droits (RGPD)</h2>
      <p className="text-fg/85 leading-relaxed">Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
      <ul className="text-fg/85 leading-relaxed">
        <li>Droit d'accès à vos données</li>
        <li>Droit de rectification</li>
        <li>Droit à l'effacement (« droit à l'oubli »)</li>
        <li>Droit à la limitation du traitement</li>
        <li>Droit à la portabilité</li>
        <li>Droit d'opposition</li>
        <li>Droit de retirer votre consentement à tout moment</li>
      </ul>
      <p className="text-fg/85 leading-relaxed">
        Pour exercer ces droits, écrivez à{" "}
        <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">{BRAND.email}</a>.
        Vous disposez également du droit d'introduire une réclamation auprès de la CNIL :{" "}
        <a href="https://www.cnil.fr/fr/plaintes" className="text-primary-soft hover:underline">cnil.fr</a>.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">7. Cookies</h2>
      <p className="text-fg/85 leading-relaxed">
        {BRAND.name} <strong>n'utilise pas de cookies de tracking ou de publicité</strong>. Les
        seuls éléments de stockage local utilisés sont strictement nécessaires au fonctionnement
        du site (préférences d'affichage, etc.). Plausible Analytics fonctionne sans cookie.
      </p>
      <p className="text-fg/85 leading-relaxed">
        Lorsque vous cliquez sur un lien d'affiliation et que vous êtes redirigé vers une
        plateforme partenaire (Binance, Bitpanda, etc.), cette plateforme peut utiliser ses propres
        cookies, conformément à sa propre politique de confidentialité.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-fg">8. Sous-traitants</h2>
      <ul className="text-fg/85 leading-relaxed">
        <li><strong>Vercel Inc.</strong> — Hébergement (USA, Data Processing Agreement signé)</li>
        <li><strong>Plausible Insights OÜ</strong> — Analytics RGPD (UE, Estonie)</li>
        <li><strong>Beehiiv Inc.</strong> — Newsletter (USA, opt-in explicite requis)</li>
        <li><strong>CoinGecko Pte Ltd</strong> — API prix crypto (Singapour, données publiques)</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-fg">9. Modification</h2>
      <p className="text-fg/85 leading-relaxed">
        Cette politique peut être modifiée. La version applicable est celle en vigueur lors de
        votre visite, datée en haut de page.
      </p>
    </article>
  );
}
