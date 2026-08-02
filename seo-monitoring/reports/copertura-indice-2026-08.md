# Report Copertura Indice — Casa e Bottega (agosto 2026)

Fonte: export "Copertura indice" (Indicizzazione pagine) di Google Search Console, caricato dall'utente il 2026-08-01. File in `seo-monitoring/exports/2026-08/coverage/`.

⚠️ **Nota:** questo NON è l'export "Rendimento" (Queries/Pages/Countries/Devices) usato per il report mensile SEO. Quei file non sono arrivati nel caricamento — vedi sezione finale.

## Il problema: pagine indicizzate in caduta libera

| Data | Indicizzate | Non indicizzate | Impressioni |
|---|---|---|---|
| 2026-05-26 (picco) | 98 | 27 | 156 |
| 2026-06-30 | 63 | 68 | 93 |
| 2026-07-10 | 38 | 93 | 78 |
| 2026-07-24 (ultimo dato) | **26** | **105** | 29 |

Da fine maggio al 24 luglio le pagine indicizzate sono crollate da 98 a 26 (**-73%**), mentre le pagine escluse sono salite da 27 a 105. Il calo è continuo e non si è ancora fermato all'ultima data disponibile — non è un incidente isolato, è un trend.

## Causa identificata e già corretta

Ho controllato ogni pagina del sito confrontando il tag `<link rel="canonical">` dichiarato con l'URL reale della pagina. Trovato un bug sistemico:

**Le pagine `contatti.html` di tutte e 5 le lingue (EN, FR, DE, NL, ES) avevano il canonical che punta alla versione italiana invece che a se stesse**, mentre i tag hreflang erano corretti. Esempio (`en/contatti.html` prima della correzione):

```
canonical → https://www.casaebottegapuglia.it/contatti.html   (SBAGLIATO: punta alla IT)
hreflang en → https://www.casaebottegapuglia.it/en/contatti.html   (corretto)
```

Un canonical che punta altrove dice esplicitamente a Google "questa pagina è un duplicato, indicizza l'altra" — è la causa diretta della categoria di esclusione "Alternative page with proper canonical tag" (38 pagine nell'export). Sembra un errore di copia-incolla del blocco `<head>` fatto in fase di creazione delle pagine tradotte, corretto solo nell'hreflang e non nel canonical.

**Ho già corretto il bug** in tutte le 10 copie (5 lingue × `sito/` + `deploy/`):
`en/contatti.html`, `fr/contatti.html`, `de/contatti.html`, `nl/contatti.html`, `es/contatti.html` — canonical ora autoreferenziale.

Gate pre-deploy eseguito dopo la correzione: **OK**, nessun FAIL. 12 WARN non bloccanti e non collegati a questa modifica (fallback prezzo hero di agosto non aggiornato in tutte le lingue — segnalazione separata, vedi sotto).

## Altre categorie nel report "Critical issues" (105 pagine escluse)

| Motivo | Pagine | Validazione | Interpretazione |
|---|---|---|---|
| Page with redirect | 42 | Failed | Atteso: sono gli URL legacy (non-www, `blog-articolo-N.html`) che devono restare esclusi perché fanno 301. Non è un errore da correggere — è il comportamento corretto di un redirect. "Failed" qui non significa che il redirect non funziona. |
| Alternative page with proper canonical tag | 38 | Not Started | In parte spiegato dal bug sopra (5 pagine `contatti`); le restanti ~33 vanno riverificate al prossimo export dopo la correzione — potrebbero includere varianti non-www ancora in coda di ri-crawling. |
| Crawled - currently not indexed | 21 | Failed | Google ha scansionato ma scelto di non indicizzare. Da monitorare: può risolversi da sola quando calano i segnali di duplicazione (vedi sopra) o richiedere contenuto/link interni più forti. |
| Excluded by 'noindex' tag | 1 | Not Started | Verosimilmente intenzionale (es. pagina admin/regole). |
| Not found (404) | 2 | Started | Servirebbe l'elenco URL puntuale (Page indexing report in GSC) per identificarli — non presente in questo export. |
| Redirect error | 1 | Started | Idem, da controllare via GSC → Pagine → dettaglio. |

## Cosa fare adesso

1. **Attendere il prossimo export (settembre) per verificare l'effetto della correzione del canonical.** Se il numero di pagine indicizzate torna a salire e "Alternative page with proper canonical tag" scende sotto 38, la causa era quella.
2. **Non toccare la categoria "Page with redirect" (42 pagine)** — è comportamento corretto, non un'anomalia da "validare" in Search Console.
3. **Aprire in GSC → Pagine → "Not found (404)" e "Redirect error"** per vedere i 3 URL puntuali coinvolti (non disponibili in questo export CSV) e valutare se serve un redirect aggiuntivo.
4. **Fallback prezzo hero disallineato per agosto** (segnalato dal gate, non correlato all'indicizzazione): tutte le versioni lingua di `index.html` mostrano ancora €90 mentre il minimo di agosto in `_data/prezzi.json` è €100. Da aggiornare nel fallback statico di `main.js`/HTML.

## File mancanti dall'ultimo caricamento

L'utente ha caricato 11 file ma solo 4 sono arrivati (probabilmente per collisione di nome: due export diversi contenevano entrambi un file `Chart.csv`, e solo l'ultimo caricato ha sovrascritto gli altri). Mancano i file dell'export "Rendimento" necessari per il report mensile SEO standard:

`Countries.csv`, `Devices.csv`, `Filters.csv`, `Pages.csv`, `Queries.csv`, `Search appearance.csv`

Per completare il confronto con la baseline (query prioritarie, click, CTR) serve ricaricarli — idealmente in un messaggio separato dall'export di Copertura indice, per evitare la stessa collisione di nomi file.
