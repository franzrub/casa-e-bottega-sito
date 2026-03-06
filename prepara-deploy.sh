#!/bin/bash
# ============================================
# PREPARA DEPLOY — Casa e Bottega
# Esegui questo script prima di caricare su Netlify.
# Uso: bash prepara-deploy.sh
# ============================================

echo "🏠 Preparazione deploy Casa e Bottega..."

# 1. Ricrea cartella deploy
rm -rf deploy
mkdir -p deploy

# 2. Copia file del sito
cp -r sito/* deploy/

# 3. Copia cartelle foto e loghi
cp -r foto-la-dimora deploy/
cp -r foto-la-bottega deploy/
cp -r foto-spazi-comuni deploy/
cp -r foto-zona deploy/
cp -r foto-homepage deploy/
cp -r loghi-e-badge deploy/

# 4. Correggi percorsi relativi
cd deploy
sed -i.bak 's|\.\./foto-|./foto-|g' *.html
sed -i.bak 's|\.\./loghi-|./loghi-|g' *.html
rm -f *.bak

# 5. Correggi percorsi nel main.js per deploy
sed -i.bak "s|\.\./foto-homepage/|./foto-homepage/|g" js/main.js
rm -f js/main.js.bak

# 6. Genera manifesto immagini hero
echo "📸 Scansione foto-homepage..."
cd foto-homepage
# Trova tutti i file immagine (jpeg, jpg, png, webp) e genera JSON
FILES=$(ls -1 *.jpeg *.jpg *.png *.webp 2>/dev/null | sort)
JSON="["
FIRST=true
for f in $FILES; do
  if [ "$FIRST" = true ]; then
    JSON="$JSON\"$f\""
    FIRST=false
  else
    JSON="$JSON,\"$f\""
  fi
done
JSON="$JSON]"
echo "$JSON" > images.json
echo "   Trovate $(echo "$FILES" | wc -l | tr -d ' ') immagini"
cd ..

# 7. Copia Netlify config e functions
mkdir -p netlify/functions
cp ../deploy-extras/netlify.toml . 2>/dev/null || true
cp ../deploy-extras/netlify/functions/*.js netlify/functions/ 2>/dev/null || true

cd ..
echo "✅ Cartella deploy/ pronta! Caricala su Netlify."
