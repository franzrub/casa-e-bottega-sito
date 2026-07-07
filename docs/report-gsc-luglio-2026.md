# Report Search Console — 2 luglio 2026

Analisi dei due export GSC (property URL-prefix, ultimi 3 mesi + nuova domain property, ~9 giorni) incrociata con audit del sito.

## Fotografia attuale

3 mesi: **89 click, 6.022 impressioni, CTR ~1,5%, posizione media ~8–10**. Trend impressioni in crescita costante (da ~10/giorno a fine marzo a ~70–100/giorno a fine giugno). Il blog genera la maggior parte della visibilità; l'homepage da sola fa 1.199 impressioni ma con CTR bassissimo (0,58%).

La parte tecnica è già solida: canonical www coerente, 301 completi sui vecchi URL blog (anche versioni lingua ed extensionless), sitemap pulita, hreflang, schema ricco (LodgingBusiness, HotelRoom, FAQ, Review). Nessun intervento tecnico urgente. La domain property sta correttamente consolidando www + non-www.

Nota transitoria: la pagina più cliccata è ancora un URL legacy (`/blog-articolo-14`, 12 click, pos 6.25). I redirect ci sono; Google consoliderà sui nuovi slug nelle prossime settimane. Non serve fare nulla.

## Le 5 opportunità principali (in ordine di impatto)

### 1. Homepage: CTR 0,58% su 1.199 impressioni
È il problema n.1 nei dati. La homepage appare in pagina 1 (pos ~6) ma quasi nessuno clicca. Query interessate: `airbnb manfredonia` (101 impr, pos 7.2), `vacanze manfredonia` (88, pos 10), `b&b manfredonia` (34, pos 12.9), `bungalow manfredonia` (29, pos 15.7).

Azioni:
- Riscrivere title/description in ottica "annuncio": mettere in prima riga i differenziatori concreti (300 m dal mare, centro storico, −20% diretto, valutazione ospiti). Es. title: `B&B Manfredonia centro storico, 300 m dal mare | −20% prenotando diretto`.
- Rafforzare l'H1 e il primo paragrafo con "B&B a Manfredonia" (oggi il title dice "Appartamento Vacanze stile B&B" — Google fatica ad associarvi alla query secca `b&b manfredonia`).
- Il report "Search appearance" è vuoto: nessun rich result attivo. Verificare in GSC → Miglioramenti che gli schema Review/FAQ siano validi; le stelline in SERP alzerebbero molto il CTR.

### 2. Brand debole: `casa e bottega` a pos 12.7 con 0 click
`casa e bottega manfredonia` va benissimo (pos 2.9, CTR 10%), ma la query secca `casa e bottega` (86 impr) vi vede in pagina 2 — persa contro omonimi. Leva principale: **Google Business Profile** (se non c'è, crearlo subito; se c'è, completarlo con foto, link al sito, e chiedere recensioni Google agli ospiti). NAP coerente (nome, Via Gargano 13, telefono) su Booking, Airbnb, PagineGialle e portali turistici. È anche la leva più forte per le query locali del punto 1.

### 3. Cluster "traghetti Tremiti": domanda alta, copertura parziale
Query sparse su ~10 varianti (`traghetto manfredonia tremiti`, `prezzi`, `costo`, `biglietti`, `san domino o san nicola`…): **~90 impressioni totali, posizioni 12–28, 0 click**. L'articolo `isole-tremiti` è generalista. Scrivere un articolo dedicato pratico: **"Traghetti Manfredonia–Tremiti 2026: orari, prezzi, biglietti"** con tabella prezzi, compagnie, FAQ (inclusa "San Domino o San Nicola?" — query reale a pos 28). Linkarlo da `isole-tremiti` e dalla homepage.

### 4. Pagine "quasi prima pagina" da spingere con link interni
Pagine con tante impressioni ferme a pos 10–13 — basta poco per farle salire:

| Pagina | Impr | Pos | Azione |
|---|---|---|---|
| spiagge-gargano-manfredonia-vieste (IT+EN) | 867 | ~11 | link interni da homepage e articoli correlati |
| isole-tremiti | 212 | 12.9 | idem + link dal nuovo articolo traghetti |
| mattinata-borgo-bianco | 207 | 12.6 | 0 click su 207 impr: rivedere anche title/description |
| locali-gargano (EN) | 211 | 14.5 | link interni dalle pagine EN |

Aggiungere in homepage una sezione "Dal blog" con 3–4 link a queste pagine (se non c'è già) e curare i link contestuali tra articoli.

### 5. Mercato inglese sottosfruttato
US: 675 impressioni, CTR 0,44%. Query EN in crescita (`manfredonia beaches` pos 10, `is manfredonia worth visiting` pos 8.5, `gargano easy to reach`). Le pagine EN rankano ma non convertono il click: passare le meta description EN in ottica benefit (prezzi, esempi concreti) e valutare 1–2 articoli EN nativi (es. "Manfredonia: is it worth visiting?" — risponde a una query reale).

## Query informative rapide (quick win)
`manfredonia vieste distanza` + varianti: ~68 impr a pos ~10, servite da `muoversi-nel-gargano`. Aggiungere all'inizio dell'articolo una risposta secca in un box ("Manfredonia–Vieste: 90 km, ~2 ore") + FAQ schema: candidata a featured snippet.

`siponto basilica` (~33 impr, pos 12): l'articolo Tresoldi c'è; rafforzare title con "Basilica di Siponto" esatto e link interni.

## Cosa NON serve fare
- Nessun intervento su redirect/sitemap/canonical: già a posto.
- Non toccare i file `blog-articolo-N.html`: sono dead end già gestiti.
- Mobile ok (pos 8.3 mobile vs 13.2 desktop, sito mobile-first funziona).

## Ordine di esecuzione suggerito
1. Google Business Profile + recensioni (fuori dal sito, impatto massimo)
2. Title/description homepage + verifica rich results
3. Articolo traghetti Tremiti
4. Passata link interni + box risposta distanze
5. Meta description EN + articolo EN nativo
