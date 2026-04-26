# Welcome Email Beehiiv — Cryptoreflex

**Objectif** : envoyé automatiquement à chaque nouvel abonné dès confirmation
de son inscription (post double opt-in). Active le toggle "Welcome Email" dans
Beehiiv après avoir collé le contenu ci-dessous.

**Cible UX** : confirmation chaleureuse + premier value drop (les 3 plateformes
recommandées) + setup expectations (rythme hebdo, contenu pratique, pas de spam).

---

## 📧 Subject Line (à coller dans Beehiiv)

```
Bienvenue dans Cryptoreflex 👋 Tes 3 plateformes recommandées dedans
```

**Variantes A/B testables plus tard** :
- `Bienvenue Kevin ! Voici ton kit de démarrage crypto`
- `Tu y es ✅ — voici comment Cryptoreflex va t'aider`
- `Premier email : les 3 erreurs que les débutants évitent`

---

## 📨 Preheader (visible dans Gmail/Apple Mail avant ouverture)

```
Comparatifs MiCA, fiscalité FR, calculateurs gratuits — tout est dedans.
```

---

## 📜 Body HTML (à coller dans l'éditeur HTML Beehiiv)

```html
<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;line-height:1.6">

  <!-- Header brand -->
  <div style="text-align:center;padding:32px 24px;background:#0B0D10;border-radius:12px 12px 0 0">
    <h1 style="color:#FCD34D;font-size:28px;font-weight:800;margin:0;letter-spacing:-0.5px">
      Cryptoreflex
    </h1>
    <p style="color:#9ca3af;font-size:14px;margin:8px 0 0">
      Comparatifs · Guides · Outils crypto
    </p>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">

    <p style="font-size:18px;font-weight:600;margin:0 0 16px">
      Bienvenue 👋
    </p>

    <p>
      Merci de ton inscription. Tu fais désormais partie des lecteurs qui veulent
      démarrer (ou progresser) dans la crypto <strong>sans se faire piéger</strong>
      par les promesses irréalistes ou les plateformes opaques.
    </p>

    <p>
      Ce que tu vas recevoir chaque semaine :
    </p>

    <ul style="padding-left:20px;margin:0 0 24px">
      <li><strong>Les actus crypto qui comptent vraiment</strong> (résumé en 3 minutes)</li>
      <li><strong>Un comparatif ou un guide pratique</strong> par semaine</li>
      <li><strong>Les opportunités MiCA-compliant</strong> sélectionnées pour la France/EU</li>
      <li><strong>Zéro spam, zéro shitcoin pump</strong> — tu peux te désabonner en 1 clic à tout moment</li>
    </ul>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

    <h2 style="font-size:18px;font-weight:700;margin:0 0 16px">
      🎯 Pour démarrer : nos 3 plateformes recommandées
    </h2>

    <p style="font-size:14px;color:#6b7280;margin:0 0 20px">
      Sélectionnées pour leur conformité MiCA, frais transparents et UX débutant-friendly.
    </p>

    <!-- Recommendation cards (flat, email-safe) -->

    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px">
      <p style="font-weight:700;font-size:16px;margin:0 0 4px">
        🥇 Bitpanda — Champion européen
      </p>
      <p style="font-size:14px;color:#4b5563;margin:0 0 8px">
        Régulé Autriche (BaFin), broker tout-en-un crypto + actions + métaux,
        IBAN intégré. Idéal pour les long-termistes EU.
      </p>
      <a href="https://www.cryptoreflex.fr/plateformes/bitpanda?utm_source=newsletter&utm_medium=email&utm_campaign=welcome"
         style="color:#B45309;font-weight:600;font-size:14px;text-decoration:none">
        Voir le test complet →
      </a>
    </div>

    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px">
      <p style="font-weight:700;font-size:16px;margin:0 0 4px">
        🛡 Coinbase — La plus régulée
      </p>
      <p style="font-size:14px;color:#4b5563;margin:0 0 8px">
        Cotée NASDAQ, agrément MiCA français, interface ultra simple.
        La référence trust pour le tout débutant.
      </p>
      <a href="https://www.cryptoreflex.fr/plateformes/coinbase?utm_source=newsletter&utm_medium=email&utm_campaign=welcome"
         style="color:#B45309;font-weight:600;font-size:14px;text-decoration:none">
        Voir le test complet →
      </a>
    </div>

    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="font-weight:700;font-size:16px;margin:0 0 4px">
        🔐 Ledger — Self-custody niveau pro
      </p>
      <p style="font-size:14px;color:#4b5563;margin:0 0 8px">
        Hardware wallet open-source de référence. Une fois que tu as plus
        de 500€ en crypto, tu sors tout des exchanges et tu vas sur Ledger.
      </p>
      <a href="https://www.cryptoreflex.fr/portefeuille/ledger?utm_source=newsletter&utm_medium=email&utm_campaign=welcome"
         style="color:#B45309;font-weight:600;font-size:14px;text-decoration:none">
        Voir le guide Ledger →
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

    <h2 style="font-size:18px;font-weight:700;margin:0 0 16px">
      🛠 Quelques outils gratuits pour aller plus loin
    </h2>

    <ul style="padding-left:20px;margin:0 0 24px">
      <li>
        <a href="https://www.cryptoreflex.fr/outils/calculateur-fiscalite?utm_source=newsletter&utm_medium=email&utm_campaign=welcome"
           style="color:#B45309;font-weight:600">
          Calculateur fiscalité crypto FR
        </a>
        — calcule tes plus-values selon le régime BNC
      </li>
      <li>
        <a href="https://www.cryptoreflex.fr/outils/dca-bitcoin?utm_source=newsletter&utm_medium=email&utm_campaign=welcome"
           style="color:#B45309;font-weight:600">
          Simulateur DCA Bitcoin
        </a>
        — ce que ton plan d'épargne aurait donné
      </li>
      <li>
        <a href="https://www.cryptoreflex.fr/outils/verificateur-mica?utm_source=newsletter&utm_medium=email&utm_campaign=welcome"
           style="color:#B45309;font-weight:600">
          Vérificateur MiCA
        </a>
        — savoir si ta plateforme est légale en EU
      </li>
    </ul>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

    <p style="background:#fef3c7;padding:16px;border-radius:8px;font-size:14px;margin:0 0 24px">
      <strong>💡 Tu veux nous aider ?</strong> Réponds à cet email avec une question
      crypto qui te bloque — c'est la meilleure façon de nous dire quel sujet
      traiter en priorité.
    </p>

    <p style="font-size:14px;color:#6b7280;margin:0">
      À très vite,<br>
      <strong>Kevin</strong> — Fondateur Cryptoreflex
    </p>

  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:24px;font-size:12px;color:#9ca3af">
    <p style="margin:0 0 8px">
      Cryptoreflex — Comparateur crypto francophone
    </p>
    <p style="margin:0 0 8px">
      <a href="https://www.cryptoreflex.fr" style="color:#9ca3af;text-decoration:underline">cryptoreflex.fr</a>
      ·
      <a href="https://www.cryptoreflex.fr/blog" style="color:#9ca3af;text-decoration:underline">Blog</a>
      ·
      <a href="https://www.cryptoreflex.fr/contact" style="color:#9ca3af;text-decoration:underline">Contact</a>
    </p>
    <p style="margin:0;font-size:11px">
      Tu reçois cet email car tu t'es inscrit à la newsletter Cryptoreflex.
      <br>
      <a href="{{rp_url}}" style="color:#9ca3af;text-decoration:underline">Se désinscrire</a>
      ·
      <a href="{{rp_url}}" style="color:#9ca3af;text-decoration:underline">Préférences</a>
    </p>
  </div>

</div>
```

---

## 📋 Procédure pour activer dans Beehiiv

1. Login Beehiiv → ta publication **Cryptoreflex Newsletter**
2. **Settings** (sidebar gauche, en bas) → **Subscribe Forms** OU **Welcome Email**
3. Toggle **Welcome Email = ON**
4. **Subject** : copy-paste le subject ci-dessus
5. **Preheader** : copy-paste le preheader
6. **Body** : passer en mode HTML (toggle "Edit HTML" ou "Code view") → coller le bloc HTML complet
7. **From name** : `Kevin (Cryptoreflex)`
8. **Reply-to** : `kevinvoisin2016@gmail.com` (ou `contact@cryptoreflex.fr` si tu actives le forwarding OVH)
9. **Save** + **Send test email** à toi-même pour vérifier le rendu (Gmail + Apple Mail mobile)
10. Activer = ON

## ✅ Variables Beehiiv supportées

- `{{first_name}}` — prénom abonné (si collecté)
- `{{rp_url}}` — Recipient Preferences URL (lien obligatoire de désabonnement RGPD)
- `{{publication_name}}` — nom de la publication
- `{{publication_url}}` — URL de la publication

(Notes : on n'utilise pas {{first_name}} dans cette V1 du welcome car notre form ne collecte pas le prénom — à ajouter ultérieurement si on étend le formulaire d'inscription.)

## 🧪 Test deliverability

Après config :
1. Inscrire `kevinvoisin2016+test1@gmail.com` sur ton site
2. Confirmer le double opt-in
3. Vérifier réception du welcome dans Gmail (Inbox, pas Promotions/Spam)
4. Outils tests bonus :
   - https://www.mail-tester.com/ → score deliverability sur 10
   - https://glockapps.com/ → multi-providers placement test

Score cible : 9/10+ sur Mail-Tester (DKIM/SPF/DMARC tous verts grâce au setup OVH+Resend qu'on vient de faire).
