# Promemoria SEO — Agosto 2026

**Aggiornamento 2026-08-01:** è arrivato un export, ma era quello di "Copertura indice" (indicizzazione pagine), non quello di "Rendimento" (Queries/Pages/Countries/Devices) necessario per il confronto con la baseline. Analizzato separatamente in `seo-monitoring/reports/copertura-indice-2026-08.md` — trovato e corretto un bug sui canonical tag delle pagine `contatti.html` tradotte.

Per il report mensile standard (query prioritarie vs baseline) serve ancora l'export "Rendimento". L'ultima cartella disponibile per quello resta `seo-monitoring/exports/2026-07/`, già analizzata nel report `seo-monitoring/reports/seo-2026-07.md` (generato il 1 luglio 2026).

Per il controllo di agosto, esporta i dati aggiornati da Google Search Console:

1. Vai su Google Search Console → **Rendimento**
2. Imposta il filtro data su **"Ultimi 3 mesi"**
3. Clic su **Esporta** → **CSV**
4. Scompatta i file (Chart.csv, Queries.csv, Pages.csv, Countries.csv, Devices.csv) in una nuova cartella:
   `seo-monitoring/exports/2026-08/`

Nota dal report di luglio: l'export precedente copriva solo 8 giorni (2026-06-22 → 2026-06-29) invece dei "3 mesi" attesi dal filtro — verifica l'intervallo di date effettivo nell'export prima di scaricare, per avere una finestra comparabile più ampia.

Una volta caricata la cartella, rilancia il controllo mensile.
