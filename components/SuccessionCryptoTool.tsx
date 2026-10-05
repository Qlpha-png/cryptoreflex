"use client";

/**
 * <SuccessionCryptoTool /> — générateur de lettre d'intention + liste de contrôle (outil Succession crypto).
 *
 * Tout reste dans le navigateur : aucun appel réseau, aucun stockage (ni localStorage, ni cookie). Une phrase de
 * récupération ou une clé privée repérée dans un champ — ou répartie entre plusieurs champs — bloque l'impression,
 * la copie et le téléchargement (lib/succession-crypto.ts, findSecret / secretFindings).
 * Revue du 05/10/2026 : correcteurs orthographiques et remplissage automatique coupés sur tous les champs (un
 * correcteur « avancé » envoie le texte à un serveur), date calculée après le montage (sinon erreur d'hydratation
 * sur une page ISR), zone masquée pour les outils d'analyse de session.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  ACCESS_METHODS,
  SECURITY_CHECKLIST,
  WALLET_KINDS,
  buildLetter,
  findSecret,
  secretFindings,
  type AccessMethod,
  type SuccessionInput,
  type WalletEntry,
  type WalletKind,
  type WillStatus,
} from "@/lib/succession-crypto";

const MAX_WALLETS = 30;
const INPUT =
  "mt-1.5 w-full rounded-lg border border-border bg-elevated/60 px-3 py-2 text-sm text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-primary";

/** Attributs posés sur chaque champ libre : rien ne doit partir vers un correcteur ou un gestionnaire de saisie. */
const PRIVATE_FIELD = {
  spellCheck: false,
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  "data-gramm": "false",
  "data-gramm_editor": "false",
  "data-enable-grammarly": "false",
} as const;

function todayLabel(): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function SecretWarning({ kind, id }: { kind: ReturnType<typeof findSecret>; id: string }) {
  if (!kind) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-danger-fg">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      {kind === "phrase"
        ? "Cela ressemble à une phrase de récupération : effacez-la. Elle ne doit jamais figurer dans cette lettre."
        : "Cela ressemble à une clé privée : effacez-la. Elle ne doit jamais figurer dans cette lettre."}
    </p>
  );
}

/** Champ texte (ou zone de texte) avec son libellé, contrôlé par findSecret ; l'alerte est hors du libellé. */
function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength,
  rows,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength: number;
  rows?: number;
}) {
  const id = useId();
  const warnId = `${id}-alerte`;
  const kind = findSecret(value); // une seule détection par champ et par frappe
  const flagged = kind !== null;
  const common = {
    id,
    value,
    maxLength,
    placeholder,
    className: INPUT,
    "aria-invalid": flagged || undefined,
    "aria-describedby": flagged ? warnId : undefined,
    ...PRIVATE_FIELD,
  };
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-fg">
        {label} {hint && <span className="font-normal text-fg/60">{hint}</span>}
      </label>
      {rows ? (
        <textarea {...common} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type="text" onChange={(e) => onChange(e.target.value)} />
      )}
      <SecretWarning kind={kind} id={warnId} />
    </div>
  );
}

export default function SuccessionCryptoTool() {
  const nextId = useRef(2);
  const [ownerName, setOwnerName] = useState("");
  const [wallets, setWallets] = useState<WalletEntry[]>([
    { id: "w1", kind: "plateforme", name: "", assets: "", access: "" },
  ]);
  const [method, setMethod] = useState<AccessMethod>("notaire");
  const [methodDetail, setMethodDetail] = useState("");
  const [notary, setNotary] = useState("");
  const [trustedPerson, setTrustedPerson] = useState("");
  const [will, setWill] = useState<WillStatus>("non");
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState<boolean[]>(() => SECURITY_CHECKLIST.map(() => false));
  const [status, setStatus] = useState("");
  // Date du jour calculée dans le navigateur, après le montage : la page est générée à l'avance (ISR) et la date
  // du serveur ne correspond pas forcément à celle du visiteur.
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => setDateLabel(todayLabel()), []);

  const input = useMemo<SuccessionInput>(
    () => ({ ownerName, wallets, method, methodDetail, notary, trustedPerson, will, message }),
    [ownerName, wallets, method, methodDetail, notary, trustedPerson, will, message],
  );
  const findings = useMemo(() => secretFindings(input), [input]);
  const letter = useMemo(() => buildLetter(input, dateLabel || "______________"), [input, dateLabel]);
  const blocked = findings.length > 0;

  function updateWallet(id: string, patch: Partial<WalletEntry>) {
    setWallets((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }
  function addWallet() {
    setWallets((ws) =>
      ws.length >= MAX_WALLETS
        ? ws
        : [...ws, { id: `w${nextId.current++}`, kind: "plateforme", name: "", assets: "", access: "" }],
    );
  }
  function removeWallet(id: string) {
    setWallets((ws) => (ws.length <= 1 ? ws : ws.filter((w) => w.id !== id)));
  }

  function flash(msg: string) {
    setStatus(msg);
    window.setTimeout(() => setStatus(""), 4000);
  }

  function printLetter() {
    if (blocked) return;
    const w = window.open("", "_blank");
    if (!w) {
      flash("La fenêtre d'impression a été bloquée par le navigateur : autorisez les fenêtres pour ce site, ou utilisez « Télécharger ».");
      return;
    }
    w.document.write(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Lettre d'intention — crypto-actifs</title>` +
        `<style>body{font:14px/1.6 Georgia,serif;color:#111;margin:40px auto;max-width:720px;padding:0 24px}` +
        `pre{white-space:pre-wrap;font:inherit}</style></head><body><pre>${escapeHtml(letter)}</pre></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  async function copyLetter() {
    if (blocked) return;
    try {
      await navigator.clipboard.writeText(letter);
      flash("Lettre copiée.");
    } catch {
      flash("Copie impossible dans ce navigateur : utilisez « Télécharger » ou sélectionnez le texte de l'aperçu.");
    }
  }

  function downloadLetter() {
    if (blocked) return;
    const url = URL.createObjectURL(new Blob([letter], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "lettre-intention-crypto.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  const done = checked.filter(Boolean).length;

  return (
    <div className="space-y-8" data-clarity-mask="true">
      <div
        role="note"
        className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-fg/85 flex gap-3"
      >
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary-soft mt-0.5" aria-hidden="true" />
        <p>
          <strong className="text-fg">Rien n&apos;est envoyé ni enregistré.</strong> Tout se passe dans votre
          navigateur : fermez la page et tout disparaît. N&apos;écrivez <strong>jamais</strong> de phrase de
          récupération, de mot de passe ni de code PIN. L&apos;outil repère les phrases de récupération écrites en
          anglais (listes BIP39 et SLIP-39, celles des Ledger, Trezor, MetaMask…) et les clés privées les plus
          courantes, et bloque alors la lettre ; il ne peut pas reconnaître un mot de passe.
        </p>
      </div>

      {/* 1. Inventaire */}
      <section aria-labelledby="succ-inventaire" className="rounded-2xl border border-border bg-elevated/40 p-5">
        <h3 id="succ-inventaire" className="text-lg font-bold text-fg">1. Ce que vous possédez</h3>
        <p className="mt-1 text-sm text-fg/70">
          Une ligne par plateforme ou portefeuille. Dans « Pour y accéder », indiquez <em>où</em> trouver
          l&apos;accès (enveloppe, coffre…), jamais le secret lui-même.
        </p>
        <div className="mt-4 space-y-4">
          {wallets.map((w, i) => (
            <fieldset key={w.id} className="rounded-xl border border-border/70 bg-surface/60 p-4">
              <legend className="px-1 text-xs font-bold uppercase tracking-wider text-primary-soft">
                Portefeuille {i + 1}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-fg">
                  Type
                  <select
                    value={w.kind}
                    onChange={(e) => updateWallet(w.id, { kind: e.target.value as WalletKind })}
                    className={INPUT}
                  >
                    {(Object.keys(WALLET_KINDS) as WalletKind[]).map((k) => (
                      <option key={k} value={k}>
                        {WALLET_KINDS[k].label}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Nom"
                  value={w.name}
                  maxLength={80}
                  placeholder={WALLET_KINDS[w.kind].example}
                  onChange={(v) => updateWallet(w.id, { name: v })}
                />
                <Field
                  label="Cryptos détenues"
                  value={w.assets}
                  maxLength={160}
                  placeholder="BTC, ETH…"
                  onChange={(v) => updateWallet(w.id, { assets: v })}
                />
                <Field
                  label="Pour y accéder"
                  value={w.access}
                  maxLength={240}
                  placeholder="Ex. code PIN dans l'enveloppe du notaire"
                  onChange={(v) => updateWallet(w.id, { access: v })}
                />
              </div>
              {wallets.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWallet(w.id)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-fg/60 hover:text-danger-fg"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Retirer ce portefeuille
                </button>
              )}
            </fieldset>
          ))}
        </div>
        {wallets.length < MAX_WALLETS && (
          <button type="button" onClick={addWallet} className="btn-ghost mt-4 inline-flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter un portefeuille
          </button>
        )}
      </section>

      {/* 2. Méthode d'accès */}
      <section aria-labelledby="succ-methode" className="rounded-2xl border border-border bg-elevated/40 p-5">
        <h3 id="succ-methode" className="text-lg font-bold text-fg">2. Comment vos proches accéderont aux fonds</h3>
        <div className="mt-4 grid gap-3" role="radiogroup" aria-labelledby="succ-methode">
          {(Object.keys(ACCESS_METHODS) as AccessMethod[]).map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                method === m ? "border-primary/60 bg-primary/10" : "border-border bg-surface/60 hover:border-primary/30"
              }`}
            >
              <input
                type="radio"
                name="succ-method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
                aria-describedby={`succ-method-${m}`}
                className="mt-1 accent-primary"
              />
              <span>
                <span className="block text-sm font-bold text-fg">{ACCESS_METHODS[m].label}</span>
                <span id={`succ-method-${m}`} className="mt-0.5 block text-xs text-fg/70 leading-relaxed">
                  {ACCESS_METHODS[m].explain}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <Field
            label={ACCESS_METHODS[method].detailLabel}
            value={methodDetail}
            maxLength={600}
            rows={2}
            onChange={setMethodDetail}
          />
        </div>
      </section>

      {/* 3. Contacts */}
      <section aria-labelledby="succ-contacts" className="rounded-2xl border border-border bg-elevated/40 p-5">
        <h3 id="succ-contacts" className="text-lg font-bold text-fg">3. Qui vos proches doivent contacter</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Votre nom" value={ownerName} maxLength={120} onChange={setOwnerName} />
          <Field
            label="Notaire (nom, ville)"
            value={notary}
            maxLength={160}
            placeholder="Ex. Maître Durand, Nantes"
            onChange={setNotary}
          />
          <Field
            label="Personne de confiance (nom, lien)"
            value={trustedPerson}
            maxLength={160}
            placeholder="Ex. Claire, ma sœur"
            onChange={setTrustedPerson}
          />
          <label className="block text-sm font-semibold text-fg">
            Avez-vous un testament ?
            <select value={will} onChange={(e) => setWill(e.target.value as WillStatus)} className={INPUT}>
              <option value="oui">Oui</option>
              <option value="en-cours">En cours de rédaction</option>
              <option value="non">Pas encore</option>
            </select>
          </label>
        </div>
        <div className="mt-3">
          <Field
            label="Message à vos proches"
            hint="(facultatif)"
            value={message}
            maxLength={2000}
            rows={3}
            onChange={setMessage}
          />
        </div>
      </section>

      {/* 4. Lettre */}
      <section aria-labelledby="succ-lettre" className="rounded-2xl border border-primary/30 bg-surface p-5">
        <h3 id="succ-lettre" className="text-lg font-bold text-fg">4. Votre lettre d&apos;intention</h3>
        <p className="mt-1 text-sm text-fg/70">
          Imprimez-la, signez-la et rangez-la avec votre testament (ou remettez-la à votre notaire). Elle se met à
          jour pendant que vous remplissez.
        </p>
        {blocked && (
          <div role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-fg/90">
            <p className="flex items-center gap-2 font-bold text-danger-fg">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Lettre bloquée : un secret a été repéré
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-0.5">
              {findings.map((f) => (
                <li key={f.field}>
                  {f.field} : {f.kind === "phrase" ? "phrase de récupération" : "clé privée"} à effacer
                </li>
              ))}
            </ul>
          </div>
        )}
        <pre
          role="region"
          aria-label="Aperçu de la lettre"
          className={`mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-elevated/40 p-4 text-[13px] leading-relaxed text-fg/90 ${
            blocked ? "blur-sm select-none" : ""
          }`}
        >
          {blocked ? "Effacez le secret repéré pour afficher la lettre." : letter}
        </pre>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={printLetter} disabled={blocked} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Printer className="h-4 w-4" aria-hidden="true" /> Imprimer ou enregistrer en PDF
          </button>
          <button type="button" onClick={copyLetter} disabled={blocked} className="btn-ghost inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Copy className="h-4 w-4" aria-hidden="true" /> Copier le texte
          </button>
          <button type="button" onClick={downloadLetter} disabled={blocked} className="btn-ghost inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Download className="h-4 w-4" aria-hidden="true" /> Télécharger (.txt)
          </button>
        </div>
        <p role="status" aria-live="polite" className="mt-3 min-h-[1.25rem] text-sm text-fg/80">
          {status}
        </p>
      </section>

      {/* 5. Liste de contrôle */}
      <section aria-labelledby="succ-checklist" className="rounded-2xl border border-border bg-elevated/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="succ-checklist" className="text-lg font-bold text-fg">5. Liste de contrôle</h3>
          <span className="text-sm font-semibold text-primary-soft" aria-live="polite">
            {done} / {SECURITY_CHECKLIST.length}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {SECURITY_CHECKLIST.map((item, i) => (
            <li key={item}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 text-sm text-fg/85 hover:bg-surface/60">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={(e) => setChecked((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className={checked[i] ? "text-fg/60 line-through" : ""}>{item}</span>
              </label>
            </li>
          ))}
        </ul>
        {done === SECURITY_CHECKLIST.length && (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success-fg">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Tout est en ordre. Pensez à relire votre lettre une fois par an.
          </p>
        )}
      </section>
    </div>
  );
}
