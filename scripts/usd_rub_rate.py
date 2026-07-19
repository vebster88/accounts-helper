#!/usr/bin/env python3
"""Console utility to fetch and display the current USD/RUB exchange rate."""

from __future__ import annotations

import argparse
import json
import re
import socket
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

__version__ = "1.0.0"

DEFAULT_TIMEOUT = 10.0
DEFAULT_TTL = 300  # seconds

SOURCES = {
    "cbr": {
        "name": "ЦБ РФ",
        "url": "https://www.cbr.ru/scripts/XML_daily.asp",
        "accept": "application/xml",
    },
    "fallback": {
        "name": "open.er-api.com",
        "url": "https://open.er-api.com/v6/latest/USD",
        "accept": "application/json",
    },
}

ERROR_MESSAGE = "Не удалось получить курс USD/RUB. Проверьте подключение к интернету."

MSK = timezone(timedelta(hours=3), name="MSK")


@dataclass(frozen=True)
class RateResult:
    rate: float
    source: str
    source_name: str
    timestamp: datetime
    cached: bool = False


def get_user_agent() -> str:
    return f"usd-rub-rate/{__version__}"


def fetch(url: str, timeout: float, accept: str) -> bytes:
    """Perform an HTTPS GET request and return response body as bytes."""
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"Only HTTPS URLs are allowed, got: {url}")

    req = urllib.request.Request(
        url,
        headers={
            "Accept": accept,
            "User-Agent": get_user_agent(),
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
        status = resp.getcode()
        if status >= 400:
            raise urllib.error.HTTPError(
                url, status, f"HTTP {status}", resp.headers, None
            )
        return resp.read()


def _decode_cbr_response(data: bytes) -> str:
    """Decode CBR XML from windows-1251 with utf-8 fallback."""
    try:
        return data.decode("windows-1251")
    except UnicodeDecodeError:
        return data.decode("utf-8")


def parse_cbr(data: bytes) -> RateResult:
    """Parse the official CBR XML response (windows-1251)."""
    text = _decode_cbr_response(data)
    root = ET.fromstring(text)

    date_attr = root.get("Date")
    if not date_attr:
        raise ValueError("Missing ValCurs/@Date attribute")
    try:
        date = datetime.strptime(date_attr, "%d.%m.%Y").date()
    except ValueError as exc:
        raise ValueError(f"Invalid ValCurs/@Date: {date_attr}") from exc

    for valute in root.findall("Valute"):
        char_code = valute.find("CharCode")
        if char_code is None or char_code.text != "USD":
            continue
        value_elem = valute.find("Value")
        if value_elem is None or value_elem.text is None:
            raise ValueError("USD Valute has no Value")
        value_text = value_elem.text.strip().replace(",", ".")
        try:
            rate = float(value_text)
        except ValueError as exc:
            raise ValueError(f"Invalid USD Value: {value_elem.text}") from exc

        return RateResult(
            rate=rate,
            source="cbr",
            source_name=SOURCES["cbr"]["name"],
            timestamp=datetime.combine(date, datetime.min.time()).replace(tzinfo=MSK),
        )

    raise ValueError("USD Valute not found in CBR XML")


def parse_fallback(data: bytes) -> RateResult:
    """Parse the open.er-api.com JSON response."""
    payload = json.loads(data.decode("utf-8"))
    rate = payload["rates"]["RUB"]
    utc_str = payload["time_last_update_utc"]
    timestamp = parse_fallback_utc(utc_str)
    return RateResult(
        rate=float(rate),
        source="fallback",
        source_name=SOURCES["fallback"]["name"],
        timestamp=timestamp,
    )


def parse_fallback_utc(value: str) -> datetime:
    """Parse UTC datetimes from open.er-api.com and convert to MSK."""
    value = value.strip()
    try:
        dt = datetime.fromisoformat(value.replace(" ", "T", 1))
    except ValueError:
        match = re.match(
            r"^[A-Za-z]{3},\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{4})",
            value,
        )
        if not match:
            raise ValueError(f"Cannot parse fallback datetime: {value}") from None
        dt = datetime.strptime(match.group(1), "%d %b %Y %H:%M:%S %z")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(MSK)


def get_cache_path() -> Path:
    """Return the preferred cache path, falling back to a local file."""
    home = Path.home()
    if str(home) == "/" or not home.exists():
        return Path(__file__).parent / ".usd-rub-cache.json"
    return home / ".cache" / "usd-rub-rate" / "cache.json"


def load_cache(path: Path, ttl: int) -> RateResult | None:
    """Load a cached RateResult if it is still valid."""
    if ttl <= 0 or not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (json.JSONDecodeError, OSError):
        return None

    required = ("rate", "source", "source_name", "timestamp", "cached_at")
    if not all(key in data for key in required):
        return None

    try:
        cached_at = datetime.fromisoformat(data["cached_at"])
    except ValueError:
        return None

    now = datetime.now(cached_at.tzinfo or MSK)
    if cached_at > now:
        return None
    if now - cached_at >= timedelta(seconds=ttl):
        return None

    try:
        timestamp = datetime.fromisoformat(data["timestamp"])
    except ValueError:
        return None

    return RateResult(
        rate=float(data["rate"]),
        source=data["source"],
        source_name=data["source_name"],
        timestamp=timestamp,
        cached=True,
    )


def load_stale_cache(path: Path) -> RateResult | None:
    """Load the cached value regardless of TTL, if structurally valid."""
    if not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (json.JSONDecodeError, OSError):
        return None

    required = ("rate", "source", "source_name", "timestamp", "cached_at")
    if not all(key in data for key in required):
        return None

    try:
        timestamp = datetime.fromisoformat(data["timestamp"])
    except ValueError:
        return None

    return RateResult(
        rate=float(data["rate"]),
        source=data["source"],
        source_name=data["source_name"],
        timestamp=timestamp,
        cached=True,
    )


def save_cache(path: Path, result: RateResult) -> None:
    """Save a successful result to the cache file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now(MSK)
    data = {
        "rate": result.rate,
        "source": result.source,
        "source_name": result.source_name,
        "timestamp": result.timestamp.isoformat(),
        "cached_at": now.isoformat(),
    }
    with path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)


def format_output(result: RateResult) -> str:
    """Format the RateResult for console output."""
    if result.source == "cbr":
        ts = result.timestamp.astimezone(MSK).strftime("%Y-%m-%d")
    else:
        ts = result.timestamp.astimezone(MSK).strftime("%Y-%m-%d %H:%M:%S MSK")
    suffix = ", кэш" if result.cached else ""
    return (
        f"USD/RUB: {result.rate:.2f} "
        f"(источник: {result.source_name}, дата: {ts}{suffix})"
    )


def fetch_source(
    source_key: str,
    timeout: float,
    verbose: bool,
) -> tuple[RateResult | None, str | None]:
    """Fetch and parse a single source. Returns (result, failure_reason)."""
    config = SOURCES[source_key]
    try:
        data = fetch(config["url"], timeout, config["accept"])
        parser: Callable[[bytes], RateResult]
        if source_key == "cbr":
            parser = parse_cbr
        else:
            parser = parse_fallback
        result = parser(data)
        if verbose:
            print(
                f"[{config['name']}] OK: {result.rate:.4f}",
                file=sys.stderr,
            )
        return result, None
    except urllib.error.HTTPError as exc:
        reason = f"HTTP {exc.code}"
    except urllib.error.URLError as exc:
        if isinstance(exc.reason, socket.timeout):
            reason = "timeout"
        else:
            reason = "network error"
    except socket.timeout:
        reason = "timeout"
    except json.JSONDecodeError:
        reason = "invalid JSON"
    except ET.ParseError:
        reason = "invalid XML"
    except (KeyError, TypeError, ValueError):
        reason = "missing field"
    except Exception:  # noqa: BLE001
        reason = "network error"

    if verbose:
        print(f"[{config['name']}] FAILED: {reason}", file=sys.stderr)
    return None, reason


def get_rate(
    source: str,
    timeout: float,
    no_fallback: bool,
    no_cache: bool,
    refresh: bool,
    use_stale: bool,
    verbose: bool,
) -> RateResult | None:
    """Obtain the USD/RUB rate, honouring cache, source and fallback settings."""
    cache_path = get_cache_path()

    if not no_cache and not refresh:
        cached = load_cache(cache_path, DEFAULT_TTL)
        if cached is not None:
            if verbose:
                print(
                    f"[Кэш] OK: {cached.rate:.4f}",
                    file=sys.stderr,
                )
            return cached

    order: list[str] = []
    if source in ("auto", "cbr"):
        order.append("cbr")
    if source in ("auto", "fallback") and not no_fallback:
        order.append("fallback")

    result: RateResult | None = None
    for key in order:
        result, _ = fetch_source(key, timeout, verbose)
        if result is not None:
            if not no_cache:
                save_cache(cache_path, result)
            return result

    if use_stale and not no_cache:
        stale = load_stale_cache(cache_path)
        if stale is not None:
            return stale

    return None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="usd_rub_rate.py",
        description="Показать актуальный курс USD/RUB.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--source",
        choices=("auto", "cbr", "fallback"),
        default="auto",
        help="Источник данных: auto (по умолчанию), cbr, fallback",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help="Таймаут HTTP-запроса в секундах (по умолчанию 10.0)",
    )
    parser.add_argument(
        "--no-fallback",
        action="store_true",
        help="Не использовать fallback-источник",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Отключить чтение и запись кэша",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Игнорировать кэш и обновить данные",
    )
    parser.add_argument(
        "--use-stale",
        action="store_true",
        help="При сетевой ошибке использовать просроченный кэш",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Подробный вывод диагностики",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {__version__}",
        help="Показать версию и выйти",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    try:
        args = parser.parse_args(argv)
    except SystemExit as exc:
        # argparse already printed help/error; preserve exit code.
        return int(exc.code) if isinstance(exc.code, int) else 2

    if args.timeout <= 0:
        parser.error("--timeout must be positive")
        return 2

    if args.source == "fallback" and args.no_fallback:
        parser.error("--source fallback conflicts with --no-fallback")
        return 2

    result = get_rate(
        source=args.source,
        timeout=args.timeout,
        no_fallback=args.no_fallback,
        no_cache=args.no_cache,
        refresh=args.refresh,
        use_stale=args.use_stale,
        verbose=args.verbose,
    )

    if result is None:
        print(ERROR_MESSAGE, file=sys.stderr)
        return 1

    print(format_output(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
