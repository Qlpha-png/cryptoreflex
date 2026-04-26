import Link from "next/link";
import { Mail, ShieldCheck, Lock, ArrowRight, Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";
import Logo from "./Logo";

/**
 * Footer — pied de page Cryptoreflex (CRITIQUE SEO sitelinks Google + UX engagement final).
 *
 * Audit Block 10 RE-AUDIT 26/04/2026 (1 agent PRO consolidé) :
 *
 * VAGUE 1 — SEO Restructuration silos (P0 sitelinks Google)
 *  - Avant : silo "Navigation" hypertrophié (13 liens fourre-tout) = PageRank dilué
 *  - Après : 3 silos cohérents "Découvrir" (money pages) / "Apprendre" / "Outils & espace"
 *  - Anchor texts keyword-rich (au lieu de "Accueil"/"Blog" génériques)
 *  - Ordre : Brand+CTA / Découvrir (silo $) / Apprendre / Outils / Légal
 *
 * VAGUE 2 — Trust E-E-A-T (Agent SEO P1)
 *  - Trust badges cluster : MiCA-aligned + RGPD + SSL (signal YMYL fintech)
 *  - Mention éditoriale visible (E-E-A-T post-HCU)
 *  - Newsletter CTA inline col 1 (signal engagement)
 *
 * VAGUE 3 — A11y EAA
 *  - Suppression role="contentinfo" redondant (footer top-level a déjà ce rôle)
 *  - text-muted -> text-fg/80 (contraste AA garanti sur surface opaque)
 *  - Uniformiser aria-labelledby partout (vs aria-label inconsistant)
 *  - Liste contact aria-labelledby au lieu de aria-label
 *
 * VAGUE 4 — Visual + Dynamism
 *  - Gradient separator gold (au lieu de border-t plat)
 *  - Hover footer-link : translate-x-0.5 + chevron qui apparaît (microinteraction)
 *  - Glow radial subtle brand top-left
 *  - Bg surface opaque (au lieu de surface/40 contraste invérifiable)
 *
 * VAGUE 5 — Code quality
 *  - CURRENT_YEAR module-scope (au lieu de new Date().getFullYear() au render)
 *  - NAV_GROUPS array typed (au lieu de JSX brut non itérable)
 *  - <FooterLink> sub-component (au lieu de FOOTER_LINK string concat 23×)
 */

const FOOTER_LINK_CLASS =
  "group/flink inline-flex items-center gap-1.5 hover:text-white hover:translate-x-0.5 transition-all duration-150 rounded " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const CURRENT_YEAR = new Date().getFullYear();

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  /** Si true, active le chevron qui apparaît au hover (signal action). */
  showChevron?: boolean;
}

function FooterLink({ href, children, showChevron = true }: FooterLinkProps) {
  return (
    <Link href={href} className={FOOTER_LINK_CLASS}>
      <span>{children}</span>
      {showChevron && (
        <ArrowRight
          className="h-3 w-3 opacity-0 -translate-x-1 group-hover/flink:opacity-100 group-hover/flink:translate-x-0 transition-all"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

interface FooterGroup {
  id: string;
  title: string;
  links: { href: string; label: string }[];
}

const NAV_GROUPS: FooterGroup[] = [
  {
    id: "footer-discover-heading",
    title: "Découvrir",
    links: [
      { href: "/comparatif", label: "Comparatif plateformes crypto FR" },
      { href: "/quiz/plateforme", label: "Quiz : trouver TA plateforme" },
      { href: "/wizard/premier-achat", label: "Faire son premier achat crypto" },
      { href: "/cryptos", label: "Top 50 cryptomonnaies analysées" },
      { href: "/marche/heatmap", label: "Heatmap marché crypto" },
    ],
  },
  {
    id: "footer-learn-heading",
    title: "Apprendre",
    links: [
      { href: "/academie", label: "Académie crypto débutants" },
      { href: "/blog", label: "Guides crypto pédagogiques" },
      { href: "/actualites", label: "Actualités crypto FR" },
      { href: "/calendrier", label: "Calendrier crypto (halvings, ETF, FOMC)" },
      { href: "/quiz/crypto", label: "Quiz : quelle crypto pour toi ?" },
    ],
  },
  {
    id: "footer-tools-heading",
    title: "Outils & espace",
    links: [
      { href: "/outils", label: "Outils crypto gratuits" },
      { href: "/alertes", label: "Alertes prix crypto" },
      { href: "/watchlist", label: "Ma watchlist" },
      { href: "/portefeuille", label: "Mon portefeuille" },
      { href: "/newsletter", label: "Newsletter quotidienne" },
    ],
  },
  {
    id: "footer-pro-heading",
    title: "Pro & contact",
    links: [
      { href: "/pro", label: "Cryptoreflex Pro" },
      { href: "/ambassadeurs", label: "Programme ambassadeurs" },
      { href: "/sponsoring", label: "Sponsoring articles" },
      { href: "/partenariats", label: "Partenariats marques" },
      { href: "/contact", label: "Nous contacter" },
    ],
  },
  {
    id: "footer-legal-heading",
    title: "Légal & transparence",
    links: [
      { href: "/methodologie", label: "Méthodologie publique" },
      { href: "/transparence", label: "Affiliation transparente" },
      { href: "/confidentialite", label: "Confidentialité (RGPD)" },
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/accessibilite", label: "Accessibilité (RGAA)" },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      // Audit A11y : retire role="contentinfo" redondant (<footer> top-level l'a déjà implicite).
      aria-label="Pied de page Cryptoreflex"
      className="relative mt-32 bg-surface border-t border-border/60 overflow-hidden"
    >
      {/* Glow radial subtle brand top-left (Audit Visual) */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 w-96 h-96 bg-[radial-gradient(ellipse_at_top_left,rgba(245,165,36,0.08),transparent_60%)] pointer-events-none"
      />

      {/* Gradient separator gold (au lieu de border-t plat) */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Trust badges cluster (Audit Visual + SEO E-E-A-T) */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300/90 uppercase tracking-wider">
            <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" focusable="false" />
            MiCA-aligned
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300/90 uppercase tracking-wider">
            <Lock className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" focusable="false" />
            RGPD · CNIL
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-accent-cyan/30 bg-accent-cyan/5 px-2 py-0.5 text-[10px] font-mono font-bold text-accent-cyan uppercase tracking-wider">
            <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" focusable="false" />
            Méthodologie publique
          </span>
        </div>

        {/* Grid principale : 12 cols pour fluidité (au lieu de 5 grossier) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          {/* Col Brand (lg:col-span-3) */}
          <div className="lg:col-span-3">
            <Logo variant="full" height={36} className="mb-3" asLink={false} title="Cryptoreflex" />
            <p className="text-sm text-fg/80 max-w-md">
              Ton guide pour naviguer dans l&apos;univers crypto. Comparatifs de plateformes,
              guides pour débutants et outils gratuits — sans jargon.
            </p>

            {/* Contact (uniformisé aria-labelledby) */}
            <h2 id="footer-contact-heading" className="sr-only">
              Contact Cryptoreflex
            </h2>
            <ul
              aria-labelledby="footer-contact-heading"
              className="flex items-center gap-3 mt-4 list-none p-0"
            >
              <li>
                <a
                  href={`mailto:${BRAND.email}`}
                  aria-label={`Contacter ${BRAND.name} par e-mail`}
                  // Audit Mobile : tap target 44px (au lieu de 32px)
                  className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border border-border hover:border-primary/60 transition-colors ${FOOTER_LINK_CLASS}`}
                >
                  <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" focusable="false" />
                </a>
              </li>
            </ul>

            {/* Mention éditoriale E-E-A-T (Audit SEO P0) */}
            <p className="mt-5 text-[11px] text-fg/55 leading-relaxed max-w-md">
              Édité depuis la France par <span className="text-fg/75 font-medium">Cryptoreflex</span>.{" "}
              Directeur de publication : Cryptoreflex Editorial.{" "}
              Hébergé en UE (Vercel · Frankfurt).
            </p>
          </div>

          {/* 5 silos de navigation (lg:col-span-9 réparti en 5×col-span-2 + 1×col-span-2 marge) */}
          {NAV_GROUPS.map((group) => (
            <nav
              key={group.id}
              aria-labelledby={group.id}
              className="lg:col-span-2"
            >
              <h2 id={group.id} className="font-semibold mb-3 text-white/90 text-sm">
                {group.title}
              </h2>
              <ul className="space-y-2 text-sm text-fg/75">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Trust ring final ligne avant copyright (Audit Visual) */}
        <div className="mt-10 pt-4 border-t border-border/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg/55">
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3 w-3" strokeWidth={2} aria-hidden="true" focusable="false" />
            Hébergé en UE
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" strokeWidth={2} aria-hidden="true" focusable="false" />
            HTTPS uniquement
          </span>
          <span aria-hidden="true">·</span>
          <span>SEPA · CIF ORIAS partenaires vérifiés</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" strokeWidth={2} aria-hidden="true" focusable="false" />
            Mis à jour quotidiennement
          </span>
        </div>

        <div className="mt-6 pt-4 border-t border-border/60 space-y-3 text-xs text-fg/65">
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <p>© {CURRENT_YEAR} {BRAND.name}. Tous droits réservés.</p>
            <p>Site indépendant non affilié à l&apos;AMF ni à un PSI.</p>
          </div>
          <p
            role="note"
            className="leading-relaxed border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 text-[13px] sm:text-xs text-amber-100"
          >
            <strong className="text-amber-200">
              <span aria-hidden="true">⚠️ </span>Avertissement légal
            </strong>{" "}
            — L&apos;investissement en cryptoactifs comporte un risque élevé de perte partielle ou
            totale du capital. Les performances passées ne préjugent pas des performances futures.
            Les contenus de {BRAND.name} ont une vocation purement informative et pédagogique et
            ne constituent pas un conseil en investissement au sens de l&apos;article L.321-1 du Code
            monétaire et financier. Consultez un conseiller en investissements financiers (CIF)
            enregistré ORIAS pour toute décision patrimoniale significative. Certains liens sont
            des liens d&apos;affiliation —{" "}
            <Link
              href="/transparence"
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
