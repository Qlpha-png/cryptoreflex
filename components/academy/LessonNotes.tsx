"use client";

/**
 * <LessonNotes /> — carnet de notes personnel par leçon (localStorage).
 *
 * Prise de notes = rétention x2. L'utilisateur écrit ce qu'il veut retenir ;
 * sauvegarde automatique (debounce 600 ms) dans son navigateur. Aucune donnée
 * envoyée à un serveur, jamais. Clé : cr.academy.notes.<slug>.
 *
 * Hydratation safe : ne rend rien tant que le localStorage n'est pas lu (évite
 * un flash d'un textarea vide qui écraserait une note existante au 1er render).
 */

import { useEffect, useRef, useState } from "react";
import { NotebookPen, Check } from "lucide-react";
import { getLessonNote, setLessonNote } from "@/lib/academy-progress";

interface LessonNotesProps {
  slug: string;
}

export default function LessonNotes({ slug }: LessonNotesProps) {
  const [hydrated, setHydrated] = useState(false);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHydrated(true);
    setValue(getLessonNote(slug));
    setSaved(false);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [slug]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLessonNote(slug, v);
      setSaved(true);
    }, 600);
  }

  // Avant hydratation : on réserve l'espace sans textarea (pas de flash).
  if (!hydrated) {
    return (
      <section className="mt-10 rounded-2xl border border-border bg-surface/60 p-5 sm:p-6">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold text-fg">
          <NotebookPen className="h-4 w-4" aria-hidden="true" />
          Mes notes
        </h2>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-border bg-surface/60 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold text-fg">
          <NotebookPen className="h-4 w-4" aria-hidden="true" />
          Mes notes
        </h2>
        {saved && value.trim().length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Enregistré
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        Notes ce que tu veux retenir. Elles restent dans ton navigateur —
        privées, jamais envoyées.
      </p>
      <textarea
        value={value}
        onChange={handleChange}
        rows={4}
        placeholder="Ex : penser à activer la 2FA avant de déposer des fonds…"
        className="mt-3 w-full resize-y rounded-xl border border-border bg-background/60 p-3 text-sm text-fg/90 placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Mes notes personnelles sur cette leçon"
      />
    </section>
  );
}
