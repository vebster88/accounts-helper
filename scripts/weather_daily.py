#!/usr/bin/env python3
"""
Ежедневный прогноз погоды для одного или нескольких городов.
Источник: Open-Meteo API (бесплатный, без ключа).
Отправляет в Telegram: текущая погода + утро, день, вечер, ночь.

Приоритет источников списка городов:
1. Аргументы командной строки
2. Переменная окружения WEATHER_CITIES
3. Файл ~/.config/weather_daily/cities.json
4. Город по умолчанию — Москва
"""

import argparse
import json
import logging
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

# === КОНФИГ ===
DEFAULT_CITY = "Москва"
MAX_CITIES = 10
CITY_MAX_LEN = 100
CACHE_DIR = Path.home() / ".cache" / "weather_daily"
CACHE_FILE = CACHE_DIR / "geocache.json"
CONFIG_DIR = Path.home() / ".config" / "weather_daily"
CONFIG_FILE = CONFIG_DIR / "cities.json"
CACHE_TTL_DAYS = 30
GEOCODE_TIMEOUT = 10
FORECAST_TIMEOUT = 10
MAX_RETRIES = 2

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Преобразование WMO weather codes → emoji + описание
WMO_CODES = {
    0:  ("☀️", "Ясно"),
    1:  ("🌤", "Преимущественно ясно"),
    2:  ("⛅", "Переменная облачность"),
    3:  ("☁️", "Пасмурно"),
    45: ("🌫", "Туман"),
    48: ("🌫", "Изморозь"),
    51: ("🌧", "Морось"),
    53: ("🌧", "Умеренная морось"),
    55: ("🌧", "Сильная морось"),
    56: ("🌨", "Морось со снегом"),
    57: ("🌨", "Сильная морось со снегом"),
    61: ("🌧", "Небольшой дождь"),
    63: ("🌧", "Умеренный дождь"),
    65: ("🌧", "Сильный дождь"),
    66: ("🌨", "Небольшой ледяной дождь"),
    67: ("🌨", "Сильный ледяной дождь"),
    71: ("🌨", "Небольшой снег"),
    73: ("🌨", "Умеренный снег"),
    75: ("🌨", "Сильный снег"),
    77: ("❄️", "Снежные зёрна"),
    80: ("🌦", "Небольшой ливень"),
    81: ("🌦", "Умеренный ливень"),
    82: ("🌧", "Сильный ливень"),
    85: ("🌨", "Метель"),
    86: ("🌨", "Сильная метель"),
    95: ("⛈", "Гроза"),
    96: ("⛈", "Гроза с градом"),
    99: ("⛈", "Гроза с сильным градом"),
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger(__name__)


def normalize_city(name):
    """Нормализует название города для использования в качестве ключа кэша."""
    return name.strip().lower()


def sanitize_city(name):
    """
    Валидирует пользовательский ввод: удаляет управляющие символы,
    null-bytes, ограничивает длину.
    """
    if not name:
        return ""
    # Удаляем null-bytes и управляющие символы, кроме пробельных (например, пробел в 'San Francisco')
    cleaned = "".join(
        ch for ch in name
        if ch not in {"\x00"} and (ord(ch) >= 32 or ch in {"\t", "\n", "\r"})
    ).strip()
    if len(cleaned) > CITY_MAX_LEN:
        cleaned = cleaned[:CITY_MAX_LEN].strip()
    return cleaned


def parse_city_sources(cli_args):
    """
    Определяет список городов по приоритету:
    CLI args > env WEATHER_CITIES > config file > default Moscow.
    """
    if cli_args:
        return cli_args

    env_cities = os.environ.get("WEATHER_CITIES", "").strip()
    if env_cities:
        return _split_city_list(env_cities)

    if CONFIG_FILE.exists():
        try:
            with CONFIG_FILE.open("r", encoding="utf-8") as f:
                raw = json.load(f)
            if isinstance(raw, list):
                cities = []
                for item in raw:
                    if isinstance(item, str):
                        cities.extend(_split_city_list(item))
                    elif isinstance(item, list):
                        for sub in item:
                            if isinstance(sub, str):
                                cities.extend(_split_city_list(sub))
                return [c for c in cities if c.strip()]
            if isinstance(raw, str):
                return _split_city_list(raw)
        except Exception as exc:
            log.warning("Не удалось прочитать конфиг %s: %s", CONFIG_FILE, exc)

    return [DEFAULT_CITY]


def _split_city_list(text):
    """Разбивает строку с городами, разделёнными запятыми, на список."""
    return [part.strip() for part in text.split(",") if part.strip()]


def load_cache():
    """Загружает кэш геокодирования из файла."""
    if not CACHE_FILE.exists():
        return {}
    try:
        with CACHE_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            log.warning("Кэш повреждён, сбрасывается.")
            return {}
        return data
    except Exception as exc:
        log.warning("Не удалось загрузить кэш: %s", exc)
        return {}


def save_cache(cache):
    """Атомарно сохраняет кэш геокодирования в файл."""
    try:
        CACHE_DIR.mkdir(parents=True, mode=0o700, exist_ok=True)
        tmp = CACHE_FILE.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
        tmp.replace(CACHE_FILE)
        CACHE_FILE.chmod(0o600)
    except Exception as exc:
        log.error("Не удалось сохранить кэш: %s", exc)


def is_cache_entry_fresh(entry):
    """Проверяет, не истёк ли 30-дневный TTL записи кэша."""
    cached_at = entry.get("cached_at")
    if not cached_at:
        return False
    try:
        dt = datetime.fromisoformat(cached_at)
        return datetime.now() - dt < timedelta(days=CACHE_TTL_DAYS)
    except Exception:
        return False


def _http_get_json(url, timeout, retries=MAX_RETRIES):
    """Выполняет GET-запрос и возвращает распарсенный JSON с повторными попытками."""
    last_exc = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "weather_daily/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as exc:
            last_exc = exc
            status = exc.code
            if 500 <= status < 600:
                log.warning("HTTP %s при запросе %s, попытка %d", status, url, attempt + 1)
                time.sleep(0.5 * (attempt + 1))
                continue
            raise
        except urllib.error.URLError as exc:
            last_exc = exc
            log.warning("Ошибка сети при запросе %s, попытка %d: %s", url, attempt + 1, exc)
            time.sleep(0.5 * (attempt + 1))
            continue
        except TimeoutError:
            last_exc = TimeoutError(f"Таймаут при запросе {url}")
            log.warning("Таймаут при запросе %s, попытка %d", url, attempt + 1)
            time.sleep(0.5 * (attempt + 1))
            continue
    raise last_exc if last_exc else RuntimeError("Не удалось выполнить HTTP-запрос")


def geocode_city(name, cache):
    """
    Возвращает (lat, lon, display_name, timezone) для города, используя кэш или API.
    """
    key = normalize_city(name)
    if key in cache and is_cache_entry_fresh(cache[key]):
        entry = cache[key]
        log.info("Кэш-хит для '%s' → %s", name, entry.get("name"))
        return entry["lat"], entry["lon"], entry["name"], entry.get("timezone")

    params = {
        "name": name,
        "count": "1",
        "language": "ru",
        "format": "json",
    }
    url = f"{GEOCODING_URL}?{urllib.parse.urlencode(params)}"
    log.info("Геокодирование '%s' через Open-Meteo", name)
    data = _http_get_json(url, GEOCODE_TIMEOUT)

    results = data.get("results") if isinstance(data, dict) else None
    if not results:
        raise ValueError(f'Город "{name}" не найден')

    result = results[0]
    lat = result["latitude"]
    lon = result["longitude"]
    display_name = result.get("name", name)
    timezone = result.get("timezone")

    cache[key] = {
        "lat": lat,
        "lon": lon,
        "name": display_name,
        "timezone": timezone,
        "cached_at": datetime.now().isoformat(),
    }
    return lat, lon, display_name, timezone


def fetch_weather(lat, lon, timezone):
    """Запрашивает прогноз погоды из Open-Meteo Forecast API."""
    tz_value = timezone if timezone else "auto"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
        "hourly": "temperature_2m,weather_code",
        "timezone": tz_value,
        "forecast_days": "2",
    }
    url = f"{FORECAST_URL}?{urllib.parse.urlencode(params)}"
    log.info("Запрос прогноза для (%s, %s), timezone=%s", lat, lon, tz_value)
    return _http_get_json(url, FORECAST_TIMEOUT)


def wmo_to_russian(code):
    emoji, desc = WMO_CODES.get(code, ("🌡", "Неизвестно"))
    return emoji, desc


def format_temp(t):
    sign = "+" if t >= 0 else ""
    return f"{sign}{round(t)}°"


def get_period_forecast(hourly, start_hour, end_hour, day_offset=0):
    """Извлекает данные для периода суток."""
    times = hourly["time"]
    temps = hourly["temperature_2m"]
    codes = hourly["weather_code"]

    today = datetime.now().date()
    target_date = today + timedelta(days=day_offset)

    period_temps = []
    period_codes = []

    for t, temp, code in zip(times, temps, codes):
        dt = datetime.fromisoformat(t)
        if dt.date() == target_date and start_hour <= dt.hour < end_hour:
            period_temps.append(temp)
            period_codes.append(code)

    if not period_temps:
        return None

    t_min = min(period_temps)
    t_max = max(period_temps)

    most_common_code = Counter(period_codes).most_common(1)[0][0]
    emoji, desc = wmo_to_russian(most_common_code)

    return {
        "t_min": t_min,
        "t_max": t_max,
        "emoji": emoji,
        "desc": desc,
    }


def build_message(data, city):
    current = data.get("current") or {}
    hourly = data.get("hourly") or {}

    now_temp = current.get("temperature_2m")
    now_feels = current.get("apparent_temperature")
    now_hum = current.get("relative_humidity_2m")
    now_wind = current.get("wind_speed_10m")
    now_code = current.get("weather_code")

    lines = [f"🌍 *{city}* — прогноз на сегодня", ""]

    if now_temp is not None and now_code is not None:
        now_emoji, now_desc = wmo_to_russian(now_code)
        lines.extend([
            f"📍 *Сейчас:* {format_temp(now_temp)} ({now_desc}) {now_emoji}",
        ])
    if now_feels is not None:
        lines.append(f"🌡 Ощущается: {format_temp(now_feels)}")
    if now_hum is not None:
        lines.append(f"💧 Влажность: {now_hum}%")
    if now_wind is not None:
        lines.append(f"💨 Ветер: {now_wind} м/с")

    if now_temp is not None:
        lines.extend(["", "─────────────────", ""])

    periods = [
        ("🌅 Утро", 6, 12, 0),
        ("☀️ День", 12, 18, 0),
        ("🌆 Вечер", 18, 24, 0),
        ("🌙 Ночь", 0, 6, 1),
    ]

    for label, start, end, offset in periods:
        p = get_period_forecast(hourly, start, end, offset)
        if p:
            t_str = f"{format_temp(p['t_min'])}...{format_temp(p['t_max'])}"
            lines.append(f"{label} ({start:02d}:00–{end:02d}:00): {t_str} {p['emoji']} {p['desc']}")
        else:
            lines.append(f"{label}: нет данных")

    lines.extend([
        "",
        "─────────────────",
        f"🤖 Данные: Open-Meteo  |  📅 {datetime.now().strftime('%d.%m.%Y')}",
    ])

    return "\n".join(lines)


def send_telegram(text):
    """Выводит текст, который Hermes доставит в Telegram."""
    print(text)


def process_city(name, cache):
    """Обрабатывает один город: геокодирование, прогноз, вывод сообщения."""
    display_name = name
    try:
        lat, lon, display_name, timezone = geocode_city(name, cache)
        data = fetch_weather(lat, lon, timezone)
        msg = build_message(data, display_name)
        send_telegram(msg)
        return True
    except urllib.error.HTTPError as exc:
        status = exc.code
        if 500 <= status < 600:
            log.error("Город '%s': ошибка сервиса погоды (HTTP %s)", display_name, status)
            print(f'❌ Город "{display_name}": ошибка сервиса погоды')
        elif 400 <= status < 500:
            log.error("Город '%s': некорректный запрос к погоде (HTTP %s)", display_name, status)
            print(f'❌ Город "{display_name}": некорректный запрос к сервису погоды')
        else:
            log.error("Город '%s': HTTP %s", display_name, status)
            print(f'❌ Город "{display_name}": ошибка сервиса погоды')
    except TimeoutError as exc:
        log.error("Город '%s': таймаут прогноза погоды: %s", display_name, exc)
        print(f'❌ Город "{display_name}": таймаут прогноза погоды')
    except urllib.error.URLError as exc:
        log.error("Город '%s': сетевая ошибка прогноза: %s", display_name, exc)
        print(f'❌ Город "{display_name}": ошибка сервиса погоды')
    except ValueError as exc:
        log.warning("Город '%s': %s", display_name, exc)
        print(f'❌ Город "{display_name}" не найден')
    except json.JSONDecodeError as exc:
        log.error("Город '%s': некорректный ответ сервиса: %s", display_name, exc)
        print(f'❌ Город "{display_name}": некорректный ответ сервиса')
    except KeyError as exc:
        log.error("Город '%s': некорректный ответ сервиса (отсутствует %s)", display_name, exc)
        print(f'❌ Город "{display_name}": некорректный ответ сервиса')
    except Exception as exc:
        log.exception("Город '%s': непредвиденная ошибка", display_name)
        print(f'❌ Город "{display_name}": ошибка при получении прогноза')
    return False


def main():
    parser = argparse.ArgumentParser(
        description="Ежедневный прогноз погоды для одного или нескольких городов.",
    )
    parser.add_argument(
        "cities",
        nargs="*",
        help="Список городов (позиционные аргументы).",
    )
    args = parser.parse_args()

    raw_cities = [sanitize_city(city) for city in args.cities]
    raw_cities = [city for city in raw_cities if city]
    skipped_empty = len(args.cities) - len(raw_cities)

    cities = parse_city_sources(raw_cities)

    if skipped_empty:
        log.warning("Пропущено %d пустых аргументов", skipped_empty)
        print("⚠️ Пропущен пустой аргумент")

    if len(cities) > MAX_CITIES:
        log.error("Превышен лимит городов: %d (максимум %d)", len(cities), MAX_CITIES)
        print(f"❌ Максимальное количество городов — {MAX_CITIES}")
        return 2

    if not cities:
        log.error("Не указано ни одного города")
        print("❌ Не указано ни одного города")
        return 2

    cache = load_cache()
    any_error = False

    for city in cities:
        ok = process_city(city, cache)
        if not ok:
            any_error = True
        # Разделитель между городами
        if city != cities[-1]:
            print()

    save_cache(cache)

    return 1 if any_error else 0


if __name__ == "__main__":
    sys.exit(main())
