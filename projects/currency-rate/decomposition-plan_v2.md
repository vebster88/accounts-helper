# План декомпозиции: currency-rate v2.0

- **Проект:** `/home/hermes_ai/my_agent/AI-harness/projects/currency-rate`
- **Спецификация:** `spec_v2.md` (версия 2.0.0, approved)
- **Дата:** 2026-07-20
- **Роль:** Decompose sub-agent

## TL;DR

Большая часть `currency_rate.py` v2.0.0 уже реализована (USD/RUB + EUR/RUB, история, SMA30, подкоманды update/report/history, формат digest). Оставшиеся изменения — доработка digest-формата (FR-07), атомарная запись JSON (SR-07), cron-обёртка и cron-задание на 12:00 MSK (FR-08/SR-10), унаследованная обёртка `usd_rub_rate.py` (FR-11) и доведение тестов до запускаемого состояния (pytest не установлен). Все юниты сведены в план ниже.

## Категории

| Категория | Что | Уровень верификации | Примеры |
|-----------|-----|---------------------|---------|
| Vibecode | Шаблонный код без бизнес-логики | L1: синтаксис / компиляция | CLI-парсер, конфиги, заглушки, обёртки shell |
| Controlled | Бизнес-логика с чётким контрактом | L2: тесты проходят | Парсеры, расчёт SMA, обновление истории, форматтеры |
| Verified | Интеграция, cross-cutting, рискованное | L3: ручное ревью / стенд | cron-обёртка, cron-задание, работа с внешними API, atomic write в runtime |

## Уровни верификации

| Уровень | Команда | Кто |
|---------|---------|-----|
| L1 | `python -m py_compile`, `bash -n`, `ruff check` (опц.) | Модель / автоматика |
| L2 | `pytest tests/`, интеграционные запуски вручную | Модель + тест-раннер |
| L3 | Ручное ревью, тест на реальном стенде (cron + API) | Разработчик / пользователь |

## Карта размещения (Placement Map)

| Концепция | Владелец | Обоснование |
|-----------|----------|-------------|
| Основной скрипт `currency_rate.py` | `AI-harness/scripts/` | Уже размещён и вызывается дайджестом |
| Legacy-обёртка `usd_rub_rate.py` | `AI-harness/scripts/` | Остаётся для обратной совместимости v1.0.0 |
| Cron-обёртка `currency_rate_update_wrapper.sh` | `~/.hermes/scripts/` | Конвенция Hermes cron (как `daily_digest_wrapper.sh`) |
| Unit-тесты | `AI-harness/projects/currency-rate/tests/test_currency_rate.py` | Существующий файл, отражает структуру `scripts/` |
| Планы/прогресс | `AI-harness/projects/currency-rate/` | Рабочая директория задачи |

## Состояние existing-кода

- `currency_rate.py` v2.0.0 компилируется (L1 passed). Покрывает FR-01..FR-06, FR-09, FR-10, FR-12, большую часть SR/NFR.
- `daily_digest.py` компилируется, уже вызывает `currency_rate.py --timeout 15 report --format digest`.
- `usd_rub_rate.py` v1.0.0 компилируется, но содержит полную собственную реализацию USD/RUB; по FR-11 должен стать тонкой обёрткой.
- `~/.hermes/scripts/daily_digest_wrapper.sh` существует.
- `currency_rate_update_wrapper.sh` отсутствует.
- Cron `daily-telegram-digest` на 08:00 MSK работает; cron `currency-rate-daily-update` на 12:00 MSK отсутствует.
- `tests/test_currency_rate.py` существует, но pytest не установлен (NFR-05 позволяет dev-venv; runtime stdlib-only).
- Запись `cache.json`/`history.json` сейчас неатомарная (`open(..., 'w')` + `json.dump`) — требуется доработка по SR-07.
- `format_digest_line` не показывает изменение за день — требуется доработка по FR-07.

## Таблица декомпозиции

| # | Категория | Work Unit | Файлы | Верификация | Зависимости | Покрываемые требования |
|---|-----------|-----------|-------|-------------|-------------|------------------------|
| 1 | Vibecode | Shell-обёртка cron `currency_rate_update_wrapper.sh` | `~/.hermes/scripts/currency_rate_update_wrapper.sh` | L1: `bash -n`, `chmod +x` | — | FR-08, SR-10 |
| 2 | Vibecode | Legacy-обёртка `usd_rub_rate.py` → тонкий делегатор | `AI-harness/scripts/usd_rub_rate.py` | L1: `python -m py_compile` | #3 (currency_rate.py формат text должен быть стабилен) | FR-11 |
| 3 | Controlled | Atomic write helper и замена `save_cache`/`save_history` | `AI-harness/scripts/currency_rate.py` | L2: `pytest`, ручная проверка целостности JSON | — | FR-04, FR-05, SR-07, NFR-02 |
| 4 | Controlled | Изменение курса за день в `format_digest_line` | `AI-harness/scripts/currency_rate.py` | L2: `pytest tests/test_currency_rate.py` + интеграционный запуск `report --format digest` | #3 (history доступна) | FR-07, BR-10, SR-09 |
| 5 | Controlled | Установка/проверка pytest и дополнение тестов | `AI-harness/projects/currency-rate/tests/test_currency_rate.py`, venv | L2: `pytest tests/test_currency_rate.py -v` | — | FR-06, FR-07, SR-03, TC-01..TC-08 |
| 6 | Controlled | Дополнительные unit-тесты для FR-07 и atomic write | `AI-harness/projects/currency-rate/tests/test_currency_rate.py` | L2: `pytest` | #3, #4 | TC-07, FR-07, SR-07 |
| 7 | Verified | Интеграционное тестирование `currency_rate.py update/report/history` | terminal / real API | L3: ручной запуск, exit-code, stdout/stderr, валидность JSON | #1, #3, #4 | IT-01..IT-06, IT-08..IT-10 |
| 8 | Verified | Развёртывание cron `currency-rate-daily-update` | `hermes cron add ...` | L3: `hermes cron list`, ручной запуск обёртки | #1, #7 | CT-01..CT-03, SR-10 |
| 9 | Verified | End-to-end проверка дайджеста с новым digest | `daily_digest.py` + cron | L3: запуск `daily_digest.py`, визуальная проверка строки | #4, #7 | IT-07, FR-12 |

### Правила зависимостей

- Vibecode (#1, #2) не зависят от Controlled/Verified.
- Controlled (#3, #4, #5, #6) могут выполняться параллельно, кроме #6, которая зависит от #3 и #4.
- Verified (#7, #8, #9) выполняются последовательно после завершения Controlled; каждый — с ручным контролем.

## Порядок реализации

1. **Пакет Vibecode:** #1 + #2.
2. **Controlled пакет 1:** #3 (atomic write) + #5 (pytest + запуск существующих тестов).
3. **Controlled пакет 2:** #4 (day-over-day change) + #6 (доп. тесты на #3/#4).
4. **Verified:** #7 (integration) → #8 (cron) → #9 (digest E2E).

## Критерии приёмки реализации

- `currency_rate.py update --verbose` пустой stdout, stderr содержит диагностику, exit 0.
- `currency_rate.py report --format digest` выдаёт строку вида `USD/RUB: XX.XX (+Y.YY, SMA30: ZZ.ZZ) | EUR/RUB: ...`.
- `currency_rate.py report --format json` валидный JSON с `rate`, `source`, `source_name`, `timestamp`, `sma30`.
- `usd_rub_rate.py` выдаёт одну строку `USD/RUB: XX.XX (источник: ..., дата: ..., SMA30: ...)`.
- `pytest tests/test_currency_rate.py` проходит (>= 10 тестов).
- `currency_rate_update_wrapper.sh` создан в `~/.hermes/scripts/`, `bash -n` чист, права на выполнение.
- `hermes cron list` содержит `currency-rate-daily-update` с расписанием `0 12 * * *` MSK.
- При аварийном прерывании `cache.json`/`history.json` не остаются в повреждённом состоянии (проверяется unit-тестом atomic write).
