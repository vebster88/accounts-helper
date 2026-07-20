# Code Review Report: usd-rub-rate v2.0

**Date:** 2026-07-20
**Scope:** `scripts/currency_rate.py`, `scripts/usd_rub_rate.py`, `scripts/daily_digest.py`, `projects/usd-rub-rate/tests/test_currency_rate.py`
**Spec:** `projects/usd-rub-rate/spec_v2.md`
**Previous test verdict:** PASS WITH FINDINGS (double comma fixed)
**Reviewer:** Orchestrator + Quality Gate 2 sub-agent (delegation `deleg_bc7e76e0`)

---

## Verdict

**APPROVE — CONDITIONAL**

Score: **90 / 100**

Код соответствует спецификации v2.0. Все критические пути реализованы: USD/RUB + EUR/RUB, atomic JSON writes, SMA30, day-over-day change, legacy wrapper, cron wrapper, digest integration. 15 unit-тестов проходят, интеграционные сценарии проверены. Замечания ниже не блокируют релиз.

---

## Resolved in commit `7c77136`

| # | Finding | Fix |
|---|---|---|
| R-01 | Неиспользуемые импорты `socket`, `typing.Callable` | Удалены |
| R-02 | Неиспользуемый класс `RateError` | Удалён |
| R-03 | `sma30` в JSON содержит float-артефакты (`78.35730000000001`) | Округление до 2 знаков |

---

## Remaining Findings

### Medium — `currency_rate_update_wrapper.sh` использует system Python

| | |
|---|---|
| Location | `~/.hermes/scripts/currency_rate_update_wrapper.sh` |
| Code | `exec /home/hermes_ai/my_agent/AI-harness/scripts/currency_rate.py --timeout 15 "$@" update` |
| Impact | Cron может использовать системный `python3`. Скрипт stdlib-only, но версия/пути могут варьироваться. |
| Recommendation | Использовать venv-интерпретатор: `exec /home/hermes_ai/my_agent/AI-harness/.venv/bin/python /home/hermes_ai/.../currency_rate.py ...` |
| Risk | Low — на текущем хосте работает. |

### Medium — `atomic_write_json` не сохраняет permissions

| | |
|---|---|
| Location | `currency_rate.py:228-241` |
| Impact | `os.replace` сбрасывает права файла на umask. Для `~/.cache` не критично. |
| Recommendation | При необходимости добавить `chmod` после `os.replace`. |
| Risk | Low. |

### Low — `fetch_all` последовательный

| | |
|---|---|
| Location | `currency_rate.py:401-413` |
| Impact | USD и EUR запрашиваются последовательно. Время удваивается. |
| Recommendation | Для v2.0 допустимо. В будущем — `concurrent.futures`. |
| Risk | None for current scope. |

### Low — `find_previous_day_change` требует записи за сегодня

| | |
|---|---|
| Location | `currency_rate.py:444-460` |
| Impact | Без сегодняшней записи изменение не показывается. Соответствует spec, но edge-case. |
| Recommendation | Добавить unit-тест на этот сценарий. |
| Risk | Low — при нормальном cron-потоке записи за сегодня появляются. |

### Low — `daily_digest.py` использует absolute path

| | |
|---|---|
| Location | `scripts/daily_digest.py` |
| Impact | Было и раньше, не относится к v2.0. Но ограничивает переносимость. |
| Recommendation | В будущем сделать путь относительным или через env. |
| Risk | Low. |

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
| FR-05 History 90d | `load_history`, `save_history`, `update_history` | TC-05, TC-06, IT-06 | ✅ |
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

Код готов к продакшену. Условия (wrapper interpreter + edge-case тест + absolute path digest) не блокируют релиз и могут быть устранены в следующей итерации.
