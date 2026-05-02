import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, AlertTriangle } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { articleSchema, breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";

/**
 * /outils/phishing-checker — Wallet Phishing Checker (idée innovation #2).
 *
 * Audit produit innovation : "Colle une adresse → check contre bases scam
 * (Chainabuse, ScamSniffer, custom FR) + score risque." Aucun équivalent FR.
 *
 * V1 fonctionnelle : intégration ScamSniffer API + cache Redis. Pour
 * l'instant, landing + capture d'audience.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Wallet Phishing Checker — Vérifie si une adresse crypto est scam",
  description:
    "Colle une adresse crypto (BTC, ETH, SOL) → score de risque scam/phishing en 2 sec. Bases Chainabuse, ScamSniffer + custom FR. Gratuit, anonyme, 100 % automatisé.",
  alternates: { canonical: `${BRAND.url}/outils/phishing-checker` },
};

export default function PhishingCheckerPage() {
  const faqItems = [
    {
      q: "Quelles bases de données scam sont consultées ?",
      a: "Chainabuse (open-source, communauté), ScamSniffer (commercial avec API gratuite tier), notre base custom FR (alimentée par signalements utilisateurs Cryptoreflex). Score agrégé entre 0 (sûr) et 100 (scam confirmé).",
    },
    {
      q: "Quels réseaux sont supportés ?",
      a: "V1 : Bitcoin, Ethereum (et tous les EVM : Polygon, Arbitrum, Optimism, BSC, Base), Solana, Tron. V2 : ajout Cosmos, NEAR, Sui.",
    },
    {
      q: "C'est anonyme ?",
      a: "Oui. Aucun login requis. L'adresse que tu colles est envoyée aux APIs en read-only, jamais stockée côté Cryptoreflex (sauf si tu signales toi-même un scam).",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/phishing-checker",
      title: "Wallet Phishing Checker — vérifie si une adresse crypto est scam",
      description: "Outil gratuit de check d'adresse contre bases scam.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Sécurité",
      tags: ["phishing", "scam", "sécurité crypto", "wallet checker"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Phishing Checker", url: "/outils/phishing-checker" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="phishing-checker" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Phishing Checker</span>
        </nav>

        <header className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 border border-success/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
            <ShieldCheck className="h-3 w-3" aria-hidden /> Gratuit · Anonyme
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="gradient-text">Wallet Phishing Checker</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Avant d&apos;envoyer ta crypto vers une adresse, vérifie qu&apos;elle
            n&apos;est pas signalée comme scam ou phishing. Score de risque
            agrégé en 2 secondes.
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Colle une adresse, on consulte 3 bases scam (Chainabuse + ScamSniffer + custom FR), tu as un score 0-100 en 2 sec."
            bullets={[
              { emoji: "🛡️", text: "Bases : Chainabuse, ScamSniffer, custom FR Cryptoreflex" },
              { emoji: "⚡", text: "Multi-réseaux : BTC, ETH/EVM, SOL, TRX" },
              { emoji: "🔒", text: "Anonyme, pas de login, adresse non stockée" },
              { emoji: "🆓", text: "Gratuit illimité" },
            ]}
            readingTime="2 min"
            level="Tous niveaux"
          />
        </div>

        {/* Stub CTA — V1 fonctionnelle à venir */}
        <section className="mt-12 rounded-2xl border border-warning/30 bg-warning/5 p-6 flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-warning-fg mt-0.5 shrink-0" aria-hidden />
          <div>
            <h2 className="text-lg font-bold">Service en construction</h2>
            <p className="mt-2 text-sm text-fg/85">
              Le checker live arrive en Q3 2026 (intégration ScamSniffer API
              + cache Redis). En attendant, tu peux consulter manuellement :
            </p>
            <ul className="mt-3 space-y-1 text-sm text-fg/80">
              <li>• <a href="https://chainabuse.com" target="_blank" rel="noopener noreferrer" className="text-primary-soft hover:underline">Chainabuse.com</a> (open-source)</li>
              <li>• <a href="https://scamsniffer.io" target="_blank" rel="noopener noreferrer" className="text-primary-soft hover:underline">ScamSniffer.io</a> (Web3)</li>
              <li>• <a href="https://etherscan.io" target="_blank" rel="noopener noreferrer" className="text-primary-soft hover:underline">Etherscan.io</a> (tag scam visible sur l&apos;adresse)</li>
            </ul>
          </div>
        </section>

        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 space-y-3">
            {faqItems.map((item) => (
              <details key={item.q} className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40">
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-fg">
                  {item.q}
                  <span className="text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <RelatedPagesNav currentPath="/outils/phishing-checker" variant="default" limit={4} />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="phishing-checker" />
        </div>
      </div>
    </article>
  );
}
