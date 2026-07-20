# MemoryWrite summary: currency-rate v2.0 HLD

## Project
- currency-rate enhancement
- Path: /home/hermes_ai/my_agent/AI-harness/projects/currency-rate

## What was done
- Read approved BRD v2.0 (`brd_v2.md`) and collector summary (`docs/architect-collector-summary.md`).
- Inspected existing scripts:
  - `currency_rate.py` v2.0.0 (USD/RUB + EUR/RUB, history, SMA30, update/report/history, digest format)
  - `usd_rub_rate.py` v1.0.0 (legacy USD/RUB-only)
  - `daily_digest.py` (calls `currency_rate.py report --format digest`)
- Produced High-Level Design Document at `hld_v2.md` covering:
  - system context and scope
  - component diagram
  - module map
  - interfaces (CLI, digest, JSON, legacy wrapper, cron wrappers)
  - data flow diagrams
  - storage schema for `cache.json` and `history.json`
  - cron integration (existing `daily-telegram-digest` 08:00 MSK + new `currency-rate-daily-update` 12:00 MSK)
  - deployment plan
  - architecture decisions (7 ADRs)
  - risks and mitigations
  - open questions
  - requirements traceability matrix

## Key design decisions
- Keep `currency_rate.py` as the single stdlib-only Python 3.11 script.
- Store history/cache locally in JSON under `~/.cache/currency-rate/`.
- Use CBR XML as primary source and open.er-api.com as fallback.
- Add a new Hermes cron `currency-rate-daily-update` at 12:00 MSK via wrapper script.
- Preserve `usd_rub_rate.py` as a thin backward-compatible wrapper.

## Open issues
- BR-10 (change-since-yesterday in digest) needs product confirmation; implementation is straightforward given existing history.
- Atomic write (`tmp + rename`) and backup for `history.json` should be decided before release.
- `spec_v2.md` is recommended as the next artifact.

## Files created/modified
- Created: /home/hermes_ai/my_agent/AI-harness/projects/currency-rate/hld_v2.md
- Created: /home/hermes_ai/my_agent/AI-harness/projects/currency-rate/docs/memorywrite-summary-hld.md (this file)

## Status
- HLD draft ready for review.
