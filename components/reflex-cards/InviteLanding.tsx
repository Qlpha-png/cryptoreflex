"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Gift } from "lucide-react";

/* même format que INVITE_RE (lib/reflex-cards/friends.ts) : CODE.mac ou CODE.v.mac (lien renouvelé) */
const INV = /^[A-HJ-NP-Z2-9]{8}(?:\.\d{1,4})?\.[a-f0-9]{16}$/;

/** jeton d'invitation lu dans l'adresse (?inv=), après le montage : la page reste statique */
function useInvite(): string | null {
  const [inv, setInv] = useState<string | null>(null);
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("inv");
    if (v && INV.test(v)) setInv(v);
  }, []);
  return inv;
}

const playHref = (inv: string | null) => (inv ? `/cartes/jouer?inv=${encodeURIComponent(inv)}` : "/cartes/jouer");

/** bouton « Jouer » qui transmet l'invitation d'un ami au jeu (le jeu la garde le temps de se connecter) */
export function PlayLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const inv = useInvite();
  return (
    <a href={playHref(inv)} className={className}>
      {children}
    </a>
  );
}

/** arrivée par le lien partagé d'un ami : bandeau d'accueil en haut de la page de la carte */
export function InviteBanner({ name }: { name: string }) {
  const inv = useInvite();
  if (!inv) return null;
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-fg/90">
          <strong className="text-fg">Un ami vous invite sur Reflex Cards</strong> et vous montre sa carte {name} : à vous de tenter votre chance ! C&apos;est gratuit et sans achat. Une fois votre compte créé, acceptez son invitation : vous serez amis pour échanger et vous offrir des cartes.
        </p>
      </div>
      <a href={playHref(inv)} className="btn-primary shrink-0 justify-center text-sm py-2.5 px-5">
        Ouvrir mon booster gratuit <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
