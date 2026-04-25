# Guide d'implémentation Schema.org / JSON-LD — Cryptoreflex.fr

Date : 2026-04-25
Fichiers concernés :
- `lib/schema.ts` — toutes les fonctions helper (Organization, WebSite, Article, Breadcrumb, ItemList, Review, FAQPage, HowTo, Person, NewsArticle, graphSchema)
- `components/StructuredData.tsx` — composant React universel d'injection

> Tous les schemas ont ete valides syntaxiquement pour le **Schema Markup Validator** Google
> (https://validator.schema.org/) et le **Rich Results Test** (https://search.google.com/test/rich-results).

---

## 1. Logique generale

Chaque page injecte **1 a N schemas** via le composant `<StructuredData />`.
Pour les pages charnieres (layout, home), on regroupe plusieurs schemas dans un `@graph` unique
via `graphSchema([...])` — meilleure deduplication et 1 seule balise `<script>`.

```tsx
import StructuredData from "@/components/StructuredData";
import { graphSchema, organizationSchema, websiteSchema, personSchema } from "@/lib/schema";

<StructuredData data={graphSchema([organizationSchema(), websiteSchema(), personSchema()])} />
```

---

## 2. Ou injecter chaque schema

### 2.1 `app/layout.tsx` — Schemas globaux (toutes pages)

A injecter **dans le `<body>` directement apres `<Navbar />`** (ou dans le `<head>` via Next.js Metadata API).

```tsx
// app/layout.tsx
import StructuredData from "@/components/StructuredData";
import { graphSchema, organizationSchema, websiteSchema, personSchema } from "@/lib/schema";

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col antialiased">
        <StructuredData
          id="global-ld"
          data={graphSchema([
            organizationSchema(),
            websiteSchema(),
            personSchema(),
          ])}
        />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

**Pourquoi ces 3 schemas en global :**
- `Organization` : permet le **knowledge panel** Google + sitelinks.
- `WebSite` + `SearchAction` : declenche la **sitelinks search box** Google.
- `Person` : signale l'auteur **E-E-A-T** sur tout le site (reutilise par `@id` ailleurs).

---

### 2.2 `app/page.tsx` — Homepage

```tsx
// app/page.tsx
import StructuredData from "@/components/StructuredData";
import { topPlatformsItemListSchema, allPlatformsReviewSchemas, breadcrumbSchema, autoBreadcrumb } from "@/lib/schema";

export default function HomePage() {
  return (
    <>
      <StructuredData
        id="home-ld"
        data={[
          breadcrumbSchema(autoBreadcrumb("/")),
          topPlatformsItemListSchema(6),
          ...allPlatformsReviewSchemas(),  // Review + AggregateRating par plateforme
        ]}
      />
      {/* ... contenu de la home ... */}
    </>
  );
}
```

**Effet :** chaque carte plateforme devient eligible aux **etoiles** dans les SERP
(rich snippet "Product Review" avec `aggregateRating`).

---

### 2.3 `app/blog/[slug]/page.tsx` — Article de blog

```tsx
// app/blog/[slug]/page.tsx
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  autoBreadcrumb,
  faqSchema,
} from "@/lib/schema";
import { ARTICLES } from "@/components/BlogPreview";

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = ARTICLES.find((a) => a.slug === params.slug)!;

  // FAQ optionnelle pour cet article
  const faq = [
    {
      question: "Faut-il declarer ses cryptos en France ?",
      answer: "Oui, les comptes ouverts sur des exchanges etrangers doivent etre declares chaque annee via le formulaire 3916-bis.",
    },
  ];

  return (
    <>
      <StructuredData
        id={`article-${article.slug}-ld`}
        data={[
          articleSchema(article),
          breadcrumbSchema(autoBreadcrumb(`/blog/${article.slug}`, article.title)),
          faqSchema(faq),
        ]}
      />
      {/* ... rendu de l'article ... */}
    </>
  );
}
```

**Pour un article type "news" (annonce reglementaire, ATH BTC, etc.) :**
remplacer `articleSchema(article)` par `newsArticleSchema(article)`.

---

### 2.4 `app/plateformes/[id]/page.tsx` — Fiche plateforme

```tsx
import StructuredData from "@/components/StructuredData";
import { platformReviewSchema, breadcrumbSchema, autoBreadcrumb, faqSchema } from "@/lib/schema";
import { getPlatformById } from "@/lib/platforms";

export default function PlatformPage({ params }: { params: { id: string } }) {
  const platform = getPlatformById(params.id)!;

  return (
    <>
      <StructuredData
        data={[
          platformReviewSchema(platform),
          breadcrumbSchema(autoBreadcrumb(`/plateformes/${params.id}`, platform.name)),
        ]}
      />
      {/* ... fiche plateforme ... */}
    </>
  );
}
```

---

### 2.5 Guide HowTo (ex: "Comment acheter Bitcoin en 2026")

A utiliser dans un article ou une page guide dediee.

```tsx
import StructuredData from "@/components/StructuredData";
import { howToSchema } from "@/lib/schema";

const guide = howToSchema({
  name: "Comment acheter du Bitcoin en France en 2026",
  description: "Guide pas a pas pour acheter ses premiers BTC sur une plateforme reglementee MiCA.",
  totalTime: "PT15M",
  estimatedCost: { currency: "EUR", value: 50 },
  image: "/blog/comment-acheter-bitcoin.jpg",
  supplies: [
    { name: "Une piece d'identite (CNI ou passeport)" },
    { name: "Un IBAN francais ou europeen (SEPA)" },
  ],
  tools: [
    { name: "Compte Coinbase, Binance ou Bitpanda" },
    { name: "Application 2FA (Google Authenticator)" },
  ],
  steps: [
    { name: "Choisir une plateforme regulee MiCA", text: "Comparez Coinbase, Binance, Bitpanda et choisissez selon vos besoins.", url: "/#plateformes" },
    { name: "Creer le compte et passer le KYC", text: "Inscription email, verification d'identite (10 min) et activation 2FA obligatoire." },
    { name: "Deposer des euros par SEPA", text: "Virement SEPA (gratuit, 1-2 jours) ou CB (instantane mais 1-2% de frais)." },
    { name: "Acheter du Bitcoin", text: "Recherchez 'BTC', choisissez le montant et validez l'ordre au marche." },
    { name: "Securiser : transferer vers un wallet", text: "Pour > 500 EUR, transferer sur un Ledger ou Trezor.", url: "/blog/wallet-froid-vs-chaud" },
  ],
});

<StructuredData data={guide} />
```

---

## 3. Recapitulatif par type de page

| Page                                | Schemas a injecter                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `app/layout.tsx` (global)           | `Organization` + `WebSite` + `Person` (via `graphSchema`)                                         |
| `app/page.tsx` (home)               | `BreadcrumbList` + `ItemList` (Top 6) + `Review`/`AggregateRating` x N plateformes                 |
| `app/blog/[slug]/page.tsx`          | `Article` (ou `NewsArticle`) + `BreadcrumbList` + `FAQPage` (si FAQ presente)                     |
| `app/blog/page.tsx` (liste blog)    | `BreadcrumbList` + `ItemList` (liste articles)                                                    |
| `app/plateformes/[id]/page.tsx`     | `Product` + `Review` + `AggregateRating` + `BreadcrumbList` + `FAQPage`                           |
| `app/outils/[tool]/page.tsx`        | `BreadcrumbList` (+ `SoftwareApplication` si calculateur)                                         |
| `app/methodologie/page.tsx`         | `BreadcrumbList` + `Person` (deja en global, on peut renforcer)                                   |
| Guide "Comment acheter X"            | `HowTo` + `BreadcrumbList`                                                                        |

---

## 4. Validation post-deploiement

1. **Schema Markup Validator** (Schema.org officiel)
   https://validator.schema.org/#url=https%3A%2F%2Fcryptoreflex.fr
2. **Google Rich Results Test**
   https://search.google.com/test/rich-results?url=https%3A%2F%2Fcryptoreflex.fr
3. **Search Console > Ameliorations** : surveiller "Produits", "Articles", "Fil d'Ariane", "FAQ".

Erreurs courantes a surveiller :
- `image` manquante ou non absolue -> toujours utiliser `abs()` (deja fait dans les helpers).
- `aggregateRating.ratingCount = 0` -> `clampRating` met un minimum a 1 (deja fait).
- Doublon `@id` entre `@graph` et schema standalone -> utiliser `graphSchema()` partout dans `layout.tsx`, et **ne pas** re-injecter `Organization` ailleurs (les helpers utilisent `@id` references, ce qui est correct).

---

## 5. Mise a jour des liens sociaux (sameAs)

Editer `lib/schema.ts`, constante `SAME_AS` :

```ts
const SAME_AS: string[] = [
  "https://twitter.com/cryptoreflex_fr",
  "https://www.linkedin.com/company/cryptoreflex",
  "https://t.me/cryptoreflex",
  "https://github.com/cryptoreflex",
];
```

A synchroniser avec les liens du `<Footer />` quand les comptes sont crees.

---

## 6. Couverture marketing / SEO obtenue

- **Knowledge panel** : `Organization` complet (logo, sameAs, contactPoint, foundingDate).
- **Sitelinks search box** : `WebSite` + `SearchAction` (necessite > 100 pages indexees).
- **Rich snippet etoiles** sur les SERP : `Product` + `aggregateRating` sur chaque plateforme.
- **Carrousel Top liste** : `ItemList` du Top 6 plateformes.
- **Article enrichi** : `Article` / `NewsArticle` avec auteur, date, image, fil d'Ariane.
- **Accordeon FAQ** dans les SERP : `FAQPage`.
- **Etapes deroulantes** : `HowTo` (rich result "Comment faire").
- **Auteur E-E-A-T** : `Person` reference partout via `@id` (signal fort pour YMYL "Your Money").

---

## 7. Integration en 5 minutes

1. Copier `lib/schema.ts` et `components/StructuredData.tsx` (deja fait).
2. Editer `app/layout.tsx` -> ajouter le bloc global (section 2.1).
3. Editer `app/page.tsx` -> ajouter le bloc home (section 2.2).
4. Sur chaque page blog/plateforme : importer le helper correspondant + `<StructuredData />`.
5. Deployer puis valider avec les 2 outils Google (section 4).
