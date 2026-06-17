# Outil EPS - Course de Haies (DI-HAI)

Une application web 100% autonome et locale d'aide à la décision pour l'évaluation en EPS.

## Fonctionnalités principales

* **100% Sans Serveur** : Conçue pour fonctionner de manière autonome.
* **Fonctionnement hors ligne** : Idéal pour les terrains de sport.
* **Données privées** : Toutes les données restent dans le navigateur de l'enseignant (localStorage). Aucune donnée n'est envoyée sur Internet.
* **Persistance automatique** : Les changements sont automatiquement sauvegardés, ce qui prévient la perte de données après rechargement.
* **Export et Import JSON** : Sauvegarde et portabilité des sessions entre différents appareils.

## Instructions de déploiement sur GitHub Pages

Puisque l'application utilise **Vite** pour la construction, vous devez compiler le projet avant de le déployer en ligne :

1. Entrez les commandes suivantes dans votre terminal local pour installer les dépendances et compiler le projet :
   ```bash
   npm install
   npm run build
   ```

2. Le processus de compilation va créer un dossier **`dist/`**. C'est ce dossier qui contient votre application autonome prête pour la production.

3. **Pour déployer sur GitHub Pages**, vous avez deux choix :
   - **Soit utiliser GitHub Actions :** Allez dans "Settings" > "Pages", choisissez Source "GitHub Actions" et utilisez le template "Static HTML" en pointant vers le dossier `dist/`.
   - **Soit déployer le dossier formel :** Vous pouvez compiler localement, et "pousser" le contenu du sous-dossier `dist` sur une branche nommée `gh-pages`.
   
   Le fichier `vite.config.ts` inclut déjà la ligne `base: './'` obligatoire pour que les assets (CSS/JS) chargent correctement peu importe le nom du dépôt ou le chemin relatif.

## Chargement des vraies données du terrain au format CSV
L'application peut importer un fichier CSV brut directement depuis le terrain.
L'outil s'attend à :
- Une colonne `Prenom` ou `Nom_Eleve`.
- Des colonnes identifiables pour les observables : `OBS1`, `OBS01`, ou `OBS01_Degre`.
- Séparateurs acceptés : virgule `,` ou point-virgule `;`.
