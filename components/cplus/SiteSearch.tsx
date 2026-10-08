"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { chercherRapide, normalize, type ItemRapide } from "@/lib/search-client";

/**
 * components/cplus/SiteSearch.tsx — recherche de l'en-tête (lot B3b ; remplace CommandPalette).
 *
 * Chargée à la demande par MegaNavIsland (« / », Ctrl K, ⌘ K, focus du champ, loupe). Deux modes :
 *  - « champ » : le champ de la rangée 1 (HTML serveur, formulaire GET /recherche) devient une combobox ARIA ; la liste
 *    s'ouvre sous le champ. Sans JavaScript, le formulaire mène à /recherche?q=… (page noindex).
 *  - « dialogue » : quand le champ n'est pas visible (rangée 1 sortie de l'écran, écran de moins de 1 024 px).
 * Index court lu une fois (/api/search/rapide, route statique) : pages de la navigation, outils, plateformes autorisées,
 * fiches crypto principales, statut des plateformes, synonymes vers des pages existantes. Résultat vide : lien vers
 * /plan-du-site et vers le vérificateur MiCA.
 * Vie privée (reprise B3b, jury du 08/10/2026) : RIEN n'est envoyé, ni le texte cherché ni un compteur. À 1524eb9f,
 * EVENTS.SearchNoResults n'était qu'une constante jamais émise : il n'existait pas de point de mesure, la consigne
 * (« compter seulement si un point de mesure existe déjà ») interdit donc d'en créer un. Un texte libre peut contenir
 * une adresse de portefeuille, un nom ou une adresse postale.
 */

let indexCharge: Promise<ItemRapide[]> | null = null;
function chargerIndex(): Promise<ItemRapide[]> {
  indexCharge ??= fetch("/api/search/rapide")
    .then((r) => (r.ok ? r.json() : { items: [] }))
    .then((d: { items?: ItemRapide[] }) => d.items ?? [])
    .catch(() => {
      indexCharge = null;
      return [];
    });
  return indexCharge;
}

/** Adresse servie hors de l'application (le jeu, un flux) : navigation complète plutôt que router.push. */
const horsApp = (u: string) => u.startsWith("/cartes/jouer") || u.endsWith(".xml");

interface Props {
  mode: "champ" | "dialogue";
  onClose: () => void;
}

export default function SiteSearch({ mode, onClose }: Props) {
  const router = useRouter();
  const uid = useId().replace(/:/g, "");
  const listeId = `cr-sq-${uid}`;
  const [index, setIndex] = useState<ItemRapide[] | null>(null);
  const [requete, setRequete] = useState("");
  const [actif, setActif] = useState(-1);
  const [champ, setChamp] = useState<HTMLInputElement | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const champDialogue = useRef<HTMLInputElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const focusAvant = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let vivant = true;
    chargerIndex().then((items) => vivant && setIndex(items));
    return () => {
      vivant = false;
    };
  }, []);

  const resultats = useMemo(() => (index ? chercherRapide(index, requete) : []), [index, requete]);
  const assez = normalize(requete).length >= 2;
  const ouvert = assez && Boolean(index);

  useEffect(() => setActif(-1), [requete]);

  const aller = (u: string) => {
    onClose();
    if (horsApp(u)) window.location.assign(u);
    else router.push(u);
  };
  const toutVoir = (q: string) => `/recherche?q=${encodeURIComponent(q.trim())}`;

  const onKeyDown = (e: { key: string; preventDefault: () => void }) => {
    if (e.key === "ArrowDown" && resultats.length) {
      e.preventDefault();
      setActif((i) => (i + 1) % resultats.length);
    } else if (e.key === "ArrowUp" && resultats.length) {
      e.preventDefault();
      setActif((i) => (i <= 0 ? resultats.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (actif >= 0 && resultats[actif]) {
        e.preventDefault();
        aller(resultats[actif].u);
      } else if (mode === "dialogue" && requete.trim()) {
        e.preventDefault();
        aller(toutVoir(requete));
      } // mode champ sans choix : le formulaire GET /recherche part normalement
    } else if (e.key === "Escape" && mode === "champ") {
      // Mode dialogue : Échap est géré pour TOUT le dialogue par l'écouteur du document (plus bas).
      e.preventDefault();
      setRequete("");
      if (champ) champ.value = "";
      onClose();
    }
  };
  const onKeyDownRef = useRef(onKeyDown);
  onKeyDownRef.current = onKeyDown;

  // Mode champ : on branche le champ serveur de la rangée 1.
  useEffect(() => {
    if (mode !== "champ") return;
    const el = document.getElementById("cr-q") as HTMLInputElement | null;
    const s = document.getElementById("cr-sq-slot");
    if (!el || !s) {
      onClose();
      return;
    }
    setChamp(el);
    setSlot(s);
    setRequete(el.value);
    el.setAttribute("role", "combobox");
    el.setAttribute("aria-autocomplete", "list");
    el.setAttribute("aria-controls", listeId);
    el.setAttribute("aria-expanded", "false");
    const onInput = () => setRequete(el.value);
    const onKey = (e: KeyboardEvent) => onKeyDownRef.current(e);
    const onBlur = (e: FocusEvent) => {
      const vers = e.relatedTarget as Node | null;
      if (vers && s.contains(vers)) return;
      onClose();
    };
    el.addEventListener("input", onInput);
    el.addEventListener("keydown", onKey);
    el.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("input", onInput);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("blur", onBlur);
      el.setAttribute("aria-expanded", "false");
      el.removeAttribute("aria-activedescendant");
    };
  }, [mode, listeId, onClose]);

  // État ARIA du champ serveur.
  useEffect(() => {
    if (!champ) return;
    champ.setAttribute("aria-expanded", ouvert && resultats.length > 0 ? "true" : "false");
    if (actif >= 0) champ.setAttribute("aria-activedescendant", `${listeId}-${actif}`);
    else champ.removeAttribute("aria-activedescendant");
  }, [champ, ouvert, resultats.length, actif, listeId]);

  // Mode dialogue : focus, piège à focus, Échap (où que soit le focus dans le dialogue), retour du focus.
  function fermerDialogue() {
    onClose();
    focusAvant.current?.focus?.();
  }
  const fermerDialogueRef = useRef(fermerDialogue);
  fermerDialogueRef.current = fermerDialogue;
  useEffect(() => {
    if (mode !== "dialogue") return;
    focusAvant.current = document.activeElement as HTMLElement | null;
    champDialogue.current?.focus();
    document.body.classList.add("modal-open");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        fermerDialogueRef.current();
        return;
      }
      if (e.key !== "Tab" || !panneau.current) return;
      const f = Array.from(panneau.current.querySelectorAll<HTMLElement>("input, button, a[href]:not([tabindex='-1'])"));
      if (!f.length) return;
      const premier = f[0];
      const dernier = f[f.length - 1];
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [mode]);

  const statut = !assez ? "" : !index ? "Chargement…" : resultats.length ? `${resultats.length} résultat${resultats.length > 1 ? "s" : ""}` : "Aucun résultat";

  const liste = ouvert ? (
    <div className="cr-sq" onMouseDown={(e) => e.preventDefault()}>
      {resultats.length > 0 ? (
        <>
          <ul className="cr-sq-list" role="listbox" id={listeId} aria-label="Suggestions de recherche">
            {resultats.map((r, i) => (
              <li key={r.u} id={`${listeId}-${i}`} className="cr-sq-o" role="option" aria-selected={i === actif}>
                <a
                  className="cr-sq-a"
                  href={r.u}
                  tabIndex={-1}
                  onClick={(e) => {
                    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                    e.preventDefault();
                    aller(r.u);
                  }}
                >
                  {r.t}
                  <span className="cr-sq-tag">{r.tag}</span>
                  {r.p ? <span className="cr-pp">{r.p}</span> : null}
                </a>
              </li>
            ))}
          </ul>
          <p className="cr-sq-plus">
            <a href={toutVoir(requete)} tabIndex={-1}>Tous les résultats, articles compris</a>
          </p>
        </>
      ) : (
        <p className="cr-sq-vide">
          Aucun résultat pour «&nbsp;{requete.trim()}&nbsp;». <a href="/plan-du-site">Voir toutes les pages, rangées par rubrique</a>,{" "}
          <a href={toutVoir(requete)}>chercher dans les articles</a>, ou, pour une plateforme,{" "}
          <a href="/outils/verificateur-mica">vérifier son statut en France</a>.
        </p>
      )}
    </div>
  ) : null;

  const annonce = (
    <p className="cr-sr" aria-live="polite">
      {statut}
    </p>
  );

  if (mode === "champ") {
    if (!slot) return null;
    return createPortal(
      <>
        {liste}
        {annonce}
      </>,
      slot,
    );
  }

  return createPortal(
    <div className="cr-sdlg">
      <div className="cr-sdlg-scrim" onClick={fermerDialogue} />
      <div className="cr-sdlg-panel" role="dialog" aria-modal="true" aria-labelledby={`${uid}-t`} ref={panneau}>
        <div className="cr-sdlg-top">
          <p className="cr-sdlg-t" id={`${uid}-t`}>Rechercher sur Cryptoreflex</p>
          <button className="cr-btn cr-espace" type="button" onClick={fermerDialogue} aria-label="Fermer la recherche">
            <X aria-hidden="true" strokeWidth={1.75} />
          </button>
        </div>
        <form
          className="cr-search"
          role="search"
          action="/recherche"
          method="get"
          onSubmit={(e) => {
            e.preventDefault();
            if (requete.trim()) aller(toutVoir(requete));
          }}
        >
          <label className="cr-sr" htmlFor={`${uid}-q`}>Rechercher une crypto, un outil, un mot</label>
          <Search className="cr-search-ico" aria-hidden="true" strokeWidth={1.75} />
          <input
            ref={champDialogue}
            className="cr-search-in"
            id={`${uid}-q`}
            name="q"
            type="search"
            placeholder="Rechercher"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={80}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listeId}
            aria-expanded={ouvert && resultats.length > 0}
            aria-activedescendant={actif >= 0 ? `${listeId}-${actif}` : undefined}
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ paddingRight: 16 }}
          />
        </form>
        {liste}
        {annonce}
      </div>
    </div>,
    document.body,
  );
}
