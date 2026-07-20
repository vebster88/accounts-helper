#!/usr/bin/env python3
"""
Ежедневный Telegram-дайджест.

Собирает единое сообщение из:
- прогноза погоды (weather_daily.py);
- курса USD/RUB (usd_rub_rate.py).

Выводит готовое сообщение в stdout, логи — в stderr.
"""

import argparse
import logging
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    stream=sys.stderr,
)

PROJECT_DIR = Path(os.environ.get("PROJECT_DIR", "/home/hermes_ai/my_agent/AI-harness"))
WEATHER_SCRIPT = Path.home() / ".hermes" / "scripts" / "weather_daily.py"
RATE_SCRIPT = PROJECT_DIR / "scripts" / "currency_rate.py"
TELEGRAM_LIMIT = 4096
MD_SPECIAL = re.escape(r"*_[]()~`>#+=")
MD_RE = re.compile(f"[{MD_SPECIAL}]")


def strip_markdown(text: str) -> str:
    return MD_RE.sub("", text)


def run_weather_block(city_args):
    try:
        result = subprocess.run(
            [sys.executable, str(WEATHER_SCRIPT)] + city_args,
            capture_output=True,
            text=True,
            timeout=30,
            encoding="utf-8",
            errors="replace",
        )
        if result.returncode == 2:
            logging.error("weather_daily.py config error: %s", result.stderr.strip())
            return "❌ Погода недоступна"
        if result.stderr:
            logging.warning("weather_daily.py stderr: %s", result.stderr.strip())
        if result.returncode == 1:
            logging.warning("weather_daily.py partial success (exit 1)")
        return strip_markdown(result.stdout.strip()) if result.stdout.strip() else "❌ Погода недоступна"
    except subprocess.TimeoutExpired:
        logging.error("weather_daily.py timed out")
        return "❌ Погода недоступна"
    except Exception:
        logging.exception("weather block failed")
        return "❌ Погода недоступна"


def run_rate_block():
    try:
        result = subprocess.run(
            [sys.executable, str(RATE_SCRIPT), "--timeout", "15", "report", "--format", "digest"],
            capture_output=True,
            text=True,
            timeout=15,
            encoding="utf-8",
            errors="replace",
        )
        if result.stderr:
            logging.warning("currency_rate.py stderr: %s", result.stderr.strip())
        if result.returncode != 0:
            return "❌ Курс недоступен"
        return strip_markdown(result.stdout.strip())
    except subprocess.TimeoutExpired:
        logging.error("currency_rate.py timed out")
        return "❌ Курс недоступен"
    except Exception:
        logging.exception("rate block failed")
        return "❌ Курс недоступен"


def truncate_message(text: str, limit: int = TELEGRAM_LIMIT) -> str:
    if len(text) <= limit:
        return text

    # 1. Drop footer (last block after separator line)
    lines = text.splitlines()
    separator_idx = None
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].startswith("─────────────────"):
            separator_idx = i
            break
    if separator_idx is not None:
        lines = lines[:separator_idx]
        text = "\n".join(lines)
        if len(text) + 1 <= limit - 1:
            return text + "\n…"

    # 2. Trim weather block at city boundaries (blank-line boundaries)
    while len(text) > limit - 1:
        cut = text.rfind("\n\n", 0, limit - 1)
        if cut == -1:
            break
        text = text[:cut]

    # 3. Final codepoint-safe trim with ellipsis
    if len(text) > limit - 1:
        text = text[: limit - 1]
        while text and (ord(text[-1]) & 0xC0 == 0x80):
            text = text[:-1]
    return text + "…"


def assemble_message(weather_block, rate_block):
    today = datetime.now().strftime("%d.%m.%Y")
    lines = [
        f"☀️ Утренний дайджест — {today}",
        "",
        weather_block,
        "",
        f"💰 Курсы валют:",
        rate_block,
        "",
        "─────────────────",
        f"🤖 Hermes daily digest  |  📅 {today}",
    ]
    text = "\n".join(lines)
    return truncate_message(text)


def resolve_city_args(cli_cities):
    return [c for c in cli_cities if c.strip()]


def main():
    parser = argparse.ArgumentParser(description="Ежедневный Telegram-дайджест")
    parser.add_argument("cities", nargs="*", help="Список городов")
    args = parser.parse_args()

    city_args = resolve_city_args(args.cities)
    if len(city_args) > 10:
        logging.error("Максимальное количество городов — 10")
        print("❌ Максимальное количество городов — 10", file=sys.stderr)
        return 2
    if city_args:
        for city in city_args:
            if len(city) > 100 or any(ord(c) < 32 for c in city):
                logging.error("Invalid city argument: %r", city)
                print(f"❌ Некорректное название города: {city}", file=sys.stderr)
                return 2

    weather_block = run_weather_block(city_args)
    rate_block = run_rate_block()
    message = assemble_message(weather_block, rate_block)
    print(message)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        logging.exception("Не удалось собрать дайджест")
        print("❌ Не удалось собрать дайджест", file=sys.stdout)
        sys.exit(1)
