/**
 * <WaltioFranchise /> — encart « Bon à savoir » affiché là où Cryptoreflex RECOMMANDE Waltio avec un lien rémunéré.
 *
 * Décision de Kev (07/10/2026) : garder l'aspect commercial (on recommande Waltio, le bouton reste juste après), mais
 * être franc sur la fuite de données de janvier 2026 au lieu de la taire sur 35 pages sur 37.
 *
 * Faits relus le 07/10/2026, et RIEN d'autre :
 *  - Communiqué officiel « Security Notice – 23 janvier 2026 » (WALTIO_INCIDENT.noticeUrl) : intrusion dans la nuit du
 *    21 janvier 2026 ; données touchées = adresse e-mail + données agrégées du rapport fiscal 2024 ; mots de passe et
 *    clés API d'exchanges non concernés ; « Mobilisation d'experts externes en cybersécurité », « Envoi d'une
 *    notification à la CNIL », « Dépôt de plainte » (unité nationale cyber de la gendarmerie) ; cause = un gestionnaire
 *    de base de données, « mise en retrait définitive de cet outil » ; audits techniques ensuite ; conseil : mot de
 *    passe unique et authentification à deux facteurs sur l'adresse e-mail.
 *  - Article d'aide Waltio « Questions & réponses : incident de sécurité » (WALTIO_INCIDENT.faqUrl) : découverte le
 *    21 janvier 2026 au matin ; données touchées = « L'adresse email de l'utilisateur, du gain ou de la perte sur
 *    l'année 2024, du solde par cryptomonnaie au 31 décembre 2024 » ; non touchées : historique des transactions,
 *    adresses de wallets, clés privées / publiques / API, pièces d'identité, IBAN, données bancaires.
 *  - Page d'accueil waltio.com/fr (HTML relu mot à mot le 07/10/2026) : « Créez et téléchargez vos formulaires
 *    fiscaux 2086 et 3916-bis en un clic », « plus de 700 exchanges, wallets et blockchains », « un accès en "lecture
 *    seule" à vos données ». La page dit « conforme à l'article 150VH » (et non 150 VH bis) et ne dit pas « sans clé
 *    privée » : ni l'un ni l'autre n'est repris ici.
 * Volontairement ABSENT (non confirmé par Waltio) : le nombre de personnes touchées (chiffre de presse), le vol de
 * bitcoins et l'intrusion de 2025 rapportés par The Big Whale (26/01/2026).
 *
 * Sans hook ni dépendance serveur : utilisable dans un Server Component comme dans un composant client.
 * Les liens de cet encart ne sont PAS rémunérés (fiche interne + communiqué officiel) ; le lien rémunéré reste le
 * bouton qui suit, marqué « Publicité ».
 */

import Link from "next/link";
import { Info } from "lucide-react";

export const WALTIO_INCIDENT = {
  /** Mois de l'annonce, tel qu'affiché. */
  month: "janvier 2026",
  /** Données touchées, d'après l'article d'aide de Waltio. */
  dataTouched: "adresse e-mail, gain ou perte de 2024 et solde par crypto au 31 décembre 2024",
  noticeUrl: "https://www.waltio.com/fr/blog/actualite/security-notice-23-01/",
  noticeLabel: "communiqué de Waltio du 23 janvier 2026",
  faqUrl: "https://help.waltio.com/fr/articles/13482134-questions-reponses-incident-de-securite",
  /** Date à laquelle ces faits ont été relus sur les sources ci-dessus. */
  checkedOn: "2026-10-07",
  /** Section « Sécurité » de la fiche partenaire (id posé par app/partenaires/[slug]/page.tsx). */
  detailHref: "/partenaires/waltio#securite-prise-en-charge-et-mises-a-jour",
} as const;

interface WaltioFranchiseProps {
  /**
   * - "card"    : encart complet (pages d'outils, articles) ;
   * - "compact" : deux phrases (petits encarts, fenêtre du PDF, fiche partenaire) ;
   * - "line"    : une ligne avec lien (bandeau collant, vitrine).
   */
  variant?: "card" | "compact" | "line";
  /** Cible du lien « détail » (par défaut la section Sécurité de la fiche Waltio). */
  detailHref?: string;
  /** Variante "line" : texte placé avant (ex. « Publicité · » dans le bandeau collant). */
  lead?: string;
  className?: string;
}

export default function WaltioFranchise({
  variant = "card",
  detailHref = WALTIO_INCIDENT.detailHref,
  lead,
  className = "",
}: WaltioFranchiseProps) {
  if (variant === "line") {
    return (
      <p className={`text-xs text-muted ${className}`} data-waltio-franchise="line">
        {lead}
        Bon à savoir : fuite de données chez Waltio en {WALTIO_INCIDENT.month}.{" "}
        <Link href={detailHref} className="underline hover:text-primary-soft">
          Ce qu&apos;il faut savoir
        </Link>
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <aside
        aria-label="Bon à savoir sur Waltio"
        data-waltio-franchise="compact"
        className={`rounded-xl border border-fg-max/10 bg-background/40 p-3 text-left text-xs text-fg-max/75 leading-relaxed ${className}`}
      >
        <p>
          <Info className="mr-1 inline h-3.5 w-3.5 align-text-top text-primary-soft" aria-hidden="true" />
          <strong className="text-fg-max">Bon à savoir :</strong> en {WALTIO_INCIDENT.month}, Waltio a annoncé une
          fuite de données ({WALTIO_INCIDENT.dataTouched}). Selon Waltio, ni les mots de passe ni les clés API n&apos;ont
          été touchés ; l&apos;éditeur a notifié la CNIL, porté plainte et retiré l&apos;outil en cause.
        </p>
        <p className="mt-1.5">
          <strong className="text-fg-max">Pourquoi on le recommande quand même :</strong> selon Waltio, il crée vos
          formulaires 2086 et 3916-bis et n&apos;a qu&apos;un accès en lecture seule à vos données. Notre conseil :
          activez la double authentification sur l&apos;adresse e-mail de votre compte.{" "}
          <Link href={detailHref} className="underline hover:text-primary-soft">
            Le détail
          </Link>
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Bon à savoir sur Waltio"
      data-waltio-franchise="card"
      className={`rounded-xl border border-fg-max/10 bg-background/40 p-4 text-left text-xs text-fg-max/75 leading-relaxed ${className}`}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold text-fg-max">
        <Info className="h-4 w-4 shrink-0 text-primary-soft" aria-hidden="true" />
        Bon à savoir
      </p>
      <p className="mt-2">
        En {WALTIO_INCIDENT.month}, Waltio a annoncé une fuite de données : {WALTIO_INCIDENT.dataTouched}. Selon
        Waltio, ni les mots de passe, ni les clés API, ni les adresses de wallets, ni l&apos;historique des transactions
        n&apos;ont été touchés. L&apos;éditeur dit avoir fait appel à des experts en cybersécurité, notifié la CNIL,
        porté plainte et retiré définitivement l&apos;outil de base de données à l&apos;origine de la fuite.
      </p>
      <p className="mt-2">
        <strong className="text-fg-max">Pourquoi on le recommande quand même :</strong> selon Waltio, il crée vos
        formulaires 2086 et 3916-bis et synchronise plus de 700 exchanges, wallets et blockchains, avec un accès en
        lecture seule à vos données. C&apos;est surtout utile si vous avez plusieurs comptes et beaucoup
        d&apos;opérations.
      </p>
      <p className="mt-2">
        <strong className="text-fg-max">Notre conseil :</strong> protégez l&apos;adresse e-mail de votre compte (mot de
        passe unique, double authentification) et méfiez-vous des e-mails ou appels inattendus qui parlent de vos
        cryptos.
      </p>
      <p className="mt-2 text-xs text-muted">
        <Link href={detailHref} className="underline hover:text-primary-soft">
          Le détail sur notre fiche Waltio
        </Link>{" "}
        · Source :{" "}
        <a
          href={WALTIO_INCIDENT.noticeUrl}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="underline hover:text-primary-soft"
        >
          {WALTIO_INCIDENT.noticeLabel}
        </a>
      </p>
    </aside>
  );
}
