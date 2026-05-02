import type { Metadata } from "next";
import Link from "next/link";
import { Award, Sparkles, ArrowRight } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { articleSchema, breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import LiveDot from "@/components/ui/LiveDot";

/**
 * /outils/crypto-license — Permis Crypto Cryptoreflex (BATCH 8 WOW).
 *
 * Audit innovation 2026-05-02 : "Quiz gamifié 50 questions (régulation,
 * fiscalité, sécurité, écosystème) → score → délivre un 'permis crypto'
 * PDF avec badge social. Très partageable. Aucun équivalent FR."
 *
 * Phase actuelle : landing + waitlist. V1 = quiz interactif côté client +
 * génération PDF côté serveur.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Permis Crypto FR — Teste tes connaissances + obtiens ton badge",
  description:
    "Quiz gratuit 50 questions sur la crypto en France (régulation MiCA, fiscalité PFU, sécurité wallet, écosystème). Score >70 % → ton Permis Crypto Cryptoreflex en PDF. Bientôt.",
  alternates: { canonical: `${BRAND.url}/outils/crypto-license` },
};

export default function CryptoLicensePage() {
  const faqItems = [
    {
      q: "C'est un diplôme officiel ?",
      a: "Non, c'est un badge éducatif et ludique délivré par Cryptoreflex. Il n'a aucune valeur réglementaire (pas de lien avec l'AMF, l'ACPR ou le RNCP). Il atteste que tu as répondu correctement à 70 % minimum d'un quiz de 50 questions sur les fondamentaux de l'investissement crypto en France.",
    },
    {
      q: "Quelles thématiques sont couvertes ?",
      a: "5 chapitres × 10 questions : (1) Bases techniques (blockchain, wallet, clé privée) ; (2) Régulation FR/UE (MiCA, PSAN, AMF, loi influenceurs) ; (3) Fiscalité (PFU 30 %, Cerfa 2086, BIC vs BNC) ; (4) Sécurité (phishing, scam, hardware wallet) ; (5) Écosystème (DeFi, L2, stablecoins, on-chain).",
    },
    {
      q: "Combien de temps prend le quiz ?",
      a: "Compte 15-25 min pour les 50 questions. Tu peux mettre en pause et reprendre. Pour passer, il faut 35/50 (70 %). Tu peux retenter autant de fois que tu veux (mais le permis affiche le meilleur score).",
    },
    {
      q: "Que contient le PDF Permis Crypto ?",
      a: "Une page A4 stylée avec ton pseudo, ton score détaillé par chapitre, un QR code de vérification (renvoyant vers cryptoreflex.fr/permis/[id]), et la date d'obtention. Idéal à mettre en story Discord ou en lien dans ton bio si tu es curateur crypto.",
    },
    {
      q: "C'est gratuit ?",
      a: "Oui, 100 % gratuit, illimité, sans login obligatoire (login optionnel pour sauvegarder ton historique de scores).",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/crypto-license",
      title: "Permis Crypto FR — Teste tes connaissances + obtiens ton badge",
      description: "Quiz gratuit 50 questions + PDF Permis Crypto.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil",
      tags: ["quiz", "éducation", "permis crypto", "MiCA"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Permis Crypto", url: "/outils/crypto-license" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="crypto-license" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Permis Crypto</span>
        </nav>

        <header className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Sparkles className="h-3 w-3" aria-hidden /> Bientôt — Q3 2026
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="gradient-text">Permis Crypto</span> FR
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Teste tes connaissances en investissement crypto avec un quiz
            ludique de 50 questions. Score &gt; 70 % → tu débloques ton
            Permis Crypto Cryptoreflex (PDF + QR code de vérification).
          </p>
          <div className="mt-3">
            <LiveDot variant="amber" label="Service en construction" />
          </div>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Un quiz sérieux mais ludique pour vérifier que tu maîtrises les bases avant d'investir, et un PDF stylé à partager si tu réussis."
            bullets={[
              { emoji: "🎓", text: "50 questions × 5 chapitres : technique, régulation, fiscalité, sécurité, écosystème" },
              { emoji: "🏆", text: "Score >70 % → PDF Permis Crypto avec QR code unique" },
              { emoji: "🔁", text: "Retentes illimitées, on garde ton meilleur score" },
              { emoji: "🆓", text: "100 % gratuit, login optionnel" },
            ]}
            readingTime="3 min"
            level="Tous niveaux"
          />
        </div>

        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { num: "01", title: "Bases techniques", body: "Blockchain, wallet, clé privée, mnémonique, fork, halving." },
            { num: "02", title: "Régulation FR/UE", body: "MiCA, PSAN, AMF, loi influenceurs 2023-451." },
            { num: "03", title: "Fiscalité", body: "PFU 30 %, Cerfa 2086, BIC vs BNC, déclaration comptes étrangers." },
            { num: "04", title: "Sécurité", body: "Phishing, seed phrase, hardware wallet, multi-sig." },
            { num: "05", title: "Écosystème", body: "DeFi, L2, stablecoins, oracles, MEV, on-chain." },
          ].map((c) => (
            <div key={c.num} className="rounded-2xl border border-border bg-elevated/40 p-5">
              <div className="text-xs uppercase tracking-wider text-primary-soft font-bold">
                Chapitre {c.num}
              </div>
              <h3 className="mt-1 text-base font-bold">{c.title}</h3>
              <p className="mt-2 text-xs text-fg/75 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <Award className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold">Accès anticipé au Permis Crypto</h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Lancement Q3 2026. Inscris-toi à la newsletter pour passer le
            quiz en avant-première et débloquer le badge collector early-bird.
          </p>
          <Link href="/#cat-informe" className="mt-5 btn-primary btn-primary-shine">
            M&apos;inscrire <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
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
          <RelatedPagesNav currentPath="/outils/crypto-license" variant="default" limit={4} />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="crypto-license" />
        </div>
      </div>
    </article>
  );
}
