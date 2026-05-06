/**
 * /embed/v1.js — JavaScript widget Cryptoreflex pour blogs/sites tiers.
 *
 * Strategie : laisser les blogs FR (finance perso, crypto, fintech) embarquer
 * un widget interactif qui affiche en temps reel le statut MiCA d'une
 * plateforme, un countdown, ou le top 10 cryptos. Chaque install = backlink
 * dofollow automatique vers cryptoreflex.fr.
 *
 * Usage minimal cote blog :
 *
 *   <div data-cryptoreflex-widget="psan-checker" data-platform="coinbase"></div>
 *   <script async src="https://www.cryptoreflex.fr/embed/v1.js"></script>
 *
 * 3 types de widgets supportes :
 *   - psan-checker     : badge statut MiCA + PSAN d'une plateforme (param: platform)
 *   - mica-countdown   : countdown jusqu'au 30 juin 2026 (deadline MiCA)
 *   - top-cryptos      : top 10 cryptos vulgarisees (param: limit, default 5)
 *
 * Branding : chaque widget rend un footer "Donnees Cryptoreflex" avec un
 * lien dofollow vers cryptoreflex.fr/api-publique. C'est non-supprimable
 * (CSS inline + DOM injection direct) - mais on documente que la licence
 * CC-BY 4.0 IMPOSE cette attribution donc tout retrait est une violation
 * de licence (= leverage legal si abus).
 *
 * Pourquoi un Route Handler plutot qu'un fichier statique :
 *  - Controle des headers (Cache-Control, Content-Type, CORS)
 *  - Possibilite d'A/B test ou de versionnage facile (v1, v2...)
 *  - Centralisation du rate limiting si besoin
 *
 * Anti-XSS : on n'injecte JAMAIS du HTML utilisateur. Les seuls inputs
 * acceptes sont des slugs alphanumeriques whitelistes (data-platform=
 * "coinbase" -> regex /^[a-z0-9-]+$/). Tout reste cote client, le widget
 * lit /api/public/* qui est statique et sain.
 */

import { NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-static";
export const revalidate = 86_400;

const WIDGET_VERSION = "1.0.0";

function generateWidgetJs(): string {
  const baseUrl = BRAND.url;

  // Le JS est genere ici cote serveur. On evite tout template strings imbrique
  // pour rester lisible. Les valeurs `${...}` ci-dessous sont resolues au
  // build (BRAND.url constant) - le JS final n'a aucune interpolation runtime.
  return `/*!
 * Cryptoreflex Embed Widget v${WIDGET_VERSION}
 * (c) ${new Date().getFullYear()} Cryptoreflex - CC-BY 4.0
 * Documentation : ${baseUrl}/embed
 *
 * Usage :
 *   <div data-cryptoreflex-widget="psan-checker" data-platform="coinbase"></div>
 *   <script async src="${baseUrl}/embed/v1.js"></script>
 */
(function () {
  "use strict";

  var BASE_URL = ${JSON.stringify(baseUrl)};
  var API_BASE = BASE_URL + "/api/public";
  var SAFE_SLUG_RE = /^[a-z0-9-]+$/;
  var DEADLINE_MICA = new Date("2026-06-30T23:59:59Z").getTime();

  // ---- Styles inline (evite collision CSS host) -----------------------------
  var FONT_STACK =
    "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

  function badgeStyles(color) {
    return [
      "display:inline-flex",
      "align-items:center",
      "gap:8px",
      "padding:8px 14px",
      "border-radius:999px",
      "border:1px solid " + color + "33",
      "background:" + color + "12",
      "color:" + color,
      "font-family:" + FONT_STACK,
      "font-size:13px",
      "font-weight:600",
      "line-height:1.4",
      "text-decoration:none",
    ].join(";");
  }

  function cardStyles() {
    return [
      "display:block",
      "padding:16px 18px",
      "border:1px solid rgba(15,23,42,0.12)",
      "border-radius:14px",
      "background:#fff",
      "color:#0f172a",
      "font-family:" + FONT_STACK,
      "font-size:14px",
      "line-height:1.55",
      "max-width:540px",
      "box-shadow:0 1px 2px rgba(15,23,42,0.04)",
    ].join(";");
  }

  function attribFooterStyles() {
    return [
      "display:block",
      "margin-top:10px",
      "padding-top:10px",
      "border-top:1px solid rgba(15,23,42,0.06)",
      "font-size:11px",
      "color:#64748b",
    ].join(";");
  }

  function linkStyles() {
    return "color:#0891b2;text-decoration:underline";
  }

  // ---- Utils ---------------------------------------------------------------
  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function attributionFooter() {
    return (
      '<div style="' +
      attribFooterStyles() +
      '">Donnees <a href="' +
      BASE_URL +
      '" rel="dofollow" style="' +
      linkStyles() +
      '">Cryptoreflex</a> - <a href="' +
      BASE_URL +
      '/api-publique" rel="dofollow" style="' +
      linkStyles() +
      '">CC-BY 4.0</a>.</div>'
    );
  }

  function jsonGet(url) {
    return fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      mode: "cors",
      cache: "default",
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  // ---- Widget : psan-checker ----------------------------------------------
  function renderPsanChecker(node) {
    var platform = node.getAttribute("data-platform") || "";
    if (!SAFE_SLUG_RE.test(platform)) {
      node.innerHTML =
        '<div style="' +
        cardStyles() +
        '">Widget Cryptoreflex : data-platform invalide. Slug attendu : minuscules + chiffres + tirets.</div>';
      return;
    }

    node.innerHTML = '<div style="' + cardStyles() + '">Chargement...</div>';

    jsonGet(API_BASE + "/psan-registry")
      .then(function (data) {
        var p =
          (data.platforms || []).filter(function (x) {
            return x.id === platform;
          })[0] || null;
        if (!p) {
          node.innerHTML =
            '<div style="' +
            cardStyles() +
            '">Plateforme <code>' +
            escHtml(platform) +
            '</code> non trouvee dans le registre Cryptoreflex.' +
            attributionFooter() +
            "</div>";
          return;
        }

        var micaOk = p.micaStatus === "authorized";
        var atRisk = p.atRiskJuly2026 === true;
        var statusColor = micaOk ? "#059669" : atRisk ? "#d97706" : "#64748b";
        var statusLabel = micaOk
          ? "MiCA conforme"
          : atRisk
          ? "Risque deadline juillet 2026"
          : "Statut a verifier";
        var statusIcon = micaOk ? "&#x2714;" : atRisk ? "&#x26A0;" : "&#x2139;";

        var psanLine = p.amfRegistration
          ? "Agrement AMF : " + escHtml(p.amfRegistration) + " - "
          : "";

        node.innerHTML =
          '<div style="' +
          cardStyles() +
          '">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
          '<span style="font-size:16px;font-weight:700;">' +
          escHtml(p.name) +
          "</span>" +
          '<span style="' +
          badgeStyles(statusColor) +
          '"><span aria-hidden="true">' +
          statusIcon +
          "</span>" +
          escHtml(statusLabel) +
          "</span>" +
          "</div>" +
          '<div style="font-size:12px;color:#475569;line-height:1.5;">' +
          psanLine +
          "Statut MiCA : " +
          escHtml(p.micaStatus || "inconnu") +
          (p.micaJurisdiction
            ? " (" + escHtml(p.micaJurisdiction) + ")"
            : "") +
          "</div>" +
          attributionFooter() +
          "</div>";
      })
      .catch(function (err) {
        node.innerHTML =
          '<div style="' +
          cardStyles() +
          '">Widget Cryptoreflex : impossible de charger les donnees (' +
          escHtml(err.message) +
          ").</div>";
      });
  }

  // ---- Widget : mica-countdown --------------------------------------------
  function fmtPlural(n, s) {
    return n + " " + s + (n > 1 ? "s" : "");
  }

  function renderMicaCountdown(node) {
    function tick() {
      var diff = DEADLINE_MICA - Date.now();
      var label;
      if (diff <= 0) {
        label = "Deadline MiCA atteinte (30 juin 2026)";
      } else {
        var days = Math.floor(diff / (24 * 60 * 60 * 1000));
        var hours = Math.floor(
          (diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
        );
        label =
          fmtPlural(days, "jour") +
          " " +
          fmtPlural(hours, "heure") +
          " avant la deadline MiCA";
      }
      node.innerHTML =
        '<div style="' +
        cardStyles() +
        '">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        '<span style="' +
        badgeStyles("#d97706") +
        '"><span aria-hidden="true">&#x23F1;</span>MiCA UE</span>' +
        '<span style="font-size:15px;font-weight:600;color:#0f172a;">' +
        escHtml(label) +
        "</span>" +
        "</div>" +
        '<div style="margin-top:8px;font-size:12px;color:#475569;">' +
        "Fin de la periode transitoire pour les CASP. Verifiez la conformite de votre plateforme avant cette date." +
        "</div>" +
        attributionFooter() +
        "</div>";
    }
    tick();
    // Refresh chaque minute (les heures bougent visiblement)
    setInterval(tick, 60_000);
  }

  // ---- Widget : top-cryptos -----------------------------------------------
  function renderTopCryptos(node) {
    var limitRaw = parseInt(node.getAttribute("data-limit") || "5", 10);
    var limit = isNaN(limitRaw) ? 5 : Math.min(Math.max(limitRaw, 1), 10);

    node.innerHTML = '<div style="' + cardStyles() + '">Chargement...</div>';

    jsonGet(API_BASE + "/top-cryptos")
      .then(function (data) {
        var list = (data.topCryptos || []).slice(0, limit);
        if (!list.length) {
          node.innerHTML =
            '<div style="' +
            cardStyles() +
            '">Donnees indisponibles temporairement.' +
            attributionFooter() +
            "</div>";
          return;
        }

        var rows = list
          .map(function (c) {
            return (
              '<li style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:6px 0;border-bottom:1px solid rgba(15,23,42,0.04);">' +
              '<div><span style="font-weight:700;color:#0f172a;">' +
              escHtml(c.rank + ". " + c.name) +
              " " +
              '<span style="color:#64748b;font-weight:500;">(' +
              escHtml(c.symbol || "") +
              ")</span></span>" +
              '<div style="font-size:12px;color:#475569;margin-top:2px;">' +
              escHtml(c.tagline || "") +
              "</div></div>" +
              "</li>"
            );
          })
          .join("");

        node.innerHTML =
          '<div style="' +
          cardStyles() +
          '">' +
          '<div style="font-weight:700;font-size:15px;color:#0f172a;margin-bottom:4px;">Top ' +
          limit +
          " cryptos vulgarisees</div>" +
          '<ul style="margin:6px 0 0 0;padding:0;list-style:none;">' +
          rows +
          "</ul>" +
          attributionFooter() +
          "</div>";
      })
      .catch(function (err) {
        node.innerHTML =
          '<div style="' +
          cardStyles() +
          '">Widget Cryptoreflex : impossible de charger les donnees (' +
          escHtml(err.message) +
          ").</div>";
      });
  }

  // ---- Bootstrap : auto-render au DOM ready -------------------------------
  function bootstrap() {
    var nodes = document.querySelectorAll("[data-cryptoreflex-widget]");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var type = node.getAttribute("data-cryptoreflex-widget");
      try {
        if (type === "psan-checker") renderPsanChecker(node);
        else if (type === "mica-countdown") renderMicaCountdown(node);
        else if (type === "top-cryptos") renderTopCryptos(node);
        else {
          node.innerHTML =
            '<div style="' +
            cardStyles() +
            '">Widget Cryptoreflex : type "' +
            escHtml(type || "") +
            '" inconnu. Types valides : psan-checker, mica-countdown, top-cryptos.</div>';
        }
      } catch (err) {
        node.innerHTML =
          '<div style="' +
          cardStyles() +
          '">Widget Cryptoreflex : erreur de rendu.</div>';
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

  // Export pour usage avance (SPAs qui injectent des widgets dynamiquement)
  window.CryptoreflexWidget = {
    version: "${WIDGET_VERSION}",
    refresh: bootstrap,
  };
})();
`;
}

const COMMON_HEADERS: Record<string, string> = {
  "Content-Type": "application/javascript; charset=utf-8",
  // CORS large : le widget se charge depuis n'importe quel domaine.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Cache long (24h CDN, SWR 7 jours) : le JS bouge rarement, on ne veut pas
  // cracher du trafic vers l'origin a chaque pageview de blog tiers.
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  // Petit signal de version pour les outils de debug.
  "X-Widget-Version": WIDGET_VERSION,
};

export function GET() {
  const js = generateWidgetJs();
  return new NextResponse(js, { status: 200, headers: COMMON_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: COMMON_HEADERS });
}
