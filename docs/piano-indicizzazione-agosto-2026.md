# Piano di indicizzazione — Agosto 2026

**Property:** `sc-domain:casaebottegapuglia.it` · **Dati:** export GSC del 20/08/2026 · **Ultimo deploy:** 17/08/2026

---

## 1. Diagnosi in breve

Il sito **non ha un problema tecnico di sitemap**. La sitemap live è corretta: tutte le URL sono `www`, in formato canonico, nessuna fa redirect o 404. I redirect (195 regole: non-www→www, `blog-articolo-N`→`/blog/slug/`) e i tag on-page (canonical self-referencing + hreflang completi a 7 voci) sono corretti.

Le 294 pagine "non indicizzate" si dividono in due gruppi molto diversi:

**Gruppo A — residuo di migrazione, si risolve da solo (~136 pagine)**
"Pagina con reindirizzamento" (78) e "Pagina alternativa con tag canonical appropriato" (58) sono le **vecchie URL** (non-www, `blog-articolo-N`, `?slug=`, `?open=1`) che i redirect e i canonical convogliano volutamente sulle pagine reali. Sono nello stato *giusto*: non sono errori da correggere. Google le abbandona da solo in settimane/mesi.

**Gruppo B — il vero collo di bottiglia (~154 pagine)**
"Rilevata ma non indicizzata" (123) + "Scansionata ma non indicizzata" (31). Abbiamo pubblicato ~28 articoli × 6 lingue ≈ 170 URL blog su un dominio ancora giovane e con poca autorità. Google le scopre tutte dalla sitemap ma **razionalizza il budget di scansione/indicizzazione**: indicizza gli originali italiani e rimanda le traduzioni, che tratta come near-duplicate a bassa priorità finché il dominio non guadagna fiducia. Questo — non un bug — è ciò che tiene "Indicizzate" ferme a ~94 mentre le impression salgono (633 il 17/08).

**Nota sul deploy del 17/08:** il grafico GSC si ferma esattamente al 17/08. GSC ha 2-3 giorni di ritardo e la rielaborazione dei redirect richiede settimane: **quello che vedi è lo stato pre-deploy**. Non giudicare ancora l'effetto dell'ultimo lavoro.

---

## 2. Cosa NON fare (subito)

- **Smettere di cliccare "Convalida correzione"** sui gruppi "Pagina con reindirizzamento" e "Pagina alternativa con canonical". Sono comportamenti corretti: la convalida risulterà *sempre* "Non riuscita" perché quelle pagine devono restare redirect/canonical. È rumore che fa sembrare il quadro peggiore di com'è.
- **Non aggiungere altre lingue/pagine** finché le attuali non salgono di indicizzazione. Più URL ora = budget di scansione più diluito.
- **Non toccare** i redirect o i canonical: funzionano.

---

## 3. Interventi prioritizzati

### P0 — Questa settimana (spinta diretta)

1. **Reinvia la sitemap in GSC.** Ho aggiunto 25 URL lingua mancanti (home `/en/ /de/ /fr/ /nl/ /es/` + `camere`, `prenota`, `contatti`, `blog` per ogni lingua). Sitemap ora a 204 URL, tutte risolvono. Dopo il push: GSC → Sitemap → reinvia `https://www.casaebottegapuglia.it/sitemap.xml`.
2. **Richiedi indicizzazione manuale delle ~10 pagine commercialmente prioritarie.** GSC → Controllo URL → "Richiedi indicizzazione", per:
   - `/en/`, `/de/` (le due lingue straniere con più traffico potenziale)
   - `/en/camere.html`, `/de/camere.html`, `/en/prenota.html`, `/de/prenota.html`
   - i 2-3 articoli blog EN/DE con più impression in GSC (guarda Rendimento → filtra per pagina)
   
   Massimo ~10 richieste: sono quelle che contano per le prenotazioni, non sprecarle sulle traduzioni minori.
3. **Lancia il ping IndexNow** dopo il deploy (hai già `indexnow-ping.sh`). Aiuta Bing/Yandex e non fa male a Google.

### P1 — Prossime 2-4 settimane (discoverability + qualità)

4. **Rafforza i link interni verso le pagine tradotte.** Il gruppo "Rilevata ma non indicizzata" (123) migliora quando le pagine ricevono link interni reali, non solo hreflang. Verifica che:
   - ogni `/xx/blog.html` linki **tutti** i suoi articoli in quella lingua;
   - ogni articolo tradotto linki 2-3 articoli fratelli nella **stessa lingua** (non all'italiano);
   - le home lingua siano raggiungibili con un click dal menu in ogni pagina.
5. **Alza la qualità percepita delle traduzioni.** "Scansionata ma non indicizzata" (31) è spesso un segnale di duplicazione/contenuto debole. Controlla che le traduzioni non siano troppo brevi o troppo simili tra lingue: titolo, meta description e primo paragrafo devono essere realmente tradotti e distinti, non solo l'italiano con qualche parola cambiata.
6. **Priorità agli originali italiani già forti.** Se un articolo IT è indicizzato e va bene, assicurati che linki alla sua versione tradotta: passa autorità direttamente alla traduzione.

### P2 — Autorità del dominio (continuo, il fattore che davvero sblocca il Gruppo B)

7. **Citazioni e backlink locali.** Hai già `build_citazioni.py` e la directory citazioni: completala. Directory turistiche Gargano/Puglia, portali B&B, Pro Loco Manfredonia, partner (l'appartamento "Casa sul mare"). Ogni link autorevole alza il budget di scansione dell'intero dominio.
8. **Google Business Profile** collegato al sito, con post periodici che linkano articoli del blog: è uno dei segnali più veloci per un'attività locale.
9. **Freschezza:** aggiorna 1-2 articoli esistenti al mese (data, dettagli stagionali) invece di pubblicarne di nuovi. Segnala al crawler che vale la pena tornare.

---

## 4. Cosa aspettarsi e quando

| Orizzonte | Cosa dovrebbe succedere |
|---|---|
| 1-2 settimane | Le ~10 pagine con "Richiedi indicizzazione" iniziano a entrare nell'indice. "Indicizzate" si muove sopra 94. |
| 4-8 settimane | I gruppi "reindirizzamento" e "canonical" (136) calano man mano che Google riscansiona. Il numero totale "non indicizzate" scende **anche senza fare nulla** — è normale, non allarmarti. |
| 2-4 mesi | "Rilevata ma non indicizzata" cala con l'aumento di link interni + autorità. È il gruppo più lento: dipende dalla fiducia nel dominio, non da un fix tecnico. |

La metrica di successo **non** è "0 pagine non indicizzate" (non arriverà mai, per via dei redirect/canonical volutamente lì). È: **"Indicizzate" in crescita costante** e le **pagine commerciali chiave** (home lingua, camere, prenota) tutte in stato "Indicizzata".

---

## 5. Cosa monitorare (settimanale, 5 minuti)

- **Indexing → Pagine:** trend della curva "Indicizzate" (deve salire da 94).
- **"Rilevata ma non indicizzata":** il conteggio deve **scendere**. È il vero indicatore del Gruppo B.
- **Controllo URL** delle 10 pagine P0: da "Rilevata/Scansionata" → "Indicizzata".
- **Rendimento:** impression e click delle pagine lingua — se salgono, l'indicizzazione sta funzionando anche prima che il conteggio si aggiorni.

---

*Preparato il 20/08/2026. La sitemap aggiornata (204 URL) è già in `sito/` e `deploy/`; va solo committata e pushata, poi reinviata in GSC.*
