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
