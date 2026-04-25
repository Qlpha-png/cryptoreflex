import { ShieldCheck, Eye, Calendar, Award } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ReassuranceItem {
  Icon: LucideIcon;
  value: string;
  label: string;
  hint?: string;
}

const ITEMS: ReassuranceItem[] = [
  {
    Icon: Eye,
    value: "100 %",
    label: "Méthodologie publique",
    hint: "Notre scoring est ouvert et auditable",
  },
  {
    Icon: ShieldCheck,
    value: "0 €",
    label: "Reçus pour modifier les notes",
    hint: "Affiliations transparentes, sans biais",
  },
  {
    Icon: Calendar,
    value: "Mensuelle",
    label: "Mise à jour des comparatifs",
    hint: "Statut MiCA suivi en temps réel",
  },
  {
    Icon: Award,
    value: "23",
    label: "Plateformes auditées",
    hint: "Toutes les options du marché FR",
  },
];

/**
 * Bandeau "pourquoi nous croire" — recommandation directe du Lead Designer.
 * Réassurance critique pour un débutant crypto FR méfiant.
 */
export default function ReassuranceSection() {
  return (
    <section aria-label="Pourquoi nous faire confiance" className="border-y border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden">
          {ITEMS.map(({ Icon, value, label, hint }) => (
            <div
              key={label}
              className="bg-surface px-5 py-6 flex flex-col items-start gap-2"
            >
              <Icon className="h-7 w-7 text-primary" strokeWidth={1.75} />
              <div className="font-mono text-2xl font-bold text-fg mt-2">
                {value}
              </div>
              <div className="text-sm font-semibold text-fg">{label}</div>
              {hint && <div className="text-xs text-muted leading-snug">{hint}</div>}
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Cryptoreflex applique la même méthodologie que les comparateurs indépendants type
          UFC-Que Choisir, adaptée au marché crypto français post-MiCA.{" "}
          <a href="/methodologie" className="text-primary-soft hover:underline">
            Lire la méthodologie complète
          </a>
        </p>
      </div>
    </section>
  );
}
