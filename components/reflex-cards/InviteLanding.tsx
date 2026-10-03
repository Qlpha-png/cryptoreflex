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

/** pseudo de l'hôte (route publique, sans compte) : « Léa vous invite » plutôt que « un ami » (plan du 03/10/2026) */
function useInviter(inv: string | null): { pseudo: string | null; invalid: boolean } {
  const [state, setState] = useState<{ pseudo: string | null; invalid: boolean }>({ pseudo: null, invalid: false });
  useEffect(() => {
    if (!inv) return;
    const ctrl = new AbortController();
    fetch(`/api/cartes/invitation?inv=${encodeURIComponent(inv)}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as { ok?: boolean; pseudo?: string } | null;
        if (r.status === 404) setState({ pseudo: null, invalid: true });
        else if (r.ok && j?.ok && j.pseudo) setState({ pseudo: j.pseudo, invalid: false });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [inv]);
  return state;
}

const playHref = (inv: string | null) => (inv ? `/cartes/jouer?inv=${encodeURIComponent(inv)}` : "/cartes/jouer");

/** bouton « Jouer » qui transmet l'invitation d'un ami au jeu (le jeu la garde jusqu'à la création du compte) */
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
  const { pseudo, invalid } = useInviter(inv);
  if (!inv) return null;
  const who = pseudo ? <strong className="text-fg">{pseudo} vous invite sur Reflex Cards</strong> : <strong className="text-fg">Un ami vous invite sur Reflex Cards</strong>;
  return (
    <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/10 p-4">
      <div className="flex items-start gap-3">
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm text-fg/90">
          <p>
            {who} et vous montre sa carte {name}. C&apos;est un jeu de cartes à collectionner, gratuit et sans achat :
            un booster de 5 cartes offert toutes les 15 minutes.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg/80">
            <li>
              <strong className="text-fg">Ouvrez votre premier booster tout de suite</strong>, sans compte.
            </li>
            <li>
              Créez ensuite un compte gratuit (une adresse e-mail suffit) pour garder vos cartes et{" "}
              <strong className="text-fg">accepter l&apos;invitation</strong> : vous devenez amis, et{" "}
              <strong className="text-fg">un booster offert à chacun</strong>.
            </li>
          </ol>
          {invalid && (
            <p className="mt-2 text-xs text-warning-fg">
              Ce lien d&apos;invitation n&apos;est plus valide : vous pouvez jouer quand même, puis demander un nouveau lien à votre ami.
            </p>
          )}
        </div>
      </div>
      <a href={playHref(inv)} className="btn-primary mt-4 w-full justify-center text-sm py-2.5 px-5 sm:w-auto">
        Ouvrir mon premier booster <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
