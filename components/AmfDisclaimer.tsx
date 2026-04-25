import { AlertTriangle, Info, Scale, BookOpen } from "lucide-react";

/**
 * Bandeau d'information AMF — conforme à l'article 222-15 du règlement général
 * de l'AMF (Autorité des Marchés Financiers) et à la doctrine PSAN/MiCA.
 *
 * Wording de base (obligatoire, repris dans toutes les variantes) :
 *
 *   « L'investissement en crypto-actifs comporte un risque élevé de perte
 *     totale en capital. Cryptoreflex n'est pas un conseiller en
 *     investissements financiers. Les performances passées ne préjugent pas
 *     des performances futures. »
 *
 * Quatre variantes contextuelles :
 *  - "educatif"    : article pédagogique
 *  - "comparatif"  : page de comparaison d'exchanges (présence de liens d'affiliation)
 *  - "speculation" : section Hidden Gems / cryptos à faible market cap
 *  - "fiscalite"   : page sur la fiscalité crypto
 *
 * Usage :
 *   <AmfDisclaimer variant="comparatif" />
 *   <AmfDisclaimer variant="speculation" compact />
 */

export type AmfVariant = "educatif" | "comparatif" | "speculation" | "fiscalite";

interface AmfDisclaimerProps {
  variant: AmfVariant;
  /** Version condensée (un seul paragraphe court). */
  compact?: boolean;
  className?: string;
}

const BASE_DISCLAIMER =
  "L'investissement en crypto-actifs comporte un risque élevé de perte totale en capital. " +
  "Cryptoreflex n'est pas un conseiller en investissements financiers. " +
  "Les performances passées ne préjugent pas des performances futures.";

interface VariantConfig {
  label: string;
  title: string;
  Icon: typeof AlertTriangle;
  /** Phrase additionnelle, après le wording AMF de base. */
  extra: string;
  tone: "info" | "warn" | "danger" | "neutral";
}

const VARIANTS: Record<AmfVariant, VariantConfig> = {
  educatif: {
    label: "Information AMF",
    title: "Article éducatif — pas un conseil en investissement",
    Icon: BookOpen,
    extra:
      "Ce contenu a une vocation strictement pédagogique. Il ne constitue ni " +
      "une recommandation personnalisée, ni une incitation à acheter ou vendre " +
      "un crypto-actif. Pour toute décision patrimoniale, consultez un Conseiller " +
      "en Investissements Financiers (CIF) immatriculé à l'ORIAS.",
    tone: "info",
  },
  comparatif: {
    label: "Avertissement AMF — Comparatif",
    title: "Comparatif sponsorisé — pas un conseil en investissement",
    Icon: Scale,
    extra:
      "Ce comparatif présente des plateformes enregistrées en tant que PSAN/CASP " +
      "auprès de l'AMF ou de leur régulateur européen. Cryptoreflex peut percevoir " +
      "une commission d'affiliation lorsqu'un visiteur s'inscrit via un lien partenaire ; " +
      "cela n'influence ni le classement éditorial, ni la note attribuée. " +
      "Vérifiez systématiquement le statut PSAN/MiCA de la plateforme avant tout dépôt.",
    tone: "warn",
  },
  speculation: {
    label: "Avertissement AMF — Cryptos spéculatives",
    title: "Cryptos à forte volatilité — risque de perte totale",
    Icon: AlertTriangle,
    extra:
      "Les crypto-actifs présentés dans cette section ont une faible capitalisation " +
      "et/ou un historique court. Leur prix peut varier de plus de 50 % en quelques " +
      "heures et leur liquidité peut disparaître brutalement. N'investissez que des " +
      "sommes que vous êtes prêt à perdre intégralement. Cette sélection ne constitue " +
      "en aucun cas une recommandation d'achat.",
    tone: "danger",
  },
  fiscalite: {
    label: "Avertissement AMF & fiscal",
    title: "Information fiscale générale — pas un conseil personnalisé",
    Icon: Info,
    extra:
      "Les informations fiscales fournies sont basées sur la législation française " +
      "en vigueur (article 150 VH bis du CGI, BOFiP) et peuvent évoluer. Elles ne " +
      "constituent pas un conseil fiscal personnalisé. Pour votre déclaration, " +
      "consultez un expert-comptable, un avocat fiscaliste ou les services de la DGFiP.",
    tone: "neutral",
  },
};

const toneClasses: Record<VariantConfig["tone"], string> = {
  info: "border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan",
  warn: "border-primary/30 bg-primary/5 text-primary-soft",
  danger: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  neutral: "border-border bg-elevated/40 text-muted",
};

export default function AmfDisclaimer({
  variant,
  compact = false,
  className = "",
}: AmfDisclaimerProps) {
  const cfg = VARIANTS[variant];
  const { Icon } = cfg;
  const tone = toneClasses[cfg.tone];

  return (
    <aside
      role="note"
      aria-label={cfg.label}
      data-amf-variant={variant}
      className={`rounded-xl border p-4 sm:p-5 ${tone} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 text-fg/90">
          <p className="text-xs font-bold uppercase tracking-wider opacity-90">
            {cfg.label}
          </p>
          {!compact && (
            <h3 className="mt-1 text-sm font-semibold text-fg">{cfg.title}</h3>
          )}
          <p
            className={`mt-2 text-xs leading-relaxed text-fg/80 ${
              compact ? "" : "sm:text-[13px]"
            }`}
          >
            <strong className="text-fg">{BASE_DISCLAIMER}</strong>
            {!compact && (
              <>
                {" "}
                <span className="text-fg/75">{cfg.extra}</span>
              </>
            )}
          </p>
          {!compact && (
            <p className="mt-2 text-[11px] text-fg/60">
              Mention conforme à l'article 222-15 du règlement général AMF.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
