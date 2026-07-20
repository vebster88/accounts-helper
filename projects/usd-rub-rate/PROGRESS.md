# PROGRESS: usd-rub-rate v2.0

- **Проект:** `/home/hermes_ai/my_agent/AI-harness/projects/usd-rub-rate`
- **Спецификация:** `spec_v2.md` v2.0.0 (approved)
- **Дата начала:** 2026-07-20

## Статус работ

| # | Статус | Work Unit | Категория | Верификация | Заметки |
|---|--------|-----------|-----------|-------------|---------|
| 1 | [ ] | Shell-обёртка cron `currency_rate_update_wrapper.sh` | Vibecode | L1 | Отсутствует в `~/.hermes/scripts/` |
| 2 | [ ] | Legacy-обёртка `usd_rub_rate.py` → тонкий делегатор | Vibecode | L1 | v1.0.0 ещё содержит полную реализацию |
| 3 | [ ] | Atomic write helper и замена `save_cache`/`save_history` | Controlled | L2 | Текущая запись неатомарная |
| 4 | [ ] | Изменение курса за день в `format_digest_line` | Controlled | L2 | FR-07, BR-10 |
| 5 | [ ] | Установка/проверка pytest и запуск существующих тестов | Controlled | L2 | pytest не установлен |
| 6 | [ ] | Доп. unit-тесты для FR-07 и atomic write | Controlled | L2 | Зависит от #3, #4 |
| 7 | [ ] | Интеграционное тестирование update/report/history | Verified | L3 | Реальные API + exit-коды |
| 8 | [ ] | Cron `currency-rate-daily-update` 12:00 MSK | Verified | L3 | `hermes cron add` + list |
| 9 | [ ] | End-to-end проверка `daily_digest.py` с новым digest | Verified | L3 | Визуальная/CLI проверка строки |

## Что уже готово

- [x] `currency_rate.py` v2.0.0 создан и компилируется (L1 passed).
- [x] Поддержка USD/RUB + EUR/RUB (FR-01), основной источник ЦБ РФ (FR-02), fallback (FR-03).
- [x] Кэш (FR-04), история 90 дней (FR-05), SMA30 (FR-06).
- [x] Подкоманды `update` (FR-08), `report` (FR-09), `history` (FR-10).
- [x] `daily_digest.py` уже вызывает `currency_rate.py report --format digest` (FR-12).
- [x] `~/.hermes/scripts/daily_digest_wrapper.sh` существует.
- [x] `spec_v2.md`, `hld_v2.md`, `brd_v2.md` approved.

## Что требует доработки

- [ ] `save_cache`/`save_history` — сделать атомарной записью (SR-07).
- [ ] `format_digest_line` — добавить изменение за предыдущий день (FR-07).
- [ ] `usd_rub_rate.py` — превратить в тонкую обёртку `currency_rate.py --currency usd report --format text` (FR-11).
- [ ] `currency_rate_update_wrapper.sh` — новый wrapper для cron 12:00 MSK.
- [ ] `hermes cron add currency-rate-daily-update "0 12 * * *" ...`.
- [ ] Установить/проверить pytest и прогнать `tests/test_currency_rate.py`; дописать тесты на FR-07 и atomic write.

## Точки восстановления

1. Vibecode-точка: после завершения #1 и #2 все скрипты компилируются (`python -m py_compile`).
2. Controlled-точка: после #3..#6 проходят `pytest`.
3. Verified-точка: после #7 готовы ручные интеграционные проверки; от неё ответвляются #8 и #9.

## Последнее обновление

- 2026-07-20: создан `decomposition-plan_v2.md` и данный `PROGRESS.md`. Реализация не начата.
