# Pricing Sett–Dic 2026 — razionale e decisioni

_Ultimo aggiornamento: 2026-09-04_

Nota che accompagna l'introduzione dei `date_overrides` in `_data/prezzi.json`.
Spiega **perché** questi numeri, così che i prossimi aggiornamenti partano da una logica, non da zero.

## Contesto di mercato (Manfredonia, Sett–Dic)

Manfredonia è un mercato **balneare estivo**: la domanda crolla dopo metà settembre
e resta bassa fino alla primavera, con pochi picchi festivi a dicembre.

Prezzi rilevati per camere doppie comparabili in città (ricerca web, sett 2026):

| Tipo | Fascia a notte |
|---|---|
| Doppie B&B standard (Diomede, Piazza Marconi, Le Ferule, La Dolce Vista) | ~€37–€61 |
| Appartamenti/strutture centrali di fascia alta (Del Corso, centrale 2-cam) | ~€80–€99 |

Casa e Bottega è design-led, en-suite, centro storico, 300 m dal mare → appartiene
alla **fascia alta**. Ma €110/€100 per **tutto** settembre era troppo per la seconda
metà del mese, quando si compete con camere a €50 e la stagione balneare è finita.
Questo era il difetto principale da correggere.

## Prezzi di default per mese (mesi_prezzi)

| Mese | La Dimora | La Bottega | Prima |
|---|---|---|---|
| Settembre | €90 | €80 | €110 / €100 |
| Ottobre | €65 | €55 | €60 / €50 |
| Novembre | €55 | €48 | €60 / €50 |
| Dicembre | €55 | €48 | €60 / €50 |

## Override per data (date_overrides)

Settembre è di fatto due stagioni in un mese, e dicembre ha tre picchi di domanda:
cose che il prezzo mensile non può esprimere. Da qui gli override.

| Periodo | La Dimora | La Bottega | Motivo |
|---|---|---|---|
| 1–14 Set | €100 | €90 | Alta stagione, mare caldo |
| 15–30 Set | €75 | €65 | Stagione finita, prezzo per riempire |
| 5–8 Dic (Ponte Immacolata) | €75 | €65 | Vero weekend di viaggio italiano |
| 24–26 Dic (Natale) | €70 | €60 | Domanda "visita ai parenti", non turistica → premio contenuto |
| 30 Dic–2 Gen (Capodanno) | €90 | €80 | Il picco più forte di dicembre |

### Nota sul 25 dicembre
Premio sì, ma **contenuto**. A Manfredonia il Natale porta gente che visita la
famiglia (e spesso dorme dai parenti), non turismo: €70/€60 è realistico, non €110.
**Capodanno è la data su cui spingere di più.**

## Cose da tenere a mente

- Questi sono **numeri di partenza**: da rivedere con i dati reali di occupazione.
- `date_overrides` vive ora in più fallback hardcoded (`prenota.html`, hero +
  `FALLBACK_OVERRIDES` in `main.js`) oltre a `prezzi.json`: **tenerli sincronizzati**,
  stessa regola del `FALLBACK` mensile.
- Il gate `predeploy-check.sh` (check 7) è ora override-aware.
- Aperto: la pagina "Le Camere" mostra il prezzo mensile, non l'override → possibile
  mismatch (es. oggi camere €90 vs booking €100). Valutare se renderla override-aware.
