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
 * /embeds â€” landing page qui prÃ©sente les 4 widgets embeddables aux autres
 * sites (blogs crypto FR, sites finance perso, agrÃ©gateurs).
 *
 * StratÃ©gie linkable assets : chaque embed externe = un backlink dofollow
 * vers cryptoreflex.fr (clause d'attribution CC-BY 4.0). Plus la page est
 * convaincante (preview, snippet copy-paste, FAQ, "pourquoi"), plus on
 * rÃ©duit la friction d'adoption.
 *
 * Cible SEO long-tail : "widget crypto gratuit", "calculateur crypto
 * embed", "iframe crypto pour blog".
 */

const PAGE_PATH = "/embeds";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
// Audit SEO 26-04 â€” title raccourci de 86 â†’ 44 chars (â‰¤ 60 cible Google SERP).
// Mot-clÃ© long-tail "widgets crypto embed gratuits" + brand en suffixe.
const PAGE_TITLE = "Widgets crypto embed gratuits | Cryptoreflex";
const PAGE_DESCRIPTION =
  "4 widgets crypto gratuits Ã  intÃ©grer en 1 ligne sur ton blog ou site finance : calculateur fiscalitÃ©, simulateur DCA, convertisseur, ROI. License CC-BY 4.0.";

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
      "La taille (width / height) est libre â€” utilise les attributs HTML standard de l'iframe. Pour les couleurs, le widget hÃ©rite du dark theme Cryptoreflex (gold + dark). Une version Â« light Â» et des couleurs personnalisables sont prÃ©vues pour la V2 â€” abonne-toi Ã  la newsletter pour Ãªtre notifiÃ©.",
  },
  {
    question: "Quelle license s'applique ?",
    answer:
      "Creative Commons BY 4.0. Tu peux intÃ©grer les widgets gratuitement, y compris sur des sites commerciaux ou monÃ©tisÃ©s (pub, affiliation), Ã  une seule condition : conserver l'attribution Â« Powered by Cryptoreflex Â» avec le lien dofollow inclus dans le widget. C'est le contrat moral entre nous.",
  },
  {
    question: "Les iframes ralentissent-elles ma page ?",
    answer:
      "TrÃ¨s peu. Les widgets utilisent loading=\"lazy\" par dÃ©faut (ils se chargent quand l'utilisateur scrolle dessus) et le bundle JS est tree-shakÃ©. Sur un test Lighthouse standard, l'impact LCP / CLS est nÃ©gligeable. Le widget tourne en CSR (Client-Side Rendering) chez Cryptoreflex, pas chez toi.",
  },
  {
    question:
      "Est-ce que mes utilisateurs sont trackÃ©s par Cryptoreflex ?",
    answer:
      "Uniquement avec Plausible (analytics RGPD-friendly, sans cookie, sans IP stockÃ©e). On voit qu'un widget a Ã©tÃ© affichÃ© sur ton domaine, c'est tout. Aucune fingerprint, aucun cross-site tracking. Le code source est inspectable.",
  },
  {
    question: "Que se passe-t-il si Cryptoreflex met Ã  jour le widget ?",
    answer:
      "L'iframe pointe vers une URL stable (ex: /embed/calculateur-fiscalite). Quand on amÃ©liore le widget cÃ´tÃ© serveur, ton intÃ©gration bÃ©nÃ©ficie automatiquement de l'update â€” sans rien toucher chez toi. On s'engage Ã  ne pas casser la rÃ©tro-compatibilitÃ© visuelle.",
  },
  {
    question: "Un site WordPress / Webflow / Shopify peut-il l'intÃ©grer ?",
    answer:
      "Oui, partout oÃ¹ tu peux coller du HTML brut. Sur WordPress, utilise le bloc Â« HTML personnalisÃ© Â» ou un shortcode iframe. Sur Webflow, le composant Embed. Sur Shopify, dans une section Â« Custom Liquid Â». Aucun plugin requis.",
  },
  {
    question: "Comment Ãªtre notifiÃ© des nouveaux widgets ?",
    answer:
      "Inscris-toi Ã  la newsletter Cryptoreflex (lien en footer du site) â€” on annonce chaque nouveau widget embeddable. Notre roadmap inclut un widget heatmap marchÃ©, un widget watchlist, et un widget MiCA Compliance Badge pour les pages plateforme.",
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
              License CC-BY 4.0 â€” gratuit, Ã  vie
            </span>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
              IntÃ¨gre les outils{" "}
              <span className="gradient-text">Cryptoreflex</span> sur ton site
            </h1>
            <p className="mt-4 text-lg text-fg/80">
              4 widgets crypto prÃªts Ã  coller sur ton blog, ton site finance
              perso ou ton agrÃ©gateur. Une ligne d'iframe, zÃ©ro maintenance â€”
              on s'occupe des updates cÃ´tÃ© serveur.
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
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-elevated/50 px-4 py-2.5 text-sm font-semibold text-fg/90 hover:border-primary/40"
              >
                <Globe className="h-4 w-4" />
                Toutes les ressources libres
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Pourquoi intÃ©grer ====================== */}
      <section className="py-12 border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Pourquoi nos widgets</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg">
              Plus d'engagement, plus de temps passÃ© sur ton site
            </h2>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            <BenefitCard
              icon={<Zap className="h-6 w-6" />}
              title="UX gain pour ton audience"
              text="Tes lecteurs n'ont plus besoin de quitter ton site pour calculer un ROI ou un impÃ´t crypto. Time-on-page +30 % en moyenne sur les pages avec outil interactif."
            />
            <BenefitCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="SEO benefit pour toi"
              text="Google rÃ©compense les pages utiles avec rich content. Un calculateur intÃ©grÃ© envoie un signal d'usefulness qui aide ton ranking sur les requÃªtes long-tail."
            />
            <BenefitCard
              icon={<Code className="h-6 w-6" />}
              title="ZÃ©ro maintenance"
              text="On gÃ¨re les updates (taux CoinGecko, fiscalitÃ© 2026, MiCAâ€¦) cÃ´tÃ© serveur. Toi, tu gardes ton iframe â€” tu profites des amÃ©liorations sans toucher Ã  rien."
            />
          </div>
        </div>
      </section>

      {/* ============================ Widgets ========================== */}
      <section id="widgets" className="py-16 border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Catalogue</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg">
              4 widgets disponibles immÃ©diatement
            </h2>
            <p className="mt-3 text-fg/70">
              Clique sur Â« Copier Â» et colle le snippet oÃ¹ tu veux. C'est
              prÃªt â€” l'attribution dofollow vers Cryptoreflex est dÃ©jÃ 
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
                    <h3 className="font-display font-bold text-lg text-fg leading-tight">
                      {tool.shortName}
                    </h3>
                    <p className="mt-1 text-sm text-fg/70 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </header>

                {/* Preview iframe â€” height limitÃ©e pour la grille */}
                <div className="rounded-xl overflow-hidden border border-border bg-background/40">
                  <iframe
                    src={`/embed/${tool.slug}`}
                    width="100%"
                    height={Math.min(tool.height, 420)}
                    frameBorder={0}
                    loading="lazy"
                    title={`AperÃ§u : ${tool.shortName}`}
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
                    Voir la version complÃ¨te
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
            <h2 className="font-display text-2xl font-extrabold text-fg">
              License Creative Commons BY 4.0
            </h2>
            <p className="mt-3 text-sm text-fg/80 leading-relaxed">
              Tu peux intÃ©grer ces widgets <strong>gratuitement</strong>, y
              compris sur des sites commerciaux, en respectant{" "}
              <strong>une seule rÃ¨gle</strong> : conserver l'attribution
              Â« Powered by Cryptoreflex Â» avec le lien <em>dofollow</em>
              inclus en bas du widget. Ne masque pas le footer, ne supprime
              pas le lien â€” c'est le contrat moral.
            </p>
            <p className="mt-3 text-sm text-fg/80 leading-relaxed">
              En cas de question, Ã©cris-nous Ã {" "}
              <a
                href={`mailto:${BRAND.email}`}
                className="text-primary-soft underline-offset-2 hover:underline"
              >
                {BRAND.email}
              </a>
              . On accepte les demandes de personnalisation pour les mÃ©dias
              partenaires.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="https://creativecommons.org/licenses/by/4.0/deed.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-elevated/40 px-3.5 py-2 text-xs font-semibold text-fg/90 hover:border-primary/40"
              >
                <Download className="h-3.5 w-3.5" />
                Texte complet de la license
              </a>
              <Link
                href="/mentions-legales"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-elevated/40 px-3.5 py-2 text-xs font-semibold text-fg/90 hover:border-primary/40"
              >
                Mentions legales Cryptoreflex
              </Link>
              <a
                href={`mailto:${BRAND.partnersEmail}?subject=Notification%20integration%20widget%20Cryptoreflex&body=Bonjour%2C%0A%0AJ%27ai%20integre%20le%20widget%20%5BNOM%5D%20sur%20%5BURL%5D.%0AAttribution%20conservee%20%3A%20%5BOUI%2FNON%5D.%0A%0AMerci.`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary-soft hover:bg-primary/20"
              >
                Notifier Cryptoreflex de ton integration (optionnel)
              </a>
            </div>
            <p className="mt-4 text-xs text-fg/60 leading-relaxed">
              <strong>Pourquoi nous notifier ?</strong> Pour qu&apos;on suive
              l&apos;adoption des widgets, qu&apos;on remercie les sites
              integrateurs (mention dans notre page Partenaires si tu acceptes),
              et qu&apos;on te previenne en cas de breaking change.
            </p>
          </div>
        </div>
      </section>

      {/* ============================ FAQ ============================ */}
      <section className="py-16 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">FAQ intÃ©grateurs</span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg">
            Questions frÃ©quentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group glass rounded-xl p-5 open:border-primary/40 transition-colors"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-semibold text-fg">
                  <span>{item.question}</span>
                  <span
                    className="text-primary-soft text-xl leading-none mt-0.5 transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg/75 leading-relaxed">
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
      <h3 className="mt-4 font-bold text-fg">{title}</h3>
      <p className="mt-2 text-sm text-fg/70 leading-relaxed">{text}</p>
    </article>
  );
}
