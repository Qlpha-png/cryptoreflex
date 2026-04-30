import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * RegulatoryFooter — bandeau légal compact à inclure en pied de toutes les
 * pages éditoriales (articles blog, fiches plateforme, pages comparateur,
 * pages outils). Complément du <Footer> global, à placer avant.
 *
 * Pourquoi un composant séparé du Footer global ?
 *  - Le Footer global est rendu une fois par layout — il porte l'avertissement
 *    AMF général qui s'applique à tout le site.
 *  - <RegulatoryFooter> sert pour les pages où on veut REDOUBLER la mention
 *    juste avant la zone de contenu signée (articles, comparatifs, outils),
 *    pour que le lecteur la voie sans avoir à scroller jusqu'au footer global.
 *  - Audit conformité 26-04-2026 : la doctrine AMF DOC-2024-01 recommande
 *    explicitement la duplication des avertissements à proximité du contenu
 *    promotionnel — un disclaimer "tout en bas du site" est jugé insuffisant
 *    s'il est trop éloigné du CTA d'affiliation.
 *
 * Source réglementaire :
 *  - Loi Influenceurs n°2023-451 du 9 juin 2023 (identification commerciale)
 *  - Article 222-15 RG AMF (avertissement risque)
 *  - Article L.321-1 CMF (statut éditeur web ≠ CIF/PSI/PSAN)
 */

interface Props {
  /** Classes Tailwind additionnelles. */
  className?: string;
  /** Mention contextuelle additionnelle (ex: "fiscalité 2026", "MiCA"). */
  context?: string;
}

export default function RegulatoryFooter({
  className = "",
  context,
}: Props) {
  return (
    <aside
      role="note"
      aria-label="Avertissement légal — pied de page éditorial"
      className={`mt-12 rounded-xl border border-border bg-elevated/40 p-4 sm:p-5 text-xs text-muted leading-relaxed ${className}`}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck
          className="h-4 w-4 shrink-0 mt-0.5 text-fg/50"
          aria-hidden="true"
        />
        <p>
          <strong className="text-fg/80">
            Site éditorial indépendant.
          </strong>{" "}
          Cryptoreflex n'est ni PSAN, ni CASP, ni CIF. Aucun contenu publié
          ne constitue un conseil en investissement personnalisé. L'investissement
          en cryptoactifs comporte un risque élevé de perte totale en capital.
          Les liens marqués{" "}
          <span className="text-fg/80">« Publicité »</span> sont des liens
          d&apos;affiliation rémunérés sans surcoût pour toi. Détails sur{" "}
          <Link
            href="/transparence"
            className="text-primary-soft hover:text-primary underline underline-offset-2"
          >
            /transparence
          </Link>
          {", "}
          <Link
            href="/methodologie"
            className="text-primary-soft hover:text-primary underline underline-offset-2"
          >
            /methodologie
          </Link>{" "}
          et{" "}
          <Link
            href="/mentions-legales"
            className="text-primary-soft hover:text-primary underline underline-offset-2"
          >
            /mentions-legales
          </Link>
          .
          {context ? (
            <>
              {" "}
              <span className="text-fg/60">Contexte : {context}.</span>
            </>
          ) : null}
        </p>
      </div>
    </aside>
  );
}
