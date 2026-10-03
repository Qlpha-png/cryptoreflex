/*
 * Reflex Cards — installation sur l'écran d'accueil et notifications (la PWA du jeu).
 * Chargé par la page /cartes/jouer (balises injectées par lib/reflex-cards/game.ts : le gabarit du jeu, généré ailleurs,
 * n'est pas modifié). Vanilla, sans dépendance, tout en option : navigateur ancien ou stockage bloqué → rien ne se passe.
 *
 *  - service worker du site (/sw.js) enregistré depuis le jeu (data-sw="1" : production seulement) ;
 *  - bannière « Installer » : invite Android/Chrome (beforeinstallprompt) ; pas-à-pas sur iPhone (Safari n'a pas d'invite) ;
 *  - une fois installé (ou, sur Android et ordinateur, même dans le navigateur) : « Activer les notifications » → Web Push
 *    (/api/push/vapid-key puis /api/push/subscribe, sujet « cartes » AJOUTÉ aux sujets déjà choisis sur /mon-compte) ;
 *  - window.ReflexPWA : install(), enableNotifications(), isStandalone(), canInstall(), show() — pour un futur bouton du jeu.
 * Mémoire locale (rc9:pwa:*) : seulement des préférences (report, notifications activées), jamais la partie.
 * Version : lib/reflex-cards/pwa.ts (PWA_SCRIPT_VERSION), à monter à chaque modification (cache du service worker).
 */
(function () {
  "use strict";
  var me = document.currentScript;
  var SW_ON = !!(me && me.getAttribute("data-sw") === "1");
  var TOPIC = "cartes";
  var K = { snooze: "rc9:pwa:snooze", push: "rc9:pwa:push", installed: "rc9:pwa:installed" };
  var DAY = 86400000;
  var mem = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* stockage bloqué : sans gravité */ } }
  };
  var ua = navigator.userAgent || "";
  var iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  /* navigateurs intégrés (Gmail, Instagram, Facebook…) : pas de « Sur l'écran d'accueil » → on ne propose rien */
  var inApp = /FBAN|FBAV|Instagram|Line\/|GSA\/|Gmail|Snapchat|; wv\)/i.test(ua);

  function standalone() {
    try { return navigator.standalone === true || (!!window.matchMedia && matchMedia("(display-mode: standalone)").matches); } catch (e) { return false; }
  }
  function pushSupported() {
    return SW_ON && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && (!iOS || standalone());
  }
  function say(m) {
    try { if (typeof toast === "function") { toast(m); return; } } catch (e) { /* le jeu n'a pas (encore) son toast */ }
    try { console.info("[Reflex Cards] " + m); } catch (e) { /* rien */ }
  }
  function snoozed() { return Number(mem.get(K.snooze) || 0) > Date.now(); }
  function snooze(days) { mem.set(K.snooze, Date.now() + days * DAY); }

  /* ---------- service worker ---------- */
  var regP = null;
  function sw() {
    if (regP) return regP;
    if (!SW_ON || !("serviceWorker" in navigator)) return (regP = Promise.resolve(null));
    regP = navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(function () { return null; });
    return regP;
  }

  /* ---------- installation ---------- */
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener("appinstalled", function () {
    mem.set(K.installed, "1"); deferred = null; hide();
    say("Reflex Cards est sur votre écran d'accueil.");
  });
  function install() {
    if (!deferred) return Promise.resolve(false);
    var p = deferred; deferred = null;
    return p.prompt().then(function () { return p.userChoice; })
      .then(function (c) { return !!(c && c.outcome === "accepted"); })
      .catch(function () { return false; });
  }

  /* ---------- notifications ---------- */
  function b64(s) {
    var pad = "=".repeat((4 - (s.length % 4)) % 4);
    var raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function enableNotifications() {
    if (!pushSupported()) return Promise.reject(new Error(iOS ? "ios" : "unsupported"));
    return Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") throw new Error("denied");
      return sw();
    }).then(function (reg) {
      if (!reg) throw new Error("sw");
      return reg.pushManager.getSubscription().then(function (sub) {
        if (sub) return sub;
        return fetch("/api/push/vapid-key", { credentials: "same-origin" })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            if (!d || !d.ok || !d.publicKey) throw new Error("sw");
            return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(d.publicKey) });
          });
      });
    }).then(function (sub) {
      var j = sub.toJSON();
      return fetch("/api/push/subscribe", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys, topics: [TOPIC], merge: true })
      });
    }).then(function (res) {
      /* pas connecté : la route renvoie vers la page de connexion (HTML) */
      if (res.redirected || (res.headers.get("content-type") || "").indexOf("application/json") < 0) throw new Error("login");
      return res.json().then(function (d) {
        if (!res.ok || !d || !d.ok) throw new Error((d && d.error) || "server");
        mem.set(K.push, "on");
        return true;
      });
    });
  }
  var ERR = {
    denied: "Notifications refusées par le navigateur : réactivez-les dans ses réglages.",
    login: "Connectez-vous à votre compte Cryptoreflex pour activer les notifications.",
    ios: "Sur iPhone, les notifications marchent une fois Reflex Cards ajouté à l'écran d'accueil.",
    unsupported: "Ce navigateur ne gère pas les notifications.",
    sw: "Notifications indisponibles pour l'instant : réessayez plus tard."
  };

  /* ---------- bannière ---------- */
  var CSS = ".rcpwa{position:fixed;left:12px;right:12px;bottom:12px;z-index:50;display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 14px;border-radius:16px;background:rgba(14,18,28,.97);border:1px solid rgba(233,185,73,.35);box-shadow:0 12px 40px rgba(0,0,0,.5);color:#eef1f7;font:14px/1.35 'Space Grotesk',system-ui,sans-serif;max-width:520px;margin:0 auto;transform:translateY(16px);opacity:0;pointer-events:none;transition:transform .3s,opacity .3s}" +
    ".rcpwa.on{transform:none;opacity:1;pointer-events:auto}" +
    ".rcpwa img{width:44px;height:44px;border-radius:10px;flex:none}" +
    ".rcpwa-t{flex:1 1 180px;min-width:0}.rcpwa-t b{display:block;font-size:15px;color:#fbe7a6}.rcpwa-t span{color:#b8c0cf;font-size:13px}" +
    ".rcpwa-b{display:flex;gap:8px;flex:0 0 auto;margin-left:auto}" +
    ".rcpwa button{font:600 13px 'Space Grotesk',system-ui,sans-serif;border-radius:999px;padding:8px 14px;cursor:pointer;border:1px solid rgba(255,255,255,.15);background:transparent;color:#eef1f7}" +
    ".rcpwa button.rcpwa-go{background:linear-gradient(135deg,#e9b949,#fbe7a6);color:#1a1405;border-color:transparent}" +
    ".rcpwa button[disabled]{opacity:.6;cursor:default}" +
    "@media (min-width:700px){.rcpwa{left:auto;right:16px;margin:0}}";
  var TXT = {
    android: { t: "Installer Reflex Cards", d: "Lancement direct depuis votre écran d'accueil, plein écran, et notifications quand votre réserve de boosters est pleine.", ok: "Installer", no: "Plus tard" },
    ios: { t: "Reflex Cards sur votre écran d'accueil", d: "Dans Safari : touchez Partager, puis « Sur l'écran d'accueil ». Vous aurez l'icône, le plein écran et les notifications.", ok: "", no: "Compris" },
    push: { t: "Activer les notifications ?", d: "Nous vous prévenons quand votre réserve de boosters est pleine, pour le quiz du jour et à chaque nouvelle sortie. Jamais la nuit.", ok: "Activer", no: "Plus tard" }
  };
  var el = null, mode = null;
  function build() {
    if (el) return el;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement("div");
    el.className = "rcpwa"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Reflex Cards sur votre téléphone");
    el.innerHTML = '<img src="/icons/reflex-cards/icon-192.png" alt="" width="44" height="44">' +
      '<div class="rcpwa-t"><b></b><span></span></div>' +
      '<div class="rcpwa-b"><button type="button" class="rcpwa-go"></button><button type="button" class="rcpwa-no"></button></div>';
    el.querySelector(".rcpwa-go").addEventListener("click", onOk);
    el.querySelector(".rcpwa-no").addEventListener("click", onNo);
    document.body.appendChild(el);
    window.addEventListener("resize", place);
    return el;
  }
  /* au-dessus de la barre d'onglets du jeu (mobile), sinon en bas */
  function place() {
    if (!el) return;
    var h = 0, tb = document.querySelector(".tabbar");
    if (tb) { var r = tb.getBoundingClientRect(); if (r.height > 0) h = Math.max(0, window.innerHeight - r.top); }
    el.style.bottom = (h + 12) + "px";
  }
  function decide() {
    if (snoozed()) return null;
    if (!standalone()) {
      if (deferred) return "android";
      if (iOS && !inApp && mem.get(K.installed) !== "1") return "ios";
    }
    if (pushSupported() && Notification.permission !== "denied" && mem.get(K.push) !== "on") return "push";
    return null;
  }
  function show(m) {
    mode = m; build();
    var t = TXT[m], go = el.querySelector(".rcpwa-go");
    el.querySelector("b").textContent = t.t;
    el.querySelector("span").textContent = t.d;
    go.textContent = t.ok; go.hidden = !t.ok; go.disabled = false;
    el.querySelector(".rcpwa-no").textContent = t.no;
    place();
    requestAnimationFrame(function () { el.classList.add("on"); });
  }
  function hide() { if (el) el.classList.remove("on"); mode = null; }
  function busy(b) {
    if (!el || !mode) return;
    var go = el.querySelector(".rcpwa-go");
    go.disabled = b; go.textContent = b ? "Un instant…" : TXT[mode].ok;
  }
  function onOk() {
    if (mode === "android") {
      install().then(function (ok) { if (!ok) snooze(14); hide(); });
    } else if (mode === "push") {
      busy(true);
      enableNotifications().then(function () {
        hide(); say("Notifications activées : à bientôt pour votre prochain booster !");
      }).catch(function (e) {
        var code = e && e.message;
        busy(false);
        say(ERR[code] || "Impossible d'activer les notifications pour l'instant.");
        if (code === "denied" || code === "unsupported" || code === "ios") hide();
      });
    }
  }
  function onNo() { snooze(mode === "ios" ? 30 : 14); hide(); }

  /* ---------- démarrage : on laisse le joueur arriver, la bannière vient après 20 s ---------- */
  function start() {
    sw();
    setTimeout(function () { var m = decide(); if (m) show(m); }, 20000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  window.ReflexPWA = {
    install: install,
    enableNotifications: enableNotifications,
    isStandalone: standalone,
    canInstall: function () { return !!deferred; },
    show: function () { var m = decide(); if (m) show(m); return m; }
  };
})();
