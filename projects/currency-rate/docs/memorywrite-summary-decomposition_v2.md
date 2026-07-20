# MemoryWrite summary: decomposition-plan_v2.md / PROGRESS.md — currency-rate v2.0

Сформирован план декомпозиции и карта прогресса для задачи `currency-rate` v2.0.

**Файлы:**
- `/home/hermes_ai/my_agent/AI-harness/projects/currency-rate/decomposition-plan_v2.md`
- `/home/hermes_ai/my_agent/AI-harness/projects/currency-rate/PROGRESS.md`

**Контекст:**
- Базовая спецификация: `spec_v2.md` v2.0.0 (approved).
- Основной скрипт `currency_rate.py` v2.0.0 уже частично реализован в `AI-harness/scripts/`.
- `daily_digest.py` уже вызывает `currency_rate.py --timeout 15 report --format digest`.
- `usd_rub_rate.py` v1.0.0 всё ещё самодостаточен и должен стать тонкой обёрткой.
- `pytest` не установлен; тесты лежат в `AI-harness/projects/currency-rate/tests/test_currency_rate.py`.
- Отсутствует `currency_rate_update_wrapper.sh` и cron `currency-rate-daily-update` 12:00 MSK.

**Декомпозиция (9 work units):**

| # | Категория | Work Unit | Верификация | Зависимости |
|---|-----------|-----------|-------------|-------------|
| 1 | Vibecode | Shell-обёртка cron `currency_rate_update_wrapper.sh` | L1 | — |
| 2 | Vibecode | Legacy-обёртка `usd_rub_rate.py` → тонкий делегатор | L1 | #3 |
| 3 | Controlled | Atomic write helper и замена `save_cache`/`save_history` | L2 | — |
| 4 | Controlled | Изменение курса за день в `format_digest_line` | L2 | #3 |
| 5 | Controlled | Установка/проверка pytest и запуск существующих тестов | L2 | — |
| 6 | Controlled | Доп. unit-тесты для FR-07 и atomic write | L2 | #3, #4 |
| 7 | Verified | Интеграционное тестирование update/report/history | L3 | #1, #3, #4 |
| 8 | Verified | Cron `currency-rate-daily-update` 12:00 MSK | L3 | #1, #7 |
| 9 | Verified | End-to-end проверка `daily_digest.py` с новым digest | L3 | #4, #7 |

**Покрываемые требования:** FR-04, FR-05, FR-07, FR-08, FR-09, FR-11, FR-12, SR-07, SR-09, SR-10, BR-10, NFR-02.

**Порядок:** Vibecode (#1, #2) → Controlled (#3 + #5 параллельно, затем #4 + #6) → Verified (#7 → #8 → #9).

**Ключевые риски:**
- `pytest` не установлен — требуется dev-venv или системная установка.
- ЦБ РФ публикует курс около 11:30 MSK; cron в 12:00 может получить вчерашнюю дату, если запуск раньше публикации.
- Одновременная запись cache/history из cron и ручного запуска — митигация атомарной записью.

**Следующий шаг:** ожидается подтверждение плана от пользователя/родительского агента, затем начинается пакет Vibecode.
