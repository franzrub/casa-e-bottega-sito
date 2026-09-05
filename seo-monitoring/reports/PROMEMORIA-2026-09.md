# Promemoria SEO — Settembre 2026

**Controllo del 2026-09-04:** nessun export nuovo da analizzare.

L'ultimo mese analizzato è **agosto 2026** (report `seo-monitoring/reports/seo-2026-08.md`), basato sulla cartella `seo-monitoring/exports/2026-08/rendimento/`. In `seo-monitoring/exports/` non è presente alcuna cartella `2026-09/` con dati "Rendimento" più recenti, quindi non c'è nulla da confrontare con la baseline.

## Come esportare i dati per il controllo di settembre

1. Vai su Google Search Console → **Rendimento**
2. Imposta il filtro data su **"Ultimi 3 mesi"**
3. Clic su **Esporta** → **CSV**
4. Scompatta i file (Chart.csv, Queries.csv, Pages.csv, Countries.csv, Devices.csv) in una nuova cartella:
   `seo-monitoring/exports/2026-09/`
5. Rilancia il controllo mensile.

## Note dai mesi precedenti (da verificare al prossimo export)

- **Finestra dati:** negli export di giugno e luglio, nonostante il filtro dicesse "Ultimi 3 mesi", l'intervallo effettivo era molto più corto (8 giorni a giugno, 38 giorni ad agosto). Prima di scaricare, controlla l'intervallo di date reale nell'export per avere una finestra comparabile più ampia.
- **Tracking non-www:** ad agosto 2026 il 43% dei click e il 34% delle impressioni erano ancora sulla versione non-www del dominio (redirect 301 attivo, ma indicizzazione lenta a ripulirsi). Al prossimo export verifica se la percentuale è in calo. Se resta stabile o cresce, controlla manualmente: (a) property separata non-www in Search Console con sitemap ancora attiva, (b) campo "sito web" nel profilo Google Business/Maps (probabile citazione esterna che rinforza l'URL sbagliato).
- **4 query scomparse dal tracking** ad agosto (vacanze manfredonia, itinerario gargano 7 giorni, cosa vedere nel gargano in 7 giorni, mattinata paese): l'articolo IT `settimana-nel-gargano` non compariva più tra le pagine con impressioni. Da verificare in GSC filtrando per quella pagina.

Una volta caricata la cartella `2026-09/`, rilancia il task.
