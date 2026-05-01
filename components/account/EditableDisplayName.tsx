"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface Props {
  initialName: string;
}

/**
 * EditableDisplayName — affiche le nom + permet de le modifier inline.
 *
 * Flow : click crayon → input + boutons Sauver/Annuler.
 * POST /api/account/update-name puis router.refresh() pour re-fetch
 * getUser() côté server (qui lit le nouveau user_metadata).
 */
export default function EditableDisplayName({ initialName }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/account/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      setName(data.displayName);
      setEditing(false);
      // Refresh server component pour re-fetch getUser()
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    setName(initialName);
    setEditing(false);
    setError(null);
  }

  if (editing) {
    return (
      <div className="inline-flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={60}
          autoFocus
          disabled={pending}
          className="rounded-lg border border-primary/40 bg-elevated px-3 py-1.5 text-base font-bold text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-xs"
          aria-label="Modifier ton nom d'affichage"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || name.trim().length < 2}
          className="grid place-items-center h-9 w-9 rounded-lg bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors disabled:opacity-50"
          aria-label="Sauvegarder le nouveau nom"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="grid place-items-center h-9 w-9 rounded-lg bg-elevated text-fg/70 hover:bg-elevated/70 transition-colors"
          aria-label="Annuler"
        >
          <X className="h-4 w-4" />
        </button>
        {error && (
          <span className="text-xs text-accent-rose ml-2" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 group">
      <span className="gradient-text">{name}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center h-7 w-7 rounded-lg bg-elevated/60 text-fg/60 hover:text-primary hover:bg-elevated"
        aria-label="Modifier mon nom"
        title="Modifier mon nom"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
