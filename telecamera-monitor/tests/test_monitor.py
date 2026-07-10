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
