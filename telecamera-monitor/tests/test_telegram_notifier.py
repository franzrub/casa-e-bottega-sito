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
