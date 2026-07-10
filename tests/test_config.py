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
