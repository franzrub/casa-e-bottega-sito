# Telecamera Monitor

Rileva persone nell'inquadratura della telecamera EZVIZ del B&B e invia un alert
con foto su Telegram. Nessuna GPU richiesta (YOLOv8n su CPU/MPS).

## 1. Account EZVIZ Open Platform

1. Registrati su https://open.ezviz.com (o https://iusopen.ezviz.com a seconda
   della regione del tuo account EZVIZ) e crea una nuova applicazione per
   ottenere `AppKey` e `AppSecret`.
2. Aggiungi la telecamera al tuo account developer: nell'app EZVIZ vai su
   Informazioni dispositivo per recuperare il **numero di serie** (`deviceSerial`)
   e il **codice di verifica**, poi collega il dispositivo alla piattaforma
   dalla console EZVIZ Open Platform (operazione da fare una sola volta).

## 2. Bot Telegram

1. Apri una chat con [@BotFather](https://t.me/BotFather) su Telegram, invia
   `/newbot` e segui le istruzioni: otterrai un **bot token**.
2. Invia un messaggio qualsiasi al tuo bot appena creato, poi visita
   `https://api.telegram.org/bot<TOKEN>/getUpdates` nel browser: nel JSON di
   risposta troverai il tuo **chat ID** (`message.chat.id`).

## 3. Installazione

```bash
cd telecamera-monitor
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
# apri .env e compila EZVIZ_APP_KEY, EZVIZ_APP_SECRET, EZVIZ_DEVICE_SERIAL,
# TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
```

## 4. Avvio manuale (per test)

```bash
.venv/bin/python3 monitor.py
```

I log vengono scritti in `telecamera-monitor.log` nella cartella del progetto.
Premi Ctrl+C per fermare.

## 5. Avvio automatico su macOS (LaunchAgent)

```bash
# sostituisci i placeholder con i path reali
sed -e "s|__VENV_PYTHON_PATH__|$(pwd)/.venv/bin/python3|g" \
    -e "s|__PROJECT_DIR__|$(pwd)|g" \
    launchd/com.casaebottega.telecamera-monitor.plist \
    > ~/Library/LaunchAgents/com.casaebottega.telecamera-monitor.plist

launchctl load ~/Library/LaunchAgents/com.casaebottega.telecamera-monitor.plist
```

Per fermarlo: `launchctl unload ~/Library/LaunchAgents/com.casaebottega.telecamera-monitor.plist`

**Limite noto:** funziona solo quando il Mac è acceso e sveglio (non in sleep).

## 6. Portabilità: passaggio a un dispositivo Linux dedicato (es. Raspberry Pi)

Tutto il codice Python (`config.py`, `ezviz_client.py`, `detector.py`,
`telegram_notifier.py`, `monitor.py`) gira invariato su Linux. L'unica parte
da sostituire è l'avvio automatico:

```bash
sed -e "s|__VENV_PYTHON_PATH__|/home/pi/telecamera-monitor/.venv/bin/python3|g" \
    -e "s|__PROJECT_DIR__|/home/pi/telecamera-monitor|g" \
    systemd/telecamera-monitor.service | sudo tee /etc/systemd/system/telecamera-monitor.service

sudo systemctl enable --now telecamera-monitor.service
```

Il backend di inferenza passa automaticamente a `cpu` (non essendoci `mps` su
Linux) — nessuna modifica al codice necessaria. Se in futuro si aggiunge un
Coral USB Accelerator, si estende `detector.py` con un backend `edgetpu`
aggiuntivo, senza toccare gli altri componenti.

## 7. Configurazione

Vedi `.env.example` per tutte le variabili disponibili (intervallo di
polling, soglia di confidenza, cooldown alert, soglia cicli offline).
