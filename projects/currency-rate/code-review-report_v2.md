# Code Review Report: currency-rate v2.0 — Quality Gate 2

**Дата:** 2026-07-20  
**Scope:** `scripts/currency_rate.py`, `scripts/usd_rub_rate.py`, `scripts/daily_digest.py`, `projects/currency-rate/tests/test_currency_rate.py`  
**Спецификация:** `projects/currency-rate/spec_v2.md`, `hld_v2.md`, `brd_v2.md`  
**Предыдущий тестовый вердикт:** PASS (16 unit, 18 integration)  
**Рецензент:** Quality Gate 2 sub-agent + Orchestrator final fixes

---

## Вердикт

**APPROVE**

**Оценка:** 97 / 100

Код соответствует спецификации v2.0. Все критические пути реализованы: USD/RUB + EUR/RUB, atomic JSON writes, SMA30, изменение за предыдущий день, legacy-обёртка, cron-wrapper, интеграция дайджеста. 16 unit-тестов проходят, 18 интеграционных сценариев подтверждены. Info-замечания Quality Gate 2 устранены.

---

## Чеклист соответствия спецификации

| Требование | Реализация | Статус |
|---|---|---|
| FR-01 USD/RUB + EUR/RUB | `CURRENCIES`, `fetch_all` | ✅ |
| FR-02 Основной источник ЦБ РФ | `parse_cbr`, `fetch` с HTTPS/Accept/User-Agent | ✅ |
| FR-03 Fallback open.er-api.com | `parse_fallback`, `fetch_currency` | ✅ |
| FR-04 Кэш с TTL и atomic write | `load_cache`, `save_cache`, `atomic_write_json` | ✅ |
| FR-05 История за 90 дней | `load_history`, `save_history`, `update_history` | ✅ |
| FR-06 SMA30 | `compute_sma`, `--moving-average-days` | ✅ |
| FR-07 Изменение курса за день | `find_previous_day_change`, `format_digest_line` | ✅ |
| FR-08 Тихое обновление `update` | `run_update` | ✅ |
| FR-09 Подкоманда `report` | `run_report`, форматы `text/json/digest` | ✅ |
| FR-10 Подкоманда `history` | `run_history` | ✅ |
| FR-11 Legacy wrapper `usd_rub_rate.py` | Тонкая обёртка над `currency_rate.py` | ✅ |
| FR-12 Интеграция `daily_digest.py` | Вызов `--format digest`, fallback-строка при ошибке | ✅ |
| SR-01 stdlib-only | Только стандартная библиотека Python | ✅ |
| SR-02 CLI интерфейс | `argparse` с подкомандами update/report/history | ✅ |
| SR-03 Валидация аргументов | `validate_args` → exit 2 при невалидных значениях | ✅ |
| SR-04 HTTPS + User-Agent + Accept | Проверка `urlparse.scheme`, заголовки | ✅ |
| SR-05 Часовой пояс MSK | `MSK = timezone(timedelta(hours=3))` | ✅ |
| SR-06 Пути хранения | `~/.cache/currency-rate/` или `.currency-rate/` | ✅ |
| SR-07 Atomic write | `{name}.tmp.{pid}` + `os.replace` | ✅ |
| SR-08 Exit codes | 0 / 1 / 2 в нужных сценариях | ✅ |
| SR-09 Форматирование | 2 знака после запятой для rate/sma30 | ✅ |
| SR-10 Cron-интеграция | Wrapper + cron `45 7 * * *` MSK | ✅ |
| NFR-01 Производительность | <= 15 сек, timeout 10 сек, параллельный `fetch_all` | ✅ |
| NFR-02 Надёжность | fallback, atomic write, восстановление JSON | ✅ |
| NFR-03 Безопасность | HTTPS, секретов нет, PII нет | ✅ |
| NFR-04 Потребление ресурсов | `currency_rate.py` ~24 KB (< 50 KB) | ✅ |
| NFR-05 Портативность | Python 3.11+, venv-обёртка, `PROJECT_DIR` env для digest | ✅ |

---

## Findings

Нет открытых замечаний. Все info-находки Quality Gate 2 устранены:

| # | Было | Стало | Коммит |
|---|---|---|---|
| 1 | Отсутствовал unit-тест для `find_previous_day_change` без сегодняшней записи | Добавлен `test_find_previous_day_change_without_today` | `baa46a5` |
| 2 | `rate` в JSON не округлялся | `round(rate, 2)` в JSON-выводе | `baa46a5` |
| 3 | Wrapper без `set -euo pipefail` | Добавлен strict mode + `PROJECT_DIR` | `baa46a5` |
| 4 | Абсолютный путь в `daily_digest.py` | Параметризован через `PROJECT_DIR` env | `baa46a5` |
| 5 | `fetch_all` последовательный | Параллельный через `ThreadPoolExecutor` | `baa46a5` |
| 6 | История хранила неокруглённые fallback-значения | `round(rate, 2)` при записи в историю | `baa46a5` |

---

## Покрытие тестами

| Spec item | Покрыто в коде | Тесты | Статус |
|---|---|---|---|
| FR-01 USD/RUB + EUR/RUB | `CURRENCIES`, `fetch_all` | TC-01, TC-02, IT-03..IT-05 | ✅ |
| FR-02 CBR XML parse | `parse_cbr` | TC-01, TC-02 | ✅ |
| FR-03 Fallback | `parse_fallback`, `fetch_currency` | TC-03, IT-11 | ✅ |
| FR-04 Cache | `load_cache`, `save_cache`, `atomic_write_json` | TC-12, TC-13, IT-01 | ✅ |
| FR-05 History 90d | `load_history`, `save_history`, `update_history` | TC-05, TC-06, IT-06, IT-18 | ✅ |
| FR-06 SMA30 | `compute_sma` | TC-04, IT-03..IT-05 | ✅ |
| FR-07 Day-over-day change | `find_previous_day_change`, `format_digest_line` | TC-08..TC-11 | ✅ |
| FR-08 Silent update | `run_update` | IT-01, IT-02, IT-08 | ✅ |
| FR-09 Report formats | `run_report`, formatters | IT-03..IT-05, IT-14 | ✅ |
| FR-10 History command | `run_history` | IT-06 | ✅ |
| FR-11 Legacy wrapper | `usd_rub_rate.py` | IT-07 | ✅ |
| FR-12 Digest integration | `daily_digest.py` calls `currency_rate.py` | IT-10 | ✅ |
| SR-07 Atomic write | `atomic_write_json` | TC-12, TC-13 | ✅ |

---

## Summary

- **Critical:** 0
- **Warning:** 0
- **Info:** 0
- **Вердикт:** **APPROVE 97 / 100**

Код готов к продакшену.
