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

**Workflow obbligatorio:**
1. Modifica i file in `sito/`
2. Esegui `./prepara-deploy.sh` per copiare in `deploy/`
3. Test locale: `cd deploy && python3 -m http.server 8080` → hard refresh con Cmd+Shift+R
4. Deploy: push su git → Netlify fa il deploy automatico

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

## Minificazione CSS e JS

`prepara-deploy.sh` genera automaticamente i file `.min` durante il deploy. **Non modificare manualmente i file `.min` in `sito/`** — vengono sovrascritti ad ogni deploy.

- `sito/js/main.js` → `deploy/js/main.min.js` (via terser)
- `sito/js/i18n.js` → `deploy/js/i18n.min.js` (via terser)
- `sito/css/style-v2.css` → `deploy/css/style-v2.min.css` (via clean-css-cli)

I file `.min` già presenti in `sito/` sono residui storici e vengono ignorati dallo script (che rigenera tutto in `deploy/`). Se si modifica `style-v2.css` o `i18n.js`, basta rieseguire `./prepara-deploy.sh` — nessun passo manuale aggiuntivo.

Dipendenze richieste (già installate globalmente o via npx): `terser`, `clean-css-cli`.

## Debug — consigli pratici
- **Sempre controllare la console del browser** prima di speculare sulla causa di un bug
- `ReferenceError: t is not defined` → stai usando `t()` fuori dallo scope di `main.js`
- Modal si apre allo step 2 invece che 1 → crash JavaScript a metà render, controlla la console
- Hamburger non funziona → cerca script inline con toggle duplicato nella pagina
- Link porta alla versione IT → c'è un `../` di troppo nel path del link
