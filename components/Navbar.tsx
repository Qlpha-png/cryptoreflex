"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Bitcoin, Sparkles } from "lucide-react";

const NAV = [
  { href: "/#marche", label: "Marché" },
  { href: "/#top10", label: "Top 10" },
  { href: "/#hidden-gems", label: "Hidden gems" },
  { href: "/#plateformes", label: "Plateformes" },
  { href: "/blog", label: "Blog" },
  { href: "/outils", label: "Outils" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-cyan shadow-glow">
              <Bitcoin className="h-5 w-5 text-white" />
            </span>
            <span className="font-bold text-lg tracking-tight">
              Crypto<span className="gradient-text">reflex</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-white/80 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/#plateformes" className="btn-primary text-sm py-2">
              <Sparkles className="h-4 w-4" />
              Commencer
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-white/80"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4 space-y-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-white/80 hover:bg-elevated"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/#plateformes" className="btn-primary w-full text-sm py-2">
              <Sparkles className="h-4 w-4" />
              Commencer
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
