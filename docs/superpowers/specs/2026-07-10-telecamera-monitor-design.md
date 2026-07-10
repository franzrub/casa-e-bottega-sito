# Telecamera Monitor — Rilevamento persone e alert Telegram

**Data:** 2026-07-10
**Stato:** approvato, in attesa di piano di implementazione

## Contesto e obiettivo

Il B&B ha una telecamera esterna EZVIZ (ecosistema cloud, nessun accesso RTSP locale disponibile sul modello in uso). L'obiettivo è ricevere un alert (foto + orario) su Telegram quando una persona viene rilevata nell'inquadratura — utile per sapere quando arrivano ospiti o per sicurezza generale.

Vincoli:
- Nessuna GPU dedicata (NVIDIA) disponibile.
- Nessun hardware aggiuntivo da acquistare in questa fase (Option C: soluzione solo software).
- Il dispositivo che fa girare lo script oggi è un Mac Apple Silicon (M1), ma **la soluzione deve restare portabile** a un futuro dispositivo dedicato (Raspberry Pi / mini PC Linux) senza riscrittura.
- Progetto indipendente dal sito del B&B: vive in una cartella separata nella stessa repo, fuori dal workflow `sito/` ⇄ `deploy/` e dal gate `predeploy-check.sh` (che riguarda solo l'artefatto del sito).

Fuori scope per questa versione:
- Rilevamento di veicoli, pacchi, o zone specifiche dell'inquadratura.
- Copertura 24/7 garantita (limite noto: funziona solo quando il Mac/dispositivo è acceso e sveglio).
- Storico/dashboard delle rilevazioni oltre a un log locale.

## Architettura

Un unico processo Python (`monitor.py`) in loop continuo. Ogni ciclo (default: ogni 15 secondi):

1. **Autenticazione EZVIZ** — ottiene/rinnova un access token via EZVIZ Open Platform (`POST /api/lapp/token/get`). Il token è valido 7 giorni; lo script lo rinnova in automatico prima della scadenza o alla ricezione dell'errore `10002` (token scaduto).
2. **Cattura snapshot** — chiama `POST /api/lapp/device/capture` per ottenere un `picUrl` (JPEG, valido 2 ore), scarica l'immagine.
3. **Rilevamento persona** — esegue inferenza con YOLOv8n (libreria `ultralytics`) sull'immagine, filtrando sulla classe `person` con soglia di confidenza 0.5. Il backend di calcolo è selezionato automaticamente in base al dispositivo:
   - `mps` se disponibile (Apple Silicon)
   - `cpu` come fallback universale (Raspberry Pi, mini PC, Intel Mac)
4. **Alert condizionale** — se viene rilevata una persona e sono passati almeno 5 minuti dall'ultimo alert inviato (cooldown, per evitare spam se qualcuno resta nell'inquadratura), invia su Telegram la foto con timestamp.
5. **Log locale** — ogni rilevazione (e ogni errore) viene scritta in un file di log locale, per poter verificare a posteriori cosa è successo.

### Gestione errori

| Caso | Comportamento |
|---|---|
| Token scaduto (`10002`) | Refresh automatico del token, poi retry del ciclo corrente |
| Limite frequenza cattura (`10028`) | Backoff: raddoppia temporaneamente l'intervallo di polling, poi torna al default |
| Device offline (`20007`) / timeout (`20008`) | Skip del ciclo, log del warning; se offline per troppi cicli consecutivi (soglia configurabile, default 10 = ~2.5 min), invia un alert Telegram dedicato ("telecamera irraggiungibile") così è chiaro che il monitoraggio si è interrotto, non solo che non è successo nulla |
| Crash del processo | Il processo viene riavviato automaticamente dal supervisore del sistema operativo (vedi sotto) |
| Dispositivo (Mac) in sleep o spento | Nessuna copertura — limite noto e accettato di questa soluzione, non gestito via codice |

## Componenti

```
telecamera-monitor/
├── monitor.py             ← main loop: orchestrazione, cooldown, log
├── ezviz_client.py         ← autenticazione + chiamata capture verso EZVIZ Open Platform
├── detector.py              ← carica YOLOv8n, esegue inferenza, seleziona backend (mps/cpu)
├── telegram_notifier.py     ← invio foto + messaggio via Telegram Bot API
├── config.py                 ← legge credenziali e parametri da .env
├── .env.example                ← template variabili (AppKey/Secret EZVIZ, device serial, bot token/chat id, soglie/intervalli)
├── .gitignore                   ← esclude il vero .env (mai committare credenziali)
├── requirements.txt
├── tests/
│   └── test_detector.py          ← test isolato su immagini campione (con/senza persona)
└── README.md                       ← setup account EZVIZ developer, bot Telegram, avvio automatico, note sulla portabilità hardware
```

**Confini dei componenti:**
- `ezviz_client.py` non sa nulla di detection o Telegram — espone solo `get_snapshot() -> bytes`.
- `detector.py` non sa nulla di EZVIZ o Telegram — espone `detect_person(image_bytes) -> (bool, float)` (rilevato, confidenza).
- `telegram_notifier.py` non sa nulla di EZVIZ o detection — espone `send_alert(image_bytes, message)`.
- `monitor.py` è l'unico componente che li conosce tutti e li orchestra, insieme alla logica di cooldown ed errori.

Questa separazione permette di sostituire un componente (es. `ezviz_client.py` con un client RTSP locale, se in futuro si cambia telecamera) senza toccare gli altri.

## Portabilità hardware (per un cambio futuro di dispositivo)

Cosa resta identico spostandosi da Mac a Raspberry Pi/mini PC Linux:
- `ezviz_client.py`, `telegram_notifier.py`, `detector.py` (tranne la selezione del backend, già automatica), `monitor.py` — tutto codice Python puro, nessuna dipendenza macOS.

Cosa cambia:
- **Avvio automatico**: su Mac si usa un **LaunchAgent** (`~/Library/LaunchAgents/`, con `KeepAlive` per riavvio automatico in caso di crash). Su Linux si sostituisce con un **systemd service** equivalente. Il README documenta entrambi.
- Se in futuro si aggiunge un **Coral USB Accelerator**, si estende `detector.py` con un backend aggiuntivo (`edgetpu`), senza toccare gli altri componenti.

## Configurazione (variabili in `.env`)

- `EZVIZ_APP_KEY`, `EZVIZ_APP_SECRET` — credenziali app da EZVIZ Open Platform
- `EZVIZ_DEVICE_SERIAL` — numero seriale del dispositivo
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — credenziali bot Telegram

Il codice di verifica del dispositivo (etichetta fisica o app) serve solo per l'operazione una tantum di collegamento della telecamera all'account developer (vedi "Setup richiesto" sotto) — non è usato dalle chiamate API a runtime, quindi non è una variabile `.env`.
- `POLL_INTERVAL_SECONDS` (default 15)
- `DETECTION_CONFIDENCE_THRESHOLD` (default 0.5)
- `ALERT_COOLDOWN_SECONDS` (default 300)
- `OFFLINE_ALERT_AFTER_CYCLES` (default 10)

## Testing

- **Test manuale end-to-end**: mettersi davanti alla telecamera, verificare che l'alert Telegram arrivi con la foto corretta entro un ciclo di polling.
- **Test automatico del detector** (`tests/test_detector.py`): due immagini campione (una con persona, una senza) verificano che `detect_person()` ritorni l'esito atteso.
- **Verifica cooldown**: due rilevazioni ravvicinate (entro la finestra di cooldown) devono produrre un solo alert Telegram.
- **Verifica gestione offline**: simulare una risposta `20007` dal client EZVIZ (mock) e verificare che dopo N cicli consecutivi parta l'alert dedicato.

## Setup richiesto (prerequisiti, da fare prima/durante l'implementazione)

1. Account developer su EZVIZ Open Platform (open.ezviz.com o iusopen.ezviz.com a seconda della regione), creazione di un'app per ottenere AppKey/AppSecret.
2. Aggiunta del dispositivo camera all'account developer (serial number + verification code, reperibili nell'app EZVIZ in "Informazioni dispositivo").
3. Creazione di un bot Telegram via @BotFather, recupero del bot token e del chat ID (inviando un messaggio al bot e leggendo `getUpdates`).
