/**
 * lib/comparison-verdict.ts — verdict rédigé par le code des duels /comparatif/[slug].
 *
 * Passe finale (06/10/2026) : extrait de app/comparatif/[slug]/page.tsx pour être testé. Sur
 * /comparatif/binance-vs-coinbase, l'intro disait « Binance reste préférable sur certains profils précis » et le verdict
 * « Choisissez Binance si vous tradez régulièrement en spot », alors que le bandeau de la même page dit Binance non
 * autorisée en France depuis le 1er juillet 2026. Règle : une plateforme non autorisée en France (registre MiCA de
 * l'ESMA, liste blanche de l'AMF : isAvailableFr) ne reçoit aucune recommandation, comme dans buildPlatformSummary.
 */
import { isAvailableFr, type Platform } from "@/lib/platforms";
import { fmtNb } from "@/lib/format-fr";

export interface DuelVerdict {
  intro: string;
  pickA: string;
  pickB: string;
  tradeoff: string;
}

/** Verdict quand au moins une des deux plateformes n'est pas autorisée en France : aucune recommandation pour elle. */
function unauthorizedVerdict(a: Platform, b: Platform, okA: boolean, okB: boolean): DuelVerdict {
  const notAllowed = (p: Platform) =>
    `${p.name} n'est pas autorisée en France (absente du registre MiCA de l'ESMA avec accès à la France et de la liste blanche de l'AMF) : aucune recommandation.`;
  if (!okA && !okB) {
    return {
      intro: `Ni ${a.name} ni ${b.name} n'est autorisée en France. Ce comparatif reste informatif : nous ne recommandons aucune des deux à un résident français.`,
      pickA: notAllowed(a),
      pickB: notAllowed(b),
      tradeoff: `Pour acheter des cryptos depuis la France, choisissez une plateforme agréée MiCA avec un accès à la France.`,
    };
  }
  const ok = okA ? a : b;
  const ko = okA ? b : a;
  const okText = `${ok.name} est agréée MiCA avec un accès à la France (${ok.mica.authority ?? ok.mica.status}) : c'est la seule des deux qu'un résident français peut utiliser.`;
  return {
    intro: `${ok.name} est agréée MiCA avec un accès à la France ; ${ko.name} ne l'est pas. Ce comparatif reste informatif : nous ne recommandons pas ${ko.name} à un résident français, quel que soit son score.`,
    pickA: okA ? okText : notAllowed(a),
    pickB: okB ? okText : notAllowed(b),
    tradeoff: `Entre ${a.name} et ${b.name}, la question se règle sur l'autorisation en France, avant les frais, la sécurité ou l'application.`,
  };
}

export function buildDuelVerdict(a: Platform, b: Platform): DuelVerdict {
  const okA = isAvailableFr(a);
  const okB = isAvailableFr(b);
  if (!okA || !okB) return unauthorizedVerdict(a, b, okA, okB);

  const aFeesAdv = a.scoring.fees - b.scoring.fees;
  const aSecAdv = a.scoring.security - b.scoring.security;
  const aUxAdv = a.scoring.ux - b.scoring.ux;

  let intro: string;
  if (Math.abs(a.scoring.global - b.scoring.global) < 0.2) {
    intro = `${a.name} et ${b.name} obtiennent quasiment le même score global (${fmtNb(a.scoring.global)} contre ${fmtNb(b.scoring.global)}). C'est une comparaison où le bon choix dépend strictement de vos priorités personnelles, pas d'une supériorité objective de l'un sur l'autre. Trois angles permettent de trancher : le coût réel sur votre profil de trading, l'importance de l'expérience mobile, et la place que vous accordez à un support en français.`;
  } else if (a.scoring.global > b.scoring.global) {
    intro = `${a.name} (${fmtNb(a.scoring.global)}/5) devance ${b.name} (${fmtNb(b.scoring.global)}/5) dans notre méthodologie globale, mais l'écart cache des spécialisations. ${b.name} reste préférable sur certains profils précis qu'on détaille plus bas — ce comparatif ne se résume pas à "le meilleur score gagne".`;
  } else {
    intro = `${b.name} (${fmtNb(b.scoring.global)}/5) devance ${a.name} (${fmtNb(a.scoring.global)}/5) dans notre méthodologie globale, mais l'écart cache des spécialisations. ${a.name} reste préférable sur certains profils précis qu'on détaille plus bas — ce comparatif ne se résume pas à "le meilleur score gagne".`;
  }

  const pickA =
    aFeesAdv > 0.3
      ? `Choisissez ${a.name} si vous tradez régulièrement en spot — vous économisez du capital à chaque opération sur les frais (${fmtNb(a.fees.spotMaker)}% vs ${fmtNb(b.fees.spotMaker)}% en maker). Sur 12 mois et 10 000€ de volume, l'écart devient mécanique.`
      : aSecAdv > 0.3
        ? `Choisissez ${a.name} si la sécurité est votre priorité non-négociable. ${fmtNb(a.security.coldStoragePct)}% en cold storage et un score MiCA ${fmtNb(a.scoring.mica)}/5 placent la barre haut.`
        : aUxAdv > 0.3
          ? `Choisissez ${a.name} si l'expérience utilisateur est déterminante : sa sous-note UX est de ${fmtNb(a.scoring.ux)}/5, contre ${fmtNb(b.scoring.ux)}/5 pour ${b.name}.`
          : `Choisissez ${a.name} si vous valorisez : ${a.strengths[0].toLowerCase()}. C'est le critère où l'écart est le plus net face à ${b.name}.`;

  const pickB =
    aFeesAdv < -0.3
      ? `Choisissez ${b.name} si vous tradez régulièrement en spot — vous économisez du capital à chaque opération sur les frais (${fmtNb(b.fees.spotMaker)}% vs ${fmtNb(a.fees.spotMaker)}% en maker). Sur 12 mois et 10 000€ de volume, l'écart devient mécanique.`
      : aSecAdv < -0.3
        ? `Choisissez ${b.name} si la sécurité est votre priorité non-négociable. ${fmtNb(b.security.coldStoragePct)}% en cold storage et un score MiCA ${fmtNb(b.scoring.mica)}/5 placent la barre haut.`
        : aUxAdv < -0.3
          ? `Choisissez ${b.name} si l'expérience utilisateur est déterminante : sa sous-note UX est de ${fmtNb(b.scoring.ux)}/5, contre ${fmtNb(a.scoring.ux)}/5 pour ${a.name}.`
          : `Choisissez ${b.name} si vous valorisez : ${b.strengths[0].toLowerCase()}. C'est le critère où l'écart est le plus net face à ${a.name}.`;

  const tradeoff = `Le vrai trade-off entre ${a.name} et ${b.name} se joue sur ${
    Math.abs(aFeesAdv) > Math.abs(aUxAdv) && Math.abs(aFeesAdv) > Math.abs(aSecAdv)
      ? "le coût total de possession (frais cumulés sur 12 mois)"
      : Math.abs(aSecAdv) > Math.abs(aUxAdv)
        ? "le profil de sécurité et la conformité MiCA"
        : "l'expérience mobile et la simplicité d'usage"
  }. Une fois ce critère arbitré, le reste devient secondaire.`;

  return { intro, pickA, pickB, tradeoff };
}
