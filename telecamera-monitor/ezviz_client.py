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
        try:
            response = requests.post(
                f"{self.base_url}/token/get",
                data={"appKey": self.app_key, "appSecret": self.app_secret},
                timeout=10,
            )
        except requests.exceptions.RequestException as exc:
            raise EzvizDeviceOfflineError(f"Errore di rete durante l'autenticazione EZVIZ: {exc}") from exc
        data = response.json()
        if data.get("code") != "200":
            raise EzvizError(f"Errore autenticazione EZVIZ: {data.get('code')} {data.get('msg')}")
        self._access_token = data["data"]["accessToken"]
        self._token_expires_at = time.time() + TOKEN_REFRESH_MARGIN_SECONDS

    def _ensure_token(self) -> None:
        if self._access_token is None or time.time() >= self._token_expires_at:
            self._fetch_token()

    def _capture(self) -> dict:
        try:
            response = requests.post(
                f"{self.base_url}/device/capture",
                data={"accessToken": self._access_token, "deviceSerial": self.device_serial},
                timeout=10,
            )
        except requests.exceptions.RequestException as exc:
            raise EzvizDeviceOfflineError(f"Errore di rete durante la cattura EZVIZ: {exc}") from exc
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
        try:
            image_response = requests.get(pic_url, timeout=10)
        except requests.exceptions.RequestException as exc:
            raise EzvizDeviceOfflineError(f"Errore di rete durante il download dello snapshot: {exc}") from exc
        image_response.raise_for_status()
        return image_response.content
