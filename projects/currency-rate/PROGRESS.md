# PROGRESS: currency-rate v2.0

- **Проект:** `/home/hermes_ai/my_agent/AI-harness/projects/currency-rate`
- **Спецификация:** `spec_v2.md` v2.0.0 (approved)
- **Дата начала:** 2026-07-20

## Статус работ

| # | Статус | Work Unit | Категория | Верификация | Заметки |
|---|--------|-----------|-----------|-------------|---------|
| 1 | [x] | Shell-обёртка cron `currency_rate_update_wrapper.sh` | Vibecode | L1 | Создана в `~/.hermes/scripts/`, использует venv-интерпретатор |
| 2 | [x] | Legacy-обёртка `usd_rub_rate.py` → тонкий делегатор | Vibecode | L1 | Переписана, делегирует `currency_rate.py --currency usd report --format text` |
| 3 | [x] | Atomic write helper и замена `save_cache`/`save_history` | Controlled | L2 | `atomic_write_json()` + `os.replace()`, тесты пройдены |
| 4 | [x] | Изменение курса за день в `format_digest_line` | Controlled | L2 | FR-07 реализован, тесты пройдены |
| 5 | [x] | Установка/проверка pytest и запуск существующих тестов | Controlled | L2 | pytest 9.1.1 в `.venv`, 15 тестов pass |
| 6 | [x] | Доп. unit-тесты для FR-07 и atomic write | Controlled | L2 | 15 тестов, включая atomic write concurrent |
| 7 | [x] | Интеграционное тестирование `update`/`report`/`history` | Verified | L3 | Реальные API + exit-коды проверены |
| 8 | [x] | Cron `currency-rate-daily-update` 12:00 MSK | Verified | L3 | `hermes cron add` + list — job `2be5040f8424` |
| 9 | [x] | End-to-end проверка `daily_digest.py` с новым digest | Verified | L3 | Тестовый дайджест отправлен в Telegram |

## Что уже готово

- [x] `currency_rate.py` v2.0.0 — atomic write, day-over-day change, USD/RUB + EUR/RUB, история, SMA30, подкоманды.
- [x] `usd_rub_rate.py` — legacy wrapper.
- [x] `currency_rate_update_wrapper.sh` — cron wrapper с venv.
- [x] `currency-rate-daily-update` cron — 12:00 MSK.
- [x] `daily_digest.py` — интеграция сохранена.
- [x] 15 unit-тестов проходят.
- [x] Интеграционные и E2E проверки пройдены.
- [x] Code review: APPROVE CONDITIONAL 90/100.

## Оставшиеся условия (не блокируют релиз)

- [ ] Добавить edge-case тест на `find_previous_day_change` без сегодняшней записи.
- [ ] Устранить absolute path в `daily_digest.py` (в будущей итерации).
- [ ] Добавить собственный `--help` в `usd_rub_rate.py` (в будущей итерации).

## Последнее обновление

- 2026-07-20: все work units 1–9 завершены. Тестовый дайджест отправлен в Telegram.
