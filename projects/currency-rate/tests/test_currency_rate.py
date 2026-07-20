import json
import os
import sys
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Make the script under test importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "scripts"))

import currency_rate as cr


def test_parse_cbr_usd():
    xml = """<?xml version="1.0" encoding="windows-1251"?>
    <ValCurs Date="19.07.2026" name="Foreign Currency Market">
      <Valute ID="R01235">
        <NumCode>840</NumCode>
        <CharCode>USD</CharCode>
        <Nominal>1</Nominal>
        <Name>Доллар США</Name>
        <Value>92,4567</Value>
      </Valute>
      <Valute ID="R01239">
        <NumCode>978</NumCode>
        <CharCode>EUR</CharCode>
        <Nominal>1</Nominal>
        <Name>Евро</Name>
        <Value>98,7654</Value>
      </Valute>
    </ValCurs>
    """.encode("windows-1251")
    result = cr.parse_cbr(xml, "USD")
    assert result.rate == 92.4567
    assert result.source == "cbr"
    assert result.timestamp.date().isoformat() == "2026-07-19"


def test_parse_cbr_eur():
    xml = """<?xml version="1.0" encoding="windows-1251"?>
    <ValCurs Date="19.07.2026" name="Foreign Currency Market">
      <Valute ID="R01235">
        <NumCode>840</NumCode>
        <CharCode>USD</CharCode>
        <Nominal>1</Nominal>
        <Name>Доллар США</Name>
        <Value>92,4567</Value>
      </Valute>
      <Valute ID="R01239">
        <NumCode>978</NumCode>
        <CharCode>EUR</CharCode>
        <Nominal>1</Nominal>
        <Name>Евро</Name>
        <Value>98,7654</Value>
      </Valute>
    </ValCurs>
    """.encode("windows-1251")
    result = cr.parse_cbr(xml, "EUR")
    assert result.rate == 98.7654
    assert result.source == "cbr"


def test_parse_fallback():
    data = json.dumps({
        "result": "success",
        "time_last_update_utc": "Sat, 19 Jul 2026 00:00:00 +0000",
        "base_code": "USD",
        "rates": {"RUB": 92.45},
    }).encode("utf-8")
    result = cr.parse_fallback(data, "USD")
    assert result.rate == 92.45
    assert result.source == "fallback"
    assert result.timestamp.tzinfo is not None


def test_compute_sma():
    entries = [
        {"date": "2026-07-01", "rate": 80.0},
        {"date": "2026-07-02", "rate": 90.0},
        {"date": "2026-07-03", "rate": 100.0},
    ]
    assert cr.compute_sma(entries, 3) == 90.0
    assert cr.compute_sma(entries, 5) == 90.0
    assert cr.compute_sma([], 30) is None


def test_load_and_save_history(tmp_path):
    path = tmp_path / "history.json"
    history = {
        "usd": [
            {"date": "2026-07-18", "rate": 78.4, "source": "cbr", "source_name": "ЦБ РФ", "timestamp": "2026-07-18T00:00:00+03:00"},
        ],
        "eur": [
            {"date": "2026-07-18", "rate": 89.9, "source": "cbr", "source_name": "ЦБ РФ", "timestamp": "2026-07-18T00:00:00+03:00"},
        ],
    }
    cr.save_history(path, history)
    loaded = cr.load_history(path)
    assert len(loaded["usd"]) == 1
    assert loaded["usd"][0]["rate"] == 78.4


def test_update_history():
    history = {"usd": [], "eur": []}
    results = {
        "usd": cr.RateResult(rate=79.0, source="cbr", source_name="ЦБ РФ", timestamp=datetime.now(cr.MSK)),
        "eur": cr.RateResult(rate=90.0, source="cbr", source_name="ЦБ РФ", timestamp=datetime.now(cr.MSK)),
    }
    updated = cr.update_history(history, results, 90)
    assert len(updated["usd"]) == 1
    assert updated["usd"][0]["rate"] == 79.0


def test_format_digest_line():
    result = cr.RateResult(rate=78.4, source="cbr", source_name="ЦБ РФ", timestamp=datetime.now(cr.MSK))
    line = cr.format_digest_line("usd", result, 78.45)
    assert "USD/RUB: 78.40" in line
    assert "SMA30: 78.45" in line


def test_format_digest_line_with_change():
    result = cr.RateResult(rate=78.4, source="cbr", source_name="ЦБ РФ", timestamp=datetime.now(cr.MSK))
    line = cr.format_digest_line("usd", result, 78.45, 0.12)
    assert "USD/RUB: 78.40" in line
    assert "+0.12" in line
    assert "SMA30: 78.45" in line


def test_format_digest_line_with_negative_change():
    result = cr.RateResult(rate=78.4, source="cbr", source_name="ЦБ РФ", timestamp=datetime.now(cr.MSK))
    line = cr.format_digest_line("usd", result, 78.45, -0.12)
    assert "-0.12" in line


def test_find_previous_day_change():
    today = date(2026, 7, 20)
    yesterday = (today - timedelta(days=1)).isoformat()
    history = [
        {"date": "2026-07-18", "rate": 90.0},
        {"date": yesterday, "rate": 92.0},
        {"date": today.isoformat(), "rate": 93.0},
    ]
    change = cr.find_previous_day_change(history, today)
    assert change == 1.0


def test_find_previous_day_change_missing():
    history = [
        {"date": "2026-07-18", "rate": 90.0},
        {"date": "2026-07-19", "rate": 92.0},
    ]
    change = cr.find_previous_day_change(history, date(2026, 7, 20))
    assert change is None


def test_find_previous_day_change_without_today():
    history = [
        {"date": "2026-07-17", "rate": 88.0},
        {"date": "2026-07-18", "rate": 90.0},
        {"date": "2026-07-19", "rate": 92.0},
    ]
    change = cr.find_previous_day_change(history, date(2026, 7, 20))
    assert change is None


def test_atomic_write_json(tmp_path):
    target = tmp_path / "data.json"
    cr.atomic_write_json(target, {"a": 1, "b": [2, 3]})
    assert target.exists()
    assert json.loads(target.read_text(encoding="utf-8")) == {"a": 1, "b": [2, 3]}
    assert not (tmp_path / f"{target.name}.tmp.{os.getpid()}").exists()


def test_atomic_write_json_concurrent(tmp_path):
    target = tmp_path / "concurrent.json"
    cr.atomic_write_json(target, {"pid": os.getpid()})
    # Ensure target file never contains partial/temp name and temp file is cleaned up.
    data = json.loads(target.read_text(encoding="utf-8"))
    assert data["pid"] == os.getpid()


def test_validate_args_timeout():
    class Args:
        timeout = -1
        history_days = 90
        moving_average_days = 30
        source = "auto"
        no_fallback = False

    assert cr.validate_args(Args()) == 2


def test_validate_args_source_conflict():
    class Args:
        timeout = 10
        history_days = 90
        moving_average_days = 30
        source = "fallback"
        no_fallback = True

    assert cr.validate_args(Args()) == 2
