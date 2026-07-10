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
