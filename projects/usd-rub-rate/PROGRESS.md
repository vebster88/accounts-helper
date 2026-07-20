# PROGRESS: usd-rub-rate v2.0

- **Проект:** `/home/hermes_ai/my_agent/AI-harness/projects/usd-rub-rate`
- **Спецификация:** `spec_v2.md` v2.0.0 (approved)
- **Дата начала:** 2026-07-20

## Статус работ

| # | Статус | Work Unit | Категория | Верификация | Заметки |
|---|--------|-----------|-----------|-------------|---------|
| 1 | [x] | Shell-обёртка cron `currency_rate_update_wrapper.sh` | Vibecode | L1 | Создана в `~/.hermes/scripts/`, исправлен порядок CLI аргументов |
| 2 | [x] | Legacy-обёртка `usd_rub_rate.py` → тонкий делегатор | Vibecode | L1 | Переписана, делегирует `currency_rate.py --currency usd report --format text` |
| 3 | [x] | Atomic write helper и замена `save_cache`/`save_history` | Controlled | L2 | `atomic_write_json()` + `os.replace()`, тесты пройдены |
| 4 | [x] | Изменение курса за день в `format_digest_line` | Controlled | L2 | FR-07 реализован, тесты пройдены |
| 5 | [x] | Установка/проверка pytest и запуск существующих тестов | Controlled | L2 | pytest 9.1.1 в `.venv`, 15 тестов pass |
| 6 | [x] | Доп. unit-тесты для FR-07 и atomic write | Controlled | L2 | 15 тестов, включая atomic write concurrent |
| 7 | [x] | Интеграционное тестирование `update`/`report`/`history` | Verified | L3 | Реальные API + exit-коды проверены |
| 8 | [x] | Cron `currency-rate-daily-update` 12:00 MSK | Verified | L3 | `hermes cron add` + list — job `2be5040f8424` |
| 9 | [x] | End-to-end проверка `daily_digest.py` с новым digest | Verified | L3 | Строка `USD/RUB: 78.40 (SMA30: 78.40) \| EUR/RUB: 89.90 (SMA30: 89.90)` |

## Что уже готово

- [x] `currency_rate.py` v2.0.0 — atomic write, day-over-day change, USD/RUB + EUR/RUB, история, SMA30, подкоманды.
- [x] `usd_rub_rate.py` — legacy wrapper.
- [x] `currency_rate_update_wrapper.sh` — cron wrapper.
- [x] `currency-rate-daily-update` cron — 12:00 MSK.
- [x] `daily_digest.py` — интеграция сохранена.
- [x] 15 unit-тестов проходят.
- [x] Интеграционные и E2E проверки пройдены.

## Ожидает тестера и code review

- [ ] Tester — формальный test-report.
- [ ] Quality Gate 2 — code-review-report_v2.md.

## Последнее обновление

- 2026-07-20: завершены все work units. Передача в tester-agent.
