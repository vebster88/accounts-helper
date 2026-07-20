# Code Review Report: usd-rub-rate v2.0

**Date:** 2026-07-20
**Scope:** `scripts/currency_rate.py`, `scripts/usd_rub_rate.py`, `scripts/daily_digest.py`, `projects/usd-rub-rate/tests/test_currency_rate.py`
**Spec:** `projects/usd-rub-rate/spec_v2.md`
**Previous test verdict:** PASS WITH FINDINGS (double comma fixed)
**Reviewer:** Orchestrator focused review

---

## Verdict

**APPROVE — CONDITIONAL**

Score: **88 / 100**

Код соответствует спецификации v2.0. Все критические пути реализованы: USD/RUB + EUR/RUB, atomic JSON writes, SMA30, day-over-day change, legacy wrapper, cron wrapper, digest integration. 15 unit-тестов проходят. Замечания ниже не блокируют релиз.

---

## Findings

### Medium — `currency_rate_update_wrapper.sh` использует system Python

| | |
|---|---|
| Location | `~/.hermes/scripts/currency_rate_update_wrapper.sh` |
| Code | `exec /home/hermes_ai/my_agent/AI-harness/scripts/currency_rate.py --timeout 15 "$@" update` |
| Impact | Cron может использовать системный `python3`, который может отличаться от venv. Хотя скрипт stdlib-only, версия/пути могут варьироваться. |
| Recommendation | Явно указать интерпретатор: `exec /home/hermes_ai/my_agent/AI-harness/.venv/bin/python /home/hermes_ai/.../currency_rate.py ...` или `python3` из `PATH` с shebang в `currency_rate.py`. |
| Risk if not fixed | Low — на текущем хосте работает. |

### Medium — `atomic_write_json` не сохраняет permissions исходного файла

| | |
|---|---|
| Location | `currency_rate.py:228-241` |
| Impact | `os.replace` копирует данные, но если исходный файл имел специальные права (например, `600`), они сбрасываются на umask. В текущем сценарии не критично. |
| Recommendation | Если в будущем потребуется конфиденциальность кэша — добавить `chmod` после `os.replace`. |
| Risk if not fixed | Low — файлы в `~/.cache` доступны только пользователю. |

### Low — `fetch_all` последовательный

| | |
|---|---|
| Location | `currency_rate.py:401-413` |
| Impact | USD и EUR запрашиваются последовательно. Время отклика удваивается при fallback для обеих пар. |
| Recommendation | Для v2.0 допустимо (NFR-01 ≤ 15 сек). В будущем можно распараллелить через `concurrent.futures`. |
| Risk if not fixed | None for current scope. |

### Low — `find_previous_day_change` требует наличия записи за сегодня

| | |
|---|---|
| Location | `currency_rate.py:444-460` |
| Impact | Если `history.json` не содержит записи за текущую дату, изменение не показывается даже если есть вчерашняя. Это соответствует spec, но при первом ручном запуске без `update` может выглядеть как баг. |
| Recommendation | Добавить unit-тест на этот edge case. |
| Risk if not fixed | Low — при нормальном cron-потоке записи за сегодня появляются. |

### Info — `usd_rub_rate.py` наследует формат `text`

| | |
|---|---|
| Location | `scripts/usd_rub_rate.py` |
| Impact | Legacy wrapper корректно делегирует. Вывод теперь без двойной запятой. |
| Status | ✅ Fixed in commit `838df01`. |

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

## Recommendations

1. Обновить wrapper на использование venv-интерпретатора для стабильности cron.
2. Добавить edge-case тест на `find_previous_day_change` без сегодняшней записи.
3. После накопления истории за 2+ дня вручную проверить `(+Y.YY)` в `digest`.

---

## Final Verdict

**APPROVE — CONDITIONAL**

Код готов к продакшену. Условия (wrapper interpreter + доп. edge-case тест) можно устранить в следующей итерации или отложить — они не блокируют функциональность.
