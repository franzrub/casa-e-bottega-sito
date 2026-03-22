# SKILL: Casa e Bottega — Manutenzione Sito

## Descrizione
Skill per lavorare sul sito casaebottegapuglia.it. Contiene la struttura del progetto, i bug noti, il workflow di deploy e la checklist di debug obbligatoria.

---

## Struttura del progetto

```
casa-e-bottega-sito/
├── sito/                  ← SORGENTE (modifica sempre qui)
│   ├── blog/              ← File markdown degli articoli (uno per slug)
│   ├── js/
│   │   ├── i18n.js        ← Tutte le traduzioni (IT, EN, FR, DE, NL, ES)
│   │   └── main.js        ← Logica JS principale
│   ├── css/style.css
│   ├── blog.html          ← Pagina indice blog (griglia 9 articoli)
│   ├── blog-articolo.html ← Template dinamico articoli (legge .md via fetch)
│   ├── en/                ← Versioni tradotte delle pagine statiche
│   ├── fr/
│   ├── de/
│   ├── nl/
│   └── es/
├── deploy/                ← OUTPUT del build (gitignored, non modificare direttamente)
├── foto-zona/             ← Immagini delle zone (Gargano, Manfredonia, ecc.)
├── foto-homepage/
├── foto-la-dimora/
├── foto-la-bottega/
├── prepara-deploy.sh      ← Script di build: genera deploy/ da sito/
└── netlify.toml           ← Build command: bash prepara-deploy.sh, publish: deploy
```

**Regola fondamentale:** si modifica sempre in `sito/`. Lo script `prepara-deploy.sh` genera `deploy/` (usato da Netlify). Non modificare `deploy/` a mano tranne per test veloci.

---

## Come funziona il blog

### Pagina indice (blog.html)
- Griglia di 9 card statiche HTML con `data-i18n="blog_articleN_*"` per titolo, categoria, data, estratto
- Le immagini sono tag `<img>` diretti puntati a `foto-zona/`
- Il filtro per categoria è JS puro in `main.js`

### Pagina articolo (blog-articolo.html?slug=...)
- Fetch dinamico del file `blog/{slug}.md` via `marked.js`
- Il markdown viene parsato e inserito nel DOM
- Il frontmatter YAML (tra `---`) fornisce titolo, categoria, data, immagine

### File markdown articoli (`sito/blog/{slug}.md`)
```markdown
---
title: "Titolo articolo"
date: "2025-08-01"
category: "Mare"
description: "Descrizione breve."
image: "foto-zona/nome-immagine.jpeg"   ← spazi nel nome: ok qui
slug: "nome-slug"
---

![Alt immagine](foto-zona/nome%20immagine.jpeg)   ← spazi nel nome: usare %20

Testo del paragrafo senza indentazione.

## Titolo sezione

Testo...
```

**⚠️ Regola immagini nei .md:** il frontmatter `image:` è gestito dal JS come stringa e funziona con spazi normali. Il link inline `![alt](path)` è processato da `marked.js` (CommonMark) e richiede `%20` al posto degli spazi nel path — altrimenti l'immagine appare come testo grezzo.

---

## ⚠️ BUG NOTI — CONTROLLARE PRIMA DI TUTTO IL RESTO

### BUG 1 — Indentazione markdown (CRITICO)
**Sintomo:** testo degli articoli in font monospace, immagini `![alt](src)` mostrate come testo grezzo invece di renderizzarsi.

**Causa:** paragrafi indentati con 4+ spazi nei file `.md`. In Markdown, 4 spazi = blocco di codice (`<pre><code>`), quindi `marked.js` NON converte né testo né immagini.

**Come verificare:**
```bash
grep -c '^    ' sito/blog/*.md
```
Se il conteggio è > 0, c'è il problema.

**Fix:**
```python
import re
for filepath in glob('sito/blog/*.md'):
    content = open(filepath).read()
    match = re.match(r'^(---\n.*?\n---\n)(.*)', content, re.DOTALL)
    frontmatter, body = match.group(1), match.group(2)
    fixed = '\n'.join(line.lstrip() for line in body.split('\n'))
    open(filepath, 'w').write(frontmatter + fixed)
```

---

### BUG 2 — Traduzioni mancanti in i18n.js
**Sintomo:** nella versione EN/FR/DE/NL/ES del blog, alcuni articoli mostrano titolo, categoria, data ed estratto in italiano.

**Causa:** quando si aggiunge un nuovo articolo, le chiavi `blog_articleN_title/cat/date/excerpt` vanno aggiunte in TUTTE E 6 le sezioni linguistiche di `sito/js/i18n.js` (it, en, fr, de, nl, es).

**Come verificare:**
```python
lines = open('sito/js/i18n.js').read().split('\n')
# trovare le sezioni per lingua e verificare che ogni lingua abbia 9 articoli
for lang in ['it','en','fr','de','nl','es']:
    count = sum(1 for l in lines if f'blog_article' in l and '_title' in l)
    # ogni lingua deve avere 9 occorrenze
```

**Fix:** aggiungere le chiavi mancanti nelle sezioni delle lingue carenti, dopo `blog_article6_excerpt`.

---

### BUG 3 — Percorsi immagini
**In sito/ (sorgente):**
- `blog.html` e `blog-articolo-N.html` (root di sito/): usano `../foto-zona/`
- `en/blog.html` e altre sottocartelle: usano `../foto-zona/`

**In deploy/ (generato da prepara-deploy.sh):**
- File in root: il sed cambia `../foto-zona/` in `./foto-zona/` ✅
- File in sottocartelle (`en/`, `fr/`, ecc.): mantengono `../foto-zona/` ✅ (corretto perché da `en/`, `../` punta alla root del deploy)

**Nei file markdown** (`blog/{slug}.md`): i path immagine sono `foto-zona/nome.jpeg` (senza `./` o `../`) — si risolvono correttamente perché `blog-articolo.html` è in root.

---

### BUG 4 — Immagini con spazi nel nome non renderizzate nel blog (CRITICO)
**Sintomo:** l'immagine inline nel corpo dell'articolo appare come testo grezzo, es. `![alt](foto-zona/Foto spiaggia.jpeg)` invece di renderizzarsi.

**Causa:** `marked.js` segue lo standard CommonMark che non accetta spazi non codificati nei path URL delle immagini. Il file può esistere fisicamente con il nome originale, ma il link nel markdown deve usare `%20` al posto degli spazi.

**Regola:** ogni volta che aggiungi un'immagine in un file `.md`, se il nome file contiene spazi, codificali con `%20` nel link markdown (ma NON nel frontmatter `image:`).

**Esempio corretto:**
```markdown
---
image: "foto-zona/Foto spiaggia.jpeg"   ← frontmatter: spazio normale, ok
---

![Alt](foto-zona/Foto%20spiaggia.jpeg)  ← body markdown: spazio codificato %20
```

**Come verificare:**
```bash
grep -n '!\[' sito/blog/*.md | grep '(' | grep ' '
# I risultati con spazi nel path (tra parentesi) sono problematici
# Spazi nell'alt text (tra parentesi quadre) sono invece normali
```

---

### BUG 5 — Sistema i18n: lingua bloccata dopo navigazione (RISOLTO in main.js)
**Sintomo:** dopo aver visitato una pagina in tedesco (o altra lingua), tornando alla home italiana il sito rimane bloccato in tedesco.

**Causa originale:** `main.js` usava `localStorage` per ricordare la lingua, ma il localStorage veniva contaminato dalla navigazione tra pagine in lingue diverse.

**Come funziona ora (NON modificare questa logica):**
La lingua è determinata **esclusivamente dall'URL**, senza mai usare localStorage come fonte iniziale:
```javascript
const _pathLang = (() => {
  const match = window.location.pathname.match(/\/(en|fr|de|nl|es)\//);
  return match ? match[1] : 'it'; // root = sempre italiano
})();
let currentLang = _pathLang;
```
- `/de/index.html` → `'de'`
- `/en/camere.html` → `'en'`
- `/index.html`, `/prenota.html`, ecc. → sempre `'it'`

**Regola:** non reintrodurre `localStorage.getItem('ceb_lang')` nell'inizializzazione di `currentLang`. Il localStorage viene scritto da `setLang()` solo per sincronizzare funzioni secondarie come `renderCalendar()`, ma non deve più guidare la lingua della pagina.

---

### BUG 6 — Chiavi duplicate in i18n.js (RISOLTO)
**Sintomo:** in JavaScript, se una chiave è definita due volte nello stesso oggetto, la seconda sovrascrive silenziosamente la prima senza errori.

**Regola:** ogni volta che aggiungi o modifichi chiavi in `i18n.js`, verificare che non esistano duplicati nella stessa sezione linguistica:
```bash
# Controlla duplicati in tutto il file
node -e "
const src = require('fs').readFileSync('sito/js/i18n.js','utf8');
eval(src.replace('const translations','var translations'));
Object.keys(translations).forEach(lang => {
  const keys = Object.keys(translations[lang]);
  const dupes = keys.filter((k,i) => keys.indexOf(k) !== i);
  if (dupes.length) console.log(lang, 'duplicati:', dupes);
});
"
```

---

## Workflow di deploy

```bash
# 1. Modificare i file in sito/
# 2. Rigenerare deploy/
bash prepara-deploy.sh

# 3. Commit e push
git add sito/
git commit -m "descrizione"
git push origin main
# Netlify vede il push e fa il deploy automatico
```

**Nota:** `git push` non funziona dal sandbox di Cowork (errore 403). L'utente deve eseguire `git push origin main` dal proprio terminale.

**Nota:** la cartella `deploy/` è gitignored. Netlify la rigenera da zero eseguendo `prepara-deploy.sh` ad ogni push.

---

## Checklist debug: "il sito sembra rotto"

Seguire questo ordine PRIMA di qualsiasi altra ipotesi:

1. **Aprire il file sorgente incriminato** (markdown, HTML, JS) — non fare supposizioni
2. **Controllare i file markdown** con `grep -c '^    ' sito/blog/*.md` — Bug 1
3. **Controllare i18n.js** per traduzioni mancanti — Bug 2
4. **Immagini nei .md con spazio nel nome?** → usare `%20` nel link, non nel frontmatter — Bug 4
5. **La lingua si blocca?** → NON toccare la logica `_pathLang` in `main.js` — Bug 5
6. **Chiavi duplicate in i18n.js?** → eseguire il check node descritto nel Bug 6
7. **Verificare il sito live** direttamente nel browser (non in sandbox) — potrebbe essere solo cache
8. **Chiedere allo utente uno screenshot** e l'URL esatto se qualcosa non torna — non insistere sulla propria lettura

---

## Struttura i18n.js

Ogni lingua ha la propria sezione. Ordine delle sezioni: `it → en → fr → de → nl → es`.

Chiavi blog obbligatorie per ogni articolo (N = numero da 1 a 9):
```
blog_articleN_title
blog_articleN_cat
blog_articleN_date
blog_articleN_excerpt
```

Chiavi filtro categorie (tradurre per ogni lingua):
```
blog_cat_all / blog_cat_mare / blog_cat_borghi / blog_cat_cibo / blog_cat_tradizioni / blog_cat_itinerari
blog_read_more
```
