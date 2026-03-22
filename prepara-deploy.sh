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
# Root HTML (IT): ../foto- → ./foto-
sed -i.bak 's|\.\./foto-|./foto-|g' *.html
sed -i.bak 's|\.\./loghi-|./loghi-|g' *.html
rm -f *.bak
# Sottocartelle lingue (EN/FR/DE/NL/ES): ../../foto- → ../foto-
for lang in en fr de nl es; do
  if [ -d "$lang" ]; then
    sed -i.bak 's|\.\./\.\./foto-|../foto-|g' "$lang"/*.html
    sed -i.bak 's|\.\./\.\./loghi-|../loghi-|g' "$lang"/*.html
    rm -f "$lang"/*.bak
  fi
done

# 5. Correggi percorsi nel main.js per deploy
sed -i.bak "s|\.\./foto-homepage/|./foto-homepage/|g" js/main.js
rm -f js/main.js.bak

# 6. Genera manifesto immagini hero
# Ordine manuale: 1.webp (TV/Netflix) spostata in ultima posizione per prima impressione elegante
echo "📸 Generazione manifest foto-homepage (ordine personalizzato)..."
cd foto-homepage
# Ordine fisso: inizia con le immagini evocative, la TV (1.*) va per ultima
ORDERED_FILES="2.webp 3.webp 4.webp 1.webp"
JSON="["
FIRST=true
for f in $ORDERED_FILES; do
  if [ -f "$f" ]; then
    if [ "$FIRST" = true ]; then
      JSON="$JSON\"$f\""
      FIRST=false
    else
      JSON="$JSON,\"$f\""
    fi
  fi
done
JSON="$JSON]"
echo "$JSON" > images.json
echo "   Manifest generato: $JSON"
cd ..

# 7. Copia Netlify functions (netlify.toml è ora nella root del repo)
mkdir -p netlify/functions
cp ../deploy-extras/netlify/functions/*.js netlify/functions/ 2>/dev/null || true

cd ..
echo "✅ Cartella deploy/ pronta! Caricala su Netlify."
