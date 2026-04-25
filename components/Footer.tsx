import Link from "next/link";
import { Bitcoin, Twitter, Github, Send, Mail } from "lucide-react";
import { BRAND } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="mt-32 border-t border-border/60 bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-cyan shadow-glow">
                <Bitcoin className="h-5 w-5 text-white" />
              </span>
              <span className="font-bold text-lg">
                Crypto<span className="gradient-text">reflex</span>
              </span>
            </div>
            <p className="text-sm text-muted max-w-md">
              Votre guide pour naviguer dans l'univers crypto. Comparatifs de plateformes,
              guides pour débutants et outils gratuits — sans jargon.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Link href="#" aria-label="Twitter" className="p-2 rounded-lg border border-border hover:border-primary/60 transition-colors">
                <Twitter className="h-4 w-4" />
              </Link>
              <Link href="#" aria-label="Telegram" className="p-2 rounded-lg border border-border hover:border-primary/60 transition-colors">
                <Send className="h-4 w-4" />
              </Link>
              <Link href="#" aria-label="GitHub" className="p-2 rounded-lg border border-border hover:border-primary/60 transition-colors">
                <Github className="h-4 w-4" />
              </Link>
              <Link href="#" aria-label="Email" className="p-2 rounded-lg border border-border hover:border-primary/60 transition-colors">
                <Mail className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-white/90">Navigation</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/" className="hover:text-white">Accueil</Link></li>
              <li><Link href="/#plateformes" className="hover:text-white">Plateformes</Link></li>
              <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              <li><Link href="/outils" className="hover:text-white">Outils</Link></li>
              <li><Link href="/partenariats" className="hover:text-white">Partenariats</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-white/90">Légal & transparence</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/methodologie" className="hover:text-white">Méthodologie</Link></li>
              <li><Link href="/affiliations" className="hover:text-white">Politique d'affiliation</Link></li>
              <li><Link href="/confidentialite" className="hover:text-white">Confidentialité (RGPD)</Link></li>
              <li><Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 space-y-3 text-xs text-muted">
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <p>© {new Date().getFullYear()} {BRAND.name}. Tous droits réservés.</p>
            <p>Site indépendant non affilié à l'AMF ni à un PSI.</p>
          </div>
          <p className="leading-relaxed border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 text-amber-200/80">
            <strong className="text-amber-300">⚠️ Avertissement légal</strong> — L'investissement
            en cryptoactifs comporte un risque élevé de perte partielle ou totale du capital. Les
            performances passées ne préjugent pas des performances futures. Les contenus de {BRAND.name}
            ont une vocation purement informative et pédagogique et ne constituent pas un conseil
            en investissement au sens de l'article L.321-1 du Code monétaire et financier. Consultez
            un conseiller en investissements financiers (CIF) enregistré ORIAS pour toute décision
            patrimoniale significative. Certains liens sont des liens d'affiliation —{" "}
            <Link href="/affiliations" className="underline hover:text-amber-100">en savoir plus</Link>.
          </p>
        </div>
      </div>
    </footer>
  );
}
