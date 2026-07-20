#!/usr/bin/env python3
"""Console utility to fetch and display USD/RUB and EUR/RUB exchange rates.

Stores up to 90 days of history and computes a configurable moving average
(default 30 days). Designed to be called from cron for silent updates and
from daily_digest.py for a digest-friendly summary.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import socket
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

__version__ = "2.0.0"

DEFAULT_TIMEOUT = 10.0
DEFAULT_TTL = 300  # seconds
DEFAULT_HISTORY_DAYS = 90
DEFAULT_MA_DAYS = 30

SOURCES = {
    "cbr": {
        "name": "ЦБ РФ",
        "url": "https://www.cbr.ru/scripts/XML_daily.asp",
        "accept": "application/xml",
    },
    "fallback": {
        "name": "open.er-api.com",
        "url": "https://open.er-api.com/v6/latest/{base}",
        "accept": "application/json",
    },
}

CURRENCIES = {
    "usd": {"base": "USD", "char_code": "USD", "symbol": "USD/RUB"},
    "eur": {"base": "EUR", "char_code": "EUR", "symbol": "EUR/RUB"},
}

ERROR_MESSAGE = "Не удалось получить курс {pair}. Проверьте подключение к интернету."

MSK = timezone(timedelta(hours=3), name="MSK")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    stream=sys.stderr,
)


@dataclass(frozen=True)
class RateResult:
    rate: float
    source: str
    source_name: str
    timestamp: datetime
    cached: bool = False


class RateError(Exception):
    pass


def get_user_agent() -> str:
    return f"currency-rate/{__version__}"


def fetch(url: str, timeout: float, accept: str) -> bytes:
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
    try:
        return data.decode("windows-1251")
    except UnicodeDecodeError:
        return data.decode("utf-8")


def parse_cbr(data: bytes, char_code: str) -> RateResult:
    text = _decode_cbr_response(data)
    root = ET.fromstring(text)

    date_attr = root.get("Date")
    if not date_attr:
        raise ValueError("Missing ValCurs/@Date attribute")
    try:
        dt = datetime.strptime(date_attr, "%d.%m.%Y").date()
    except ValueError as exc:
        raise ValueError(f"Invalid ValCurs/@Date: {date_attr}") from exc

    for valute in root.findall("Valute"):
        code_elem = valute.find("CharCode")
        if code_elem is None or code_elem.text != char_code:
            continue
        value_elem = valute.find("Value")
        if value_elem is None or value_elem.text is None:
            raise ValueError(f"{char_code} Valute has no Value")
        value_text = value_elem.text.strip().replace(",", ".")
        try:
            rate = float(value_text)
        except ValueError as exc:
            raise ValueError(f"Invalid {char_code} Value: {value_elem.text}") from exc

        return RateResult(
            rate=rate,
            source="cbr",
            source_name=SOURCES["cbr"]["name"],
            timestamp=datetime.combine(dt, datetime.min.time()).replace(tzinfo=MSK),
        )

    raise ValueError(f"{char_code} Valute not found in CBR XML")


def parse_fallback(data: bytes, base: str) -> RateResult:
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


def get_data_dir() -> Path:
    home = Path.home()
    if str(home) == "/" or not home.exists():
        return Path(__file__).parent / ".currency-rate"
    return home / ".cache" / "currency-rate"


def get_cache_path() -> Path:
    return get_data_dir() / "cache.json"


def get_history_path() -> Path:
    return get_data_dir() / "history.json"


def load_cache(path: Path, ttl: int) -> dict[str, RateResult] | None:
    if ttl <= 0 or not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (json.JSONDecodeError, OSError):
        return None

    if not isinstance(data, dict):
        return None

    now = datetime.now(MSK)
    results: dict[str, RateResult] = {}
    for currency, entry in data.items():
        if currency not in CURRENCIES:
            continue
        required = ("rate", "source", "source_name", "timestamp", "cached_at")
        if not all(key in entry for key in required):
            continue
        try:
            cached_at = datetime.fromisoformat(entry["cached_at"])
            timestamp = datetime.fromisoformat(entry["timestamp"])
        except ValueError:
            continue
        if cached_at > now:
            continue
        if now - cached_at >= timedelta(seconds=ttl):
            continue
        results[currency] = RateResult(
            rate=float(entry["rate"]),
            source=entry["source"],
            source_name=entry["source_name"],
            timestamp=timestamp,
            cached=True,
        )

    return results if results else None


def atomic_write_json(path: Path, data: object) -> None:
    """Atomically write JSON data to *path* using a sibling temp file + os.replace."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.parent / f"{path.name}.tmp.{os.getpid()}"
    try:
        with tmp.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        os.replace(tmp, path)
    except Exception:
        try:
            tmp.unlink()
        except FileNotFoundError:
            pass
        raise


def save_cache(path: Path, results: dict[str, RateResult]) -> None:
    data = {}
    for currency, result in results.items():
        data[currency] = {
            "rate": result.rate,
            "source": result.source,
            "source_name": result.source_name,
            "timestamp": result.timestamp.isoformat(),
            "cached_at": datetime.now(MSK).isoformat(),
        }
    atomic_write_json(path, data)


def load_history(path: Path) -> dict[str, list[dict]]:
    if not path.exists():
        return {c: [] for c in CURRENCIES}
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (json.JSONDecodeError, OSError):
        return {c: [] for c in CURRENCIES}

    if not isinstance(data, dict):
        return {c: [] for c in CURRENCIES}

    history = {c: [] for c in CURRENCIES}
    for currency in CURRENCIES:
        entries = data.get(currency, [])
        if isinstance(entries, list):
            history[currency] = [
                {
                    "date": entry["date"],
                    "rate": float(entry["rate"]),
                    "source": entry.get("source", "unknown"),
                    "source_name": entry.get("source_name", ""),
                    "timestamp": entry.get("timestamp", entry["date"]),
                }
                for entry in entries
                if isinstance(entry, dict) and "date" in entry and "rate" in entry
            ]
    return history


def save_history(path: Path, history: dict[str, list[dict]]) -> None:
    data = {
        "updated_at": datetime.now(MSK).isoformat(),
    }
    for currency in CURRENCIES:
        entries = sorted(history[currency], key=lambda e: e["date"])
        serialized_entries = []
        for entry in entries:
            serialized_entry = {
                "date": entry["date"],
                "rate": entry["rate"],
                "source": entry["source"],
                "source_name": entry["source_name"],
                "timestamp": entry.get("timestamp", entry["date"]),
            }
            serialized_entries.append(serialized_entry)
        data[currency] = serialized_entries
    atomic_write_json(path, data)


def update_history(history: dict[str, list[dict]], results: dict[str, RateResult], max_days: int) -> dict[str, list[dict]]:
    today = datetime.now(MSK).date()
    today_str = today.isoformat()
    for currency, result in results.items():
        entries = history.get(currency, [])
        entries = [e for e in entries if e["date"] != today_str]
        entry_date = result.timestamp.date()
        if entry_date > today:
            entry_date = today
        entry_date_str = entry_date.isoformat()
        # Avoid duplicate for the same date if it somehow survived.
        entries = [e for e in entries if e["date"] != entry_date_str]
        entries.append({
            "date": entry_date_str,
            "rate": result.rate,
            "source": result.source,
            "source_name": result.source_name,
            "timestamp": result.timestamp.isoformat(),
        })
        entries = sorted(entries, key=lambda e: e["date"])
        cutoff = (today - timedelta(days=max_days)).isoformat()
        entries = [e for e in entries if e["date"] >= cutoff]
        history[currency] = entries
    return history


def compute_sma(entries: list[dict], days: int) -> float | None:
    if not entries:
        return None
    sorted_entries = sorted(entries, key=lambda e: e["date"])
    window = sorted_entries[-days:]
    if not window:
        return None
    return sum(e["rate"] for e in window) / len(window)


def fetch_single(
    currency: str,
    source: str,
    timeout: float,
    verbose: bool,
) -> RateResult:
    meta = CURRENCIES[currency]
    if source == "cbr":
        url = SOURCES["cbr"]["url"]
        accept = SOURCES["cbr"]["accept"]
        try:
            data = fetch(url, timeout, accept)
            result = parse_cbr(data, meta["char_code"])
            if verbose:
                logging.info("[%s] OK: %s/%s = %.4f", SOURCES["cbr"]["name"], meta["base"], "RUB", result.rate)
            return result
        except Exception as exc:
            if verbose:
                logging.info("[%s] FAILED: %s", SOURCES["cbr"]["name"], exc)
            raise
    elif source == "fallback":
        url = SOURCES["fallback"]["url"].format(base=meta["base"])
        accept = SOURCES["fallback"]["accept"]
        try:
            data = fetch(url, timeout, accept)
            result = parse_fallback(data, meta["base"])
            if verbose:
                logging.info("[%s] OK: %s/%s = %.4f", SOURCES["fallback"]["name"], meta["base"], "RUB", result.rate)
            return result
        except Exception as exc:
            if verbose:
                logging.info("[%s] FAILED: %s", SOURCES["fallback"]["name"], exc)
            raise
    else:
        raise ValueError(f"Unknown source: {source}")


def fetch_currency(
    currency: str,
    source: str,
    timeout: float,
    no_fallback: bool,
    verbose: bool,
) -> RateResult | None:
    if source in ("cbr", "auto"):
        try:
            return fetch_single(currency, "cbr", timeout, verbose)
        except Exception:
            if no_fallback or source == "cbr":
                return None
    if source in ("fallback", "auto"):
        try:
            return fetch_single(currency, "fallback", timeout, verbose)
        except Exception:
            return None
    return None


def fetch_all(
    currencies: list[str],
    source: str,
    timeout: float,
    no_fallback: bool,
    verbose: bool,
) -> dict[str, RateResult]:
    results: dict[str, RateResult] = {}
    for currency in currencies:
        result = fetch_currency(currency, source, timeout, no_fallback, verbose)
        if result:
            results[currency] = result
    return results


def format_rate_line(currency: str, result: RateResult, sma: float | None = None, stale: bool = False) -> str:
    meta = CURRENCIES[currency]
    parts = [
        f"{meta['symbol']}: {result.rate:.2f}",
        f"(источник: {result.source_name}",
        f"дата: {result.timestamp.strftime('%Y-%m-%d')}",
    ]
    if sma is not None:
        parts.append(f"SMA30: {sma:.2f}")
    if stale:
        parts.append("кэш")
    line = ", ".join(parts)
    return line + ")"


def format_digest_line(currency: str, result: RateResult, sma: float | None = None, change: float | None = None) -> str:
    meta = CURRENCIES[currency]
    parts = [f"{meta['symbol']}: {result.rate:.2f}"]
    extras: list[str] = []
    if change is not None:
        sign = "+" if change >= 0 else ""
        extras.append(f"{sign}{change:.2f}")
    if sma is not None:
        extras.append(f"SMA30: {sma:.2f}")
    if extras:
        parts.append(f"({', '.join(extras)})")
    return " ".join(parts)


def find_previous_day_change(history_entries: list[dict], current_date: date | str | None = None) -> float | None:
    """Return rate difference between the newest entry and the previous calendar day, if any."""
    if not history_entries:
        return None
    sorted_entries = sorted(history_entries, key=lambda e: e["date"])
    if current_date is None:
        current_date = datetime.now(MSK).date()
    elif isinstance(current_date, str):
        current_date = date.fromisoformat(current_date)
    prev_date = (current_date - timedelta(days=1)).isoformat()
    current_rate = None
    for entry in reversed(sorted_entries):
        if entry["date"] == current_date.isoformat():
            current_rate = entry["rate"]
        elif entry["date"] == prev_date and current_rate is not None:
            return current_rate - entry["rate"]
    return None


def get_currencies_to_process(args: argparse.Namespace) -> list[str]:
    if args.currency == "all":
        return list(CURRENCIES.keys())
    return [args.currency]


def run_update(args: argparse.Namespace) -> int:
    cache_path = get_cache_path()
    history_path = get_history_path()
    currencies = get_currencies_to_process(args)

    cached = None
    if not args.no_cache and not args.refresh:
        cached = load_cache(cache_path, args.ttl)

    missing = [c for c in currencies if not cached or c not in cached]
    results: dict[str, RateResult] = {}
    if cached:
        for c in currencies:
            if c in cached:
                results[c] = cached[c]

    if missing:
        fetched = fetch_all(
            missing,
            args.source,
            args.timeout,
            args.no_fallback,
            args.verbose,
        )
        results.update(fetched)

    if not results:
        logging.error(ERROR_MESSAGE.format(pair="USD/RUB, EUR/RUB"))
        return 1

    if not args.no_cache:
        save_cache(cache_path, results)

    history = load_history(history_path)
    history = update_history(history, results, args.history_days)
    save_history(history_path, history)

    if args.verbose:
        for currency in currencies:
            if currency in results:
                logging.info("Updated %s: %.4f", currency.upper(), results[currency].rate)

    return 0


def run_report(args: argparse.Namespace) -> int:
    cache_path = get_cache_path()
    history_path = get_history_path()
    currencies = get_currencies_to_process(args)

    results: dict[str, RateResult] = {}
    history = load_history(history_path)

    cached = load_cache(cache_path, args.ttl)
    if cached:
        for c in currencies:
            if c in cached:
                results[c] = cached[c]

    missing = [c for c in currencies if c not in results]
    if missing:
        fetched = fetch_all(
            missing,
            args.source,
            args.timeout,
            args.no_fallback,
            args.verbose,
        )
        results.update(fetched)

    if not results:
        if args.use_stale:
            for c in currencies:
                if history.get(c):
                    latest = sorted(history[c], key=lambda e: e["date"])[-1]
                    results[c] = RateResult(
                        rate=latest["rate"],
                        source=latest["source"],
                        source_name=latest["source_name"],
                        timestamp=datetime.fromisoformat(latest["timestamp"]),
                        cached=True,
                    )
        if not results:
            print(ERROR_MESSAGE.format(pair="USD/RUB, EUR/RUB"), file=sys.stderr)
            return 1

    if not args.no_cache:
        save_cache(cache_path, results)
        history = update_history(history, results, args.history_days)
        save_history(history_path, history)

    if args.format == "digest":
        lines = []
        for currency in currencies:
            if currency in results:
                sma = compute_sma(history.get(currency, []), args.moving_average_days)
                change = find_previous_day_change(history.get(currency, []))
                lines.append(format_digest_line(currency, results[currency], sma, change))
        print(" | ".join(lines))
    elif args.format == "json":
        output = {}
        for currency in currencies:
            if currency in results:
                sma = compute_sma(history.get(currency, []), args.moving_average_days)
                output[currency] = {
                    "rate": results[currency].rate,
                    "source": results[currency].source,
                    "source_name": results[currency].source_name,
                    "timestamp": results[currency].timestamp.isoformat(),
                    "sma30": sma,
                }
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        for currency in currencies:
            if currency in results:
                sma = compute_sma(history.get(currency, []), args.moving_average_days)
                stale = results[currency].cached and args.use_stale
                print(format_rate_line(currency, results[currency], sma, stale))

    return 0


def run_history(args: argparse.Namespace) -> int:
    history_path = get_history_path()
    history = load_history(history_path)
    currencies = get_currencies_to_process(args)
    days = args.history_days

    output = {}
    for currency in currencies:
        entries = sorted(history.get(currency, []), key=lambda e: e["date"])
        if days > 0:
            cutoff = (datetime.now(MSK).date() - timedelta(days=days)).isoformat()
            entries = [e for e in entries if e["date"] >= cutoff]
        output[currency] = entries

    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Курсы USD/RUB и EUR/RUB с историей и скользящей средней.",
    )
    parser.add_argument(
        "--currency",
        choices=list(CURRENCIES.keys()) + ["all"],
        default="all",
        help="Валютная пара (usd, eur, all). По умолчанию all.",
    )
    parser.add_argument(
        "--source",
        choices=["auto", "cbr", "fallback"],
        default="auto",
        help="Источник данных",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help="Таймаут HTTP-запроса в секундах",
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
        version=f"currency-rate {__version__}",
    )
    parser.add_argument(
        "--ttl",
        type=int,
        default=DEFAULT_TTL,
        help="Время жизни кэша в секундах (по умолчанию 300)",
    )
    parser.add_argument(
        "--history-days",
        type=int,
        default=DEFAULT_HISTORY_DAYS,
        help="Сколько дней хранить в истории (по умолчанию 90)",
    )
    parser.add_argument(
        "--moving-average-days",
        type=int,
        default=DEFAULT_MA_DAYS,
        help="Окно скользящей средней в днях (по умолчанию 30)",
    )

    subparsers = parser.add_subparsers(dest="command")

    update_parser = subparsers.add_parser(
        "update",
        help="Тихое обновление кэша и истории (без вывода в stdout)",
    )
    update_parser.set_defaults(func=run_update)

    report_parser = subparsers.add_parser(
        "report",
        help="Вывести текущий курс и скользящую среднюю",
    )
    report_parser.add_argument(
        "--format",
        choices=["text", "digest", "json"],
        default="text",
        help="Формат вывода",
    )
    report_parser.set_defaults(func=run_report)

    history_parser = subparsers.add_parser(
        "history",
        help="Вывести историю курсов в JSON",
    )
    history_parser.set_defaults(func=run_history)

    parser.set_defaults(command="report", func=run_report, format="text")

    return parser


def validate_args(args: argparse.Namespace) -> int | None:
    if args.timeout <= 0:
        print("Таймаут должен быть больше 0", file=sys.stderr)
        return 2
    if args.history_days <= 0:
        print("history-days должен быть больше 0", file=sys.stderr)
        return 2
    if args.moving_average_days <= 0:
        print("moving-average-days должен быть больше 0", file=sys.stderr)
        return 2
    if args.source == "fallback" and args.no_fallback:
        print("Конфликт флагов: --source fallback и --no-fallback", file=sys.stderr)
        return 2
    return None


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    error = validate_args(args)
    if error is not None:
        return error

    if args.command is None:
        args.command = "report"
        args.func = run_report

    return args.func(args)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        logging.exception("Не удалось выполнить currency-rate")
        print("❌ Не удалось выполнить currency-rate", file=sys.stderr)
        sys.exit(1)
