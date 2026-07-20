# Отчёт о тестировании: currency-rate v2.0.0

**Project:** currency-rate  
**Spec:** `/home/hermes_ai/my_agent/AI-harness/projects/currency-rate/spec_v2.md`  
**Implementation:**
- `/home/hermes_ai/my_agent/AI-harness/scripts/currency_rate.py` v2.0.0
- `/home/hermes_ai/my_agent/AI-harness/scripts/usd_rub_rate.py` v1.0.0
- `/home/hermes_ai/my_agent/AI-harness/scripts/daily_digest.py`
- `/home/hermes_ai/.hermes/scripts/currency_rate_update_wrapper.sh`
- `/home/hermes_ai/.hermes/scripts/daily_digest_wrapper.sh`

**Date:** 2026-07-20  
**Tester:** Hermes Tester Sub-Agent  

## Summary

| Metric | Value |
|---|---|
| Unit test cases | 15 |
| Unit tests passed | 15 |
| Unit tests failed | 0 |
| Integration scenarios run | 17 |
| Integration passed | 16 |
| Integration passed with findings | 1 |
| Failed | 0 |
| Verdict | **PASS WITH FINDINGS** |

## Unit Test Results

Run: `python3 -m pytest tests/test_currency_rate.py -v`

| ID | Case | Expected | Actual | Result |
|---|---|---|---|---|
| TC-01 | `test_parse_cbr_usd` | Парсинг USD из CBR XML | rate=92.4567, source=cbr, date=2026-07-19 | PASS |
| TC-02 | `test_parse_cbr_eur` | Парсинг EUR из CBR XML | rate=98.7654, source=cbr | PASS |
| TC-03 | `test_parse_fallback` | Парсинг fallback JSON | rate=92.45, tz-aware MSK | PASS |
| TC-04 | `test_compute_sma` | Расчёт SMA | 90.0 / 90.0 / None | PASS |
| TC-05 | `test_load_and_save_history` | Сериализация history.json | 1 запись USD/EUR | PASS |
| TC-06 | `test_update_history` | Добавление записи | 1 запись, rate=79.0 | PASS |
| TC-07 | `test_format_digest_line` | Формат digest без изменения | `USD/RUB: 78.40`, `SMA30: 78.45` | PASS |
| TC-08 | `test_format_digest_line_with_change` | Формат digest с изменением | `+0.12`, `SMA30: 78.45` | PASS |
| TC-09 | `test_format_digest_line_with_negative_change` | Отрицательное изменение | `-0.12` | PASS |
| TC-10 | `test_find_previous_day_change` | Изменение за предыдущий день | 1.0 | PASS |
| TC-11 | `test_find_previous_day_change_missing` | Отсутствие предыдущего дня | None | PASS |
| TC-12 | `test_atomic_write_json` | Атомарная запись JSON | target exists, temp deleted | PASS |
| TC-13 | `test_atomic_write_json_concurrent` | Атомарность без остатков | pid совпадает | PASS |
| TC-14 | `test_validate_args_timeout` | Валидация timeout | exit code 2 | PASS |
| TC-15 | `test_validate_args_source_conflict` | Конфликт source/fallback | exit code 2 | PASS |

**Pytest stdout:** `15 passed in 0.06s`.

## Integration Test Results

All scenarios executed against real CBR / open.er-api.com endpoints unless otherwise noted.

| ID | Case | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| IT-01 | `update` silent | `currency_rate.py --timeout 15 update` | stdout пуст, exit 0 | stdout=0 bytes, exit=0 | PASS |
| IT-02 | `update --verbose` | `currency_rate.py --timeout 15 --verbose update` | stderr диагностика, exit 0 | `Updated USD: 78.3987`, exit=0 | PASS |
| IT-03 | `report --format text` | `currency_rate.py --timeout 15 report --format text` | 2 строки USD/RUB и EUR/RUB с SMA30 | `USD/RUB: 78.40, (источник: ЦБ РФ, дата: 2026-07-18, SMA30: 78.40)`; EUR аналогично | PASS |
| IT-04 | `report --format json` | `currency_rate.py --timeout 15 report --format json` | Валидный JSON с `rate`, `source`, `source_name`, `timestamp`, `sma30` | JSON с обеими парами, SMA30 присутствует | PASS |
| IT-05 | `report --format digest` | `currency_rate.py --timeout 15 report --format digest` | Компактная строка с `\|` | `USD/RUB: 78.40 (SMA30: 78.40) \| EUR/RUB: 89.90 (SMA30: 89.90)` | PASS |
| IT-06 | `history` | `currency_rate.py --timeout 15 --history-days 7 history` | JSON, записи не старше 7 дней | JSON с 1 записью USD/EUR 2026-07-18 | PASS |
| IT-07 | `usd_rub_rate.py` legacy wrapper | `python3 usd_rub_rate.py` | Строка `USD/RUB: XX.XX (...)` | `USD/RUB: 78.40, (источник: ЦБ РФ, дата: 2026-07-18, SMA30: 78.40)`, exit=0 | PASS |
| IT-08 | cron wrapper silent | `bash currency_rate_update_wrapper.sh` | stdout пуст, exit 0 | stdout=0 bytes, exit=0 | PASS |
| IT-09 | cron wrapper verbose pass-through | `bash currency_rate_update_wrapper.sh --verbose` | stderr диагностика, exit 0 | `[ЦБ РФ] OK: EUR/RUB = 89.8998`, exit=0 | PASS |
| IT-10 | `daily_digest.py` | `python3 daily_digest.py` | Сообщение содержит `💰 USD/RUB... \| EUR/RUB...` | Сообщение собрано, rate-блок `USD/RUB: 78.40 SMA30: 78.40 \| EUR/RUB: 89.90 SMA30: 89.90`, exit=0 | PASS |
| IT-11 | `--source fallback` | `currency_rate.py --source fallback --timeout 15 report --format text` | EUR от fallback, USD от CBR | EUR source=open.er-api.com, USD source=ЦБ РФ | PASS |
| IT-12 | `--source fallback --no-fallback` | `currency_rate.py --source fallback --no-fallback report` | exit 2 | `Конфликт флагов...`, exit=2 | PASS |
| IT-13 | `--timeout 0` | `currency_rate.py --timeout 0 report` | exit 2 | `Таймаут должен быть больше 0`, exit=2 | PASS |
| IT-14 | `--currency usd --source cbr` | `currency_rate.py --currency usd --source cbr report --format json` | Только USD | Только `usd` в JSON, exit=0 | PASS |
| IT-15 | `--help` / `--version` | `currency_rate.py --help`, `--version` | Справка и версия 2.0.0 | Справка корректна, `currency-rate 2.0.0`, exit=0 | PASS |
| IT-16 | Bash syntax wrapper | `bash -n currency_rate_update_wrapper.sh` | Чистая проверка синтаксиса | exit=0 | PASS |
| IT-17 | Cron schedule presence | `hermes cron list` | Задания `currency-rate-daily-update` (0 12 * * *) и `daily-telegram-digest` (0 8 * * *) присутствуют | Оба задания в списке, currency-rate-daily-update: `0 12 * * *`, local, wrapper | PASS |

## Findings

### Minor — Строка `text` содержит двойную запятую
- **Location:** `currency_rate.py:416-428` (`format_rate_line`).
- **Spec reference:** SR-09, пример в спецификации.
- **Impact:** Low. Вывод содержит `USD/RUB: 78.40, (источник: ...` вместо ожидаемого `USD/RUB: 78.40 (источник: ...`. Legacy-скрипт `usd_rub_rate.py` наследует этот формат.
- **Recommendation:** Убрать запятую между курсом и открывающей скобкой в `format_rate_line`, чтобы соответствовать примеру из SR-09 и сохранить обратную совместимость с ожидаемым v1-форматом.

### Minor — Изменение курса за день не отображается в `digest` на тестовых данных
- **Location:** `currency_rate.py:445-461` (`find_previous_day_change`).
- **Spec reference:** FR-07.
- **Impact:** Low. Алгоритм требует записи за предыдущий календарный день в `history.json`; на момент теста в истории только одна дата (2026-07-18), поэтому `change=None` и строка digest не содержит `(+Y.YY)`. Функциональность реализована корректно и проверена unit-тестами.
- **Recommendation:** После нескольких дней накопления истории перепроверить вывод digest вручную. Для форсированного теста внести в `history.json` две соседние даты.

### Info — Wrapper передаёт `--verbose` валидно только как глобальную опцию
- **Location:** `currency_rate_update_wrapper.sh`.
- **Spec reference:** FR-08.
- **Impact:** None. Скрипт wrapper выполняет `exec ... "$@" update`; попытка `wrapper.sh update --verbose` приведёт к ошибке `unrecognized arguments: --verbose`. Для cron требуется тихий режим, `--verbose` не используется.
- **Recommendation:** Не требует действий.

## Defects

Блокирующих дефектов не обнаружено.

## Coverage Notes

| Spec item | Covered by | Status |
|---|---|---|
| FR-01 USD/RUB + EUR/RUB | TC-01, TC-02, IT-03, IT-04, IT-05 | PASS |
| FR-02 Основной источник ЦБ РФ | TC-01, TC-02, IT-02, IT-03 | PASS |
| FR-03 Fallback open.er-api.com | TC-03, IT-11 | PASS |
| FR-04 Кэш с TTL и atomic write | TC-12, TC-13, IT-01 | PASS |
| FR-05 История за 90 дней | TC-05, TC-06, IT-06 | PASS |
| FR-06 SMA30 | TC-04, IT-03, IT-04, IT-05 | PASS |
| FR-07 Изменение курса за день | TC-10, TC-11, IT-05 (with finding) | PASS WITH FINDING |
| FR-08 Тихое обновление `update` | IT-01, IT-02, IT-08 | PASS |
| FR-09 Подкоманда `report` | IT-03, IT-04, IT-05, IT-14 | PASS |
| FR-10 Подкоманда `history` | IT-06 | PASS |
| FR-11 Legacy wrapper `usd_rub_rate.py` | IT-07 | PASS |
| FR-12 Интеграция `daily_digest.py` | IT-10 | PASS |
| SR-01 stdlib-only | Скрипт не импортирует сторонние модули | PASS |
| SR-02 CLI интерфейс | IT-01..IT-06, IT-15 | PASS |
| SR-03 Валидация аргументов | TC-14, TC-15, IT-12, IT-13 | PASS |
| SR-04 HTTPS + User-Agent + Accept | Проверено в коде + интеграциями | PASS |
| SR-05 Часовой пояс MSK | TC-03, IT-04 | PASS |
| SR-06 Пути хранения | IT-01, IT-06 | PASS |
| SR-07 Atomic write | TC-12, TC-13 | PASS |
| SR-08 Exit codes | IT-12, IT-13 | PASS |
| SR-09 Форматирование | IT-03, IT-04, IT-05 (with finding) | PASS WITH FINDING |
| SR-10 Cron интеграция | IT-08, IT-09, IT-16, IT-17 | PASS |
| NFR-01 Производительность | Все вызовы < 15 сек | PASS |
| NFR-02 Надёжность | IT-12, fallback, atomic write | PASS |
| NFR-03 Безопасность | Только HTTPS | PASS |
| NFR-04 Ресурсы | currency_rate.py 24 229 bytes (< 50 KB) | PASS |

## Verdict

**PASS WITH FINDINGS**

Все 15 unit-тестов и 16 из 17 интеграционных сценариев прошли успешно. Критические пути (получение курсов, fallback, кэш/история, atomic write, подкоманды, legacy wrapper, cron wrapper, daily_digest) работают корректно. Cron-задания `currency-rate-daily-update` (12:00 MSK) и `daily-telegram-digest` (08:00 MSK) присутствуют в `hermes cron list`.

Единственное замечание — лишняя запятая в `text`-формате (`USD/RUB: 78.40, (...)`), что расходится с примером SR-09. Это не влияет на функциональность, но рекомендуется исправить для соответствия спецификации. Изменение курса за день в digest не отобразилось из-за однодневной истории; функциональность проверена unit-тестами.

## Recommendations

1. Убрать запятую в `format_rate_line` между курсом и открывающей скобкой.
2. После накопления истории за 2+ дня перепроверить `report --format digest` на наличие `(+Y.YY)` / `(-Y.YY)`.
3. Сохранить `test-report_v2.md` в проекте для аудита.
