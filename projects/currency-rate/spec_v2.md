---
status: approved
title: Техническая спецификация — Мультивалютный скрипт курсов USD/RUB и EUR/RUB v2.0
author: System Analyst sub-agent
project: /home/hermes_ai/my_agent/AI-harness/projects/currency-rate
version: 2.0.0
---

# Техническая спецификация (ТЗ): Мультивалютный скрипт курсов USD/RUB и EUR/RUB v2.0

## 1. Область применения

Настоящая спецификация описывает доработку консольной утилиты `currency_rate.py`, а также сопутствующих скриптов `usd_rub_rate.py` (legacy-обёртка) и `daily_digest.py` (интеграция с Telegram-дайджестом). Цель — единое stdlib-only решение на Python 3.11+ для получения курсов USD/RUB и EUR/RUB, хранения 90-дневной истории, расчёта SMA30, тихого cron-обновления в 12:00 MSK и поставки компактной строки в утренний дайджест.

## 2. Ссылки

- `brd_v2.md` — бизнес-требования v2.0.
- `hld_v2.md` — высокоуровневое проектное решение v2.0.
- `currency_rate.py` — основной исполняемый скрипт v2.0.0.
- `usd_rub_rate.py` — legacy-скрипт v1.0.0.
- `daily_digest.py` — сборка утреннего дайджеста.
- `docs/architect-collector-summary.md` — краткая сводка контекста, собранного на старте pipeline (cron-интеграция, drift доков/кода, риски).

## 3. Глоссарий

| Термин | Определение |
|--------|-------------|
| Пара | Валютная пара USD/RUB или EUR/RUB, идентифицируемая ключом `usd` или `eur`. |
| CBR / ЦБ РФ | Официальный XML API ЦБ РФ (`XML_daily.asp`). |
| Fallback | Альтернативный источник open.er-api.com/v6/latest/{base}. |
| SMA30 | Простая скользящая средняя за окно `--moving-average-days` (по умолчанию 30 дней). |
| MSK | Московское время, UTC+3. |
| Тихое обновление | Подкоманда `update`, которая при успехе не пишет в stdout. |

## 4. Функциональные требования (FR)

### FR-01 — Поддержка USD/RUB и EUR/RUB
**Описание:** Скрипт запрашивает и отображает актуальные курсы обеих пар.
**Критерии приёмки:**
1. Ключи валют: `usd`, `eur`.
2. Пользователь может выбрать одну пару (`--currency usd`, `--currency eur`) или все (`--currency all`, default).
3. Каждая пара запрашивается отдельно у источников; для EUR/RUB используется тот же CBR XML, где фильтруется `CharCode="EUR"`.
**Приоритет:** Must.
**Трассировка:** BR-01, US-01.

### FR-02 — Основной источник ЦБ РФ
**Описание:** Основной источник данных — официальный XML API ЦБ РФ.
**Критерии приёмки:**
1. URL: `https://www.cbr.ru/scripts/XML_daily.asp`.
2. Парсинг stdlib (`xml.etree.ElementTree`).
3. Декодирование ответа: `windows-1251` с fallback на `utf-8`.
4. Извлекаются `ValCurs/@Date`, `Valute/CharCode`, `Valute/Value`.
5. Значение `Value` нормализуется: запятая заменяется на точку перед `float()`.
**Приоритет:** Must.
**Трассировка:** BR-01, BRULE-01, BRULE-03.

### FR-03 — Fallback-источник open.er-api.com
**Описание:** При недоступности ЦБ РФ используется fallback-источник.
**Критерии приёмки:**
1. URL формируется как `https://open.er-api.com/v6/latest/{base}`, где `base` — `USD` или `EUR`.
2. Парсинг JSON stdlib (`json`).
3. Извлекаются `rates.RUB` и `time_last_update_utc`.
4. Время fallback преобразуется в MSK (UTC+3).
5. Fallback можно отключить через `--no-fallback`.
**Приоритет:** Must.
**Трассировка:** BR-01, BRULE-01, BRULE-04.

### FR-04 — Кэш последнего результата
**Описание:** Результаты успешных запросов кэшируются локально с TTL.
**Критерии приёмки:**
1. Файл кэша: `~/.cache/currency-rate/cache.json`.
2. TTL конфигурируется `--ttl` (default 300 сек).
3. Кэш хранит каждую пару отдельно с полями `rate`, `source`, `source_name`, `timestamp`, `cached_at`.
4. Просроченный кэш игнорируется; при `--use-stale` используется как fallback при сетевой ошибке.
5. Запись в кэш атомарна: запись во временный файл + `os.replace()`.
**Приоритет:** Must.
**Трассировка:** BR-02, BR-08, NFR-02.

### FR-05 — История котировок за 90 дней
**Описание:** Скрипт ведёт файл истории с записями за последние `--history-days` дней.
**Критерии приёмки:**
1. Файл истории: `~/.cache/currency-rate/history.json`.
2. История отдельна по каждой паре.
3. Каждая запись содержит `date`, `rate`, `source`, `source_name`, `timestamp`.
4. При обновлении записи дедуплицируются по `date` (новая заменяет старую).
5. Записи старше `--history-days` (default 90) удаляются.
6. Запись в историю атомарна: запись во временный файл + `os.replace()`.
**Приоритет:** Must.
**Трассировка:** BR-02, BRULE-05.

### FR-06 — Расчёт SMA30
**Описание:** Для каждой пары вычисляется простая скользящая средняя.
**Критерии приёмки:**
1. Окно задаётся `--moving-average-days` (default 30, positive int).
2. Если записей в истории меньше окна, SMA считается по доступным записям.
3. Если история пуста, SMA = `null` (JSON) / не отображается (text/digest).
4. SMA показывается в форматах `text`, `json`, `digest`.
**Приоритет:** Must.
**Трассировка:** BR-03, BRULE-06.

### FR-07 — Изменение курса за день
**Описание:** Формат `digest` показывает изменение курса относительно предыдущего дня, если оно известно.
**Критерии приёмки:**
1. Для каждой пары ищется запись за предыдущий календарный день в истории.
2. Изменение = `rate_today - rate_prev_day`, форматируется с двумя знаками и знаком `+`/`-`.
3. Если предыдущего дня нет, изменение не выводится.
4. Формат: `USD/RUB: XX.XX (+Y.YY, SMA30: ZZ.ZZ)`.
**Приоритет:** Should.
**Трассировка:** BR-10.

### FR-08 — Тихое обновление по подкоманде `update`
**Описание:** Подкоманда `update` обновляет кэш и историю без вывода в stdout.
**Критерии приёмки:**
1. При успехе stdout пуст; stderr пишется только при `--verbose`.
2. `update` всегда обновляет кэш/историю (игнорирует TTL, но использует `--no-cache`, `--no-fallback`, `--timeout`).
3. При ошибке завершается с exit code != 0.
**Приоритет:** Must.
**Трассировка:** BR-04, BRULE-07.

### FR-09 — Подкоманда `report`
**Описание:** Подкоманда `report` выводит текущие курсы и SMA30 в выбранном формате.
**Критерии приёмки:**
1. Форматы: `text` (default), `json`, `digest`.
2. Перед сетевым запросом проверяется кэш по TTL.
3. При успехе обновляет кэш и историю (если не `--no-cache`).
4. Поддерживает `--currency`, `--source`, `--timeout`, `--no-fallback`, `--use-stale`, `--verbose`.
**Приоритет:** Must.
**Трассировка:** BR-06.

### FR-10 — Подкоманда `history`
**Описание:** Подкоманда `history` выводит историю котировок в JSON.
**Критерии приёмки:**
1. Вывод: JSON-объект с ключами `usd`, `eur` и массивами записей.
2. Поддерживает `--currency` и `--history-days`.
3. Записи отсортированы по `date` ascending.
**Приоритет:** Must.
**Трассировка:** BR-02.

### FR-11 — Legacy-совместимость `usd_rub_rate.py`
**Описание:** Старый скрипт остаётся рабочим как тонкая обёртка.
**Критерии приёмки:**
1. `usd_rub_rate.py` вызывает `currency_rate.py --currency usd report --format text`.
2. Выходной формат максимально совместим с v1.0.0.
3. При ошибке возвращает ненулевой exit code.
**Приоритет:** Should.
**Трассировка:** BR-09.

### FR-12 — Интеграция с `daily_digest.py`
**Описание:** Утренний дайджест получает компактную строку с курсами обеих пар.
**Критерии приёмки:**
1. `daily_digest.py` вызывает `currency_rate.py --timeout 15 report --format digest`.
2. Формат `digest` возвращает строку `USD/RUB: XX.XX (SMA30: YY.YY) | EUR/RUB: ZZ.ZZ (SMA30: WW.WW)`.
3. При ошибке `daily_digest.py` подставляет `❌ Курс недоступен` и не падает.
**Приоритет:** Must.
**Трассировка:** BR-05, US-02.

## 5. Системные требования (SR)

### SR-01 — Язык и библиотеки
**Описание:** Решение использует только стандартную библиотеку Python 3.11+.
**Требования:**
1. Python 3.11.15+.
2. HTTP: `urllib.request`.
3. XML: `xml.etree.ElementTree`.
4. JSON: `json`.
5. CLI: `argparse`.
6. Дата/время: `datetime`.
7. Запрещены сторонние pip-зависимости в runtime.
**Трассировка:** BR-07, NFR-04.

### SR-02 — CLI-интерфейс `currency_rate.py`

```text
currency_rate.py [-h] [--currency {usd,eur,all}] [--source {auto,cbr,fallback}]
                 [--timeout SEC] [--no-fallback] [--no-cache] [--refresh]
                 [--use-stale] [--verbose] [--version]
                 [--ttl SEC] [--history-days N] [--moving-average-days N]
                 {update,report,history} ...
```

- `update` — тихое обновление кэша и истории.
- `report` — вывод курсов; опция `--format {text,json,digest}` (default `text`).
- `history` — вывод истории в JSON.

### SR-03 — Валидация входных параметров
**Требования:**
1. `--timeout` > 0, иначе exit 2.
2. `--history-days` > 0, иначе exit 2.
3. `--moving-average-days` > 0, иначе exit 2.
4. `--source fallback` и `--no-fallback` взаимно исключаются → exit 2.
5. Недопустимые значения `--currency`, `--source`, `--format` отклоняются `argparse` → exit 2.

### SR-04 — HTTP-запросы
**Требования:**
1. Разрешены только HTTPS URL (проверка через `urllib.parse.urlparse`).
2. User-Agent: `currency-rate/{version}`.
3. Заголовок `Accept` соответствует ожидаемому MIME-типу источника.
4. HTTP >= 400 трактуется как ошибка.
5. Таймаут по умолчанию 10 сек, переопределяется `--timeout`.

### SR-05 — Часовой пояс
**Требования:**
1. Все метки времени внутри системы хранятся с tz-aware `datetime`.
2. MSK реализован как `timezone(timedelta(hours=3), name="MSK")`.
3. Для CBR дата берётся из `ValCurs/@Date` и комбинируется с `00:00:00 MSK`.
4. Для fallback `time_last_update_utc` парсится и конвертируется в MSK.

### SR-06 — Хранение и пути
**Требования:**
1. Директория по умолчанию: `~/.cache/currency-rate/`.
2. При недоступном `$HOME` или `/` используется локальная директория `.currency-rate/` рядом со скриптом.
3. Файлы: `cache.json`, `history.json`.
4. JSON-файлы сохраняются с `ensure_ascii=False`, `indent=2`.

### SR-07 — Atomic write
**Требования:**
1. Запись `cache.json` и `history.json` выполняется атомарно:
   - Запись во временный файл в той же директории (`{name}.tmp.{pid}`).
   - `os.replace(tmp, target)`.
2. При повреждении JSON при чтении скрипт стартует с пустой историей/кэша.

### SR-08 — Обработка ошибок и exit-коды
**Требования:**
1. Некорректные аргументы → exit 2.
2. Успех → exit 0.
3. Сетевая/API-ошибка, при которой не удалось получить ни одну пару → exit 1.
4. Неожиданное исключение верхнего уровня → exit 1.
5. В режиме по умолчанию traceback не выводится пользователю; диагностика при `--verbose`.

### SR-09 — Форматирование вывода
**Требования:**
1. Курс и SMA форматируются с двумя знаками после запятой.
2. `text`:
   ```
   USD/RUB: 92.45 (источник: ЦБ РФ, дата: 2026-07-20, SMA30: 91.80)
   EUR/RUB: 101.23 (источник: ЦБ РФ, дата: 2026-07-20, SMA30: 100.50)
   ```
3. `json`:
   ```json
   {
     "usd": {
       "rate": 92.45,
       "source": "cbr",
       "source_name": "ЦБ РФ",
       "timestamp": "2026-07-20T00:00:00+03:00",
       "sma30": 91.80
     },
     "eur": { ... }
   }
   ```
4. `digest`:
   ```
   USD/RUB: 92.45 (SMA30: 91.80)
   EUR/RUB: 101.23 (SMA30: 100.50)
   ```
   При наличии изменения за предыдущий день:
   ```
   USD/RUB: 92.45 (+0.12, SMA30: 91.80)
   EUR/RUB: 101.23 (-0.05, SMA30: 100.50)
   ```

### SR-10 — Cron-интеграция
**Требования:**
1. Задание `currency-rate-daily-update`: `45 7 * * *` MSK (перед `daily-telegram-digest`).
2. Команда через wrapper: `currency_rate_update_wrapper.sh` → `.venv/bin/python currency_rate.py --timeout 15 "$@" update`.
3. Wrapper размещается в `~/.hermes/scripts/` как Hermes-конфигурация (вне Git-репозитория `AI-harness`).
4. Задание `daily-telegram-digest`: `0 8 * * *` MSK.
5. `daily_digest.py` вызывает `currency_rate.py --timeout 15 report --format digest`, получает многострочный блок.

### SR-11 — Настройки по умолчанию
**Требования:**
| Параметр | Default | CLI-флаг |
|----------|---------|----------|
| Timeout | 10 сек | `--timeout` |
| Cache TTL | 300 сек | `--ttl` |
| History days | 90 | `--history-days` |
| Moving average window | 30 | `--moving-average-days` |
| Currency | all | `--currency` |
| Source | auto | `--source` |
| Format report | text | `--format` |

## 6. Нефункциональные требования (NFR)

### NFR-01 — Производительность
1. Время от запуска до вывода результата <= 15 сек при нормальном соединении.
2. HTTP-таймаут по умолчанию 10 сек.
3. Параллельность запросов не требуется; допускается последовательная обработка пар.

### NFR-02 — Надёжность
1. Скрипт корректно завершается без traceback при недоступности API.
2. Поддерживается fallback для каждой пары.
3. При сбое cron-обновления дайджест продолжает работать.
4. Повреждённый JSON истории/кэша восстанавливается пустым состоянием.

### NFR-03 — Безопасность
1. Не хранятся и не передаются персональные данные.
2. API-ключи и секреты отсутствуют.
3. Все внешние URL используют HTTPS.
4. Запрещены не-HTTPS URL.

### NFR-04 — Потребление ресурсов
1. Размер `currency_rate.py` <= 50 КБ.
2. Размер `history.json` не превышает нескольких сотен КБ (90 записей × 2 пары).
3. Запуск возможен без venv (системный Python 3.11+).

### NFR-05 — Портативность и развёртывание
1. Работает на Python 3.11+.
2. Рекомендуется venv `.venv` в `AI-harness/`.
3. Wrapper-скрипты для cron размещаются в `~/.hermes/scripts/`.

## 7. API-контракты и источники данных

### 7.1 Основной источник: ЦБ РФ

**Request:**
```text
GET https://www.cbr.ru/scripts/XML_daily.asp
Accept: application/xml
User-Agent: currency-rate/2.0.0
```

**Response (example):**
```xml
<?xml version="1.0" encoding="windows-1251"?>
<ValCurs Date="20.07.2026" name="Foreign Currency Market">
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
    <Value>101,2345</Value>
  </Valute>
</ValCurs>
```

**Поля:**
| Поле | XPath | Назначение |
|------|-------|------------|
| Дата курса | `ValCurs/@Date` | `dd.mm.YYYY` → MSK midnight |
| Код валюты | `Valute/CharCode` | USD / EUR |
| Значение | `Valute/Value` | Запятая как десятичный разделитель |

**Ошибки парсинга:**
- Отсутствует `ValCurs/@Date` → `ValueError`.
- Неверный формат даты → `ValueError`.
- Отсутствует искомый `Valute` → `ValueError`.
- Отсутствует `Valute/Value` → `ValueError`.
- Некорректное числовое значение → `ValueError`.
- Невалидный XML → `xml.etree.ElementTree.ParseError`.

### 7.2 Fallback-источник: open.er-api.com

**Request:**
```text
GET https://open.er-api.com/v6/latest/USD
Accept: application/json
User-Agent: currency-rate/2.0.0
```

**Response (example):**
```json
{
  "result": "success",
  "time_last_update_utc": "Sun, 19 Jul 2026 00:00:00 +0000",
  "base_code": "USD",
  "rates": {"RUB": 92.45}
}
```

**Поля:**
| Поле | Путь | Назначение |
|------|------|------------|
| Курс | `rates.RUB` | Float |
| Время обновления | `time_last_update_utc` | ISO-8601 или RFC 2822 → MSK |

**Ошибки парсинга:**
- Отсутствует `rates.RUB` → `KeyError`/`TypeError`.
- Некорректный timestamp → `ValueError`.
- Невалидный JSON → `json.JSONDecodeError`.

### 7.3 Внутренний CLI-контракт для `daily_digest.py`

```bash
python currency_rate.py --timeout 15 report --format digest
```

**Stdout при успехе:**
```text
USD/RUB: 92.45 (+0.12, SMA30: 91.80) | EUR/RUB: 101.23 (-0.05, SMA30: 100.50)
```

**Stdout/Stderr при ошибке:** может быть пусто или содержать `❌ Курс недоступен` (обработка на стороне `daily_digest.py`).

### 7.4 Legacy-контракт `usd_rub_rate.py`

```bash
python usd_rub_rate.py
```

Делегирует:
```bash
python currency_rate.py --currency usd report --format text
```

**Stdout при успехе (v1-совместимый):**
```text
USD/RUB: 92.45 (источник: ЦБ РФ, дата: 2026-07-20)
```

## 8. Модель данных

### 8.1 Диаграмма сущностей

```text
CURRENCY (usd, eur)
  ├── base: "USD" | "EUR"
  ├── char_code: "USD" | "EUR"
  └── symbol: "USD/RUB" | "EUR/RUB"

RateResult
  ├── rate: float
  ├── source: str (cbr | fallback)
  ├── source_name: str
  ├── timestamp: datetime (MSK)
  └── cached: bool

cache.json
  └── <currency>: RateResult + cached_at: datetime

history.json
  ├── updated_at: datetime
  └── <currency>: list[HistoryEntry]

HistoryEntry
  ├── date: str (YYYY-MM-DD)
  ├── rate: float
  ├── source: str
  ├── source_name: str
  └── timestamp: str (ISO-8601 MSK)
```

### 8.2 Схема `cache.json`

```json
{
  "usd": {
    "rate": 92.45,
    "source": "cbr",
    "source_name": "ЦБ РФ",
    "timestamp": "2026-07-20T00:00:00+03:00",
    "cached_at": "2026-07-20T12:00:05+03:00"
  },
  "eur": { ... }
}
```

### 8.3 Схема `history.json`

```json
{
  "updated_at": "2026-07-20T12:00:05+03:00",
  "usd": [
    {
      "date": "2026-07-20",
      "rate": 92.45,
      "source": "cbr",
      "source_name": "ЦБ РФ",
      "timestamp": "2026-07-20T00:00:00+03:00"
    }
  ],
  "eur": [ ... ]
}
```

### 8.4 Правила обновления истории

1. `update_history(history, results, max_days)`:
   - `entry_date = result.timestamp.date()` — дата из источника (для CBR: `ValCurs/@Date`; для fallback: дата публикации в MSK).
   - Удалить существующую запись с той же `date`.
   - Добавить новую запись `{date, rate, source, source_name, timestamp}`.
   - Отсортировать по `date` ascending.
   - Удалить записи старше `max_days` от `today`.
2. Дедупликация по `date` в рамках одной пары.
3. Сортировка перед сохранением.

## 9. Алгоритмы

### 9.1 Получение курсов (`fetch_all`)

```text
FOR currency IN currencies:
    IF source IN (auto, cbr):
        TRY fetch + parse_cbr
            RETURN result
        CATCH log(failure)
    IF source IN (auto, fallback) AND NOT no_fallback:
        TRY fetch + parse_fallback
            RETURN result
        CATCH log(failure)
    RETURN None
```

### 9.2 Расчёт SMA30

```text
entries_sorted = sort(entries, key=date)
window = entries_sorted[-moving_average_days:]
IF window empty: RETURN None
RETURN sum(e.rate for e in window) / len(window)
```

### 9.3 Обновление кэша и истории (`run_update`)

```text
1. load_cache (если не no_cache / refresh)
2. missing = currencies not in cache
3. fetched = fetch_all(missing)
4. results = cached + fetched
5. IF results empty: error exit 1
6. save_cache(results)
7. history = load_history()
8. history = update_history(history, results, history_days)
9. save_history(history)
10. IF verbose: log each result
11. exit 0
```

### 9.4 Формирование отчёта (`run_report`)

```text
1. load_cache(TTL)
2. missing = currencies not in results
3. fetched = fetch_all(missing)
4. results += fetched
5. IF results empty:
       IF use_stale AND history has latest entry:
           use latest history entry as stale result per currency
       ELSE: error exit 1
6. IF not no_cache: save_cache + update_history
7. FORMAT output by --format
8. print
9. exit 0
```

### 9.5 Атомарная запись JSON

```python
def atomic_write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(f"{path.suffix}.tmp.{os.getpid()}")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, path)
```

## 10. Обработка ошибок

### 10.1 Матрица ошибок

| Код | Сценарий | Поведение по умолчанию | `--verbose` | Exit code |
|-----|----------|------------------------|-------------|-----------|
| E-01 | Нет подключения к интернету | Сообщение в stderr | Детали по каждому источнику | 1 |
| E-02 | HTTP >= 400 от источника | Переход к fallback / ошибка | HTTP-статус и причина | — |
| E-03 | Таймаут | Переход к fallback / ошибка | Причина `timeout` | — |
| E-04 | Невалидный XML от ЦБ РФ | Fallback; иначе ошибка | `invalid XML` | — |
| E-05 | Отсутствует валюта в XML | Fallback; иначе ошибка | `missing field` | — |
| E-06 | Невалидный JSON fallback | Ошибка | `invalid JSON` | — |
| E-07 | Повреждённый `history.json` | Старт с пустой историей | Предупреждение | 0/1 |
| E-08 | Некорректные CLI-аргументы | Сообщение argparse | — | 2 |
| E-09 | Конфликт `--source fallback --no-fallback` | Сообщение в stderr | — | 2 |
| E-10 | Все источники недоступны | `ERROR_MESSAGE` | Перечень причин | 1 |
| E-11 | Неожиданное исключение | Короткое сообщение | Traceback | 1 |

### 10.2 Сообщения об ошибках

- `ERROR_MESSAGE`: "Не удалось получить курс {pair}. Проверьте подключение к интернету."
- Аргументы: `timeout > 0`, `history_days > 0`, `moving_average_days > 0`.
- Конфликт флагов: "Конфликт флагов: --source fallback и --no-fallback".

### 10.3 Fallback-поведение

1. По умолчанию (`--source auto`): сначала ЦБ РФ, затем fallback.
2. `--source cbr` / `--no-fallback`: только ЦБ РФ.
3. `--source fallback`: только fallback.
4. При недоступности всех источников и `--use-stale`: используется последняя запись из `history.json`.

## 11. План тестирования

### 11.1 Unit-тесты (`tests/test_currency_rate.py`)

| ID | Тест | Проверяемое требование |
|----|------|------------------------|
| TC-01 | `test_parse_cbr_usd` | FR-02, парсинг USD из XML ЦБ РФ |
| TC-02 | `test_parse_cbr_eur` | FR-02, парсинг EUR из XML ЦБ РФ |
| TC-03 | `test_parse_fallback` | FR-03, парсинг JSON fallback |
| TC-04 | `test_compute_sma` | FR-06, расчёт SMA |
| TC-05 | `test_load_and_save_history` | FR-05, сериализация истории |
| TC-06 | `test_update_history` | FR-05, добавление записи в историю |
| TC-07 | `test_format_digest_line` | FR-09, SR-09, формат digest |
| TC-08 | `test_validate_args_timeout` | SR-03, валидация timeout |

### 11.2 Интеграционные тесты

| ID | Сценарий | Ожидаемый результат |
|----|----------|---------------------|
| IT-01 | `python currency_rate.py update --verbose` | stdout пуст, stderr содержит диагностику, кэш/история обновлены |
| IT-02 | `python currency_rate.py report --format text` | Две строки USD/RUB и EUR/RUB с SMA30 |
| IT-03 | `python currency_rate.py report --format json` | Валидный JSON с полями `rate`, `source`, `source_name`, `timestamp`, `sma30` |
| IT-04 | `python currency_rate.py report --format digest` | Компактная строка с `\|` разделителем |
| IT-05 | `python currency_rate.py history --history-days 7` | JSON с записями не старше 7 дней |
| IT-06 | `python usd_rub_rate.py` | Строка `USD/RUB: XX.XX (...)` |
| IT-07 | `python daily_digest.py` | Сообщение содержит блок `💰 USD/RUB... \| EUR/RUB...` |
| IT-08 | Отключить интернет → `report` | exit 1 и сообщение об ошибке |
| IT-09 | `--source cbr` при недоступности ЦБ | exit 1 (fallback отключён) |
| IT-10 | `--timeout 0.001` | exit 2 с сообщением о некорректном timeout |

### 11.3 Тесты cron

| ID | Сценарий | Ожидаемый результат |
|----|----------|---------------------|
| CT-01 | `hermes cron add currency-rate-daily-update "0 12 * * *" ~/.hermes/scripts/currency_rate_update_wrapper.sh` | Задание добавлено |
| CT-02 | `hermes cron list` | В списке есть `currency-rate-daily-update` и `daily-telegram-digest` |
| CT-03 | Запуск wrapper вручную | stdout пуст, exit 0 |

### 11.4 Нагрузочные / smoke тесты

| ID | Сценарий | Критерий |
|----|----------|----------|
| PT-01 | 10 последовательных вызовов `report` | Среднее время <= 15 сек, не превышен fallback rate-limit |
| PT-02 | Запуск на чистой машине без venv | exit 0, если Python 3.11+ |

## 12. Решённые открытые вопросы

| ID | Вопрос | Решение | Обоснование |
|----|--------|---------|-------------|
| OQ-01 | Показывать изменение курса за день в `digest`? | **Да.** Реализовать `FR-07`. | Данные уже в истории; повышает информативность дайджеста. |
| OQ-02 | Атомарная запись `history.json` и резервная копия? | **Атомарная запись обязательна (SR-07).** Резервная копия — не требуется в рамках v2.0. | Снижает риск повреждения при аварийном завершении. Backup вне скоупа. |
| OQ-03 | Поведение cron при отсутствии интернета? | **Exit != 0** (SR-08). | Прозрачный мониторинг сбоев cron. Stale-кэш остаётся для ручного `report`. |
| OQ-04 | Нужен ли отдельный `spec_v2.md`? | **Да.** Данный документ. | Необходим для передачи к разработке и тестированию. |

## 13. Traceability matrix

| BRD / BRULE / US / NFR | HLD-раздел | FR | SR | AC / TC |
|------------------------|------------|----|----|---------|
| BR-01 USD/RUB + EUR/RUB | 4.1, 4.2, 5.1 | FR-01, FR-02 | SR-02, SR-04 | TC-01, TC-02, IT-02, IT-04 |
| BR-02 90-дневная история | 6.3 | FR-05 | SR-06, SR-07 | TC-05, TC-06, IT-05 |
| BR-03 SMA30 | 6.4 | FR-06 | SR-09 | TC-04, IT-02 |
| BR-04 Тихое cron-обновление | 7.2 | FR-08 | SR-10 | CT-01, CT-03, IT-01 |
| BR-05 Интеграция с дайджестом | 5.3, 4.2 | FR-12 | SR-09, SR-10 | IT-07 |
| BR-06 text/json/digest | 4.1, 4.2, 4.3 | FR-09 | SR-09 | TC-07, IT-02, IT-03, IT-04 |
| BR-07 Stdlib-only | 8.1 | — | SR-01 | PT-02 |
| BR-08 Обработка ошибок | 4.1 | — | SR-08 | IT-08, IT-09, IT-10 |
| BR-09 Legacy wrapper | 4.4 | FR-11 | SR-09 | IT-06 |
| BR-10 Изменение за день | 4.2 | FR-07 | SR-09 | IT-04 |
| BRULE-01 Приоритет источников | 5.1 | FR-02, FR-03 | SR-04 | IT-09 |
| BRULE-02 Форматирование курса | 4.2 | — | SR-09 | TC-07 |
| BRULE-03 Временная метка | 5.1 | FR-02, FR-03 | SR-05 | TC-01, TC-03 |
| BRULE-04 Отключение fallback | 4.1 | FR-03 | SR-03, SR-04 | IT-09 |
| BRULE-05 Глубина истории | 6.4 | FR-05 | SR-02, SR-06 | IT-05 |
| BRULE-06 Окно SMA | 6.4 | FR-06 | SR-03 | TC-04 |
| BRULE-07 Тихое обновление | 5.2 | FR-08 | SR-10 | CT-03, IT-01 |
| BRULE-08 Дайджест-строка | 4.2 | FR-12 | SR-09 | IT-07 |
| US-01 Ручной просмотр курсов | CJM-1 | FR-01, FR-09 | SR-02, SR-09 | IT-02 |
| US-02 Автоматическое обновление и дайджест | CJM-2 | FR-08, FR-12 | SR-10 | CT-01, IT-07 |
| NFR-01 Производительность | 8.1 | — | SR-11 | PT-01 |
| NFR-02 Надёжность | 10 | FR-04, FR-05 | SR-07, SR-08 | IT-08, CT-03 |
| NFR-03 Безопасность | — | — | SR-04 | PT-02 |
| NFR-04 Потребление ресурсов | 8.1 | — | SR-01, SR-06 | PT-02 |
| NFR-05 Портативность | 8.2 | — | SR-01, SR-10 | PT-02, CT-02 |

## 14. DoD спецификации

- [x] Все BR из `brd_v2.md` покрыты FR/SR.
- [x] Каждый FR имеет критерии приёмки и трассировку.
- [x] Описаны API-контракты основного и fallback-источников.
- [x] Описана модель данных (`cache.json`, `history.json`).
- [x] Документированы алгоритмы получения курсов, SMA, обновления истории, атомарной записи.
- [x] Матрица ошибок и exit-кодов.
- [x] План тестирования с unit / integration / cron / smoke тестами.
- [x] Открытые вопросы из HLD решены.
- [x] Traceability matrix заполнена.
- [x] Файл сохранён в проекте.
