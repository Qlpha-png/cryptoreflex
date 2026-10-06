"use client";

/**
 * Comparateur de plateformes (refonte du 05/10/2026, objectif de Kev : beau, fluide, simple, qu'un enfant de 8 ans s'y
 * retrouve). Deux questions, une liste classée avec UN chiffre lisible (le coût en euros), un panier « Comparer ».
 * Calculs : lib/comparateur.ts (testés). L'état (montant, objectif) est gardé dans l'adresse pour le partage.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Coins, CreditCard, ExternalLink, Flag, Info, Phone, MessageCircle, Plus, Sprout, X } from "lucide-react";
import PlatformLogo from "@/components/PlatformLogo";
import { costLabel, rowCost, sortRows, type Amount, type Goal, type Row } from "@/lib/comparateur";
import { outboundRel } from "@/lib/partnerships";

const GOALS: { id: Goal; label: string; hint: string; Icon: typeof Coins }[] = [
  { id: "prix", label: "Le moins cher", hint: "Classées du moins cher au plus cher", Icon: Coins },
  { id: "debutant", label: "Je débute", hint: "Aide en français et appli simple d'abord", Icon: Sprout },
  { id: "francais", label: "Français", hint: "Agréées par l'AMF, le gendarme français", Icon: Flag },
  { id: "carte", label: "Je paie par carte", hint: "Le prix d'un achat payé par carte bancaire", Icon: CreditCard },
];
const AMOUNTS: Amount[] = [100, 1000];
const MAX_COMPARE = 3;
/* les 8 premières d'abord : la liste complète tenait 12 écrans sur téléphone */
const FIRST = 8;

const fmtDate = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default function Comparateur({ rows, duelSlugs }: { rows: Row[]; duelSlugs: string[] }) {
  const [amount, setAmount] = useState<Amount>(100);
  const [goal, setGoal] = useState<Goal>("prix");
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  /* état lu depuis l'adresse (?montant=1000&objectif=carte) puis réécrit à chaque choix */
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const m = Number(q.get("montant"));
      if (m === 100 || m === 1000) setAmount(m);
      const o = q.get("objectif");
      if (o && GOALS.some((g) => g.id === o)) setGoal(o as Goal);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      q.set("montant", String(amount));
      q.set("objectif", goal);
      window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}${window.location.hash}`);
    } catch {}
  }, [amount, goal]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const list = useMemo(() => sortRows(rows, amount, goal), [rows, amount, goal]);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const chosen = picked.map((id) => byId.get(id)).filter((r): r is Row => !!r);
  const g = GOALS.find((x) => x.id === goal)!;
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_COMPARE ? p : [...p, id]));
  const duel =
    chosen.length === 2
      ? [`${chosen[0].id}-vs-${chosen[1].id}`, `${chosen[1].id}-vs-${chosen[0].id}`].find((s) => duelSlugs.includes(s))
      : undefined;

  return (
    <div>
      {/* 1. les deux questions */}
      <div className="rounded-3xl border border-border bg-surface p-4 sm:p-6 shadow-e2">
        <fieldset>
          <legend className="text-sm font-bold text-fg">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-background">1</span>
            Combien voulez-vous mettre ?
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-sm" role="group" aria-label="Montant de l'achat">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={amount === a}
                onClick={() => setAmount(a)}
                className={`min-h-tap rounded-2xl border-2 px-4 py-3 text-lg font-extrabold tabular-nums transition-colors motion-reduce:transition-none ${
                  amount === a ? "border-primary bg-primary/15 text-fg" : "border-border bg-background text-fg/70 hover:border-primary/50"
                }`}
              >
                {a.toLocaleString("fr-FR").replace(/ /g, " ")} €
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-fg">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-background">2</span>
            Qu&apos;est-ce qui compte pour vous ?
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4" role="group" aria-label="Ce qui compte pour vous">
            {GOALS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={goal === id}
                onClick={() => setGoal(id)}
                className={`min-h-tap flex items-center gap-2 rounded-2xl border-2 px-3 py-3 text-left text-sm font-bold transition-colors motion-reduce:transition-none ${
                  goal === id ? "border-primary bg-primary/15 text-fg" : "border-border bg-background text-fg/75 hover:border-primary/50"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${goal === id ? "text-primary" : "text-muted"}`} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* 2. le classement */}
      <p className="mt-6 text-sm text-fg/70" aria-live="polite">
        <strong className="text-fg">
          {list.length} plateforme{list.length > 1 ? "s" : ""} {goal === "francais" ? "agréées en France par l'AMF" : "autorisées en France"}
        </strong>
        {goal === "debutant" ? ", aide en français et appli simple d'abord. " : ", de la moins chère à la plus chère. "}
        Prix d&apos;un achat de <strong className="text-fg">{amount.toLocaleString("fr-FR").replace(/ /g, " ")} €</strong>
        {goal === "carte" ? " payé par carte." : " après un virement."}
      </p>

      <ol className={`mt-3 space-y-3 ${chosen.length ? "pb-28 md:pb-24" : ""}`}>
        {(showAll ? list : list.slice(0, FIRST)).map((r, i) => {
          const c = rowCost(r, amount, goal === "carte" ? "carte" : "prix");
          const card = rowCost(r, amount, "carte");
          const on = picked.includes(r.id);
          const full = !on && picked.length >= MAX_COMPARE;
          return (
            <li
              key={r.id}
              className={`rounded-2xl border bg-surface p-4 transition-colors motion-reduce:transition-none ${on ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
            >
              <div className="grid grid-cols-[auto,1fr] items-center gap-x-3 gap-y-3 md:grid-cols-[auto,minmax(0,1.6fr),minmax(0,1fr),auto]">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold tabular-nums ${
                    i < 3 ? "bg-primary text-background" : "bg-elevated text-fg/70"
                  }`}
                >
                  <span className="sr-only">Rang </span>
                  {i + 1}
                </span>
                <div className="flex min-w-0 items-center gap-3">
                  <PlatformLogo id={r.id} name={r.name} size={40} />
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-extrabold text-fg">{r.name}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg/65">
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent-green/30 bg-accent-green/10 px-2 py-0.5 font-semibold text-accent-green">
                        <Check className="h-3 w-3" aria-hidden="true" /> {r.french ? "Agréée par l'AMF" : `Agréée MiCA · ${r.country}`}
                      </span>
                      {r.supportFr !== "non" && (
                        <span className="inline-flex items-center gap-1">
                          {r.supportFr === "telephone" ? <Phone className="h-3 w-3" aria-hidden="true" /> : <MessageCircle className="h-3 w-3" aria-hidden="true" />}
                          Aide en français
                        </span>
                      )}
                      <span>Note {r.score.toLocaleString("fr-FR")}/5</span>
                    </p>
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  {c ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        {costLabel(c).prefix && <span className="text-xs font-semibold text-fg/60">{costLabel(c).prefix}</span>}
                        <span className={`${c.fee == null ? "text-lg" : "text-2xl"} font-extrabold tabular-nums text-fg`}>{costLabel(c).main}</span>
                        {c.fee != null && <span className="text-xs text-fg/60">de frais</span>}
                      </div>
                      {costLabel(c).suffix && <p className="mt-0.5 text-xs font-semibold text-amber-300">{costLabel(c).suffix}</p>}
                      {goal !== "carte" && (
                        <p className="mt-0.5 text-xs text-fg/55">{card ? `Par carte : ${cell(card)}` : "Pas d'achat par carte"}</p>
                      )}
                      {r.note && <p className="mt-1 text-xs leading-snug text-fg/55">{r.note}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-fg/60">Pas d&apos;achat par carte</p>
                  )}
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    disabled={full}
                    aria-pressed={on}
                    className={`min-h-tap inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      on ? "border-primary bg-primary/15 text-fg" : "border-border text-fg/80 hover:border-primary/50"
                    }`}
                    title={full ? `${MAX_COMPARE} plateformes au maximum` : undefined}
                  >
                    {on ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                    Comparer
                  </button>
                  <Link
                    href={`/avis/${r.id}`}
                    className="min-h-tap inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-extrabold text-background hover:bg-primary-glow"
                  >
                    Voir l&apos;avis <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Frais vérifiés le {fmtDate(r.verifiedDate)}
                {r.source ? (
                  <>
                    {" "}·{" "}
                    <a href={r.source} target="_blank" rel="nofollow noopener noreferrer" className="underline hover:text-fg">
                      source
                    </a>
                  </>
                ) : null}
                {" "}·{" "}
                <a
                  href={r.affiliateUrl}
                  target="_blank"
                  rel={outboundRel(r.id, r.affiliateUrl)}
                  className="inline-flex items-center gap-0.5 underline hover:text-fg"
                >
                  site officiel <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                {r.affiliationNotice ? ` (${r.affiliationNotice})` : ""}
              </p>
            </li>
          );
        })}
      </ol>
      {!showAll && list.length > FIRST && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 min-h-tap w-full rounded-2xl border-2 border-dashed border-border px-4 py-3 text-sm font-bold text-fg/80 hover:border-primary/50 hover:text-fg"
        >
          Voir les {list.length - FIRST} autres plateformes
        </button>
      )}

      {/* 3. le panier « Comparer » */}
      {chosen.length > 0 && (
        <div className="fixed inset-x-0 z-40 bottom-[calc(64px+env(safe-area-inset-bottom))] px-3 md:bottom-4 md:px-6">
          <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-primary/50 bg-background/95 p-3 shadow-e3 backdrop-blur">
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {chosen.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-fg">
                  {r.name}
                  <button type="button" onClick={() => toggle(r.id)} aria-label={`Retirer ${r.name}`} className="text-muted hover:text-fg">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {chosen.length === 1 && <span className="self-center text-xs text-muted">Ajoutez-en une autre</span>}
            </div>
            <button
              type="button"
              disabled={chosen.length < 2}
              onClick={() => setOpen(true)}
              className="btn-primary shrink-0 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Comparer {chosen.length > 1 ? `(${chosen.length})` : ""}
            </button>
          </div>
        </div>
      )}

      {/* 4. la comparaison côte à côte */}
      {open && chosen.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpen(false)}>
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Comparaison côte à côte"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-border bg-surface p-4 outline-none sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-fg">Côte à côte</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border p-2 text-fg/80 hover:text-fg" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr>
                    <th className="w-36 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted"> </th>
                    {chosen.map((r) => (
                      <th key={r.id} className="py-2 text-left">
                        <span className="inline-flex items-center gap-2 font-extrabold text-fg">
                          <PlatformLogo id={r.id} name={r.name} size={28} /> {r.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["Achat de 100 €", (r: Row) => cell(rowCost(r, 100, "prix"))],
                    ["Achat de 1 000 €", (r: Row) => cell(rowCost(r, 1000, "prix"))],
                    ["100 € par carte", (r: Row) => cell(rowCost(r, 100, "carte"))],
                    ["Agrément", (r: Row) => (r.french ? "AMF (France)" : r.authority)],
                    ["Aide en français", (r: Row) => (r.supportFr === "telephone" ? "Téléphone et chat" : r.supportFr === "chat" ? "Chat" : "Non")],
                    ["Note Cryptoreflex", (r: Row) => `${r.score.toLocaleString("fr-FR")}/5`],
                    ["Frais vérifiés le", (r: Row) => fmtDate(r.verifiedDate)],
                  ].map(([label, fn]) => (
                    <tr key={label as string}>
                      <th scope="row" className="py-2.5 pr-3 text-left text-xs font-semibold text-fg/70">{label as string}</th>
                      {chosen.map((r) => (
                        <td key={r.id} className="py-2.5 pr-3 font-semibold tabular-nums text-fg">{(fn as (r: Row) => string)(r)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {duel && (
                <Link href={`/comparatif/${duel}`} className="btn-primary px-4 py-2 text-sm">
                  Lire le duel détaillé <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {chosen.map((r) => (
                <Link key={r.id} href={`/avis/${r.id}`} className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-fg/85 hover:border-primary/50">
                  Avis {r.name}
                </Link>
              ))}
            </div>
            <p className="mt-4 flex items-start gap-1.5 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              « au plus » : la plateforme publie un maximum pour sa marge, compté ici. « + marge » : elle ajoute une marge au prix
              sans la chiffrer, le montant affiché est donc un minimum. « Non publié » : la plateforme ne chiffre pas ce coût.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function cell(c: ReturnType<typeof rowCost>): string {
  if (!c) return "Pas de carte";
  if (c.fee == null) return "Non publié";
  const l = costLabel(c);
  return `${l.prefix ? l.prefix + " " : ""}${l.main}${c.kind === "partiel" ? " + marge" : ""}`;
}
