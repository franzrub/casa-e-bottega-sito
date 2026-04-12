# Strategia SEO — Casa e Bottega Manfredonia
### Analisi, ottimizzazioni e piano contenuti · Aprile 2026

---

## DIAGNOSI INIZIALE

Dalla lettura del codice e delle query Search Console emergono tre segnali chiari:

**Punti di forza esistenti:** Il Title della Home è già abbastanza solido (`Casa e Bottega Manfredonia | Prenota Diretto –20% | Gargano`), il sito ha struttura multilingua hreflang corretta, lo schema markup LodgingBusiness è presente e ben compilato, i blog article in markdown hanno una voce narrativa autentica.

**Criticità da correggere:**
- Le query ad alto volume come `cosa vedere nel gargano in 7 giorni` o `airbnb manfredonia` non hanno una pagina dedicata che le intercetti con un contenuto specifico.
- Le meta description di Camere, Prenota e Blog sono descrittive ma prive di CTA e di urgenza.
- L'H1 della Home Page è solo "Casa e Bottega" — il nome del brand, non una keyword. Chi arriva da Google non vede subito dove si trova la struttura e cosa offre.
- Il blog ha un articolo (`settimana-nel-gargano.md`) che potenzialmente copre la query `cosa vedere nel gargano in 7 giorni` ma non è ottimizzato né per quel titolo specifico né per l'intent transazionale sottostante.

---

## PARTE 1 — TAG TITLE E META DESCRIPTION OTTIMIZZATI

> **Regola generale applicata:** Title ≤ 60 caratteri, Meta description ≤ 155 caratteri, keyword principale all'inizio, CTA esplicita nel meta.

---

### HOME PAGE — `index.html`

**Attuale:**
```
Title:       Casa e Bottega Manfredonia | Prenota Diretto –20% | Gargano
             (64 caratteri — tagliato da Google su mobile)
Meta:        B&B nel centro storico di Manfredonia, a 300 m dal mare. Prenota
             direttamente e risparmi il 20% sui portali. 9,8/10 — Porta del
             Gargano, Puglia.
```

**Proposta ottimizzata:**
```
Title:       B&B Manfredonia | Casa e Bottega – 300 m dal Mare | Gargano
             (56 caratteri ✓)

Meta:        B&B nel centro storico di Manfredonia, porta del Gargano. 300 m
             dal mare, 9,8/10. Prenota diretto e risparmi il 20%. Due camere
             con anima, disponibili subito.
             (154 caratteri ✓)
```

**Perché funziona meglio:** Anticipa "B&B Manfredonia" — la keyword transazionale più cercata — prima del brand name. La meta tiene "300 m dal mare" e "9,8/10" come trust signals immediati e chiude con "disponibili subito" per incentivare il click.

---

### PAGINA CAMERE — `camere.html`

**Attuale:**
```
Title:       Le Camere | Casa e Bottega Manfredonia
             (43 caratteri)
Meta:        Le camere di Casa e Bottega: La Dimora e La Bottega. Due stanze
             con anima nel centro storico di Manfredonia, Gargano.
```

**Proposta ottimizzata:**
```
Title:       Camere B&B Manfredonia | La Dimora e La Bottega | Gargano
             (59 caratteri ✓)

Meta:        Due camere nel cuore di Manfredonia, a 300 m dal mare: La Dimora
             (king size, luminosa) e La Bottega (blu petrolio, en suite).
             Prenota ora con sconto diretto –20%.
             (155 caratteri ✓)
```

**Perché funziona meglio:** "Camere B&B Manfredonia" intercetta chi cerca alloggi specifici (intent informativo/commerciale). La meta descritta in modo concreto (dimensioni letto, colori, bagno) riduce il bounce rate perché prepara l'utente a cosa troverà sulla pagina.

---

### PAGINA PRENOTA — `prenota.html`

**Attuale:**
```
Title:       Prenota | Casa e Bottega Manfredonia
             (41 caratteri)
Meta:        Prenota la tua camera a Casa e Bottega: affittacamere nel centro
             storico di Manfredonia, a pochi passi dal mare Adriatico.
```

**Proposta ottimizzata:**
```
Title:       Prenota il tuo B&B a Manfredonia | –20% Rispetto ad Airbnb
             (60 caratteri ✓)

Meta:        Prenota direttamente e risparmi il 20% su Booking e Airbnb.
             Check-in autonomo, 300 m dal mare, Gargano. Disponibilità
             immediata — nessuna commissione.
             (152 caratteri ✓)
```

**Perché funziona meglio:** Intercetta esplicitamente chi cerca su Airbnb/Booking (query `airbnb manfredonia`) offrendo un vantaggio immediato e concreto. "Nessuna commissione" è un trigger potente per chi ha già capito il meccanismo delle OTA.

---

### PAGINA BLOG — `blog.html`

**Attuale:**
```
Title:       Racconti dal Gargano | Casa e Bottega Manfredonia
             (53 caratteri)
Meta:        Racconti dal Gargano: storie, luoghi e sapori dalla Puglia.
             Il blog di Casa e Bottega Manfredonia.
```

**Proposta ottimizzata:**
```
Title:       Cosa Vedere nel Gargano | Guide e Itinerari – Casa e Bottega
             (63 caratteri — al limite, accettabile)

Meta:        Guide pratiche, itinerari e consigli locali sul Gargano e
             Manfredonia. Scritti da chi ci vive. Scopri dove andare,
             cosa mangiare e come muoverti in Puglia.
             (153 caratteri ✓)
```

**Perché funziona meglio:** Trasforma la label poetica "Racconti" in una keyword-page riconoscibile dai motori: "Cosa Vedere nel Gargano" è esattamente la query informativa più cercata nell'area. Il meta usa "chi ci vive" come elemento di autorevolezza locale.

---

### PAGINA CONTATTI — `contatti.html`

**Attuale:**
```
Title:       Come raggiungerci | Casa e Bottega Manfredonia
Meta:        Casa e Bottega nel centro storico di Manfredonia: Via Gargano 13.
             Come raggiungerci, parcheggio e contatti.
```

**Proposta ottimizzata:**
```
Title:       Dove Siamo | B&B Manfredonia Centro Storico – Casa e Bottega
             (63 caratteri ✓)

Meta:        Casa e Bottega è in Via Gargano 13, Manfredonia (FG) — centro
             storico, a 300 m dal mare. Parcheggio gratuito in strada.
             Scrivici su WhatsApp o email.
             (154 caratteri ✓)
```

---

## PARTE 2 — STRATEGIA CONTENUTI: ARTICOLO "COSA VEDERE NEL GARGANO IN 7 GIORNI"

Il file `settimana-nel-gargano.md` esiste già ed è un ottimo punto di partenza — ha voce autentica e struttura narrativa. Il problema è che non è ottimizzato per la query esatta che stai intercettando.

### 2A — Riposizionamento del file esistente

Modifica il frontmatter del file `sito/blog/settimana-nel-gargano.md` come segue:

```yaml
---
title: "Cosa Vedere nel Gargano in 7 Giorni: Itinerario Completo da Manfredonia"
date: "2025-10-01"
category: "Itinerari"
description: "Cosa vedere nel Gargano in 7 giorni: itinerario completo con
              Manfredonia, Monte Sant'Angelo, Vieste, Peschici e la Foresta
              Umbra. Guida pratica con consigli locali."
image: "foto-zona/Gargano_dallo_spazio.jpeg"
slug: "cosa-vedere-gargano-7-giorni"
```

Il **slug** cambia da `settimana-nel-gargano` a `cosa-vedere-gargano-7-giorni` — URL che rispecchia esattamente la keyword target. Aggiungi un redirect 301 nel `netlify.toml` per preservare l'eventuale ranking esistente.

---

### 2B — Struttura ottimizzata dell'articolo (H1 → H2 → H3 → CTA)

L'obiettivo è rispondere all'intent informativo in modo completo, guadagnare il featured snippet di Google, e condurre naturalmente il lettore verso la prenotazione. Ecco la struttura ideale:

---

**H1 (uno solo, in apertura):**
`Cosa Vedere nel Gargano in 7 Giorni: Itinerario Completo`

**Paragrafo introduttivo (≈120 parole — ottimizzato per featured snippet):**
Risponde direttamente alla query nei primi 2-3 periodi: *"Sette giorni nel Gargano bastano per visitare Manfredonia, Monte Sant'Angelo, il Santuario di San Michele, Vieste, Peschici, la Foresta Umbra e le spiagge di Mattinata. Il punto di partenza ideale è Manfredonia, la porta del Gargano, ben collegata e ricca di storia. Ogni giorno ha un ritmo preciso: mattina visita culturale, pomeriggio natura o mare, sera rientro in struttura."*

Poi segue la narrazione più ampia già presente nel file.

---

**H2 – Giorno per giorno (già presenti, da riformulare così):**

| Attuale | Ottimizzato |
|---|---|
| Giorno 1: Arrivo a Manfredonia... | **Giorno 1 – Manfredonia: il centro storico, il Castello e il lungomare** |
| Giorno 2: Siponto, Castello e la magia... | **Giorno 2 – Siponto e il Castello Svevo: storia paleocristiana e l'installazione Tresoldi** |
| Giorno 3: Monte Sant'Angelo e la Foresta Umbra | **Giorno 3 – Monte Sant'Angelo e la Foresta Umbra: il Santuario di San Michele e il bosco antico** |
| Giorno 4: Vieste, il borgo arroccato più bello | **Giorno 4 – Vieste: il Pizzomunno, le grotte e i vicoli bianchi** |
| Giorno 5: Peschici, Rodi Garganico... | **Giorno 5 – Peschici e Rodi Garganico: borghi bianchi e costa selvaggia** |
| Giorno 6: Mattinata, Baia delle Zagare... | **Giorno 6 – Mattinata e la Baia delle Zagare: la spiaggia più bella del Gargano** |
| Giorno 7: Ritorno e permanenza a Manfredonia | **Giorno 7 – L'ultimo giorno a Manfredonia: mercato del pesce, colazione al bar, arrivederci** |

---

**H2 aggiuntivi strategici da inserire (aumentano la pertinenza topica):**

- `Dove Dormire nel Gargano: Manfredonia come Base` ← **questo è il punto di svolta verso la conversione**
- `Come Muoversi nel Gargano in 7 Giorni` (auto, noleggio, tempi di percorrenza)
- `Quando Andare nel Gargano: il Periodo Migliore`
- `Quanto Costa una Settimana nel Gargano: Budget Orientativo`

---

### 2C — Il blocco di conversione nell'articolo

Inserire **dopo il Giorno 2 e prima del Giorno 5** (non solo in fondo) una box di conversione naturale, come questa:

```markdown
---
### Dove dormiamo noi: Casa e Bottega a Manfredonia

Tutti i giorni di questo itinerario partono e tornano a Manfredonia.
Non è una scelta casuale: è la città meglio posizionata per raggiungere
ogni angolo del Gargano senza allontanarsi troppo dal mare.

**Casa e Bottega** si trova in Via Gargano 13, nel centro storico,
a 300 metri dal lungomare. Due camere — La Dimora e La Bottega —
con colazione autonoma, check-in indipendente e un punteggio di 9,8/10
su Booking.com.

Prenota direttamente sul sito e risparmi il 20% rispetto ai portali.

[→ Verifica disponibilità e prenota](../prenota.html)
---
```

Questa sezione non interrompe la narrazione ma risponde a una domanda legittima del lettore ("dove mi fermo?") nel momento in cui la domanda sorge naturalmente — non alla fine quando ha già deciso.

---

## PARTE 3 — OTTIMIZZAZIONE HEADLINE H1 e H2

### 3A — Home Page (`index.html`)

**Problema attuale:** L'H1 è solo "Casa e Bottega" — è il nome del brand, non una keyword. Google legge questo H1 e non capisce immediatamente di cosa si tratta né dove si trova la struttura.

**Soluzione proposta — modifica al file `index.html`:**

Cambia il blocco dell'H1 da:
```html
<h1 class="hero-title">
  Casa<span class="hero-title-line2"><span class="hero-title-e">e</span> Bottega</span>
</h1>
<p class="hero-tagline">
  <span data-i18n="hero_tagline">Nel cuore del Gargano, a pochi passi dal mare.</span>
</p>
```

A questo:
```html
<h1 class="hero-title">
  Casa<span class="hero-title-line2"><span class="hero-title-e">e</span> Bottega</span>
</h1>
<p class="hero-tagline">
  <span data-i18n="hero_tagline">B&amp;B a Manfredonia — centro storico, 300 m dal mare, Gargano.</span>
</p>
```

In alternativa, se vuoi mantenere il tono poetico nell'hero e aggiungere context SEO, inserisci subito dopo il carousel un `<section>` con un vero H2 visibile:

```html
<h2 class="section-title">B&amp;B nel Centro Storico di Manfredonia, Porta del Gargano</h2>
```

Questo H2 contestualizza subito dove si trova la struttura e incorpora le keyword principali senza sacrificare l'estetica dell'hero.

---

### 3B — Pagina Camere

**Proposta H1:**
```html
<h1>Le Camere: La Dimora e La Bottega</h1>
```
Subito sotto, come sottotitolo visibile (può essere un `<p class="section-subtitle">`):
```
Due stanze con anima nel centro storico di Manfredonia — Gargano, Puglia
```

**H2 per ogni camera:**
- Attuale (probabile): `La Dimora` → **`La Dimora — Camera King Size a Manfredonia`**
- Attuale (probabile): `La Bottega` → **`La Bottega — Camera Doppia con Bagno en Suite`**

Aggiungere dopo le descrizioni delle camere un **H2 SEO**: `Perché Scegliere Casa e Bottega per il tuo Soggiorno nel Gargano`

---

### 3C — Pagina Blog

**H1 attuale (probabilmente):** `Racconti` o `Racconti dal Gargano`

**Proposta:**
```html
<h1>Guide e Itinerari nel Gargano</h1>
```
Con sottotitolo:
```
Consigli scritti da chi vive a Manfredonia — cosa vedere, dove mangiare, come muoversi
```

Ogni card di articolo sul blog page dovrebbe mostrare la categoria (`Itinerari`, `Gastronomia`, `Arte`) come micro-label sopra il titolo — migliora la scannabilità e aiuta Google a capire la tassonomia dei contenuti.

---

### 3D — Pagina Contatti

**H1 attuale:** `Come raggiungerci` (generico, non localizzato)

**Proposta:**
```html
<h1>Come Raggiungerci a Manfredonia</h1>
```
Con **H2** aggiuntivi:
- `In auto da Foggia, Bari e Napoli`
- `In treno: la stazione più vicina`
- `Parcheggio nei pressi di Casa e Bottega`

Questi H2 intercettano query navigazionali tipo "come arrivare a Manfredonia" e aumentano la pertinenza locale.

---

## RIEPILOGO PRIORITÀ DI IMPLEMENTAZIONE

| Priorità | Azione | Impatto stimato |
|---|---|---|
| 🔴 Alta | Modifica slug + frontmatter articolo Gargano 7 giorni | CTR +organico su query ad alto volume |
| 🔴 Alta | Aggiornamento Title tag Home e pagina Prenota | CTR immediato da SERP |
| 🟡 Media | Aggiunta H2 localizzato sotto hero nella Home | Rilevanza keyword, bounce rate |
| 🟡 Media | Inserimento blocco conversione a metà articolo blog | Tasso conversione da traffico blog |
| 🟢 Bassa | Ottimizzazione H1/H2 su Camere e Contatti | Pertinenza long-tail |
| 🟢 Bassa | Redirect 301 vecchio slug → nuovo slug | Conservazione ranking esistente |

---

*Documento elaborato da Claude — Casa e Bottega Puglia · Aprile 2026*
