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
