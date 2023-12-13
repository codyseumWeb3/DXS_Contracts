#!/bin/bash

# Arrête le script en cas d'erreur
set -e

# Exécuter des tests ou d'autres étapes de vérification (optionnel)
yarn test

# Construire le package (si nécessaire)
yarn build

# Naviguer vers le répertoire du package
cd ./dist

# Publier le package
npm publish

echo "Package publié avec succès !"
