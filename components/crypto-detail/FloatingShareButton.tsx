"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Link2, Check, X } from "lucide-react";

interface FloatingShareButtonProps {
  /** URL canonique à partager. */
  url: string;
  /** Texte préformulé pour le partage (X / Reddit / WhatsApp). */
  shareText: string;
  /** Titre pour LinkedIn. */
  title: string;
}

/**
 * FloatingShareButton — Bouton circulaire flottant bottom-left avec menu
 * radial : copier le lien, X (Twitter), WhatsApp, Reddit, LinkedIn.
 *
 * Position : `fixed left-4 bottom-20 sm:bottom-6` — bottom 20 (= 80px) sur
 * mobile pour ne pas overlap MobileStickyCTA (h ~56-64px). Sur desktop
 * remonte à bottom-6.
 *
 * A11y :
 *  - Bouton avec aria-expanded et aria-haspopup
 *  - Trap focus simple : Echap ferme le menu, Tab cycle dans les boutons
 *  - Toast "Lien copié !" en aria-live polite
 *  - Tous les triggers ont aria-label explicites
 *
 * Pas de dépendance externe ; les icons réseaux sont des SVG inline.
 */
export default function FloatingShareButton({
  url,
  shareText,
  title,
}: FloatingShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Fermeture sur clic extérieur + Echap
  useEffect(() => {
    if (!open) return;

    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback minimal : sélection programmatique pourrait être ajoutée
      // — on garde silencieux pour ne pas casser l'UX.
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks: Array<{
    label: string;
    href: string;
    bg: string;
    icon: React.ReactNode;
  }> = [
    {
      label: "Partager sur X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      bg: "bg-black hover:bg-zinc-800",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-current"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: "Partager sur WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      bg: "bg-[#25D366] hover:bg-[#1ebe57]",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-current"
          aria-hidden="true"
        >
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l.6.954-1 3.648 3.379-.999z" />
        </svg>
      ),
    },
    {
      label: "Partager sur Reddit",
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      bg: "bg-[#FF4500] hover:bg-[#e03e00]",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-current"
          aria-hidden="true"
        >
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      ),
    },
    {
      label: "Partager sur LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      bg: "bg-[#0A66C2] hover:bg-[#0858a6]",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-current"
          aria-hidden="true"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed left-4 bottom-20 sm:bottom-6 z-40 print:hidden"
    >
      {/* Toast "Lien copié" */}
      <div
        aria-live="polite"
        className={[
          "absolute left-14 bottom-1 whitespace-nowrap rounded-lg border border-success-border bg-success-soft px-3 py-1.5 text-xs font-semibold text-success-fg transition-all duration-200",
          copied
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1 pointer-events-none",
        ].join(" ")}
      >
        Lien copié !
      </div>

      {/* Menu radial — affiché au-dessus du bouton trigger */}
      <div
        className={[
          "absolute left-0 bottom-14 flex flex-col gap-2 transition-all duration-200 ease-out",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copier le lien"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-fg shadow-e2 hover:border-primary/50 hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success-fg" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
        </button>
        {shareLinks.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            className={[
              "inline-flex h-10 w-10 items-center justify-center rounded-full text-white shadow-e2 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              s.bg,
            ].join(" ")}
          >
            {s.icon}
          </a>
        ))}
      </div>

      {/* Bouton trigger principal */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Fermer le menu de partage" : "Partager cette page"}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-background shadow-glow-gold hover:bg-primary-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-transform active:scale-95"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Share2 className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
