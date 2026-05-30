"use client";

/**
 * <SharedCertificate /> — vue publique d'un certificat partagé.
 *
 * Lit le payload encodé dans l'URL (?d=base64), le décode et affiche les
 * parcours validés. 0 backend, 0 stockage : tout est dans l'URL. Le prénom
 * (optionnel) n'apparaît que si l'utilisateur l'a lui-même saisi au partage.
 *
 * Page noindex (cf. metadata de la route) — pas de contenu indexable utile.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, GraduationCap, ArrowRight } from "lucide-react";
import { decodeCertShare } from "@/lib/academy-progress";
import { getTrack, type Track } from "@/lib/academy-tracks";

export default function SharedCertificate() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const params = new URLSearchParams(window.location.search);
    const code = params.get("d");
    if (!code) return;
    const payload = decodeCertShare(code);
    if (!payload) return;
    const resolved = payload.t
      .map((id) => getTrack(id))
      .filter((t): t is Track => t !== null);
    setTracks(resolved);
    setName(payload.n ?? null);
  }, []);

  if (!ready) {
    return <div className="min-h-[40vh]" aria-hidden="true" />;
  }

  if (tracks.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="ds-h1">Certificat introuvable</h1>
        <p className="mt-3 ds-lead">
          Ce lien de partage est invalide ou expiré. Découvre l&apos;académie
          gratuite pour décrocher les tiens.
        </p>
        <Link href="/academie" className="btn-primary mt-6 inline-flex text-sm">
          Voir l&apos;académie
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-b from-amber-400/10 to-transparent p-8 text-center sm:p-12">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
          <Award className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary-soft">
          Certificat de réussite · Académie Cryptoreflex
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
          {name ? `${name} a validé` : "Parcours validés"}{" "}
          {tracks.length === 1
            ? "1 parcours"
            : `${tracks.length} parcours`}{" "}
          crypto
        </h1>
        <p className="mt-2 text-sm text-muted">
          Formation gratuite, pédagogique, MiCA &amp; fiscalité française.
        </p>

        <ul
          role="list"
          className="mx-auto mt-6 grid max-w-xl gap-2 text-left sm:grid-cols-2"
        >
          {tracks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg"
            >
              <Award className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              {t.title}
            </li>
          ))}
        </ul>

        <Link href="/academie" className="btn-primary mt-8 inline-flex text-sm">
          <GraduationCap className="h-4 w-4" aria-hidden="true" />
          Commencer gratuitement
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
