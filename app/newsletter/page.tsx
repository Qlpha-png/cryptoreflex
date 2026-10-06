import type { Metadata } from "next";
import Link from "next/link";
import {
  Mail,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Calculator,
  HelpCircle,
} from "lucide-react";
import NewsletterInline from "@/components/NewsletterInline";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /newsletter — landing page dédiée d'inscription.
 *
 * Pourquoi une page dédiée plutôt que juste les widgets ?
 *  - URL partageable (Twitter, biographies, footer email signature)
 *  - Cible SEO légère ("newsletter crypto FR", "crypto news france")
 *  - Conversion supérieure : pas de distraction, copy long-form
 *  - Permet de A/B test la landing sans toucher la home
 *
 * 06/10/2026 : plus aucune promesse de rythme (« quotidienne », « 7h », « 3 infos/jour ») — aucune édition
 * n'est envoyée par le code (cron daily-brief = page web seulement). Témoignages retirés : placeholders, pas de vrais avis.
 */

export const metadata: Metadata = {
  title: "Newsletter crypto FR — l'essentiel, sans spam",
  description:
    "La newsletter Cryptoreflex : l'essentiel de la crypto en français pour un investisseur — MiCA, fiscalité, alertes plateformes. Nous n'écrivons que quand une information compte. Gratuit, désinscription en 1 clic.",
  alternates: withHreflang(`${BRAND.url}/newsletter`),
  openGraph: {
    title: "Newsletter Cryptoreflex — l'essentiel de la crypto en français",
    description:
      "Nous n'écrivons que quand une information compte : MiCA, fiscalité, alerte plateforme. Sans hype, sans pub.",
    url: `${BRAND.url}/newsletter`,
    type: "website",
  },
  // BLOCs 0-7 audit FRONT P0-3 (2026-05-04) — twitter card specifique
  // (avant : fallback global "Cryptoreflex — Tout pour investir...").
  twitter: {
    card: "summary_large_image",
    title: "Newsletter Cryptoreflex — l'essentiel de la crypto en français",
    description:
      "Nous n'écrivons que quand une information compte : MiCA, fiscalité, alerte plateforme. Sans hype, sans pub.",
  },
  robots: { index: true, follow: true },
};

// 06/10/2026 : « Ce que vous recevez » décrivait des envois comme s'ils existaient déjà ; aucune édition n'est envoyée
// à ce jour. Formulation au futur : ce que nous enverrons, sans rythme promis, quand une information compte.
const benefits = [
  {
    icon: Clock,
    title: "Court et factuel",
    text: "Chaque e-mail tiendra en quelques lignes : le fait, le contexte, ce que ça change pour vous.",
  },
  {
    icon: ShieldCheck,
    title: "Alertes plateformes",
    text: "Si une plateforme change de statut MiCA/AMF, perd sa licence ou se fait pirater, nous vous expliquerons ce que ça change pour vous.",
  },
  {
    icon: TrendingUp,
    title: "Marché en français clair",
    text: "Quand le marché bouge vraiment : un décryptage Bitcoin/Ethereum/Solana sans jargon, compréhensible par un débutant.",
  },
  {
    icon: Calculator,
    title: "Fiscalité FR",
    text: "Les changements qui comptent (PFU 31,4 %, BOFiP, formulaire 2086), pour ne pas être surpris au moment de déclarer.",
  },
  {
    icon: AlertTriangle,
    title: "Scams & arnaques",
    text: "Les arnaques repérées (faux brokers, plateformes douteuses, pumps) et comment les reconnaître.",
  },
  {
    icon: Sparkles,
    title: "Bonus inscription",
    text: "Tout de suite : le guide PDF « Les plateformes crypto régulées MiCA à utiliser en France 2026 ».",
  },
];

// 06/10/2026 : FAQ entièrement au vouvoiement ; « commissions … plateforme partenaire (Coinbase, Bitpanda) » était faux
// (Coinbase n'est pas partenaire, Bitpanda est un parrainage personnel) → aligné sur lib/partnerships.ts.
const faqs = [
  {
    q: "Est-ce vraiment gratuit ?",
    a: "Oui, 100 % gratuit. Le site est financé par quelques liens d'affiliation (Ledger, Trezor, Waltio) et par des codes de parrainage personnels du fondateur, tous signalés « Publicité ». Vous ne payez rien.",
  },
  {
    q: "À quelle fréquence recevrez-vous un e-mail ?",
    a: "Pas de rythme fixe : nous n'écrivons que quand une information compte (MiCA, fiscalité, alerte plateforme). Pas de pub déguisée, pas d'envois en rafale.",
  },
  {
    q: "Comment vous désinscrire ?",
    a: "Un lien de désinscription en 1 clic est présent en bas de chaque email. Pas de friction, pas de confirmation, pas de formulaire à rallonge.",
  },
  {
    q: "Donnez-vous des conseils d'investissement ?",
    a: "Non. Cryptoreflex n'est ni un prestataire de services sur crypto-actifs (CASP) ni un conseiller financier. La newsletter délivre de l'information factuelle sur le marché crypto, pas des recommandations d'achat ou de vente.",
  },
  {
    q: "Vos données sont-elles partagées ?",
    a: "Jamais. Votre email reste hébergé chez Beehiiv (notre fournisseur d'envoi), conforme RGPD, et n'est jamais revendu, partagé ou loué à des tiers. Voir notre politique de confidentialité.",
  },
  {
    q: "Pouvez-vous suggérer un sujet ?",
    a: `Oui : écrivez-nous à ${BRAND.email}. Nous lisons tout.`,
  },
];

export default function NewsletterPage() {
  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="flex flex-col items-center text-center">
            <span className="badge-info">
              <Mail className="h-3.5 w-3.5" />
              Newsletter Cryptoreflex
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-extrabold text-fg leading-[1.1] max-w-3xl">
              L&apos;essentiel de la crypto{" "}
              <span className="gradient-text">en français</span>, sans spam.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              Ce qui compte vraiment pour un investisseur français : MiCA, fiscalité,
              alertes plateformes. Sans hype, sans pub déguisée, sans jargon trader.
              Nous n&apos;écrivons que quand une information compte.
            </p>

            <div className="mt-8 w-full max-w-xl">
              <NewsletterInline
                source="newsletter-page"
                variant="default"
                title="Inscription à la newsletter"
                subtitle="Gratuit. Désinscription 1 clic. Bonus PDF immédiat."
                ctaLabel="Recevoir la newsletter"
                leadMagnet
              />
            </div>

            <p className="mt-4 text-xs text-muted flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-green" />
              {/* 06/10/2026 : « Plus de 1 000 lecteurs FR » retiré (aucun chiffre vérifié) */}
              Gratuit — conforme RGPD — désinscription en 1 clic
            </p>
          </div>
        </div>
      </section>

      {/* BÉNÉFICES */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Ce que nous vous enverrons, <span className="gradient-text">quand une information compte</span>
          </h2>
          <p className="mt-3 text-fg/70 max-w-2xl mx-auto">
            Pas de rythme fixe, pas d&apos;envoi pour remplir : un e-mail seulement quand il y a quelque chose d&apos;utile à vous dire.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b) => (
            <div key={b.title} className="glass rounded-2xl p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <b.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-bold text-fg">{b.title}</h3>
              <p className="mt-1.5 text-sm text-fg/70">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section témoignages supprimée le 06/10/2026 : 3 avis placeholders (pas de vrais lecteurs). */}

      {/* CTA milieu */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <NewsletterInline
          source="newsletter-page"
          variant="default"
          title="Recevoir la newsletter"
          subtitle="Gratuit, sans spam, désinscription en 1 clic."
          ctaLabel="S'abonner"
          leadMagnet
        />
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">Questions fréquentes</h2>
        </div>
        <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden">
          {faqs.map((f) => (
            <details key={f.q} className="group bg-elevated/40 open:bg-elevated/70">
              <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 font-medium text-fg hover:bg-elevated/80">
                {f.q}
                <span className="text-muted group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-fg/75 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* RGPD */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 text-xs text-muted leading-relaxed">
          <p className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
            <span>
              <strong className="text-fg">Mention RGPD —</strong> En vous inscrivant, vous acceptez
              de recevoir la newsletter Cryptoreflex à l'adresse email indiquée. Vos données
              sont traitées par Beehiiv Inc. (sous-traitant) sur la base de votre consentement
              explicite, conformément au RGPD (UE 2016/679). Aucune cession à des tiers.
              Vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition
              que vous pouvez exercer à tout moment via le lien de désinscription en pied de chaque
              email, ou en écrivant à <span className="text-fg">{BRAND.email}</span>. Voir notre{" "}
              <Link href="/confidentialite" className="text-primary-soft underline hover:text-primary">
                politique de confidentialité
              </Link>{" "}
              et nos{" "}
              <Link href="/mentions-legales" className="text-primary-soft underline hover:text-primary">
                mentions légales
              </Link>
              .
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
