---
status: draft
project: daily-telegram-digest
title: "SRS/Spec: daily-telegram-digest"
author: System Analyst Sub-Agent
version: 1.0
---

# Спецификация (SRS): daily-telegram-digest

## 1. Общее положение

### 1.1. Цель

Сформировать детальную техническую спецификацию для управляющего скрипта `daily_digest.py`, который ежедневно собирает единое Telegram-сообщение из блоков:

- прогноз погоды (за счёт `weather_daily.py`);
- актуальный курс USD/RUB (за счёт `usd_rub_rate.py`);
- служебного заголовка и подвала.

### 1.2. Основа

- BRD: `/home/hermes_ai/my_agent/AI-harness/projects/daily-telegram-digest/brd.md`
- HLD: `/home/hermes_ai/my_agent/AI-harness/projects/daily-telegram-digest/hld.md`
- Скрипт погоды: `/home/hermes_ai/.hermes/scripts/weather_daily.py`
- Скрипт курса: `/home/hermes_ai/my_agent/AI-harness/scripts/usd_rub_rate.py`

### 1.3. Рамки (Scope)

**Входит:**

- реализация `daily_digest.py`;
- запуск `weather_daily.py` и `usd_rub_rate.py` через `subprocess`;
- сборка и форматирование единого сообщения;
- обработка частичных и критических ошибок;
- доставка через `hermes cron` в режиме `no-agent`;
- замена старого cron-задания погоды.

**Не входит:**

- изменение источников данных (Open-Meteo, ЦБ РФ, open.er-api.com);
- внутреннее форматирование блока погоды (оставляем как в `weather_daily.py`);
- веб-интерфейс, GUI, БД, поддержка других мессенджеров.

### 1.4. Глоссарий

| Термин | Описание |
|--------|----------|
| Дайджест | Одно сообщение Telegram, собранное `daily_digest.py`. |
| Блок | Часть дайджеста: погода, курс, заголовок, подвал. |
| Placeholder | Замещающий текст об ошибке (`❌ Погода недоступна` и т.п.). |
| Cron-задание | Запись в `hermes cron` с расписанием и `deliver: origin`. |
| `no-agent` | Режим доставки, при котором stdout скрипта отправляется без LLM. |
| `origin` | Доставка в канал `TELEGRAM_HOME_CHANNEL`. |

---

## 2. Функциональные требования (FR-NN)

### FR-01. Управляющий скрипт

`daily_digest.py` должен располагаться по пути:

```
/home/hermes_ai/my_agent/AI-harness/projects/daily-telegram-digest/daily_digest.py
```

Файл должен быть исполняемым (`chmod +x`).

### FR-02. Запуск погодного блока

Скрипт должен запускать `weather_daily.py` через `subprocess.run`:

```python
subprocess.run(
    [sys.executable, str(WEATHER_SCRIPT)] + city_args,
    capture_output=True,
    text=True,
    timeout=30,
)
```

- `WEATHER_SCRIPT = Path.home() / ".hermes" / "scripts" / "weather_daily.py"`.
- Аргументы передаются только если нужно переопределить список городов по умолчанию.
- `stdout` подпроцесса используется как текст погодного блока.
- `stderr` подпроцесса перенаправляется в `stderr` `daily_digest.py`.

### FR-03. Запуск курсового блока

Скрипт должен запускать `usd_rub_rate.py` через `subprocess.run`:

```python
subprocess.run(
    [sys.executable, str(RATE_SCRIPT), "--source", "auto"],
    capture_output=True,
    text=True,
    timeout=15,
)
```

- `RATE_SCRIPT = Path("/home/hermes_ai/my_agent/AI-harness/scripts/usd_rub_rate.py")`.
- `stdout` подпроцесса — текст курсового блока.
- `stderr` перенаправляется в `stderr` `daily_digest.py`.

### FR-04. Приоритет источников городов

Порядок определения списка городов должен сохраняться:

1. Позиционные аргументы CLI `daily_digest.py`.
2. Переменная окружения `WEATHER_CITIES`.
3. `~/.config/weather_daily/cities.json`.
4. Москва (default).

Если `WEATHER_CITIES` или `cities.json` заданы, `daily_digest.py` не передаёт города в `weather_daily.py`, позволяя внутренней логике скрипта разрешить приоритет.

### FR-05. Ограничение на число городов

`daily_digest.py` должен доверять ограничению `weather_daily.py` (`MAX_CITIES = 10`). Если CLI-аргументы превышают лимит, скрипт должен:

- записать ошибку в `stderr`;
- вывести в `stdout` сообщение с пояснением;
- завершиться с кодом `2`.

### FR-06. Сборка единого сообщения

Сообщение собирается в строго заданном порядке:

1. Заголовок с датой.
2. Блок погоды.
3. Блок курса USD/RUB.
4. Подвал с источниками.

Между блоками допускаются пустые строки для читаемости.

### FR-07. Формат заголовка

Заголовок должен содержать:

```
☀️ Утренний дайджест — 19.07.2026
```

Дата формируется в часовом поясе сервера (`Europe/Moscow`) в формате `DD.MM.YYYY`.

### FR-08. Формат подвала

Подвал должен содержать:

```
─────────────────
🤖 Hermes daily digest  |  📅 19.07.2026
```

Источники могут быть перечислены в одной строке (`Open-Meteo`, `ЦБ РФ / open.er-api.com`).

### FR-09. Обработка частичных ошибок

Если один из блоков не удалось получить, дайджест всё равно отправляется:

- недоступна погода → вместо блока погоды вставляется `❌ Погода недоступна`;
- недоступен курс → вместо блока курса вставляется `❌ Курс недоступен`;
- недоступны оба → в сообщении оба placeholder'а.

При частичных ошибках код возврата `daily_digest.py` должен быть `0`.

### FR-10. Ограничение длины сообщения

Если итоговое сообщение превышает 4096 символов, `daily_digest.py` должен:

- обрезать подвал;
- добавить в конце `…`;
- гарантировать, что итоговая длина ≤ 4096 символов.

### FR-10. Ограничение длины сообщения

Если итоговое сообщение превышает 4096 символов, `daily_digest.py` должен:

1. Сначала удалить подвал (строку с источниками/подписью).
2. При необходимости сократить погодный блок по границам городов (не разрезая строку посередине).
3. В конце добавить `…`.
4. Все операции обрезки выполняются по кодовым точкам Unicode, не ломая UTF-8.
5. Гарантировать, что итоговая длина ≤ 4096 символов.

### FR-11. Markdown / plain text

- Дайджест отправляется как **plain text**.
- `daily_digest.py` удаляет Markdown-спецсимволы (`*`, `_`, `[`, `]`, `(`, `)`, `~`, `` ` ``, `>`, `#`, `+`, `=`, `|`, `{`, `}`, `!`) из вывода `weather_daily.py` и `usd_rub_rate.py` перед сборкой сообщения.
- Заголовок и подвал используют только безопасные символы (emoji, ASCII-разделитель, буквы/цифры).
- Если в будущем потребуется Markdown-режим, он должен быть опциональным и управляться аргументом/переменной окружения.

### FR-14. Cron-задание

После приёмки `daily_digest.py` копируется/симлинкуется в `~/.hermes/scripts/` и создаётся единственное ежедневное задание:

```bash
ln -s /home/hermes_ai/my_agent/AI-harness/scripts/daily_digest.py ~/.hermes/scripts/daily_digest.py
chmod +x ~/.hermes/scripts/daily_digest.py

hermes cron add \
  --name "daily-telegram-digest" \
  --schedule "0 8 * * *" \
  --timezone "Europe/Moscow" \
  --script "daily_digest.py" \
  --deliver origin \
  --mode no-agent
```

### FR-15. Отключение старого задания

Старое cron-задание погоды `984d5d5e9628` существует и активно. Перед запуском нового дайджеста его нужно отключить или удалить:

```bash
hermes cron disable 984d5d5e9628
# или
hermes cron remove 984d5d5e9628
```

Если id отличается в другой среде, отключить/удалить все задания со словом "Погода" в имени.

### FR-16. Коды возврата

| Код | Смысл |
|-----|-------|
| 0 | Успех (даже при частичных ошибках источников). |
| 1 | Критическая ошибка: не удалось собрать или отправить сообщение. |
| 2 | Ошибка конфигурации/аргументов CLI (например, >10 городов). |

---

## 3. Системные требования (SR-NN)

### SR-01. Язык и интерпретатор

`daily_digest.py` пишется на Python 3.11 и совместим с Python 3.11.15.

### SR-02. Зависимости

Скрипт использует только стандартную библиотеку Python:

- `argparse`
- `logging`
- `os`
- `subprocess`
- `sys`
- `datetime`
- `pathlib`

### SR-03. Пути к скриптам

Пути к интегрируемым скриптам должны быть зашиты как константы:

```python
WEATHER_SCRIPT = Path.home() / ".hermes" / "scripts" / "weather_daily.py"
RATE_SCRIPT = Path("/home/hermes_ai/my_agent/AI-harness/scripts/usd_rub_rate.py")
```

### SR-04. Переменные окружения

| Переменная | Обязательность | Назначение |
|------------|----------------|------------|
| `TELEGRAM_BOT_TOKEN` | Обязательна в `~/.hermes/.env` | Используется Hermes для отправки. `daily_digest.py` не читает её напрямую. |
| `TELEGRAM_HOME_CHANNEL` | Обязательна в `~/.hermes/.env` | Канал доставки (`origin`). |
| `WEATHER_CITIES` | Опциональна | Список городов через запятую. |
| `PATH` | Обязательна в cron | Должна содержать `python3`. |

### SR-05. Часовой пояс

Сервер работает в `Europe/Moscow` (MSK, UTC+3). Все даты в дайджесте и cron-расписании интерпретируются в этом часовом поясе.

### SR-11. Среда разработки и развёртывание

- **Целевая платформа:** сервер / VPS / контейнер с Python 3.11+.
- **Изоляция окружения:** рекомендуется проектный venv в папке `AI-harness/`:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```
- **Зависимости:** `daily_digest.py` stdlib-only; `requirements.txt` не требуется.
- **Размещение для cron:** мастер-копия в `AI-harness/scripts/daily_digest.py`, симлинк или копия в `~/.hermes/scripts/daily_digest.py`.
- **Способы запуска:**
  - Ручной запуск: `~/.hermes/scripts/daily_digest.py`.
  - Cron: `hermes cron add ... --script daily_digest.py`.
  - Systemd: опционально через `ExecStart=/path/.venv/bin/python /path/scripts/daily_digest.py`.
- **Портативность:** не зависит от Hermes runtime, только от Python 3.11+ и путей к `weather_daily.py` / `usd_rub_rate.py`.

### SR-06. Таймауты

| Операция | Таймаут |
|----------|---------|
| `weather_daily.py` | 30 секунд |
| `usd_rub_rate.py` | 15 секунд |
| HTTP-запросы внутри скриптов | 10 секунд |
| Общее выполнение `daily_digest.py` | ≤ 30 секунд |

### SR-07. Права на файл

`daily_digest.py` должен иметь права на выполнение:

```bash
chmod +x daily_digest.py
```

### SR-08. Безопасность

- Telegram-токен не должен читаться `daily_digest.py`.
- Не допускается `eval`, `exec`, `os.system`, shell-интерполяция пользовательских строк.
- Городские названия санитизируются `weather_daily.py`; `daily_digest.py` не должен портить санитизацию.

### SR-09. Наблюдаемость

- `stderr` — логи и диагностика.
- `stdout` — только текст для Telegram.
- Все исключения должны перехватываться и логироваться.

### SR-10. Надёжность

Сбой одного источника не должен прерывать сборку и доставку дайджеста. Критические сбои должны приводить к exit code 1.

### SR-11. Портативность

Скрипт запускается в окружении пользователя `hermes_ai`, без `sudo`/`systemctl`.

### SR-12. Структура проекта

```
/home/hermes_ai/my_agent/AI-harness/projects/daily-telegram-digest/
├── brd.md
├── hld.md
├── spec.md          # настоящий документ
└── daily_digest.py  # управляющий скрипт
```

`requirements.txt` создаётся только при появлении внешних зависимостей; сейчас он не требуется.

---

## 4. CLI-интерфейс

### 4.1. `daily_digest.py`

```bash
python3 daily_digest.py [CITY ...]
```

| Аргумент | Тип | Описание |
|----------|-----|----------|
| `CITY` | позиционный, `nargs='*'` | Переопределяет список городов. Максимум 10. |

Примеры:

```bash
python3 daily_digest.py
python3 daily_digest.py Москва
python3 daily_digest.py Москва Санкт-Петербург
```

### 4.2. `weather_daily.py`

```bash
python3 weather_daily.py [CITY ...]
```

- Позиционные аргументы — список городов.
- Приоритет: CLI > `WEATHER_CITIES` > `cities.json` > Москва.

### 4.3. `usd_rub_rate.py`

```bash
python3 usd_rub_rate.py [OPTIONS]
```

| Аргумент | Значения по умолчанию | Описание |
|----------|----------------------|----------|
| `--source` | `auto` | `auto`, `cbr`, `fallback` |
| `--timeout` | `10.0` | Таймаут HTTP-запроса |
| `--no-fallback` | `False` | Отключить fallback-источник |
| `--no-cache` | `False` | Отключить кэш |
| `--refresh` | `False` | Игнорировать кэш |
| `--use-stale` | `False` | Использовать просроченный кэш при сбое |
| `--verbose` | `False` | Подробный вывод в stderr |
| `--version` | — | Версия скрипта |

---

## 5. API-контракты

### 5.1. Контракт `weather_daily.py`

| Параметр | Значение |
|----------|----------|
| Вход | Список городов через CLI или env/config |
| Выход (stdout) | Отформатированный текст погоды по городам, разделённый пустой строкой |
| Выход (stderr) | Логи уровня `INFO`/`WARNING`/`ERROR` |
| Код возврата 0 | Все города успешно обработаны |
| Код возврата 1 | Частичные ошибки (некоторые города недоступны/не найдены) |
| Код возврата 2 | Ошибка конфигурации (пустой список, >10 городов) |

### 5.2. Контракт `usd_rub_rate.py`

| Параметр | Значение |
|----------|----------|
| Вход | `--source auto` (или другие опции) |
| Выход (stdout) | Одна строка: `USD/RUB: <rate> (источник: <name>, дата: <date>[, кэш])` |
| Выход (stderr) | Логи/диагностика |
| Код возврата 0 | Курс получен |
| Код возврата 1 | Курс недоступен |
| Код возврата 2 | Ошибка аргументов CLI |

### 5.3. Контракт `daily_digest.py`

| Параметр | Значение |
|----------|----------|
| Вход | CLI-аргументы города, env `WEATHER_CITIES` |
| Выход (stdout) | Итоговый дайджест для Telegram |
| Выход (stderr) | Логи работы и ошибки подпроцессов |
| Код возврата 0 | Дайджест собран и готов к доставке |
| Код возврата 1 | Критический сбой сборки |
| Код возврата 2 | Ошибка CLI/конфигурации |

---

## 6. Поведение кэша

### 6.1. Кэш погоды (`weather_daily.py`)

- Путь: `~/.cache/weather_daily/geocache.json`
- TTL: 30 дней.
- Содержит координаты, display_name и timezone для геокодированных городов.
- Атомарное сохранение: запись во временный файл + `replace()`.
- Права: каталог `0o700`, файл `0o600`.
- Создаётся/обновляется автоматически при успешном геокодировании.
- При повреждении кэша скрипт сбрасывает его и перезапрашивает данные.

### 6.2. Кэш курса (`usd_rub_rate.py`)

- Путь: `~/.cache/usd-rub-rate/cache.json`
- TTL: 300 секунд.
- Содержит rate, source, source_name, timestamp, cached_at.
- При `--refresh` кэш игнорируется.
- При `--use-stale` при сетевом сбое возвращается просроченная запись.
- `daily_digest.py` вызывает скрипт с поведением по умолчанию (`--source auto`), поэтому кэш используется.

### 6.3. Требования к `daily_digest.py`

- Сам `daily_digest.py` не ведёт собственный кэш.
- Не передаёт `--no-cache` и не отключает fallback, кроме случаев явной директивы пользователя.

---

## 7. Матрица ошибок

| ID | Сценарий | Поведение `daily_digest.py` | stdout | stderr | Exit code |
|----|----------|------------------------------|--------|--------|-----------|
| E-01 | Погода и курс успешны | Полный дайджест | Полное сообщение | Логи работы | 0 |
| E-02 | Погода недоступна, курс успешен | Placeholder погоды + курс | Дайджест с `❌ Погода недоступна` | Ошибка подпроцесса | 0 |
| E-03 | Погода успешна, курс недоступен | Placeholder курса | Дайджест с `❌ Курс недоступен` | Ошибка подпроцесса | 0 |
| E-04 | Оба источника недоступны | Два placeholder'а | Дайджест с обоими `❌` | Две ошибки | 0 |
| E-05 | Таймаут `weather_daily.py` (>30 с) | Убить процесс, placeholder | `❌ Погода недоступна` | `ERROR timeout` | 0 |
| E-06 | Таймаут `usd_rub_rate.py` (>15 с) | Убить процесс, placeholder | `❌ Курс недоступен` | `ERROR timeout` | 0 |
|| E-07 | `weather_daily.py` возвращает код 2 | Не доверять stdout, placeholder | `❌ Погода недоступна` | Ошибка | 0 |
|| E-08 | `weather_daily.py` возвращает код 1 | Использовать stdout (частичный успех), но отметить в логе | stdout погоды в дайджесте | WARNING partial | 0 |
|| E-09 | `usd_rub_rate.py` возвращает код 1 | Placeholder курса | `❌ Курс недоступен` | Ошибка | 0 |
|| E-10 | `usd_rub_rate.py` возвращает код 2 | Placeholder курса | `❌ Курс недоступен` | Ошибка | 0 |
|| E-11 | Превышен лимит 10 городов в CLI | Отказ | Сообщение об ошибке | Ошибка | 2 |
|| E-12 | Пустой список городов в CLI | Отказ | Сообщение об ошибке | Ошибка | 2 |
|| E-13 | Непредвиденное исключение в `daily_digest.py` | Лог + fallback-сообщение | `❌ Не удалось собрать дайджест` | Traceback/ERROR | 1 |
|| E-14 | Сообщение > 4096 символов | Обрезать с `…` | Урезанное сообщение | Предупреждение | 0 |

---

## 8. Критерии приёмки

### AC-1. Ежедневная отправка

Дайджест приходит ровно один раз в день в 08:00 МСК.

### AC-2. Состав сообщения

Каждое сообщение содержит:

- заголовок с датой;
- блок погоды (или placeholder);
- блок курса USD/RUB (или placeholder);
- подвал с источниками.

### AC-3. Устойчивость к частичным сбоям

Если Open-Meteo или курс недоступны, сообщение всё равно отправляется с пояснением об ошибке.

### AC-4. Отсутствие дублирования

После приёмки старое cron-задание погоды (`984d5d5e9628`) не отправляет отдельное сообщение.

### AC-5. Настраиваемость городов

Изменение `WEATHER_CITIES` или `~/.config/weather_daily/cities.json` влияет на дайджест без правки кода.

### AC-6. Логирование

В `stderr` присутствуют записи о запуске подпроцессов, их статусе и любых ошибках; в `stdout` — только итоговый текст.

### AC-7. Лимит длины

Сообщение не превышает 4096 символов.

### AC-8. Коды возврата

- exit code 0 при любом успешно собранном дайджесте;
- exit code 1 только при критическом сбое;
- exit code 2 при ошибках CLI.

---

## 9. Матрица трассируемости

| BRD / HLD / NFR | FR | SR | AC | Примечание |
|-----------------|----|----|----|------------|
| BR-01 | FR-01 | SR-07 | — | Скрипт и права |
| BR-02 | FR-02, FR-04, FR-05 | SR-03, SR-04 | AC-5 | Интеграция погоды |
| BR-03 | FR-03 | SR-03 | AC-2 | Интеграция курса |
| BR-04 | FR-06, FR-07, FR-08, FR-12 | SR-09 | AC-2, AC-6 | Единое сообщение |
| BR-05 | FR-09 | SR-10 | AC-3 | Частичные ошибки |
| BR-06 | FR-15 | — | AC-4 | Замена cron |
| BR-07 | FR-14 | SR-05 | AC-1 | Время отправки |
| BR-08 | FR-04 | SR-04 | AC-5 | Города |
| BRULE-01 | FR-02, FR-03 | SR-03 | — | Источники |
| BRULE-02 | FR-06 | — | AC-2 | Порядок блоков |
| BRULE-03 | — | SR-06 | — | Повторы и таймауты |
| BRULE-04 | FR-14 | SR-05 | AC-1 | Cron по умолчанию |
| BRULE-05 | FR-11 | — | AC-2 | Telegram-формат |
| NFR-01 | FR-09 | SR-10 | AC-3 | Доступность |
| NFR-02 | FR-09, FR-16 | SR-10 | AC-8 | Надёжность |
| NFR-03 | FR-02, FR-03 | SR-06 | — | Производительность |
| NFR-04 | — | SR-08 | — | Безопасность |
| NFR-05 | FR-13 | SR-09 | AC-6 | Наблюдаемость |
| NFR-06 | — | SR-02, SR-11 | — | Портативность |
| NFR-07 | FR-04, FR-14 | SR-04 | AC-5 | Конфигурируемость |
| HLD §5.1 | FR-02, FR-03 | SR-03 | — | subprocess |
| HLD §6 | FR-06, FR-07, FR-08, FR-10 | — | AC-2, AC-7 | Формат |
| HLD §7 | FR-14, FR-15 | SR-04, SR-05 | AC-1, AC-4 | Cron |
| HLD §9 | FR-09, FR-16 | SR-10 | AC-3, AC-8 | Ошибки |

---

## 10. Требования к развёртыванию

### 10.1. Файлы

- `daily_digest.py` размещается в `/home/hermes_ai/my_agent/AI-harness/projects/daily-telegram-digest/`.
- Файл должен быть исполняемым.
- `spec.md`, `brd.md`, `hld.md` остаются в том же каталоге.

### 10.2. Окружение

- Python 3.11.15.
- `~/.hermes/.env` содержит раскомментированные `TELEGRAM_BOT_TOKEN` и `TELEGRAM_HOME_CHANNEL`.
- Сервер в часовом поясе `Europe/Moscow`.
- Доступ в интернет по HTTPS.

### 10.3. Проверки перед деплоем

```bash
python3 -m py_compile daily_digest.py
python3 daily_digest.py          # ручной прогон
python3 daily_digest.py Москва     # ручной прогон с городом
hermes cron list                   # убедиться, что старое задание отключено
```

### 10.4. Команды настройки cron

Создание нового задания:

```bash
ln -s /home/hermes_ai/my_agent/AI-harness/scripts/daily_digest.py ~/.hermes/scripts/daily_digest.py
chmod +x ~/.hermes/scripts/daily_digest.py

hermes cron add \
  --name "daily-telegram-digest" \
  --schedule "0 8 * * *" \
  --timezone "Europe/Moscow" \
  --script "daily_digest.py" \
  --deliver origin \
  --mode no-agent
```

Отключение старого:

```bash
hermes cron disable 984d5d5e9628
# или
hermes cron remove 984d5d5e9628
```

Если id отличается в другой среде, отключить/удалить все задания со словом "Погода" в имени.

### 10.5. Rollback и dry-run

- **Dry-run:** запустить вручную и проверить stdout:
  ```bash
  ~/.hermes/scripts/daily_digest.py
  ```
- **Acceptance sign-off:** пользователь получает тестовое сообщение и подтверждает формат.
- **Rollback:** если новый дайджест не работает:
  ```bash
  hermes cron remove <new-job-id>
  hermes cron enable 984d5d5e9628
  ```
- **Backup конфигурации:** перед изменением сохранить `~/.hermes/cron/jobs.json`.

### 10.6. Валидация после деплоя

- `hermes cron list` содержит ровно одно активное задание `daily-telegram-digest`.
- Старое задание `984d5d5e9628` отсутствует или `disabled`.
- В 08:00 МСК приходит одно сообщение с погодой и курсом.

---

## 11. Рекомендации по реализации

### 11.1. Псевдокод `daily_digest.py`

```python
#!/usr/bin/env python3
import argparse
import logging
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

WEATHER_SCRIPT = Path.home() / ".hermes" / "scripts" / "weather_daily.py"
RATE_SCRIPT = Path("/home/hermes_ai/my_agent/AI-harness/scripts/usd_rub_rate.py")
TELEGRAM_LIMIT = 4096
MD_SPECIAL = re.escape(r"*_[]()~`>#+=|{}!")
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
            [sys.executable, str(RATE_SCRIPT)],
            capture_output=True,
            text=True,
            timeout=15,
            encoding="utf-8",
            errors="replace",
        )
        if result.stderr:
            logging.warning("usd_rub_rate.py stderr: %s", result.stderr.strip())
        if result.returncode != 0:
            return "❌ Курс недоступен"
        return strip_markdown(result.stdout.strip())
    except subprocess.TimeoutExpired:
        logging.error("usd_rub_rate.py timed out")
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
    # 2. Trim weather block at city boundaries (heuristic: blank line + emoji/letter)
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
        f"💰 {rate_block}",
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
        # Validate each city is a short safe string
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
    sys.exit(main())
```

### 11.2. Проверки сообщения

- Длина ≤ 4096 символов.
- Присутствует заголовок, блок погоды/placeholder, блок курса/placeholder, подвал.
- `stdout` не содержит логов.

---

## 12. Открытые вопросы и риски

| ID | Вопрос/риск | Митигация | Статус |
|----|-------------|-----------|--------|
| R-01 | `TELEGRAM_BOT_TOKEN` может быть закомментирован | Проверить и активировать `~/.hermes/.env` перед деплоем | Открыт |
| R-02 | Старое cron-задание продолжит дублировать сообщения | Отключить/удалить `984d5d5e9628` сразу после приёмки | Открыт |
| R-03 | Большой список городов превысит лимит 4096 символов | Реализовать урезание сообщения (FR-10) | Закрыт |
| R-04 | Часовой пояс cron | Использовать `--timezone Europe/Moscow` и проверить `timedatectl` | Закрыт |
| R-05 | Markdown-конфликт с форматированием `weather_daily.py` | Удалить Markdown-спецсимволы в `daily_digest.py` перед отправкой; plain text по умолчанию | Закрыт |

---

## 13. История изменений

| Версия | Дата | Автор | Изменения |
|--------|------|-------|-----------|
| 1.0 | 2026-07-19 | System Analyst Sub-Agent | Первоначальная версия спецификации |

---

**Статус:** готово к передаче разработчику.  
**Следующий шаг:** реализация `daily_digest.py` и настройка `hermes cron`.
