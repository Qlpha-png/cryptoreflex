import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Code,
  Download,
  ExternalLink,
  Globe,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import StructuredData from "@/components/StructuredData";
import EmbedSnippet from "@/components/embeds/EmbedSnippet";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import {
  EMBEDDABLE_TOOLS,
  generateCollectionPageSchema,
} from "@/lib/schema-tools";
import { BRAND } from "@/lib/brand";

/**
 * /embeds — landing page qui présente les 4 widgets embeddables aux autres
 * sites (blogs crypto FR, sites finance perso, agrégateurs).
 *
 * Stratégie linkable assets : chaque embed externe = un backlink dofollow
 * vers cryptoreflex.fr (clause d'attribution CC-BY 4.0). Plus la page est
 * convaincante (preview, snippet copy-paste, FAQ, "pourquoi"), plus on
 * réduit la friction d'adoption.
 *
 * Cible SEO long-tail : "widget crypto gratuit", "calculateur crypto
 * embed", "iframe crypto pour blog".
 */

const PAGE_PATH = "/embeds";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const PAGE_TITLE =
  "Intégrer les outils Cryptoreflex sur ton site — gratuit (iframes embed)";
const PAGE_DESCRIPTION =
  "4 widgets crypto gratuits à intégrer en 1 ligne sur ton blog ou site finance : calculateur fiscalité, simulateur DCA, convertisseur, ROI. License CC-BY 4.0.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const FAQ_ITEMS = [
  {
    question: "Puis-je modifier le widget (couleurs, taille, langue) ?",
    answer:
      "La taille (width / height) est libre — utilise les attributs HTML standard de l'iframe. Pour les couleurs, le widget hérite du dark theme Cryptoreflex (gold + dark). Une version « light » et des couleurs personnalisables sont prévues pour la V2 — abonne-toi à la newsletter pour être notifié.",
  },
  {
    question: "Quelle license s'applique ?",
    answer:
      "Creative Commons BY 4.0. Tu peux intégrer les widgets gratuitement, y compris sur des sites commerciaux ou monétisés (pub, affiliation), à une seule condition : conserver l'attribution « Powered by Cryptoreflex » avec le lien dofollow inclus dans le widget. C'est le contrat moral entre nous.",
  },
  {
    question: "Les iframes ralentissent-elles ma page ?",
    answer:
      "Très peu. Les widgets utilisent loading=\"lazy\" par défaut (ils se chargent quand l'utilisateur scrolle dessus) et le bundle JS est tree-shaké. Sur un test Lighthouse standard, l'impact LCP / CLS est négligeable. Le widget tourne en CSR (Client-Side Rendering) chez Cryptoreflex, pas chez toi.",
  },
  {
    question:
      "Est-ce que mes utilisateurs sont trackés par Cryptoreflex ?",
    answer:
      "Uniquement avec Plausible (analytics RGPD-friendly, sans cookie, sans IP stockée). On voit qu'un widget a été affiché sur ton domaine, c'est tout. Aucune fingerprint, aucun cross-site tracking. Le code source est inspectable.",
  },
  {
    question: "Que se passe-t-il si Cryptoreflex met à jour le widget ?",
    answer:
      "L'iframe pointe vers une URL stable (ex: /embed/calculateur-fiscalite). Quand on améliore le widget côté serveur, ton intégration bénéficie automatiquement de l'update — sans rien toucher chez toi. On s'engage à ne pas casser la rétro-compatibilité visuelle.",
  },
  {
    question: "Un site WordPress / Webflow / Shopify peut-il l'intégrer ?",
    answer:
      "Oui, partout où tu peux coller du HTML brut. Sur WordPress, utilise le bloc « HTML personnalisé » ou un shortcode iframe. Sur Webflow, le composant Embed. Sur Shopify, dans une section « Custom Liquid ». Aucun plugin requis.",
  },
  {
    question: "Comment être notifié des nouveaux widgets ?",
    answer:
      "Inscris-toi à la newsletter Cryptoreflex (lien en footer du site) — on annonce chaque nouveau widget embeddable. Notre roadmap inclut un widget heatmap marché, un widget watchlist, et un widget MiCA Compliance Badge pour les pages plateforme.",
  },
];

const collectionSchema = generateCollectionPageSchema({
  name: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  url: PAGE_URL,
  items: EMBEDDABLE_TOOLS.map((t) => ({
    name: t.shortName,
    url: `${BRAND.url}/outils/${t.slug}`,
    description: t.description,
  })),
});

export default function EmbedsLandingPage() {
  const schemas: JsonLd[] = [
    collectionSchema,
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Widgets embeddables", url: PAGE_PATH },
    ]),
    faqSchema(FAQ_ITEMS),
  ];

  return (
    <>
      <StructuredData data={graphSchema(schemas)} />

      {/* ============================ Hero ============================ */}
      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              License CC-BY 4.0 — gratuit, à vie
            </span>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Intègre les outils{" "}
              <span className="gradient-text">Cryptoreflex</span> sur ton site
            </h1>
            <p className="mt-4 text-lg text-white/80">
              4 widgets crypto prêts à coller sur ton blog, ton site finance
              perso ou ton agrégateur. Une ligne d'iframe, zéro maintenance —
              on s'occupe des updates côté serveur.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#widgets"
                className="btn-primary"
              >
                Voir les widgets
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/ressources-libres"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-elevated/50 px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-primary/40"
              >
                <Globe className="h-4 w-4" />
                Toutes les ressources libres
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Pourquoi intégrer ====================== */}
      <section className="py-12 border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Pourquoi nos widgets</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white">
              Plus d'engagement, plus de temps passé sur ton site
            </h2>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            <BenefitCard
              icon={<Zap className="h-6 w-6" />}
              title="UX gain pour ton audience"
              text="Tes lecteurs n'ont plus besoin de quitter ton site pour calculer un ROI ou un impôt crypto. Time-on-page +30 % en moyenne sur les pages avec outil interactif."
            />
            <BenefitCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="SEO benefit pour toi"
              text="Google récompense les pages utiles avec rich content. Un calculateur intégré envoie un signal d'usefulness qui aide ton ranking sur les requêtes long-tail."
            />
            <BenefitCard
              icon={<Code className="h-6 w-6" />}
              title="Zéro maintenance"
              text="On gère les updates (taux CoinGecko, fiscalité 2026, MiCA…) côté serveur. Toi, tu gardes ton iframe — tu profites des améliorations sans toucher à rien."
            />
          </div>
        </div>
      </section>

      {/* ============================ Widgets ========================== */}
      <section id="widgets" className="py-16 border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Catalogue</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white">
              4 widgets disponibles immédiatement
            </h2>
            <p className="mt-3 text-white/70">
              Clique sur « Copier » et colle le snippet où tu veux. C'est
              prêt — l'attribution dofollow vers Cryptoreflex est déjà
              incluse (clause CC-BY).
            </p>
          </div>

          <div className="mt-10 grid lg:grid-cols-2 gap-6">
            {EMBEDDABLE_TOOLS.map((tool) => (
              <article
                key={tool.slug}
                className="glass rounded-2xl p-5 sm:p-6 flex flex-col gap-4"
              >
                <header className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-2xl border border-primary/30 shrink-0"
                    aria-hidden="true"
                  >
                    {tool.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-lg text-white leading-tight">
                      {tool.shortName}
                    </h3>
                    <p className="mt-1 text-sm text-white/70 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </header>

                {/* Preview iframe — height limitée pour la grille */}
                <div className="rounded-xl overflow-hidden border border-border bg-background/40">
                  <iframe
                    src={`/embed/${tool.slug}`}
                    width="100%"
                    height={Math.min(tool.height, 420)}
                    frameBorder={0}
                    loading="lazy"
                    title={`Aperçu : ${tool.shortName}`}
                    className="block w-full"
                  />
                </div>

                <EmbedSnippet
                  slug={tool.slug}
                  title={tool.shortName}
                  height={tool.height}
                />

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
                  <Link
                    href={`/outils/${tool.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm text-primary-soft hover:text-primary-glow font-semibold"
                  >
                    Voir la version complète
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ License ========================== */}
      <section className="py-12 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-extrabold text-white">
              License Creative Commons BY 4.0
            </h2>
            <p className="mt-3 text-sm text-white/80 leading-relaxed">
              Tu peux intégrer ces widgets <strong>gratuitement</strong>, y
              compris sur des sites commerciaux, en respectant{" "}
              <strong>une seule règle</strong> : conserver l'attribution
              « Powered by Cryptoreflex » avec le lien <em>dofollow</em>
              inclus en bas du widget. Ne masque pas le footer, ne supprime
              pas le lien — c'est le contrat moral.
            </p>
            <p className="mt-3 text-sm text-white/80 leading-relaxed">
              En cas de question, écris-nous à{" "}
              <a
                href={`mailto:${BRAND.email}`}
                className="text-primary-soft underline-offset-2 hover:underline"
              >
                {BRAND.email}
              </a>
              . On accepte les demandes de personnalisation pour les médias
              partenaires.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="https://creativecommons.org/licenses/by/4.0/deed.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-elevated/40 px-3.5 py-2 text-xs font-semibold text-white/90 hover:border-primary/40"
              >
                <Download className="h-3.5 w-3.5" />
                Texte complet de la license
              </a>
              <Link
                href="/mentions-legales"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-elevated/40 px-3.5 py-2 text-xs font-semibold text-white/90 hover:border-primary/40"
              >
                Mentions légales Cryptoreflex
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ FAQ ============================ */}
      <section className="py-16 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">FAQ intégrateurs</span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white">
            Questions fréquentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group glass rounded-xl p-5 open:border-primary/40 transition-colors"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-semibold text-white">
                  <span>{item.question}</span>
                  <span
                    className="text-primary-soft text-xl leading-none mt-0.5 transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-white/75 leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function BenefitCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="glass rounded-2xl p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft border border-primary/30">
        {icon}
      </div>
      <h3 className="mt-4 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">{text}</p>
    </article>
  );
}
