# Architect Collector Summary: usd-rub-rate

## Metadata

- Project path: `/home/hermes_ai/my_agent/AI-harness/projects/usd-rub-rate`
- Generated: 2026-07-20
- Collector: architect-collector
- Focus areas: currency rate script enhancement, EUR/RUB support, 90-day history, 30-day MA, cron integration, digest integration

## Executive Summary

The `usd-rub-rate` project is a stdlib-only Python utility that already evolved from a USD/RUB-only script (`usd_rub_rate.py`) into a multi-currency version (`currency_rate.py`) supporting USD/RUB and EUR/RUB with a 90-day history store and a 30-day moving average. The implementation is mostly complete and tested, but the BRD/HLD/spec documents still describe the **old** USD/RUB-only scope and do not cover the new features. The daily digest cron (`daily-telegram-digest`) already calls the new script. A separate silent daily update cron at 12:00 MSK is expected but not yet present in `hermes cron list`.

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Python 3.11+ | 3.11.15 confirmed |
| HTTP client | `urllib.request` | HTTPS-only, 10 s default timeout |
| XML parsing | `xml.etree.ElementTree` | CBR XML windows-1251 with utf-8 fallback |
| JSON parsing | `json` | Fallback API + history/cache storage |
| CLI | `argparse` + subcommands | `update`, `report`, `history` |
| Storage | JSON files in `~/.cache/currency-rate/` | `cache.json`, `history.json` |
| Scheduling | Hermes cron | `daily-telegram-digest` at 08:00 MSK |
| Versioning | git | `main` branch, remote `origin` on GitHub |

## Module Map

| Module | Purpose |
|--------|---------|
| `/home/hermes_ai/my_agent/AI-harness/scripts/currency_rate.py` | Main enhanced script: USD/RUB + EUR/RUB, history, SMA, update/report/history subcommands |
| `/home/hermes_ai/my_agent/AI-harness/scripts/usd_rub_rate.py` | Legacy v1.0.0 USD/RUB-only script (kept for backward compatibility) |
| `/home/hermes_ai/my_agent/AI-harness/scripts/daily_digest.py` | Telegram daily digest; calls `currency_rate.py report --format digest` |
| `~/.hermes/scripts/daily_digest_wrapper.sh` | Hermes cron wrapper that runs `daily_digest.py` |
| `tests/test_currency_rate.py` | pytest unit tests for the new script |

## Integration Points

| Type | Name | Notes |
|------|------|-------|
| External API (primary) | `https://www.cbr.ru/scripts/XML_daily.asp` | Official CBR XML, windows-1251; returns USD and EUR |
| External API (fallback) | `https://open.er-api.com/v6/latest/{USD\|EUR}` | JSON fallback for USD and EUR |
| Caller | `daily_digest.py` | Invokes `[python, currency_rate.py, "--timeout", "15", "report", "--format", "digest"]` |
| Cron | `daily-telegram-digest` | 08:00 MSK, calls `daily_digest_wrapper.sh` |

## Current Cron State

```
Name:      daily-telegram-digest
Schedule:  0 8 * * *
Script:    daily_digest_wrapper.sh
Next run:  2026-07-21T08:00:00+03:00
Last run:  2026-07-20T08:00:24.926284+03:00  ok
```

No silent `currency-rate update` cron at 12:00 MSK was found in `hermes cron list`.

## Doc/Code Drift

| # | Issue | Severity | Notes |
|---|------|----------|-------|
| 1 | Updated docs missing | High | `brd_updated.md`, `hld_updated.md`, `spec_updated.md` are identical to the original USD/RUB-only versions and do not describe EUR/RUB, history, or SMA |
| 2 | `daily_digest.py` references `RATE_SCRIPT = Path("/home/hermes_ai/my_agent/AI-harness/scripts/currency_rate.py")` | Medium | Correct in code, but docs still say USD/RUB only |
| 3 | `currency_rate.py` already has `__version__ = "2.0.0"` | Low | Version bump not reflected in docs |

## Constraints and Risks

| # | Risk | Severity | Notes |
|---|------|----------|-------|
| 1 | CBR XML date-only accuracy; time-of-day not available | Medium | HLD/spec already note this for USD; still true for EUR |
| 2 | EUR fallback endpoint not explicitly tested | Medium | `parse_fallback` uses `base=EUR` but unit tests only exercise USD fallback |
| 3 | No dedicated 12:00 MSK silent-update cron | Medium | Required by task; needs `hermes cron add` |
| 4 | History storage is local JSON, no backup/atomic write | Low | Risk of partial corruption on crash |
| 5 | `format_rate_line` timestamp always printed as date, losing fallback time detail | Low | Existing design choice; digest format is more compact |

## Memory Findings

- No prior remindb/session memory found for the EUR/RUB enhancement or the 12:00 cron.

## Open Questions

| # | Question | Owner | Impact |
|---|----------|-------|--------|
| 1 | Should the legacy `usd_rub_rate.py` be deprecated or kept as a thin wrapper to `currency_rate.py`? | Architect/BA | Affects maintenance surface |
| 2 | Should the 12:00 silent update cron also fetch EUR or only USD? | BA | Affects scope of new cron |
| 3 | Should `brd_updated.md`/`hld_updated.md`/`spec_updated.md` be rewritten to cover the new features, or are new docs expected? | Architect | Affects next design phase |

## Raw Findings (for architect)

- Implementation file: `currency_rate.py` already contains:
  - `CURRENCIES = {"usd", "eur"}`
  - `DEFAULT_HISTORY_DAYS = 90`
  - `DEFAULT_MA_DAYS = 30`
  - Subcommands: `update`, `report`, `history`
  - `--format digest` used by `daily_digest.py`
- `daily_digest.py` already calls `currency_rate.py` (not the legacy `usd_rub_rate.py`).
- Existing cron `daily-telegram-digest` runs at 08:00 MSK as required.
- Missing: a silent `currency_rate.py update` cron at 12:00 MSK.
- Docs need to be updated/created to reflect the actual v2.0.0 feature set.
