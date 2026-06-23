# Interventi SEO / Sitelinks — Casa e Bottega

Data: 2026-06-20

Lavoro ispirato alla checklist sitelinks usata per un altro sito, adattato a un B&B
multilingua. Il sito era già tecnicamente solido (hreflang, canonical, x-default, nav
crawlabile, schema ricco): qui sotto cosa è stato corretto/aggiunto e cosa resta da fare
manualmente da parte tua.

## Cosa è stato fatto (codice — già in `sito/` e `deploy/`)

1. **Canonical pagine appartamento**
   - `casa-con-vista.html`: canonical (e `og:url`) corretti da
     `https://casaebottegapuglia.it/casa-con-vista` (senza www, senza `.html`) a
     `https://www.casaebottegapuglia.it/casa-con-vista.html`.
   - `casa-sul-mare.html`: aggiunto il canonical mancante
     `https://www.casaebottegapuglia.it/casa-sul-mare.html`.

2. **Sitemap riscritta e pulita** (`sitemap.xml`)
   - Rimossi 4 slug blog duplicati.
   - Aggiunti i 4 slug IT mancanti (giro-in-barca-gargano, manfredonia-tre-giorni,
     peschici-borgo-sul-mare, spiagge-lidi-manfredonia).
   - Ogni articolo ora è dichiarato in tutte le 6 lingue come URL proprio con hreflang
     reciproci (prima erano "orfani": solo IT, traduzioni assenti).
   - Aggiunte le 2 pagine appartamento.
   - Totale: 184 URL, zero duplicati, XML validato.

3. **Voce di menu "Posizione" → "Contatti"**
   - Etichetta resa standard e identica su tutte le pagine, in tutte le lingue:
     IT "Contatti", EN/FR/NL "Contact", DE "Kontakt", ES "Contacto".
   - Corretta anche una forte incoerenza preesistente (es. il FR aveva 5 varianti diverse
     come "Accès", "Emplacement", "Lieu", "Situation"…). Anchor text stabile = requisito
     per i sitelink.

4. **Ricerca reale sul blog (`?q=`)**
   - Aggiunto un campo di ricerca su `blog.html` (tutte le 6 lingue) che filtra gli
     articoli per titolo/estratto/categoria, integrato col filtro categorie esistente.
   - Legge il parametro `?q=` dall'URL: questo rende **veritiero** il `SearchAction` dello
     schema WebSite (prima puntava a una ricerca inesistente).

5. **Internal linking contestuale dalla home**
   - Nella sezione "Il Gargano a piedi" aggiunti link descrittivi a **Racconti** (la
     sezione meno linkata) e a **Contatti**, tradotti nelle 6 lingue.

6. **Minified rigenerato**
   - `deploy/js/i18n.min.js` rigenerato (unico file `.min` impattato; `main.js` e
     `style-v2.css` non sono stati toccati).

## Cosa devi fare tu (non automatizzabile da qui)

### Google Search Console — proprietà Domain + sitemap
Il punto più importante che resta. Finché usi una proprietà sbagliata o lo stato sitemap è
"Couldn't fetch", Google ha una mappa incompleta del sito.

1. Vai su [Google Search Console](https://search.google.com/search-console).
2. Aggiungi proprietà → scegli **"Dominio"** (non "Prefisso URL") → inserisci
   `casaebottegapuglia.it`.
3. Verifica con il record **TXT DNS** che GSC ti fornisce (da aggiungere dal pannello del
   tuo provider DNS / registrar del dominio).
4. Una volta verificata la proprietà Domain, vai in **Sitemap** e invia:
   `https://www.casaebottegapuglia.it/sitemap.xml`
5. Controlla dopo qualche giorno che lo stato sia "Operazione riuscita" e che il numero di
   URL rilevati sia coerente (≈184).

La proprietà Domain copre www/non-www e http/https insieme: è la più completa e risolve
l'ambiguità che bloccava la lettura del sitemap.

### Autorità di brand (leva non tecnica, la più lenta)
"Casa e Bottega" è un nome ambiguo (espressione comune). Per i sitelink contano i segnali
di brand:
- Cura il **Google Business Profile** (foto, orari, descrizione, post, risposte alle
  recensioni).
- Stimola ricerche brand specifiche tipo "Casa e Bottega Manfredonia" e click coerenti.
- Le recensioni e il tempo fanno il resto: i sitelink premiano siti maturi e cliccati.

## Note tecniche
- Tutte le modifiche sono state replicate in `sito/` (source of truth) e `deploy/`
  (pubblicato da Netlify), come da regola della doppia copia.
- Il deploy va fatto da te con push su GitHub (Netlify pubblica dalla cartella `deploy/`).
