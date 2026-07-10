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
