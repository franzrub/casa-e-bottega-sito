# Casa e Bottega B&B — Contesto del Progetto

## Panoramica
Sito statico per il B&B "Casa e Bottega" (Manfredonia, Via Gargano 13). Deploy su Netlify.

## Struttura cartelle
```
casa-e-bottega-sito/
├── sito/          ← SOURCE OF TRUTH (modifica sempre qui)
├── deploy/        ← cartella di deploy (generata da prepara-deploy.sh)
├── prepara-deploy.sh
└── netlify.toml   ← publish = "deploy"
```

**Workflow:**
1. Modifica i file in `sito/`
2. Copia **sempre** il file modificato anche in `deploy/` (stessa struttura di cartelle)
3. Il deploy avviene tramite push su GitHub da terminale (gestito dall'utente)
4. Netlify fa il deploy automatico dal branch principale **dalla cartella `deploy/`**

**⚠️ REGOLA CRITICA — DOPPIA COPIA OBBLIGATORIA:**
- `sito/` = usato per visualizzazione in locale
- `deploy/` = quello che Netlify pubblica online
- **Ogni modifica a qualsiasi file HTML/CSS/JS va copiata in ENTRAMBE le cartelle.** Se si modifica solo `sito/`, il sito live resta invariato. Se si dimentica `deploy/`, il lavoro non va online.

**⛔ NON suggerire mai `./prepara-deploy.sh`** — l'utente fa il push direttamente da terminale e non usa questo script.

## ✅ GATE PRE-DEPLOY — `predeploy-check.sh` (OBBLIGATORIO)
Prima di dichiarare qualsiasi lavoro "pronto per il deploy" o di suggerire un push,
**eseguire sempre il gate ed eseguire il report all'utente:**

```bash
cd ~/Documents/casa-e-bottega-sito && ./predeploy-check.sh
```

Il gate controlla SOLO cose oggettive (non giudica design né testi):
- link interni rotti nell'artefatto pubblicato (`deploy/`)
- parità `sito/` ⇄ `deploy/` (regola della doppia copia)
- chiavi `data-i18n` usate ma non definite in `i18n.js`
- file `.min` referenziati ma più vecchi del sorgente (rigenerazione dimenticata)
- cache-buster `?v=` incoerenti tra le pagine

Regole per l'agente:
1. **Se il gate esce con codice ≠ 0 (FAIL), NON dichiarare il lavoro pronto.** Sistema i FAIL, poi ri-esegui finché è verde (o spiega all'utente perché un FAIL è accettabile).
2. Riporta sempre l'output del gate all'utente in modo sintetico (quanti FAIL/WARN e quali).
3. Il gate è il "verify" del loop: è lui a decidere se il lavoro è finito, non l'autovalutazione dell'agente.
4. Usa `./predeploy-check.sh --strict` per far fallire anche sui WARN quando serve una pulizia completa.

> Questo è l'unico gate autorizzato. Non reintrodurre controlli manuali ad-hoc al posto suo: se serve un nuovo controllo, aggiungilo dentro `predeploy-check.sh`.

## Regola fondamentale
**`sito/index.html` (versione IT) è sempre il source of truth** per struttura, componenti e logica. Qualsiasi modifica a layout o funzionalità va prima applicata lì, poi replicata nelle versioni tradotte.

## Struttura multilingua
Le pagine tradotte si trovano in sottocartelle:
```
sito/
├── index.html         ← IT (source of truth)
├── camere.html
├── blog.html
├── prenota.html
├── contatti.html
├── casa-sul-mare.html ← pagina appartamento partner (solo IT, linkata da homepage e footer)
├── blog-articolo-*.html
├── en/index.html      ← EN
├── de/index.html      ← DE
├── fr/index.html      ← FR
├── nl/index.html      ← NL
└── es/index.html      ← ES
```
Le pagine interne tradotte (camere, blog, prenota, contatti) si trovano dentro ogni cartella lingua: `en/camere.html`, `de/prenota.html`, ecc.

**Attenzione ai link interni nelle pagine tradotte:** usare path relativi senza `../` (es. `camere.html`, non `../camere.html`), altrimenti si risale alla root e si atterra sulla versione IT.

## Navigazione mobile (hamburger)

### Struttura HTML della nav
- **Desktop:** `<nav class="v2-nav-links-desktop">` dentro `<header>`
- **Mobile panel:** `<div class="v2-nav-links">` **fuori** da `</header>`, immediatamente dopo

### Regola critica — UN SOLO toggle handler
**`sito/js/main.js` è l'unico gestore autorizzato del toggle hamburger.** Non aggiungere MAI listener inline nelle pagine. Il toggle è dentro un IIFE in `DOMContentLoaded` attorno alla riga 1212.

Se una pagina ha un proprio script inline con il toggle hamburger → doppio listener → apre e chiude immediatamente → sembra non funzionare. Rimuovere sempre l'inline toggle.

### CSS breakpoint
`max-width: 900px`: nasconde `.v2-nav-links-desktop`, mostra `.v2-menu-toggle`

## i18n (internazionalizzazione)

### Meccanismo
- Attributi `data-i18n` sugli elementi HTML
- Traduzioni in `sito/js/i18n.js`
- Funzione `t()` definita in `main.js` (caricato con `defer`)

### Regola critica — t() negli script inline
La funzione `t()` è disponibile solo nello scope di `main.js`. Negli script inline (IIFE) usare sempre il pattern con guard:
```js
// CORRETTO:
typeof t === 'function' ? t('chiave') : 'fallback_italiano'

// SBAGLIATO (causa ReferenceError se main.js non è ancora eseguito):
t('chiave')
```

## prenota.html — Logica booking

### Struttura IIFE
Il file ha più IIFE separate. Le variabili definite in una non sono accessibili nelle altre, a meno che non siano esposte via `window.*`.

**Pattern per accedere a variabili cross-IIFE:**
```js
// Nel primo IIFE, per accedere a ROOMS definito nel secondo:
var _ROOMS = window.ROOMS;
```

### Auto-apertura modal dal CTA homepage
I bottoni CTA (homepage) linkano a `prenota.html?open=1`. Il modal si apre automaticamente allo step 1 via:
```js
if (window.location.search.indexOf('open=1') !== -1) {
  window.addEventListener('load', function() {
    var ciEl = document.getElementById('search-checkin');
    var coEl = document.getElementById('search-checkout');
    if (ciEl) ciEl.value = '';
    if (coEl) coEl.value = '';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        openModal(1);
      });
    });
  });
}
```
Il doppio `requestAnimationFrame` è necessario per aspettare che il browser finisca l'autocomplete dei form.

### Prezzi — nessuna pulizia finale
La riga "Pulizie finali €25" è stata rimossa dal riepilogo prezzi. Non reintrodurla.

## Footer — link Seguici
I link nel footer sezione "Seguici" devono puntare a:
- **Booking:** `https://www.booking.com/Share-5rpSCP`
- **Airbnb (La Dimora):** `https://www.airbnb.it/h/casaebottega`

Non usare i link generici `booking.com` o `airbnb.it`.

## Blog (Racconti)
La hero della pagina blog NON deve avere immagine di sfondo. Fix applicato via CSS:
```css
.blog-hero::before {
  display: none;
}
```

### Struttura URL blog — IMPORTANTE

Il blog ha due set di file. **Lavorare SEMPRE e SOLO sui file canonici slug:**

```
sito/blog/slug-articolo/index.html   ← CANONICI (Google li indicizza, modificare questi)
sito/blog-articolo-N.html            ← OBSOLETI (Netlify li reindirizza via 301, non toccare)
```

I file `blog-articolo-N.html` esistono ancora in `sito/` ma sono dead end SEO: Netlify li reindirizza ai nuovi slug con 301. Qualsiasi modifica a quei file è lavoro sprecato. Se serve lavorare sui contenuti del blog (link interni, SEO, testi), identificare il file corrispondente in `sito/blog/slug/index.html`.

I 25 articoli canonici sono in:
```
sito/blog/settimana-nel-gargano/
sito/blog/spiagge-gargano-manfredonia-vieste/
sito/blog/bagno-gargano-maggio-giugno/
sito/blog/mattinata-borgo-bianco/
sito/blog/vieste-borgo-sul-mare/
sito/blog/monte-santangelo/
sito/blog/basilica-siponto-tresoldi/
sito/blog/scogliere-calette-gargano/
sito/blog/borghi-nascosti-gargano/
sito/blog/muoversi-nel-gargano/
sito/blog/cosa-fare-manfredonia/
sito/blog/cosa-mangiare-manfredonia/
sito/blog/dove-mangiano-i-locali-manfredonia/
sito/blog/vino-gargano-nero-troia/
sito/blog/locali-gargano/
sito/blog/manfredonia-lenta/
sito/blog/gargano-fuori-stagione/
sito/blog/settimana-santa-manfredonia/
sito/blog/peschici-borgo-sul-mare/
sito/blog/giro-in-barca-gargano/
sito/blog/foresta-umbra/
sito/blog/weekend-gargano/
sito/blog/manfredonia-tre-giorni/
sito/blog/spiagge-lidi-manfredonia/
sito/blog/isole-tremiti/
```

Link relativi tra articoli slug: `../altro-slug/` (es. da `settimana-nel-gargano/` a Vieste: `href="../vieste-borgo-sul-mare/"`)

## Minificazione CSS e JS

**Non modificare manualmente i file `.min` in `sito/`** — sono residui storici ignorati.

I file minificati in `deploy/` vanno rigenerati manualmente ogni volta che si modifica `i18n.js`, `main.js` o `style-v2.css`:

```bash
# Rigenera i18n.min.js dopo ogni modifica a i18n.js (aggiunta articoli, nuove traduzioni)
npx terser sito/js/i18n.js --compress --mangle -o deploy/js/i18n.min.js

# Rigenera main.min.js dopo ogni modifica a main.js
npx terser sito/js/main.js --compress --mangle -o deploy/js/main.min.js

# Rigenera style-v2.min.css dopo ogni modifica al CSS
npx clean-css-cli sito/css/style-v2.css -o deploy/css/style-v2.min.css
```

⚠️ **Se dimentichi di rigenerare `i18n.min.js` dopo aver aggiunto articoli o traduzioni, il sito live mostrerà le chiavi i18n come testo letterale** (es. `blog_article25_title` invece del titolo vero).

### Cache-buster `?v=` — OBBLIGATORIO dopo aver rigenerato un `.min`
I file in `deploy/js/*` e `deploy/css/*` hanno `Cache-Control: immutable, max-age=1 anno` (vedi `netlify.toml`). Significa che browser e CDN servono **la versione vecchia** finché l'URL resta identico, anche dopo il push.

Ogni volta che rigeneri `i18n.min.js`, `main.min.js` o `style-v2.min.css`, **devi bumpare la stringa `?v=…`** del relativo riferimento in **tutte** le pagine HTML, altrimenti le modifiche non vanno live per i visitatori (e per Google).

```bash
# Esempio: bump di i18n.min.js a una nuova versione (es. data odierna)
python3 - <<'PY'
import glob, re
NEW = "20260620"  # cambia in YYYYMMDD
for base in ("sito","deploy"):
    for fp in glob.glob(f"{base}/**/*.html", recursive=True):
        s = open(fp, encoding="utf-8").read()
        n = re.sub(r'i18n\.min\.js\?v=[0-9]+', f'i18n.min.js?v={NEW}', s)
        if n != s: open(fp,"w",encoding="utf-8").write(n)
PY
```

## Git — `index.lock` bloccato
Errore tipico al commit/push:
```
fatal: Unable to create '.git/index.lock': File exists.
Another git process seems to be running in this repository...
```
È un lock rimasto da un processo git precedente interrotto (spesso un commit annullato o un editor chiuso male). Soluzione: rimuovi il file lock e riprova.

```bash
cd ~/Documents/casa-e-bottega-sito
rm -f .git/index.lock
git add -A && git commit -m "..." && git push origin main
```

⚠️ Rimuovi `index.lock` solo se sei sicuro che **non** ci sia un'operazione git davvero in corso (nessun commit/merge/rebase attivo in un altro terminale). Se il file è a 0 byte ed è vecchio, è quasi sempre uno stale lock sicuro da eliminare.

## Debug — consigli pratici
- **Sempre controllare la console del browser** prima di speculare sulla causa di un bug
- `ReferenceError: t is not defined` → stai usando `t()` fuori dallo scope di `main.js`
- Modal si apre allo step 2 invece che 1 → crash JavaScript a metà render, controlla la console
- Hamburger non funziona → cerca script inline con toggle duplicato nella pagina
- Link porta alla versione IT → c'è un `../` di troppo nel path del link
