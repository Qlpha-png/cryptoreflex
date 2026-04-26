# Programmes d'affiliation à inscrire — Cryptoreflex

**Objectif** : remplacer les liens placeholder `?utm_source=cryptoreflex` par les vrais liens partenaire avec sub-id Cryptoreflex.

**Méthode** : pour chaque programme, t'inscrire (10-30 min/inscription), récupérer ton lien d'affiliation unique, puis je l'update dans `data/platforms.json` et `data/wallets.json`.

---

## ⭐ Tier 1 — Priorité absolue (~70% du potentiel revenus)

### 1. Coinbase Affiliate
- **URL d'inscription** : https://affiliate.coinbase.com/
- **Commission** : 50% des fees pendant 3 mois (jusqu'à $35-50/inscription qualifiée)
- **Process** : approbation rapide (24-48h), pas de validation site requise
- **Notre slug** : `data/platforms.json` → `coinbase` → `affiliateUrl`
- **Format attendu** : `https://www.coinbase.com/join/XXXXXXX` ou `https://refer.coinbase.com/XXXXXX`

### 2. Binance Affiliate
- **URL d'inscription** : https://www.binance.com/en/activity/referral
- **Commission** : 40% (perso) jusqu'à 50% (via API/network)
- **Process** : disponible immédiatement avec compte Binance, code parrainage généré
- **Notre slug** : `binance`
- **Format attendu** : code style `https://accounts.binance.com/register?ref=XXXXXXXX`

### 3. Bitpanda Partners
- **URL d'inscription** : https://www.bitpanda.com/affiliate-program
- **Commission** : 25% à vie sur les frais générés (LTV élevée, c'est le meilleur du marché EU)
- **Process** : application + validation (3-7 jours)
- **Notre slug** : `bitpanda`
- **Format attendu** : `https://www.bitpanda.com/?ref=XXXXXXXXX`

---

## 🟢 Tier 2 — Important (~25% du potentiel)

### 4. Kraken Affiliate
- **URL d'inscription** : https://www.kraken.com/affiliate-program
- **Commission** : 20% des trading fees pendant 12 mois
- **Process** : application avec critères audience minimum (~5K visites/mo recommandé)
- **Notre slug** : `kraken`

### 5. Bitget Partner
- **URL d'inscription** : https://partner.bitget.com/
- **Commission** : 50% (programme agressif)
- **Process** : très permissif, approbation rapide
- **Notre slug** : `bitget`

### 6. Ledger Affiliate (hardware wallets)
- **URL d'inscription** : https://www.ledger.com/affiliate
- **Commission** : 10% sur hardware (Nano S+, Nano X, Stax)
- **Process** : application + validation (5-10 jours)
- **Notre slug** : `ledger` (à ajouter dans `data/wallets.json` si manquant)

### 7. Trezor Affiliate
- **URL d'inscription** : https://trezor.io/affiliates
- **Commission** : 12-15% sur hardware (Trezor Safe 3, Safe 5)
- **Process** : application
- **Notre slug** : `trezor` (à ajouter dans `data/wallets.json`)

---

## 🔵 Tier 3 — Bonus (~5% du potentiel mais facile à activer)

### 8. Trade Republic (parrainage, pas affiliation pure)
- **URL d'inscription** : https://traderepublic.com/fr-fr/parrainage
- **Commission** : €15 par filleul qui dépose €100 (limité)
- **Notre slug** : `trade-republic`

### 9. SwissBorg (programme cashback)
- **URL** : https://swissborg.com/refer-a-friend
- **Commission** : variable (cashback BTC partagé)
- **Notre slug** : `swissborg`

### 10. Coinhouse (contact direct nécessaire)
- **Email** : partenariats@coinhouse.com
- **Notre slug** : `coinhouse`

---

## 📝 Process pour me transmettre les liens

Pour chaque programme, dès que tu as ton lien d'affiliation, tu m'envoies dans ce format :

```
coinbase: https://www.coinbase.com/join/TONCODE
binance: https://accounts.binance.com/register?ref=TONCODE
bitpanda: https://www.bitpanda.com/?ref=TONCODE
...
```

Je mettrai à jour `data/platforms.json` et `data/wallets.json` en lot, je commit + deploy. **Ça active immédiatement les revenus** sur les 480 pages du site qui contiennent des CTAs vers ces plateformes.

---

## 💰 Estimation revenus M+1 (avec ces 8 affiliations actives)

| Hypothèse | Chiffre |
|---|---|
| Visites/mo (M+1 cible) | 5 000 |
| Taux clic affilié | 2% |
| Clics affiliés | 100 |
| Taux conversion (visiteur → compte créé + dépôt) | 8% |
| Comptes créés | 8 |
| Commission moyenne (mix Coinbase/Binance/Bitpanda) | €40 |
| **MRR estimé M+1** | **€320** |

À M+3 avec 25K visites/mo → ~€1600/mo. M+6 avec 100K visites → ~€6500/mo.

---

## 🔧 Action utilisateur immédiate

**3 priorités absolues (1h max)** :
1. Coinbase Affiliate (15 min, approbation rapide)
2. Binance Affiliate (5 min, instantané)
3. Bitpanda Partners (15 min, approbation 3-7j mais à lancer maintenant)

Les autres peuvent attendre 1-2 semaines.

---

*Liste préparée 25 avril 2026. Tu m'envoies les liens et je les intègre en quelques minutes.*
