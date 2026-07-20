# Code Review Report: currency-rate v2.0

**Date:** 2026-07-20  
**Scope:** `scripts/currency_rate.py`, `scripts/usd_rub_rate.py`, `scripts/daily_digest.py`, `projects/currency-rate/tests/test_currency_rate.py`  
**Spec:** `projects/currency-rate/spec_v2.md`  
**Previous test verdict:** PASS  
**Reviewer:** Orchestrator focused review

---

## Verdict

**APPROVE — CONDITIONAL**

Score: **92 / 100**

Код соответствует спецификации v2.0. Все критические пути реализованы: USD/RUB + EUR/RUB, atomic JSON writes, SMA30, day-over-day change, legacy wrapper, cron wrapper, digest integration. 15 unit-тестов проходят, 18 интеграционных сценариев проверены. Замечания ниже не блокируют релиз.

---

## Resolved during review

| # | Finding | Fix | Commit |
|---|---|---|---|
| R-01 | Неиспользуемые импорты `socket`, `typing.Callable` | Удалены | `7c77136` |
| R-02 | Неиспользуемый класс `RateError` | Удалён | `7c77136` |
| R-03 | `sma30` в JSON содержит float-артефакты | Округление до 2 знаков | `7c77136` |
| R-04 | Двойная запятая в `text`-формате | Убрана | `838df01` |
| R-05 | Дата истории cap'алась до `today` | Сохраняется реальная дата из источника | `2fc7bb3` |
| R-06 | Digest в одну строку | Переделан в многострочный блок | `2fc7bb3` |
| R-07 | Cron 12:00 MSK — поздно для дайджеста | Перенесён на 07:45 MSK | cron update |
| R-08 | Wrapper использовал system Python | Использует venv-интерпретатор | wrapper update |
| R-09 | Название проекта `usd-rub-rate` устарело | Переименовано в `currency-rate` | `59afb28` |

---

## Remaining Findings

### Medium — `atomic_write_json` не сохраняет permissions

| | |
|---|---|
| Location | `currency_rate.py:228-241` |
| Impact | `os.replace` сбрасывает права файла на umask. Для `~/.cache` не критично. |
| Recommendation | При необходимости добавить `chmod` после `os.replace`. |
| Risk | Low. |

### Medium — `daily_digest.py` использует absolute path

| | |
|---|---|
| Location | `scripts/daily_digest.py` |
| Impact | Ограничивает переносимость. |
| Recommendation | В будущей итерации сделать путь относительным или через env. |
| Risk | Low. |

### Low — `fetch_all` последовательный

| | |
|---|---|
| Location | `currency_rate.py:401-413` |
| Impact | USD и EUR запрашиваются последовательно. Время удваивается при fallback для обеих пар. |
| Recommendation | Для v2.0 допустимо. В будущем — `concurrent.futures`. |
| Risk | None for current scope. |

### Low — `find_previous_day_change` требует записи за сегодня

| | |
|---|---|
| Location | `currency_rate.py:444-460` |
| Impact | Без сегодняшней записи изменение не показывается. Соответствует spec, но edge-case. |
| Recommendation | Добавить unit-тест на этот сценарий. |
| Risk | Low — при нормальном cron-потоке записи за сегодня появляются. |

### Low — Legacy wrapper не expose `--help`/`--version`

| | |
|---|---|
| Location | `scripts/usd_rub_rate.py` |
| Impact | Legacy wrapper просто передаёт аргументы. `--help` выведет help `currency_rate.py`. |
| Recommendation | Можно добавить собственный `--help` для обратной совместимости. |
| Risk | Info. |

---

## Coverage

| Spec item | Covered in code | Tests | Status |
|---|---|---|---|
| FR-01 USD/RUB + EUR/RUB | `CURRENCIES`, `fetch_all` | TC-01, TC-02, IT-03..05 | ✅ |
| FR-02 CBR XML parse | `parse_cbr` | TC-01, TC-02 | ✅ |
| FR-03 Fallback | `parse_fallback`, `fetch_currency` | TC-03, IT-11 | ✅ |
| FR-04 Cache | `load_cache`, `save_cache`, `atomic_write_json` | TC-12, TC-13, IT-01 | ✅ |
| FR-05 History 90d | `load_history`, `save_history`, `update_history` | TC-05, TC-06, IT-06, IT-18 | ✅ |
| FR-06 SMA30 | `compute_sma` | TC-04, IT-03..05 | ✅ |
| FR-07 Day-over-day change | `find_previous_day_change`, `format_digest_line` | TC-10, TC-11, TC-08, TC-09 | ✅ |
| FR-08 Silent update | `run_update` | IT-01, IT-02, IT-08 | ✅ |
| FR-09 Report formats | `run_report`, formatters | IT-03..05, IT-14 | ✅ |
| FR-10 History command | `run_history` | IT-06 | ✅ |
| FR-11 Legacy wrapper | `usd_rub_rate.py` | IT-07 | ✅ |
| FR-12 Digest integration | `daily_digest.py` calls `currency_rate.py` | IT-10 | ✅ |
| SR-07 Atomic write | `atomic_write_json` | TC-12, TC-13 | ✅ |

---

## Final Verdict

**APPROVE — CONDITIONAL**

Код готов к продакшену. Условия (atomic write permissions, relative path digest, edge-case test) не блокируют релиз и могут быть устранены в следующей итерации.
