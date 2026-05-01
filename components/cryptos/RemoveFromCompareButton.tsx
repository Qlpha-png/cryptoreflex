"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { X } from "lucide-react";
import { useCompareList } from "@/lib/use-compare-list";

interface Props {
  slug: string;
  cryptoName: string;
}

/**
 * RemoveFromCompareButton — petit X dans l'en-tête de chaque colonne du
 * comparatif. Retire la crypto à la fois :
 *   1. du localStorage (via le hook),
 *   2. de l'URL `?ids=` (refresh server-side avec router.replace).
 *
 * Si la liste finale tombe sous 2 cryptos, on redirige vers `/cryptos`
 * (cohérent avec le redirect server-side de la page parente).
 */
export default function RemoveFromCompareButton({ slug, cryptoName }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const { remove } = useCompareList();

  const onClick = useCallback(() => {
    remove(slug);

    const current = (params.get("ids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = current.filter((s) => s !== slug);

    if (next.length < 2) {
      router.push("/cryptos");
      return;
    }
    router.replace(`/cryptos/comparer?ids=${next.join(",")}`);
  }, [params, remove, router, slug]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Retirer ${cryptoName} du comparatif`}
      title={`Retirer ${cryptoName} du comparatif`}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted hover:border-accent-rose/50 hover:text-accent-rose hover:bg-accent-rose/5 transition-colors"
    >
      <X className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}
