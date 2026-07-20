# MemoryWrite summary: spec_v2.md — currency-rate v2.0

Сформирована и сохранена техническая спецификация `/home/hermes_ai/my_agent/AI-harness/projects/currency-rate/spec_v2.md` (версия 2.0.0, статус approved).

**Ключевые решения:**
- Основной скрипт: `currency_rate.py` v2.0.0 (stdlib-only Python 3.11+).
- Пары: USD/RUB и EUR/RUB; источники — ЦБ РФ XML (primary), open.er-api.com (fallback).
- Подкоманды CLI: `update`, `report`, `history`.
- Форматы вывода `report`: `text`, `json`, `digest` (с изменением за день по FR-07).
- Хранение: `~/.cache/currency-rate/cache.json` и `history.json` с атомарной записью (`tmp + os.replace`).
- История: до 90 дней, дедупликация по дате, SMA30 с окном `--moving-average-days` (default 30).
- Cron: `currency-rate-daily-update` в 12:00 MSK через wrapper `currency_rate_update_wrapper.sh`.
- Legacy: `usd_rub_rate.py` делегирует `currency_rate.py --currency usd report --format text`.
- Интеграция дайджеста: `daily_digest.py` вызывает `currency_rate.py --timeout 15 report --format digest`.

**Открытые вопросы HLD решены (раздел 12 spec_v2.md):**
- OQ-01: в `digest` показывать изменение за день — да.
- OQ-02: атомарная запись JSON — обязательна, резервная копия вне скоупа.
- OQ-03: при отсутствии интернета cron обновления завершается exit != 0.
- OQ-04: spec_v2.md создан.

**Требования:** FR-01..FR-12, SR-01..SR-11, NFR-01..NFR-05.
**Тесты:** unit (TC-01..TC-08), integration (IT-01..IT-10), cron (CT-01..CT-03), smoke/perf (PT-01..PT-02).
**Traceability matrix:** полная таблица соответствия BR/BRULE/US/NFR → HLD → FR → SR → AC/TC.
