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
  Quote,
  HelpCircle,
} from "lucide-react";
import NewsletterInline from "@/components/NewsletterInline";
import { BRAND } from "@/lib/brand";

/**
 * /newsletter — landing page dédiée d'inscription.
 *
 * Pourquoi une page dédiée plutôt que juste les widgets ?
 *  - URL partageable (Twitter, biographies, footer email signature)
 *  - Cible SEO légère ("newsletter crypto FR", "crypto news france")
 *  - Conversion supérieure : pas de distraction, copy long-form, social proof
 *  - Permet de A/B test la landing sans toucher la home
 */

export const metadata: Metadata = {
  title: "Newsletter quotidienne crypto FR — 3 min/jour, sans bullshit",
  description:
    "Reçois chaque matin à 7h les 3 infos crypto qui comptent vraiment pour un investisseur français. Statut MiCA, alertes plateformes, fiscalité. Gratuit, désinscription 1 clic.",
  alternates: { canonical: `${BRAND.url}/newsletter` },
  openGraph: {
    title: "Newsletter Cryptoreflex — 3 infos crypto par jour",
    description:
      "La newsletter quotidienne crypto en français. 3 minutes le matin. Sans hype, sans pub.",
    url: `${BRAND.url}/newsletter`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

const benefits = [
  {
    icon: Clock,
    title: "3 minutes le matin",
    text: "Format court : titre, contexte, ce que ça change pour toi. Pas de pavé indigeste.",
  },
  {
    icon: ShieldCheck,
    title: "Alertes plateformes",
    text: "Statut MiCA/AMF, retrait de licence, hack, downtime — tu le sais avant Twitter.",
  },
  {
    icon: TrendingUp,
    title: "Marché en français clair",
    text: "Décryptage Bitcoin/Ethereum/Solana sans le jargon trader. Compréhensible débutant.",
  },
  {
    icon: Calculator,
    title: "Fiscalité FR",
    text: "Mises à jour PFU 30%, BOFiP, formulaire 2086. Tu ne te fais pas surprendre en avril.",
  },
  {
    icon: AlertTriangle,
    title: "Scams & arnaques",
    text: "Plateformes douteuses, faux brokers, schemas de pump — on signale tôt.",
  },
  {
    icon: Sparkles,
    title: "Bonus inscription",
    text: "Le guide PDF complet 'Les 10 plateformes crypto à utiliser en France 2026'.",
  },
];

const testimonials = [
  {
    quote:
      "Enfin une newsletter crypto en français qui ne survend pas le prochain shitcoin. Les 3 infos du matin, format parfait pour le café.",
    name: "Julien M.",
    role: "Investisseur particulier",
  },
  {
    quote:
      "Le guide PDF MiCA m'a clairement aidé à choisir entre Coinbase et Bitpanda. Pratique et neutre.",
    name: "Sarah L.",
    role: "Débutante",
  },
  {
    quote:
      "Je lis ça tous les jours dans le métro. C'est mon premier filtre avant d'aller voir Twitter.",
    name: "Karim B.",
    role: "Lecteur depuis le V0",
  },
];

const faqs = [
  {
    q: "C'est vraiment gratuit ?",
    a: "Oui, 100% gratuit. La newsletter est financée par les commissions d'affiliation que touche Cryptoreflex quand un lecteur ouvre un compte sur une plateforme partenaire (Coinbase, Bitpanda, etc.). Tu ne paies rien.",
  },
  {
    q: "À quelle fréquence j'écris ?",
    a: "Une édition par jour ouvré, envoyée vers 7h00 (heure de Paris). Pas de week-end, pas de pub déguisée, pas d'envois multiples.",
  },
  {
    q: "Comment je me désinscris ?",
    a: "Un lien de désinscription en 1 clic est présent en bas de chaque email. Pas de friction, pas de confirmation, pas de formulaire à rallonge.",
  },
  {
    q: "Vous donnez des conseils d'investissement ?",
    a: "Non. Cryptoreflex n'est pas un PSAN ni un conseiller financier. La newsletter délivre de l'information factuelle sur le marché crypto, pas des recommandations d'achat ou de vente.",
  },
  {
    q: "Mes données sont-elles partagées ?",
    a: "Jamais. Ton email reste hébergé chez Beehiiv (notre fournisseur d'envoi), conforme RGPD, et n'est jamais revendu, partagé ou loué à des tiers. Voir notre politique de confidentialité.",
  },
  {
    q: "Je peux suggérer un sujet ?",
    a: `Oui, réponds simplement à n'importe quel email — ou écris à ${BRAND.email}. On lit tout.`,
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
              La crypto FR en{" "}
              <span className="gradient-text">3 minutes</span>, chaque matin.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              3 infos crypto qui comptent vraiment pour un investisseur français.
              Sans hype, sans pub déguisée, sans jargon trader. Reçue par 100% des lecteurs
              avec leur café.
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
              Plus de 1 000 lecteurs FR — RGPD-compliant — désinscription 1 clic
            </p>
          </div>
        </div>
      </section>

      {/* BÉNÉFICES */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Ce que tu reçois (et ce que tu <span className="text-accent-rose">ne reçois pas</span>)
          </h2>
          <p className="mt-3 text-fg/70 max-w-2xl mx-auto">
            Une newsletter qui respecte ton temps : 3 min, factuel, actionnable.
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

      {/* TÉMOIGNAGES */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Ce qu'en disent les lecteurs
            </h2>
            <p className="mt-2 text-xs text-muted">
              Témoignages de lecteurs (placeholder à remplacer par de vrais avis dès 50+ inscrits).
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <figure key={t.name} className="glass rounded-2xl p-5">
                <Quote className="h-5 w-5 text-primary" aria-hidden />
                <blockquote className="mt-3 text-sm text-fg/85 leading-relaxed">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-4 text-xs text-muted">
                  <span className="font-medium text-fg">{t.name}</span> — {t.role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA milieu */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <NewsletterInline
          source="newsletter-page"
          variant="default"
          title="Prêt à recevoir la prochaine édition ?"
          subtitle="Demain matin à 7h, dans ta boîte."
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
              <strong className="text-fg">Mention RGPD —</strong> En t'inscrivant, tu acceptes
              de recevoir la newsletter Cryptoreflex à l'adresse email indiquée. Tes données
              sont traitées par Beehiiv Inc. (sous-traitant) sur la base de ton consentement
              explicite, conformément au RGPD (UE 2016/679). Aucune cession à des tiers.
              Tu disposes d'un droit d'accès, de rectification, d'effacement et d'opposition
              que tu peux exercer à tout moment via le lien de désinscription en pied de chaque
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
