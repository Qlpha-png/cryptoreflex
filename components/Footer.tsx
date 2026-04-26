import Link from "next/link";
import { Mail } from "lucide-react";
import { BRAND } from "@/lib/brand";
import Logo from "./Logo";

/**
 * Classes utilisées pour TOUT lien du footer :
 *  - texte muted lisible 4.5:1 sur bg-surface
 *  - hover & focus-visible explicites (WCAG 2.4.7)
 *  - rounded pour que le ring soit propre
 */
const FOOTER_LINK =
  "hover:text-white rounded focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function Footer() {
  return (
    <footer
      role="contentinfo"
      aria-label="Pied de page"
      className="mt-32 border-t border-border/60 bg-surface/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            {/*
              P0-7 audit-front : pas de Link wrappant le Logo en footer
              (la Navbar porte déjà le lien Accueil ; et "Accueil" figure
              dans la liste de nav en dessous). Logo purement décoratif ici
              pour éviter le triple aria-label "Cryptoreflex — Accueil".
            */}
            <Logo variant="full" height={36} className="mb-3" asLink={false} title="Cryptoreflex" />

            <p className="text-sm text-muted max-w-md">
              Votre guide pour naviguer dans l'univers crypto. Comparatifs de plateformes,
              guides pour débutants et outils gratuits — sans jargon.
            </p>
            {/*
              Audit P0-7 : suppression des liens sociaux placeholder (href="#").
              Twitter / Telegram / GitHub : aucune URL réelle dans BRAND ;
              les conserver dégradait SEO + a11y (lien sans destination).
              Seul le contact e-mail (BRAND.email réel) est conservé.
            */}
            <ul
              aria-label="Contact"
              className="flex items-center gap-3 mt-4 list-none p-0"
            >
              <li>
                <a
                  href={`mailto:${BRAND.email}`}
                  aria-label={`Contacter ${BRAND.name} par e-mail`}
                  className={`p-2 rounded-lg border border-border hover:border-primary/60 transition-colors inline-flex ${FOOTER_LINK}`}
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>

          <nav aria-labelledby="footer-nav-heading">
            <h2 id="footer-nav-heading" className="font-semibold mb-3 text-white/90 text-sm">
              Navigation
            </h2>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/" className={FOOTER_LINK}>Accueil</Link></li>
              <li><Link href="/#plateformes" className={FOOTER_LINK}>Plateformes</Link></li>
              <li><Link href="/blog" className={FOOTER_LINK}>Blog</Link></li>
              <li><Link href="/actualites" className={FOOTER_LINK}>Actualités crypto</Link></li>
              <li><Link href="/calendrier" className={FOOTER_LINK}>Calendrier événements</Link></li>
              <li><Link href="/outils" className={FOOTER_LINK}>Outils</Link></li>
              <li><Link href="/alertes" className={FOOTER_LINK}>Alertes prix</Link></li>
              <li><Link href="/quiz/plateforme" className={FOOTER_LINK}>Quiz plateforme</Link></li>
              <li><Link href="/quiz/crypto" className={FOOTER_LINK}>Quiz : quelle crypto pour toi ?</Link></li>
              <li><Link href="/wizard/premier-achat" className={FOOTER_LINK}>Mon premier achat</Link></li>
              <li><Link href="/watchlist" className={FOOTER_LINK}>Ma watchlist</Link></li>
              <li><Link href="/portefeuille" className={FOOTER_LINK}>Mon portefeuille</Link></li>
              <li><Link href="/academie" className={FOOTER_LINK}>Académie crypto</Link></li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-business-heading">
            <h2 id="footer-business-heading" className="font-semibold mb-3 text-white/90 text-sm">
              Cryptoreflex Pro &amp; contact
            </h2>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/pro" className={FOOTER_LINK}>Cryptoreflex Pro</Link></li>
              <li><Link href="/ambassadeurs" className={FOOTER_LINK}>Programme ambassadeurs</Link></li>
              <li><Link href="/sponsoring" className={FOOTER_LINK}>Sponsoring articles</Link></li>
              <li><Link href="/partenariats" className={FOOTER_LINK}>Partenariats marques</Link></li>
              <li><Link href="/contact" className={FOOTER_LINK}>Contact</Link></li>
              <li><Link href="/newsletter" className={FOOTER_LINK}>Newsletter</Link></li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal-heading">
            <h2 id="footer-legal-heading" className="font-semibold mb-3 text-white/90 text-sm">
              Légal &amp; transparence
            </h2>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/methodologie" className={FOOTER_LINK}>Méthodologie</Link></li>
              <li><Link href="/affiliations" className={FOOTER_LINK}>Politique d'affiliation</Link></li>
              <li><Link href="/confidentialite" className={FOOTER_LINK}>Confidentialité (RGPD)</Link></li>
              <li><Link href="/mentions-legales" className={FOOTER_LINK}>Mentions légales</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 space-y-3 text-xs text-muted">
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <p>© {new Date().getFullYear()} {BRAND.name}. Tous droits réservés.</p>
            <p>Site indépendant non affilié à l'AMF ni à un PSI.</p>
          </div>
          <p
            role="note"
            className="leading-relaxed border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 text-amber-100"
          >
            <strong className="text-amber-200">
              <span aria-hidden="true">⚠️ </span>Avertissement légal
            </strong>{" "}
            — L'investissement en cryptoactifs comporte un risque élevé de perte partielle ou
            totale du capital. Les performances passées ne préjugent pas des performances futures.
            Les contenus de {BRAND.name} ont une vocation purement informative et pédagogique et
            ne constituent pas un conseil en investissement au sens de l'article L.321-1 du Code
            monétaire et financier. Consultez un conseiller en investissements financiers (CIF)
            enregistré ORIAS pour toute décision patrimoniale significative. Certains liens sont
            des liens d'affiliation —{" "}
            <Link
              href="/affiliations"
              className="underline hover:text-white rounded
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              en savoir plus
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
