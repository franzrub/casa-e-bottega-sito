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

# 5. Correggi percorsi nel main.js per deploy e minifica
sed -i.bak "s|\.\./foto-homepage/|./foto-homepage/|g" js/main.js
rm -f js/main.js.bak

# Minifica main.js → main.min.js (richiede terser: npm install -g terser)
if command -v terser &> /dev/null || command -v npx &> /dev/null; then
  echo "⚡ Minificazione main.js..."
  npx terser js/main.js --compress --mangle --output js/main.min.js
  # Aggiorna il riferimento in tutti gli HTML
  for f in *.html; do sed -i.bak 's|js/main\.js|js/main.min.js|g' "$f"; rm -f "${f}.bak"; done
  for lang in en fr de nl es de; do
    if [ -d "$lang" ]; then
      for f in "$lang"/*.html; do sed -i.bak 's|js/main\.js|js/main.min.js|g' "$f"; rm -f "${f}.bak"; done
    fi
  done
  echo "   main.js → main.min.js ($(wc -c < js/main.min.js) bytes)"
else
  echo "⚠️  terser non trovato — main.js non minificato. Installa con: npm install -g terser"
fi

# Minifica i18n.js → i18n.min.js
if command -v terser &> /dev/null || command -v npx &> /dev/null; then
  echo "⚡ Minificazione i18n.js..."
  npx terser js/i18n.js --compress --mangle --output js/i18n.min.js
  # Aggiorna il riferimento in tutti gli HTML (root + sottocartelle lingua)
  for f in *.html; do sed -i.bak 's|js/i18n\.js|js/i18n.min.js|g' "$f"; rm -f "${f}.bak"; done
  for lang in en fr de nl es; do
    if [ -d "$lang" ]; then
      for f in "$lang"/*.html; do sed -i.bak 's|js/i18n\.js|js/i18n.min.js|g' "$f"; rm -f "${f}.bak"; done
    fi
  done
  echo "   i18n.js → i18n.min.js ($(wc -c < js/i18n.min.js) bytes)"
else
  echo "⚠️  terser non trovato — i18n.js non minificato."
fi

# Minifica style-v2.css → style-v2.min.css (richiede clean-css-cli: npm install -g clean-css-cli)
if command -v cleancss &> /dev/null || command -v npx &> /dev/null; then
  echo "⚡ Minificazione style-v2.css..."
  npx clean-css-cli -o css/style-v2.min.css css/style-v2.css
  # Aggiorna il riferimento in tutti gli HTML (root + sottocartelle lingua)
  for f in *.html; do sed -i.bak 's|css/style-v2\.css|css/style-v2.min.css|g' "$f"; rm -f "${f}.bak"; done
  for lang in en fr de nl es; do
    if [ -d "$lang" ]; then
      for f in "$lang"/*.html; do sed -i.bak 's|css/style-v2\.css|css/style-v2.min.css|g' "$f"; rm -f "${f}.bak"; done
    fi
  done
  echo "   style-v2.css → style-v2.min.css ($(wc -c < css/style-v2.min.css) bytes)"
else
  echo "⚠️  clean-css-cli non trovato — style-v2.css non minificato. Installa con: npm install -g clean-css-cli"
fi

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
