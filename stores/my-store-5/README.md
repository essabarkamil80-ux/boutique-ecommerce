# My Store 5 — thème « sf- » (page d'accueil)

Page d'accueil reproduisant la structure et le design de la référence fournie (11 bandes, dans le même ordre),
construite comme un ensemble de sections Shopify indépendantes, réordonnables et modifiables dans l'éditeur.

Boutique cible : `pjsp1f-sy.myshopify.com` (thème de base : Horizon).

## Contenu

| Fichier | Rôle |
|---|---|
| `theme/snippets/sf-base.liquid` | Polices, couleurs, classes communes, carrousels. Rendu une fois par page depuis l'en-tête. |
| `theme/snippets/sf-icon.liquid` | Icônes SVG. |
| `theme/snippets/sf-card.liquid` | Carte produit (réutilisable sur la page produit et les collections). |
| `theme/sections/sf-announcement.liquid` | Barre d'annonce (groupe d'en-tête). |
| `theme/sections/sf-header.liquid` | En-tête : logo, menu, compte, panier, menu mobile. |
| `theme/sections/sf-hero.liquid` | Hero 50/50 texte + image. |
| `theme/sections/sf-press.liquid` | Bandeau de logos presse défilant. |
| `theme/sections/sf-products.liquid` | Carrousel « Best Sellers » (collection au choix). |
| `theme/sections/sf-promo.liquid` | Bandeau promo image pleine largeur + 3 atouts + bouton. |
| `theme/sections/sf-categories.liquid` | Grille « Popular Categories ». |
| `theme/sections/sf-reviews.liquid` | Carrousel d'avis avec 4 types de mini-graphiques. |
| `theme/sections/sf-colors.liquid` | « Shop by color ». |
| `theme/sections/sf-news.liquid` | Derniers articles du blog. |
| `theme/sections/sf-trust.liquid` | Barre de réassurance. |
| `theme/sections/header-group.json` | Remplace l'en-tête Horizon par annonce + en-tête sf-. |
| `theme/templates/index.json` | Page d'accueil : les 9 sections dans l'ordre de la référence. |

## Déploiement

L'API Shopify refuse d'écrire sur le thème publié. Procédure :

1. Dupliquer le thème Horizon → brouillon (`themeDuplicate`).
2. Envoyer **d'abord** les snippets puis les sections `.liquid`, **ensuite seulement** `header-group.json` et
   `index.json` (un JSON qui référence une section pas encore présente est ignoré sans erreur).
3. **Méthode la plus simple (vérifiée le 29/09/2026)** : le dépôt étant public, `themeFilesUpsert` accepte directement
   `body: {type: URL, value: "https://raw.githubusercontent.com/<compte>/<depot>/<branche>/stores/my-store-5/theme/<fichier>"}`.
   Pousser la branche d'abord, puis envoyer les URL (plusieurs fichiers par appel). Aucune signature à recopier. Le MD5 côté
   Shopify a coïncidé avec le MD5 local pour les 14 fichiers `.liquid`. Attendre ~5 s après le push si l'ancienne version est servie.
   Alternative si le dépôt devient privé — envoi des gros fichiers : `stagedUploadsCreate` → POST multipart vers GCS → `themeFilesUpsert` avec
   `body: {type: URL}`. Une URL de transfert déjà utilisée ou expirée est ignorée sans erreur : en créer une neuve.
4. **Vérifier chaque fichier** après envoi : `checksumMd5` identique au MD5 local pour les `.liquid` ; relire le
   contenu pour les `.json` (Shopify les normalise). Un `userErrors: []` vide ne prouve rien.
5. Pour publier : dupliquer le brouillon et publier **la copie**, pour que le brouillon reste modifiable.

## Pièges rencontrés avec Horizon

- Horizon stylise les éléments nus (`h1`-`h6` : marges 1,5–2,5 rem, casse ; `ul`/`ol` : retrait 1,5 em ; `blockquote` : bordure).
  Les remises à zéro du socle sont donc en `:where(.sf) h1, …` (spécificité d'élément, gagnent à égalité car chargées plus tard dans
  le `<body>`), et `.sf-wrap` / `.sf-rail` sont de vraies classes. `tools/horizon-globals.css` + `tools/probe.js` rejouent ces règles.
- L'icône panier de l'en-tête ouvre le tiroir Horizon (`document.getElementById('cart-drawer').open()`) si `settings.cart_type == 'drawer'`.
- La duplication d'un thème est asynchrone : attendre `processing: false` avant d'écrire dedans.

## Tester en local

```sh
sh tools/fetch-fonts.sh        # une fois
python3 tools/validate.py      # règles des schémas Shopify
sh tools/build.sh 1            # rend tools/out.html avec des images factices
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/shot.js out.html 1440 tools/d1440.png
sh tools/build.sh 1 horizon    # idem, avec les règles globales d'Horizon injectées
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/probe.js out.html   # marges / retraits / casse mesurés
```

`tools/render.js` rend les vraies sections avec LiquidJS en émulant les objets et filtres Shopify
(`image_url`, `image_tag`, `placeholder_svg_tag`, `money`…) : il attrape les erreurs Liquid avant l'envoi.

## Contenus à renseigner par le marchand

Volontairement laissés vides ou neutres, à remplir uniquement avec des éléments réels :

- **Logos presse** : seulement des médias qui ont réellement parlé de la marque.
- **Avis clients** : vrais avis, avec l'accord des clientes ; note de la pastille = note réelle (ex. Judge.me).
- **Preuve sociale du hero** (« 200 000+ … ») : masquée tant que le champ est vide.
- **Étoiles des cartes produit** : n'apparaissent que si une appli d'avis remplit `reviews.rating`.
- **Promesses de réassurance** (livraison, retours, tailles) : doivent correspondre aux conditions réelles.

## Mesures (référence ramenée à 1 440 px de large)

Conteneur 1 224 px (marges 108 px). Hero 579 px. Cartes produit 278 × 347 px, écart 21 px. Catégories 294 px.
Cartes d'avis 315 px, photo 177 px. Couleurs 235 px. Articles 394 × 222 px. Réassurance 141 px.
Palette : prune `#6B2441`, encre `#13072E`, crème `#F9F3EE`, vert `#00B67A`, indigo `#4E43D8`.
