# Telecamera Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Script Python che monitora la telecamera EZVIZ del B&B, rileva persone via YOLOv8n (CPU/MPS, nessuna GPU dedicata) e invia alert con foto su Telegram.

**Architecture:** Loop di polling a intervalli fissi: cattura snapshot via EZVIZ Open Platform → inferenza YOLOv8n locale → alert Telegram condizionale (con cooldown e gestione offline). Componenti separati con confini netti (client EZVIZ, detector, notifier, orchestratore), ognuno testabile in isolamento con dipendenze finte.

**Tech Stack:** Python 3, `ultralytics` (YOLOv8n), `requests`, `python-dotenv`, `Pillow`, `pytest`.

## Global Constraints

- Nessuna GPU NVIDIA disponibile; backend di inferenza: `mps` su Apple Silicon, fallback `cpu` ovunque altro.
- Nessun hardware dedicato acquistato in questa fase — lo script gira su un Mac M1, ma deve restare portabile a Linux (Raspberry Pi/mini PC) senza riscrittura del codice di business logic.
- Intervallo di polling default: 15 secondi (l'API EZVIZ richiede minimo ~4 secondi tra catture).
- Soglia di confidenza detection default: 0.5.
- Cooldown alert default: 300 secondi (5 minuti).
- Soglia cicli offline consecutivi prima dell'alert dedicato: 10 cicli.
- Token EZVIZ valido 7 giorni; `picUrl` dello snapshot valido 2 ore.
- Progetto vive in `telecamera-monitor/` nella repo, separato dal workflow `sito/`/`deploy/` e dal gate `predeploy-check.sh` (non li riguarda).
- Nessuna credenziale va committata: `.env` è in `.gitignore`, solo `.env.example` è tracciato.

---

### Task 1: Scaffolding e configurazione

**Files:**
- Create: `telecamera-monitor/requirements.txt`
- Create: `telecamera-monitor/.gitignore`
- Create: `telecamera-monitor/.env.example`
- Create: `telecamera-monitor/config.py`
- Create: `telecamera-monitor/tests/conftest.py`
- Test: `telecamera-monitor/tests/test_config.py`

**Interfaces:**
- Produces: `Config` (dataclass) con campi `ezviz_app_key: str`, `ezviz_app_secret: str`, `ezviz_device_serial: str`, `telegram_bot_token: str`, `telegram_chat_id: str`, `poll_interval_seconds: int = 15`, `detection_confidence_threshold: float = 0.5`, `alert_cooldown_seconds: int = 300`, `offline_alert_after_cycles: int = 10`.
- Produces: `load_config(env_path: str | None = None) -> Config` — legge da `.env` (o dal path passato) e da variabili d'ambiente, solleva `ValueError` se mancano variabili obbligatorie.

- [ ] **Step 1: Crea la struttura base del progetto**

```bash
mkdir -p telecamera-monitor/tests
```

```text
# telecamera-monitor/requirements.txt
ultralytics>=8.3.0
requests>=2.31.0
python-dotenv>=1.0.0
Pillow>=10.0.0
pytest>=8.0.0
```

```text
# telecamera-monitor/.gitignore
.env
.venv/
*.log
__pycache__/
*.pyc
.pytest_cache/
yolov8n.pt
```

```text
# telecamera-monitor/.env.example
EZVIZ_APP_KEY=
EZVIZ_APP_SECRET=
EZVIZ_DEVICE_SERIAL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
POLL_INTERVAL_SECONDS=15
DETECTION_CONFIDENCE_THRESHOLD=0.5
ALERT_COOLDOWN_SECONDS=300
OFFLINE_ALERT_AFTER_CYCLES=10
```

```python
# telecamera-monitor/tests/conftest.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
```

- [ ] **Step 2: Scrivi il test di `load_config` (fallirà: `config.py` non esiste ancora)**

```python
# telecamera-monitor/tests/test_config.py
import pytest
from config import load_config


def test_load_config_reads_required_and_defaults(monkeypatch, tmp_path):
    monkeypatch.setenv("EZVIZ_APP_KEY", "key123")
    monkeypatch.setenv("EZVIZ_APP_SECRET", "secret123")
    monkeypatch.setenv("EZVIZ_DEVICE_SERIAL", "serial123")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "token123")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "chat123")
    empty_env_file = tmp_path / ".env"
    empty_env_file.write_text("")

    config = load_config(env_path=str(empty_env_file))

    assert config.ezviz_app_key == "key123"
    assert config.ezviz_device_serial == "serial123"
    assert config.telegram_chat_id == "chat123"
    assert config.poll_interval_seconds == 15
    assert config.detection_confidence_threshold == 0.5
    assert config.alert_cooldown_seconds == 300
    assert config.offline_alert_after_cycles == 10


def test_load_config_raises_on_missing_required(monkeypatch, tmp_path):
    monkeypatch.delenv("EZVIZ_APP_KEY", raising=False)
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    empty_env_file = tmp_path / ".env"
    empty_env_file.write_text("")

    with pytest.raises(ValueError, match="EZVIZ_APP_KEY"):
        load_config(env_path=str(empty_env_file))
```

- [ ] **Step 3: Esegui i test e verifica che falliscano**

Run: `cd telecamera-monitor && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/pytest tests/test_config.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'config'`

- [ ] **Step 4: Implementa `config.py`**

```python
# telecamera-monitor/config.py
import os
from dataclasses import dataclass

from dotenv import load_dotenv

REQUIRED_VARS = [
    "EZVIZ_APP_KEY",
    "EZVIZ_APP_SECRET",
    "EZVIZ_DEVICE_SERIAL",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
]


@dataclass
class Config:
    ezviz_app_key: str
    ezviz_app_secret: str
    ezviz_device_serial: str
    telegram_bot_token: str
    telegram_chat_id: str
    poll_interval_seconds: int = 15
    detection_confidence_threshold: float = 0.5
    alert_cooldown_seconds: int = 300
    offline_alert_after_cycles: int = 10


def load_config(env_path: str | None = None) -> Config:
    load_dotenv(dotenv_path=env_path)
    missing = [var for var in REQUIRED_VARS if not os.environ.get(var)]
    if missing:
        raise ValueError(f"Variabili .env mancanti: {', '.join(missing)}")
    return Config(
        ezviz_app_key=os.environ["EZVIZ_APP_KEY"],
        ezviz_app_secret=os.environ["EZVIZ_APP_SECRET"],
        ezviz_device_serial=os.environ["EZVIZ_DEVICE_SERIAL"],
        telegram_bot_token=os.environ["TELEGRAM_BOT_TOKEN"],
        telegram_chat_id=os.environ["TELEGRAM_CHAT_ID"],
        poll_interval_seconds=int(os.environ.get("POLL_INTERVAL_SECONDS", 15)),
        detection_confidence_threshold=float(os.environ.get("DETECTION_CONFIDENCE_THRESHOLD", 0.5)),
        alert_cooldown_seconds=int(os.environ.get("ALERT_COOLDOWN_SECONDS", 300)),
        offline_alert_after_cycles=int(os.environ.get("OFFLINE_ALERT_AFTER_CYCLES", 10)),
    )
```

- [ ] **Step 5: Esegui i test e verifica che passino**

Run: `.venv/bin/pytest tests/test_config.py -v`
Expected: PASS (2 test)

- [ ] **Step 6: Commit**

```bash
git add telecamera-monitor/
git commit -m "telecamera-monitor: scaffolding e caricamento configurazione"
```

---

### Task 2: Client EZVIZ Open Platform

**Files:**
- Create: `telecamera-monitor/ezviz_client.py`
- Test: `telecamera-monitor/tests/test_ezviz_client.py`

**Interfaces:**
- Consumes: nessuna interfaccia interna (solo `requests`).
- Produces: `class EzvizClient(app_key: str, app_secret: str, device_serial: str, base_url: str = "https://open.ys7.com/api/lapp")` con metodo `get_snapshot() -> bytes`.
- Produces: eccezioni `EzvizError(Exception)`, `EzvizDeviceOfflineError(EzvizError)`, `EzvizRateLimitError(EzvizError)`.

- [ ] **Step 1: Scrivi i test del client (falliranno: `ezviz_client.py` non esiste)**

```python
# telecamera-monitor/tests/test_ezviz_client.py
from unittest.mock import Mock, patch

import pytest

from ezviz_client import EzvizClient, EzvizDeviceOfflineError, EzvizRateLimitError


def make_client():
    return EzvizClient(app_key="k", app_secret="s", device_serial="dev1")


@patch("ezviz_client.requests.get")
@patch("ezviz_client.requests.post")
def test_get_snapshot_returns_image_bytes(mock_post, mock_get):
    token_response = Mock()
    token_response.json.return_value = {"code": "200", "data": {"accessToken": "tok1"}}
    capture_response = Mock()
    capture_response.json.return_value = {"code": "200", "data": {"picUrl": "https://example.com/pic.jpg"}}
    mock_post.side_effect = [token_response, capture_response]
    image_response = Mock()
    image_response.content = b"fake-jpeg-bytes"
    image_response.raise_for_status.return_value = None
    mock_get.return_value = image_response

    result = make_client().get_snapshot()

    assert result == b"fake-jpeg-bytes"


@patch("ezviz_client.requests.get")
@patch("ezviz_client.requests.post")
def test_get_snapshot_raises_on_device_offline(mock_post, mock_get):
    token_response = Mock()
    token_response.json.return_value = {"code": "200", "data": {"accessToken": "tok1"}}
    capture_response = Mock()
    capture_response.json.return_value = {"code": "20007", "msg": "device offline"}
    mock_post.side_effect = [token_response, capture_response]

    with pytest.raises(EzvizDeviceOfflineError):
        make_client().get_snapshot()


@patch("ezviz_client.requests.get")
@patch("ezviz_client.requests.post")
def test_get_snapshot_raises_on_rate_limit(mock_post, mock_get):
    token_response = Mock()
    token_response.json.return_value = {"code": "200", "data": {"accessToken": "tok1"}}
    capture_response = Mock()
    capture_response.json.return_value = {"code": "10028", "msg": "rate limited"}
    mock_post.side_effect = [token_response, capture_response]

    with pytest.raises(EzvizRateLimitError):
        make_client().get_snapshot()


@patch("ezviz_client.requests.get")
@patch("ezviz_client.requests.post")
def test_get_snapshot_refreshes_token_on_expiry(mock_post, mock_get):
    token_response = Mock()
    token_response.json.return_value = {"code": "200", "data": {"accessToken": "tok1"}}
    expired_capture_response = Mock()
    expired_capture_response.json.return_value = {"code": "10002", "msg": "token expired"}
    refreshed_token_response = Mock()
    refreshed_token_response.json.return_value = {"code": "200", "data": {"accessToken": "tok2"}}
    retried_capture_response = Mock()
    retried_capture_response.json.return_value = {"code": "200", "data": {"picUrl": "https://example.com/pic.jpg"}}
    mock_post.side_effect = [
        token_response,
        expired_capture_response,
        refreshed_token_response,
        retried_capture_response,
    ]
    image_response = Mock()
    image_response.content = b"fake-jpeg-bytes"
    image_response.raise_for_status.return_value = None
    mock_get.return_value = image_response

    result = make_client().get_snapshot()

    assert result == b"fake-jpeg-bytes"
    assert mock_post.call_count == 4
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `.venv/bin/pytest tests/test_ezviz_client.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'ezviz_client'`

- [ ] **Step 3: Implementa `ezviz_client.py`**

```python
# telecamera-monitor/ezviz_client.py
import time

import requests

DEFAULT_BASE_URL = "https://open.ys7.com/api/lapp"
TOKEN_REFRESH_MARGIN_SECONDS = 6 * 24 * 3600  # rinnova prima della scadenza a 7gg


class EzvizError(Exception):
    pass


class EzvizDeviceOfflineError(EzvizError):
    pass


class EzvizRateLimitError(EzvizError):
    pass


class EzvizClient:
    def __init__(self, app_key: str, app_secret: str, device_serial: str, base_url: str = DEFAULT_BASE_URL):
        self.app_key = app_key
        self.app_secret = app_secret
        self.device_serial = device_serial
        self.base_url = base_url
        self._access_token = None
        self._token_expires_at = 0.0

    def _fetch_token(self) -> None:
        response = requests.post(
            f"{self.base_url}/token/get",
            data={"appKey": self.app_key, "appSecret": self.app_secret},
        )
        data = response.json()
        if data.get("code") != "200":
            raise EzvizError(f"Errore autenticazione EZVIZ: {data.get('code')} {data.get('msg')}")
        self._access_token = data["data"]["accessToken"]
        self._token_expires_at = time.time() + TOKEN_REFRESH_MARGIN_SECONDS

    def _ensure_token(self) -> None:
        if self._access_token is None or time.time() >= self._token_expires_at:
            self._fetch_token()

    def _capture(self) -> dict:
        response = requests.post(
            f"{self.base_url}/device/capture",
            data={"accessToken": self._access_token, "deviceSerial": self.device_serial},
        )
        return response.json()

    def get_snapshot(self) -> bytes:
        self._ensure_token()
        data = self._capture()

        if data.get("code") == "10002":
            self._fetch_token()
            data = self._capture()

        code = data.get("code")
        if code == "10028":
            raise EzvizRateLimitError("Limite di frequenza cattura EZVIZ superato")
        if code in ("20007", "20008"):
            raise EzvizDeviceOfflineError(f"Telecamera non raggiungibile: {code}")
        if code != "200":
            raise EzvizError(f"Errore cattura EZVIZ: {code} {data.get('msg')}")

        pic_url = data["data"]["picUrl"]
        image_response = requests.get(pic_url)
        image_response.raise_for_status()
        return image_response.content
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `.venv/bin/pytest tests/test_ezviz_client.py -v`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add telecamera-monitor/ezviz_client.py telecamera-monitor/tests/test_ezviz_client.py
git commit -m "telecamera-monitor: client EZVIZ Open Platform con gestione token ed errori"
```

---

### Task 3: Rilevamento persone (detector)

**Files:**
- Create: `telecamera-monitor/detector.py`
- Create: `telecamera-monitor/tests/fixtures/person.jpg`
- Create: `telecamera-monitor/tests/fixtures/no_person.jpg`
- Test: `telecamera-monitor/tests/test_detector.py`

**Interfaces:**
- Consumes: nessuna interfaccia interna (solo `ultralytics`, `torch`, `Pillow`).
- Produces: `DetectionResult` (dataclass) con `detected: bool`, `confidence: float`.
- Produces: `class PersonDetector(confidence_threshold: float = 0.5, model_path: str = "yolov8n.pt")` con metodo `detect(image_bytes: bytes) -> DetectionResult`.

- [ ] **Step 1: Crea le immagini di test (una con persona, una senza)**

```bash
mkdir -p telecamera-monitor/tests/fixtures
curl -L -o telecamera-monitor/tests/fixtures/person.jpg https://ultralytics.com/images/bus.jpg
telecamera-monitor/.venv/bin/python3 -c "from PIL import Image; Image.new('RGB', (640, 480), color=(120, 170, 200)).save('telecamera-monitor/tests/fixtures/no_person.jpg')"
```

- [ ] **Step 2: Scrivi i test del detector (falliranno: `detector.py` non esiste)**

```python
# telecamera-monitor/tests/test_detector.py
from pathlib import Path

from detector import PersonDetector

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_detects_person_in_photo_with_person():
    detector = PersonDetector(confidence_threshold=0.5)
    image_bytes = (FIXTURES_DIR / "person.jpg").read_bytes()

    result = detector.detect(image_bytes)

    assert result.detected is True
    assert result.confidence >= 0.5


def test_does_not_detect_person_in_empty_photo():
    detector = PersonDetector(confidence_threshold=0.5)
    image_bytes = (FIXTURES_DIR / "no_person.jpg").read_bytes()

    result = detector.detect(image_bytes)

    assert result.detected is False
```

- [ ] **Step 3: Esegui i test e verifica che falliscano**

Run: `.venv/bin/pytest tests/test_detector.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'detector'`

- [ ] **Step 4: Implementa `detector.py`**

```python
# telecamera-monitor/detector.py
from dataclasses import dataclass
from io import BytesIO

import torch
from PIL import Image
from ultralytics import YOLO

PERSON_CLASS_NAME = "person"


@dataclass
class DetectionResult:
    detected: bool
    confidence: float


class PersonDetector:
    def __init__(self, confidence_threshold: float = 0.5, model_path: str = "yolov8n.pt"):
        self.confidence_threshold = confidence_threshold
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.model = YOLO(model_path)

    def detect(self, image_bytes: bytes) -> DetectionResult:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        results = self.model.predict(image, device=self.device, verbose=False)

        best_confidence = 0.0
        for result in results:
            for box in result.boxes:
                class_name = result.names[int(box.cls[0])]
                confidence = float(box.conf[0])
                if class_name == PERSON_CLASS_NAME and confidence > best_confidence:
                    best_confidence = confidence

        return DetectionResult(
            detected=best_confidence >= self.confidence_threshold,
            confidence=best_confidence,
        )
```

- [ ] **Step 5: Esegui i test e verifica che passino**

Run: `.venv/bin/pytest tests/test_detector.py -v`
Expected: PASS (2 test). Nota: al primo avvio `ultralytics` scarica automaticamente `yolov8n.pt` (~6MB) da GitHub releases — richiede connessione internet.

- [ ] **Step 6: Commit**

```bash
git add telecamera-monitor/detector.py telecamera-monitor/tests/test_detector.py telecamera-monitor/tests/fixtures/
git commit -m "telecamera-monitor: rilevamento persone con YOLOv8n (backend mps/cpu automatico)"
```

---

### Task 4: Notifiche Telegram

**Files:**
- Create: `telecamera-monitor/telegram_notifier.py`
- Test: `telecamera-monitor/tests/test_telegram_notifier.py`

**Interfaces:**
- Consumes: nessuna interfaccia interna (solo `requests`).
- Produces: `class TelegramNotifier(bot_token: str, chat_id: str, api_base: str = "https://api.telegram.org")` con metodi `send_alert(image_bytes: bytes, message: str) -> None` e `send_text(message: str) -> None`.

- [ ] **Step 1: Scrivi i test del notifier (falliranno: `telegram_notifier.py` non esiste)**

```python
# telecamera-monitor/tests/test_telegram_notifier.py
from unittest.mock import Mock, patch

from telegram_notifier import TelegramNotifier


@patch("telegram_notifier.requests.post")
def test_send_alert_posts_photo_with_caption(mock_post):
    mock_response = Mock()
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response

    notifier = TelegramNotifier(bot_token="tok", chat_id="123")
    notifier.send_alert(b"jpeg-bytes", "Persona rilevata")

    args, kwargs = mock_post.call_args
    assert args[0] == "https://api.telegram.org/bottok/sendPhoto"
    assert kwargs["data"] == {"chat_id": "123", "caption": "Persona rilevata"}
    assert kwargs["files"]["photo"][1] == b"jpeg-bytes"


@patch("telegram_notifier.requests.post")
def test_send_text_posts_message(mock_post):
    mock_response = Mock()
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response

    notifier = TelegramNotifier(bot_token="tok", chat_id="123")
    notifier.send_text("Telecamera irraggiungibile")

    args, kwargs = mock_post.call_args
    assert args[0] == "https://api.telegram.org/bottok/sendMessage"
    assert kwargs["data"] == {"chat_id": "123", "text": "Telecamera irraggiungibile"}
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `.venv/bin/pytest tests/test_telegram_notifier.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'telegram_notifier'`

- [ ] **Step 3: Implementa `telegram_notifier.py`**

```python
# telecamera-monitor/telegram_notifier.py
import requests

DEFAULT_API_BASE = "https://api.telegram.org"


class TelegramNotifier:
    def __init__(self, bot_token: str, chat_id: str, api_base: str = DEFAULT_API_BASE):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.api_base = api_base

    def send_alert(self, image_bytes: bytes, message: str) -> None:
        url = f"{self.api_base}/bot{self.bot_token}/sendPhoto"
        response = requests.post(
            url,
            data={"chat_id": self.chat_id, "caption": message},
            files={"photo": ("snapshot.jpg", image_bytes, "image/jpeg")},
        )
        response.raise_for_status()

    def send_text(self, message: str) -> None:
        url = f"{self.api_base}/bot{self.bot_token}/sendMessage"
        response = requests.post(url, data={"chat_id": self.chat_id, "text": message})
        response.raise_for_status()
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `.venv/bin/pytest tests/test_telegram_notifier.py -v`
Expected: PASS (2 test)

- [ ] **Step 5: Commit**

```bash
git add telecamera-monitor/telegram_notifier.py telecamera-monitor/tests/test_telegram_notifier.py
git commit -m "telecamera-monitor: notifiche Telegram (foto + testo)"
```

---

### Task 5: Loop di monitoraggio (orchestrazione)

**Files:**
- Create: `telecamera-monitor/monitor.py`
- Test: `telecamera-monitor/tests/test_monitor.py`

**Interfaces:**
- Consumes: `Config`/`load_config` da `config.py`; `EzvizClient`/`EzvizDeviceOfflineError`/`EzvizRateLimitError` da `ezviz_client.py`; `PersonDetector`/`DetectionResult` da `detector.py`; `TelegramNotifier` da `telegram_notifier.py`.
- Produces: `MonitorState` (dataclass) con `last_alert_time: float | None = None`, `consecutive_offline_cycles: int = 0`, `offline_alert_sent: bool = False`.
- Produces: `run_once(config, ezviz_client, detector, notifier, state: MonitorState, now: float) -> MonitorState`.
- Produces: `main() -> None` (entry point eseguibile, loop infinito).

- [ ] **Step 1: Scrivi i test di `run_once` (falliranno: `monitor.py` non esiste)**

```python
# telecamera-monitor/tests/test_monitor.py
from unittest.mock import Mock

from config import Config
from detector import DetectionResult
from ezviz_client import EzvizDeviceOfflineError, EzvizRateLimitError
from monitor import MonitorState, run_once


def make_config(**overrides):
    defaults = dict(
        ezviz_app_key="k",
        ezviz_app_secret="s",
        ezviz_device_serial="d",
        telegram_bot_token="t",
        telegram_chat_id="c",
        poll_interval_seconds=15,
        detection_confidence_threshold=0.5,
        alert_cooldown_seconds=300,
        offline_alert_after_cycles=10,
    )
    defaults.update(overrides)
    return Config(**defaults)


def test_run_once_sends_alert_when_person_detected_first_time():
    config = make_config()
    ezviz_client = Mock()
    ezviz_client.get_snapshot.return_value = b"jpeg"
    detector = Mock()
    detector.detect.return_value = DetectionResult(detected=True, confidence=0.9)
    notifier = Mock()

    new_state = run_once(config, ezviz_client, detector, notifier, MonitorState(), now=1000.0)

    notifier.send_alert.assert_called_once()
    assert new_state.last_alert_time == 1000.0


def test_run_once_respects_cooldown():
    config = make_config(alert_cooldown_seconds=300)
    ezviz_client = Mock()
    ezviz_client.get_snapshot.return_value = b"jpeg"
    detector = Mock()
    detector.detect.return_value = DetectionResult(detected=True, confidence=0.9)
    notifier = Mock()
    state = MonitorState(last_alert_time=1000.0)

    new_state = run_once(config, ezviz_client, detector, notifier, state, now=1100.0)

    notifier.send_alert.assert_not_called()
    assert new_state.last_alert_time == 1000.0


def test_run_once_sends_alert_again_after_cooldown_expires():
    config = make_config(alert_cooldown_seconds=300)
    ezviz_client = Mock()
    ezviz_client.get_snapshot.return_value = b"jpeg"
    detector = Mock()
    detector.detect.return_value = DetectionResult(detected=True, confidence=0.9)
    notifier = Mock()
    state = MonitorState(last_alert_time=1000.0)

    new_state = run_once(config, ezviz_client, detector, notifier, state, now=1301.0)

    notifier.send_alert.assert_called_once()
    assert new_state.last_alert_time == 1301.0


def test_run_once_does_not_alert_when_no_person_detected():
    config = make_config()
    ezviz_client = Mock()
    ezviz_client.get_snapshot.return_value = b"jpeg"
    detector = Mock()
    detector.detect.return_value = DetectionResult(detected=False, confidence=0.1)
    notifier = Mock()

    new_state = run_once(config, ezviz_client, detector, notifier, MonitorState(), now=1000.0)

    notifier.send_alert.assert_not_called()
    assert new_state.last_alert_time is None


def test_run_once_sends_offline_alert_after_threshold_cycles():
    config = make_config(offline_alert_after_cycles=3)
    ezviz_client = Mock()
    ezviz_client.get_snapshot.side_effect = EzvizDeviceOfflineError("offline")
    detector = Mock()
    notifier = Mock()
    state = MonitorState(consecutive_offline_cycles=2)

    new_state = run_once(config, ezviz_client, detector, notifier, state, now=1000.0)

    assert new_state.consecutive_offline_cycles == 3
    notifier.send_text.assert_called_once()
    assert new_state.offline_alert_sent is True


def test_run_once_does_not_repeat_offline_alert():
    config = make_config(offline_alert_after_cycles=3)
    ezviz_client = Mock()
    ezviz_client.get_snapshot.side_effect = EzvizDeviceOfflineError("offline")
    detector = Mock()
    notifier = Mock()
    state = MonitorState(consecutive_offline_cycles=3, offline_alert_sent=True)

    new_state = run_once(config, ezviz_client, detector, notifier, state, now=1000.0)

    assert new_state.consecutive_offline_cycles == 4
    notifier.send_text.assert_not_called()


def test_run_once_resets_offline_state_after_recovery():
    config = make_config()
    ezviz_client = Mock()
    ezviz_client.get_snapshot.return_value = b"jpeg"
    detector = Mock()
    detector.detect.return_value = DetectionResult(detected=False, confidence=0.0)
    notifier = Mock()
    state = MonitorState(consecutive_offline_cycles=5, offline_alert_sent=True)

    new_state = run_once(config, ezviz_client, detector, notifier, state, now=1000.0)

    assert new_state.consecutive_offline_cycles == 0
    assert new_state.offline_alert_sent is False


def test_run_once_propagates_rate_limit_error():
    config = make_config()
    ezviz_client = Mock()
    ezviz_client.get_snapshot.side_effect = EzvizRateLimitError("rate limited")
    detector = Mock()
    notifier = Mock()

    try:
        run_once(config, ezviz_client, detector, notifier, MonitorState(), now=1000.0)
        assert False, "expected EzvizRateLimitError"
    except EzvizRateLimitError:
        pass
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `.venv/bin/pytest tests/test_monitor.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'monitor'`

- [ ] **Step 3: Implementa `monitor.py`**

```python
# telecamera-monitor/monitor.py
import logging
import time
from dataclasses import dataclass
from datetime import datetime

from config import load_config
from detector import PersonDetector
from ezviz_client import EzvizClient, EzvizDeviceOfflineError, EzvizRateLimitError
from telegram_notifier import TelegramNotifier


@dataclass
class MonitorState:
    last_alert_time: float | None = None
    consecutive_offline_cycles: int = 0
    offline_alert_sent: bool = False


def run_once(config, ezviz_client, detector, notifier, state: MonitorState, now: float) -> MonitorState:
    try:
        snapshot = ezviz_client.get_snapshot()
    except EzvizDeviceOfflineError:
        offline_cycles = state.consecutive_offline_cycles + 1
        offline_alert_sent = state.offline_alert_sent
        if offline_cycles >= config.offline_alert_after_cycles and not offline_alert_sent:
            notifier.send_text(f"Telecamera irraggiungibile da {offline_cycles} cicli consecutivi.")
            offline_alert_sent = True
        logging.warning("Telecamera offline (ciclo %d)", offline_cycles)
        return MonitorState(
            last_alert_time=state.last_alert_time,
            consecutive_offline_cycles=offline_cycles,
            offline_alert_sent=offline_alert_sent,
        )

    result = detector.detect(snapshot)
    last_alert_time = state.last_alert_time
    if result.detected and (last_alert_time is None or now - last_alert_time >= config.alert_cooldown_seconds):
        timestamp = datetime.fromtimestamp(now).strftime("%H:%M:%S")
        notifier.send_alert(snapshot, f"Persona rilevata alle {timestamp} (confidenza {result.confidence:.2f})")
        last_alert_time = now
        logging.info("Alert inviato (confidenza %.2f)", result.confidence)

    return MonitorState(last_alert_time=last_alert_time, consecutive_offline_cycles=0, offline_alert_sent=False)


def main() -> None:
    logging.basicConfig(
        filename="telecamera-monitor.log",
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    config = load_config()
    ezviz_client = EzvizClient(config.ezviz_app_key, config.ezviz_app_secret, config.ezviz_device_serial)
    detector = PersonDetector(confidence_threshold=config.detection_confidence_threshold)
    notifier = TelegramNotifier(config.telegram_bot_token, config.telegram_chat_id)
    state = MonitorState()

    while True:
        sleep_for = config.poll_interval_seconds
        try:
            state = run_once(config, ezviz_client, detector, notifier, state, time.time())
        except EzvizRateLimitError:
            logging.warning("Limite di frequenza EZVIZ raggiunto, raddoppio intervallo per un ciclo")
            sleep_for = config.poll_interval_seconds * 2
        except Exception:
            logging.exception("Errore imprevisto nel ciclo di monitoraggio")
        time.sleep(sleep_for)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `.venv/bin/pytest tests/test_monitor.py -v`
Expected: PASS (8 test)

- [ ] **Step 5: Esegui l'intera suite di test del progetto**

Run: `.venv/bin/pytest -v`
Expected: PASS (tutti i test di Task 1-5)

- [ ] **Step 6: Commit**

```bash
git add telecamera-monitor/monitor.py telecamera-monitor/tests/test_monitor.py
git commit -m "telecamera-monitor: loop di monitoraggio con cooldown e gestione offline"
```

---

### Task 6: Setup account, avvio automatico e documentazione

**Files:**
- Create: `telecamera-monitor/README.md`
- Create: `telecamera-monitor/launchd/com.casaebottega.telecamera-monitor.plist`
- Create: `telecamera-monitor/systemd/telecamera-monitor.service` (documentazione per futuro dispositivo Linux)

**Interfaces:**
- Consumes: nessuna (solo documentazione e file di configurazione OS).
- Produces: nessuna (deliverable finale del progetto).

- [ ] **Step 1: Crea il file LaunchAgent per l'avvio automatico su macOS**

```bash
mkdir -p telecamera-monitor/launchd telecamera-monitor/systemd
```

```xml
<!-- telecamera-monitor/launchd/com.casaebottega.telecamera-monitor.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.casaebottega.telecamera-monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>__VENV_PYTHON_PATH__</string>
        <string>__PROJECT_DIR__/monitor.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>__PROJECT_DIR__</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>__PROJECT_DIR__/launchd-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>__PROJECT_DIR__/launchd-stderr.log</string>
</dict>
</plist>
```

- [ ] **Step 2: Crea il file systemd di riferimento per un futuro dispositivo Linux**

```ini
# telecamera-monitor/systemd/telecamera-monitor.service
[Unit]
Description=Telecamera Monitor - rilevamento persone e alert Telegram
After=network-online.target

[Service]
Type=simple
WorkingDirectory=__PROJECT_DIR__
ExecStart=__VENV_PYTHON_PATH__ monitor.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 3: Aggiorna `.gitignore` per escludere i log runtime del LaunchAgent**

```text
# aggiungi in telecamera-monitor/.gitignore
launchd-stdout.log
launchd-stderr.log
```

- [ ] **Step 4: Scrivi il README con le istruzioni complete di setup**

```markdown
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
```

- [ ] **Step 5: Commit**

```bash
git add telecamera-monitor/README.md telecamera-monitor/launchd/ telecamera-monitor/systemd/ telecamera-monitor/.gitignore
git commit -m "telecamera-monitor: README setup, LaunchAgent macOS e systemd di riferimento"
```

---

### Task 7: Verifica end-to-end manuale

**Files:** nessuno (checklist di verifica manuale, non produce codice).

**Interfaces:** nessuna.

- [ ] **Step 1: Verifica l'avvio manuale**

Run: `cd telecamera-monitor && .venv/bin/python3 monitor.py`
Expected: nessun errore in avvio, il processo resta in esecuzione, `telecamera-monitor.log` viene creato.

- [ ] **Step 2: Verifica il rilevamento reale**

Mettiti davanti alla telecamera per almeno un ciclo di polling (15s di default).
Expected: entro 1-2 cicli arriva un messaggio Telegram con foto e didascalia "Persona rilevata alle HH:MM:SS (confidenza 0.XX)".

- [ ] **Step 3: Verifica il cooldown**

Resta davanti alla telecamera per più di un ciclo, senza allontanarti.
Expected: un solo alert Telegram entro la finestra di cooldown (default 5 minuti), non uno per ogni ciclo.

- [ ] **Step 4: Verifica il log**

Run: `tail -f telecamera-monitor/telecamera-monitor.log`
Expected: righe di log per ogni ciclo con detection ed eventuale invio alert.

- [ ] **Step 5: Ferma il test manuale**

Premi Ctrl+C nel terminale dove gira `monitor.py`.

- [ ] **Step 6: Installa e verifica il LaunchAgent**

Segui la sezione 5 del README. Poi:

Run: `launchctl list | grep casaebottega`
Expected: il servizio appare nella lista, con stato di uscita 0 o in esecuzione.

- [ ] **Step 7: Verifica il riavvio automatico**

Termina manualmente il processo (`kill <pid>` del processo Python) mentre gira sotto LaunchAgent.
Expected: LaunchAgent lo riavvia automaticamente entro pochi secondi (verifica con `ps aux | grep monitor.py`).
