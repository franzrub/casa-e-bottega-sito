# Checklist SEO — dopo l'analisi Semrush del 16 lug 2026

Stato di partenza: 38 keyword IT, ~5 visite/mese, 0 keyword in top 3, bucket 4–10 in crescita (3→11 da inizio luglio). Punti 1 e 3 (quick win on-page + Mattinata) già fatti il 17/07/2026.

## ✅ Fatto (17 lug 2026)
- [x] `bagno-gargano-maggio-giugno`: H1 + headline allineati a "Com'è il mare a Manfredonia", risposta diretta nel primo paragrafo, FAQ aggiunta al JSON-LD
- [x] `isole-tremiti`: H1 + headline con "traghetti da Manfredonia", anchor esatta dal bagno-article
- [x] `spiagge-gargano-manfredonia-vieste`: FAQ "Quanto dista Vieste da Manfredonia?" (visibile + JSON-LD), parola "distanza" nell'intro, anchor esatta verso bagno-article
- [x] `mattinata-borgo-bianco`: title/H1/headline con "cosa vedere", FAQ "Cosa vedere a Mattinata in un giorno?"
- [x] Gate predeploy verde — **manca solo il push da terminale**

## 🔶 Punto 2 — Keyword commerciali — link building interno fatto il 17/07
- [x] Censimento: solo 3 articoli su 29 avevano un link commerciale nel corpo
- [x] Ora **29/29 articoli** hanno ≥1 link contestuale nel corpo: 23 → homepage, 6 → camere.html
- [x] Anchor variate: "dormire a Manfredonia", "dove dormire a Manfredonia", "B&B a Manfredonia centro storico", "bed & breakfast a Manfredonia", "camere del nostro B&B a Manfredonia", ecc. (nessuna anchor dominante)
- [x] Corretto refuso in settimana-santa ("Se soggi a" → "Se soggiorni a")
- [x] H1 homepage verificato: contiene già "B&B … Manfredonia" ("Casa vacanze in stile B&B alle porte del centro storico di Manfredonia")
- [ ] Valutare una sezione "Dove dormire a Manfredonia" (testo breve + link prenota) in fondo agli articoli su Manfredonia — opzionale, seconda ondata
- [ ] Dopo 3-4 settimane: ricontrollare su Semrush se compaiono "b&b manfredonia", "dove dormire manfredonia", "b&b gargano" in top 100

## 🔶 Punto 4 — Brand SERP: "casa & bottega" pos 33 — on-page fatto il 17/07
- [x] Audit schema: homepage già ottima (LodgingBusiness con @id, alternateName, sameAs Booking+Airbnb, geo, recensioni, aggregateRating) — nessun intervento necessario
- [x] SERP check "casa e bottega manfredonia": già dominata dal sito + profili OTA. Il problema è solo il termine generico (collisione con omonimi)
- [x] Aggiunto JSON-LD (ContactPage + entità NAP + sameAs) a contatti.html, che ne era priva — gate verde
- [ ] ⚠️ **Incoerenza trovata**: Booking dichiara check-in dalle 16:00, lo schema del sito dice 15:00 → allineare (correggere Booking o lo schema)
- [ ] Verificare Google Business Profile: completo, categoria "Bed & breakfast", link a www.casaebottegapuglia.it, foto recenti, orari — solo Francesco può farlo
- [ ] Chiedere recensioni **Google** ai prossimi ospiti (oggi le recensioni sono su Booking/Airbnb; sono quelle GBP a spingere il knowledge panel)
- [ ] Uniformare il nome esatto "Casa e Bottega" su GBP, Booking, Airbnb (stesso spelling, stessa "e" non "&")
- [ ] Target realistico resta "casa e bottega manfredonia" / "+ b&b", non il generico da 1,3K

## 🔶 Punto 5 — NL/DE quasi invisibili (3 + 2 keyword) — in gran parte fatto il 17/07
- [x] Audit: traduzioni di buona qualità, ma title/meta guidavano con "Manfredonia" (sconosciuta in NL/DE) invece della regione "Gargano"
- [x] Riscritti title + meta + og/twitter delle 5 pagine principali × 2 lingue (index, camere, prenota, contatti, blog): ora guidano con "Gargano" + "Puglia/Apulien"
- [x] Corretto errore NL: "Rondkomen op de Gargano" (= sbarcare il lunario) → "Vervoer/Je verplaatsen in de Gargano" (title, H1, og, headline)
- [x] NL "Gargano reisroute" → "Rondreis Gargano" (termine di ricerca reale olandese; il DE aveva già "Gargano Rundreise")
- [ ] Validare le keyword scelte con Semrush, database NL e DE (volumi per "bed and breakfast gargano", "vakantie gargano", "rondreis gargano", "gargano urlaub", "b&b gargano apulien")
- [ ] Verificare che gli articoli blog tradotti siano indicizzati (Search Console → coperture per /nl/ e /de/)
- [ ] Controllare hreflang reciproci tra le versioni (il gate non li verifica)
- [ ] Tra 3-4 settimane: ricontrollare numero keyword NL/DE su Semrush (baseline: 3 NL, 2 DE)

## Monitoraggio
- [ ] Tra 2-3 settimane: ricontrollare posizioni di "com'è il mare a manfredonia" (era 10), "isole tremiti traghetti da manfredonia" (15), "manfredonia vieste distanza" (6), "mattinata cosa vedere" (68)
- [ ] Search Console: verificare che le 4 pagine modificate vengano ri-crawlate (eventualmente richiedere indicizzazione manuale)
