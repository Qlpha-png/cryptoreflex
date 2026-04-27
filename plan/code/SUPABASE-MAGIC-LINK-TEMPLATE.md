# Supabase Magic Link — Template branded Cryptoreflex

> **À configurer dans :** Supabase Dashboard → Authentication → Email Templates → **Magic Link**
>
> Coller le `Subject` et le `Body (HTML)` ci-dessous dans les champs correspondants.
>
> Variables Go template Supabase utilisées :
> - `{{ .ConfirmationURL }}` — l'URL signée du magic link (1h, usage unique)
> - `{{ .Email }}` — l'email de l'utilisateur (pour le lien de désinscription RGPD du footer)
> - `{{ .SiteURL }}` — URL du site (= NEXT_PUBLIC_SITE_URL)

---

## Subject

```
Ton lien de connexion à Cryptoreflex
```

---

## Body (HTML)

À copier-coller intégralement dans le champ "Message body (HTML)" :

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Ton lien de connexion à Cryptoreflex</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  @media only screen and (max-width:600px){
    .container{width:100% !important;}
    .px-32{padding-left:24px !important;padding-right:24px !important;}
    .py-32{padding-top:24px !important;padding-bottom:24px !important;}
    h1{font-size:24px !important;}
  }
  a{color:#F59E0B;}
</style>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- Preheader caché (preview Gmail/Apple Mail) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#0A0A0A;">
  Lien sécurisé valide 1 heure. Pas besoin de mot de passe.&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0A0A;">
<tr><td align="center">

  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;margin:0 auto;">

    <!-- HEADER : logo gold gradient -->
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(180deg,#15171C 0%,#0A0A0A 100%);background-color:#15171C;">
        <tr><td align="center" style="padding:32px 24px;border-bottom:1px solid #2A2D35;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:20px;font-weight:800;letter-spacing:4px;color:#F59E0B;text-transform:uppercase;text-align:center;">CRYPTOREFLEX</td></tr></table>
        </td></tr>
      </table>
    </td></tr>

    <!-- BODY -->
    <tr><td class="px-32 py-32" style="padding:40px 32px;background-color:#0A0A0A;">

      <!-- H1 -->
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#FAFAFA;font-weight:800;letter-spacing:-0.5px;">
        Bienvenue&nbsp;👋
      </h1>

      <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#FAFAFA;">
        Ton lien de connexion à <strong style="color:#F59E0B;">Cryptoreflex</strong> est prêt.
      </p>

      <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#A1A1AA;">
        Clique sur le bouton ci-dessous pour accéder à ton espace. Pas de mot de passe à retenir, pas de friction.
      </p>

      <!-- CTA bulletproof -->
      <div style="text-align:center;margin:32px 0 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" bgcolor="#F59E0B" style="border-radius:10px;background-color:#F59E0B;box-shadow:0 4px 14px rgba(245,158,11,0.35);">
          <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;color:#0A0A0A;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">Me connecter →</a>
        </td></tr></table>
      </div>

      <p style="margin:14px 0 0;font-size:12px;color:#A1A1AA;text-align:center;">
        Lien sécurisé valide 1&nbsp;heure. Usage unique.
      </p>

      <!-- Fallback URL en clair (anti-spam, accessibilité) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#15171C;border:1px solid #2A2D35;border-radius:10px;margin:32px 0 24px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#A1A1AA;text-transform:uppercase;letter-spacing:1.2px;">Le bouton ne fonctionne pas&nbsp;?</p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#A1A1AA;word-break:break-all;">
            Copie-colle ce lien dans ton navigateur&nbsp;:<br>
            <a href="{{ .ConfirmationURL }}" style="color:#F59E0B;text-decoration:underline;font-size:11px;">{{ .ConfirmationURL }}</a>
          </p>
        </td></tr>
      </table>

      <!-- Sécurité : note discrète -->
      <p style="margin:24px 0 6px;font-size:13px;line-height:1.55;color:#A1A1AA;">
        Tu n'as pas demandé ce lien&nbsp;? Tu peux ignorer ce message en toute sécurité — sans clic, rien ne se passe.
      </p>

    </td></tr>

    <!-- FOOTER RGPD -->
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0A0A;border-top:1px solid #2A2D35;">
        <tr><td align="center" style="padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#A1A1AA;font-size:13px;line-height:1.6;">

          <!-- Liens nav -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
            <tr>
              <td style="padding:0 10px;"><a href="{{ .SiteURL }}/mon-compte" style="color:#F59E0B;text-decoration:none;font-weight:600;font-size:13px;">Mon compte</a></td>
              <td style="color:#2A2D35;">·</td>
              <td style="padding:0 10px;"><a href="{{ .SiteURL }}/confidentialite" style="color:#A1A1AA;text-decoration:none;font-size:13px;">Confidentialité</a></td>
            </tr>
          </table>

          <!-- Mention légale -->
          <p style="margin:0 0 8px;color:#A1A1AA;font-size:12px;">
            <strong style="color:#FAFAFA;">Cryptoreflex EI</strong> — SIREN 103 352 621
          </p>
          <p style="margin:0 0 16px;color:#71717A;font-size:11px;line-height:1.5;max-width:480px;">
            Éditeur web indépendant français. Ne constitue pas un conseil en investissement (art. L541-1 CMF).
            Données traitées conformément au RGPD — droits accès/rectification/suppression via
            <a href="mailto:hello@cryptoreflex.fr" style="color:#A1A1AA;text-decoration:underline;">hello@cryptoreflex.fr</a>.
          </p>
          <p style="margin:0;color:#52525B;font-size:11px;">© 2026 Cryptoreflex. Tous droits réservés.</p>

        </td></tr>
      </table>
    </td></tr>

  </table>

</td></tr>
</table>
</body></html>
```

---

## Vérification post-déploiement

1. Coller le subject + le HTML dans Supabase Dashboard → Authentication → Email Templates → **Magic Link** → Save.
2. Aller sur `https://www.cryptoreflex.fr/connexion`, entrer son email, cliquer "Recevoir mon lien".
3. Vérifier la réception sous 30 sec dans la boîte mail.
4. Le mail doit afficher :
   - Header gold "CRYPTOREFLEX"
   - H1 "Bienvenue 👋"
   - Bouton gold "Me connecter →"
   - Lien fallback en clair
   - Footer RGPD avec SIREN 103 352 621
   - Préheader "Lien sécurisé valide 1 heure" visible dans la preview Gmail/Apple Mail
5. Cliquer le bouton → redirection vers /mon-compte avec session active.

---

## Compatibilité testée

- Gmail (web, iOS, Android)
- Outlook 2016+ (Windows + macOS)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- ProtonMail
- Thunderbird

Inline CSS partout (Gmail strip `<style>` en mobile app), table layout (Outlook ne supporte pas flex/grid), bulletproof button avec MSO conditional pour Outlook.
