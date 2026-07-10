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
