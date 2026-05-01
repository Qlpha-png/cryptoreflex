"use client";

/**
 * PushOptIn — Composant client pour activer/désactiver les notifs push.
 *
 * Flow Activer :
 *  1. Vérifie compatibilité navigateur (PushManager, ServiceWorker).
 *  2. `Notification.requestPermission()` → si granted, on continue.
 *  3. Fetch /api/push/vapid-key pour récupérer la clé publique.
 *  4. Récupère le SW (`navigator.serviceWorker.ready`) et appelle
 *     `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
 *  5. POST /api/push/subscribe avec la sub sérialisée.
 *
 * Flow Désactiver :
 *  1. `getSubscription()` → unsubscribe() côté navigateur.
 *  2. POST /api/push/unsubscribe avec l'endpoint pour purger la DB.
 *
 * États affichés (badge couleur) :
 *  - unsupported  : navigateur n'a pas le Push API (Safari < 16, Firefox priv)
 *  - off          : permission "default" + pas de sub active
 *  - asking       : modale browser ouverte / appel API en cours
 *  - granted      : permission + sub active (✓ vert)
 *  - denied       : user a refusé → message d'aide pour réactiver dans settings
 *  - error        : erreur réseau / VAPID manquant côté serveur
 */

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type Status =
  | "loading"
  | "unsupported"
  | "off"
  | "asking"
  | "granted"
  | "denied"
  | "error";

interface Props {
  /** Variante d'affichage : `card` (mon-compte) ou `inline` (CTA dans alertes). */
  variant?: "card" | "inline";
  /** Texte du CTA principal (override si besoin). */
  ctaLabel?: string;
}

/**
 * Convertit la clé VAPID base64-url en Uint8Array (format attendu par
 * PushManager.subscribe → applicationServerKey).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  return out;
}

export default function PushOptIn({
  variant = "card",
  ctaLabel,
}: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  /* ----- Détection initiale support + état permission/subscription ----- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (Notification.permission === "denied") {
          setStatus("denied");
        } else if (sub && Notification.permission === "granted") {
          setStatus("granted");
        } else {
          setStatus("off");
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ----- Activation ----- */
  const handleEnable = useCallback(async () => {
    setStatus("asking");
    setErrorMsg("");
    try {
      // 1) Permission browser
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        return;
      }

      // 2) Récupère la clé VAPID
      const keyRes = await fetch("/api/push/vapid-key", { cache: "no-store" });
      if (!keyRes.ok) {
        setStatus("error");
        setErrorMsg("Service push indisponible (clé VAPID manquante).");
        return;
      }
      const keyData = (await keyRes.json()) as {
        ok?: boolean;
        publicKey?: string;
      };
      if (!keyData.ok || !keyData.publicKey) {
        setStatus("error");
        setErrorMsg("Clé VAPID invalide.");
        return;
      }

      // 3) Subscribe via le SW
      const reg = await navigator.serviceWorker.ready;
      // Si déjà sub avec une autre clé (changement VAPID) → on renouvelle.
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe().catch(() => undefined);

      // PushManager.subscribe attend un BufferSource. On déballe le `.buffer`
      // pour éviter l'incompatibilité TypeScript Uint8Array<ArrayBufferLike>
      // vs Uint8Array<ArrayBuffer> (lib.dom récente).
      const keyBytes = urlBase64ToUint8Array(keyData.publicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer.slice(
          keyBytes.byteOffset,
          keyBytes.byteOffset + keyBytes.byteLength,
        ) as ArrayBuffer,
      });

      // 4) Persiste côté serveur
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      const subRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!subRes.ok) {
        setStatus("error");
        setErrorMsg("Enregistrement serveur impossible.");
        return;
      }

      setStatus("granted");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }, []);

  /* ----- Désactivation ----- */
  const handleDisable = useCallback(async () => {
    setStatus("asking");
    setErrorMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => undefined);
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => undefined);
      }
      setStatus("off");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }, []);

  /* -------------------- Render -------------------- */

  if (variant === "inline") {
    // Variante compacte (utilisable sous le formulaire d'alerte créée).
    if (status === "granted" || status === "unsupported" || status === "loading") {
      return null;
    }
    return (
      <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
        <div className="flex items-start gap-2">
          <Bell className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-fg/85">
              <strong className="text-fg">Active les notifs push</strong> pour
              recevoir tes alertes immédiatement, même hors-ligne.
            </p>
            {status === "denied" ? (
              <p className="mt-1 text-xs text-muted">
                Tu as refusé les notifs. Réactive-les dans les paramètres de ton
                navigateur (icône cadenas à gauche de l&apos;URL).
              </p>
            ) : (
              <button
                type="button"
                onClick={handleEnable}
                disabled={status === "asking"}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "asking" ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    Activation…
                  </>
                ) : (
                  <>
                    <Bell className="h-3 w-3" aria-hidden="true" />
                    Activer les notifs
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Variante card (compte utilisateur).
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-primary-soft" aria-hidden="true" />
        <h3 className="font-bold text-fg">Notifications push</h3>
        <StatusBadge status={status} />
      </div>

      <p className="text-sm text-fg/70 leading-relaxed mb-4">
        Reçois tes alertes prix et le brief quotidien directement sur ton appareil,
        même quand le site est fermé. Pas d&apos;email, pas de spam — juste tes
        notifs en temps réel.
      </p>

      {status === "unsupported" && (
        <p className="text-xs text-muted">
          Ton navigateur ne supporte pas les notifications push (essaie Chrome,
          Firefox ou Edge sur desktop, ou Safari iOS 16.4+).
        </p>
      )}

      {status === "denied" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
          <AlertCircle className="inline h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />
          Tu as refusé les notifications dans ton navigateur. Pour les réactiver :
          clique sur l&apos;icône cadenas (ou ⓘ) à gauche de l&apos;URL → autorise
          les notifications → recharge la page.
        </div>
      )}

      {(status === "off" || status === "loading" || status === "asking") && (
        <button
          type="button"
          onClick={handleEnable}
          disabled={status === "asking" || status === "loading"}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "asking" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Activation…
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" aria-hidden="true" />
              {ctaLabel || "Activer les notifications push"}
            </>
          )}
        </button>
      )}

      {status === "granted" && (
        <button
          type="button"
          onClick={handleDisable}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-fg hover:bg-elevated/60"
        >
          <BellOff className="h-4 w-4" aria-hidden="true" />
          Désactiver les notifications
        </button>
      )}

      {status === "error" && errorMsg && (
        <p className="mt-3 text-xs text-accent-rose inline-flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {errorMsg}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<
    Status,
    { label: string; cls: string; Icon?: typeof CheckCircle2 }
  > = {
    loading: { label: "…", cls: "bg-elevated/60 text-muted border-border" },
    unsupported: {
      label: "Non supporté",
      cls: "bg-muted/10 text-muted border-border",
    },
    off: { label: "Inactif", cls: "bg-elevated/60 text-fg/70 border-border" },
    asking: { label: "…", cls: "bg-primary/10 text-primary border-primary/30" },
    granted: {
      label: "Actif",
      cls: "bg-accent-green/10 text-accent-green border-accent-green/30",
      Icon: CheckCircle2,
    },
    denied: {
      label: "Bloqué",
      cls: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      Icon: AlertCircle,
    },
    error: {
      label: "Erreur",
      cls: "bg-accent-rose/10 text-accent-rose border-accent-rose/30",
      Icon: AlertCircle,
    },
  };
  const { label, cls, Icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {label}
    </span>
  );
}
