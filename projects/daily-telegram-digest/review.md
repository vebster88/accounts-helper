---
status: review
project: daily-telegram-digest
title: "Quality Gate Review: BRD / HLD / Spec — Round 2"
author: Quality Gate Sub-Agent
date: 2026-07-19
---

# Review Verdict

**Overall verdict: APPROVED**

The package of BRD / HLD / Spec is now sufficiently aligned, consistent, and implementable for the developer to start building `daily_digest.py` and the cron job. All nine must-fix findings from the previous round have been addressed in the updated artifacts. A handful of non-blocking notes remain and are listed below for awareness.

---

## Must-Fix Verification

| # | Original finding | Status | Evidence / resolution |
|---|------------------|--------|-----------------------|
| 1 | Markdown vs plain-text contradiction | ✅ Fixed | BRD §11.5 / BRULE-05 now says plain text with stripping of Markdown special chars. HLD §6.2 and §9.3 updated to “plain text by default / strip reserved chars”. Spec FR-11 and §11.1 implement `strip_markdown()` that removes `*_[]()~` `#+-=\|{}.!` from sub-process output. This matches the actual `weather_daily.py` output which uses `*Москва*` etc. |
| 2 | `weather_daily.py` return code 1 partial success not handled | ✅ Fixed | Spec §7 matrix now has explicit E-08: rc 1 → use stdout, log WARNING, exit 0. Spec §11.1 pseudocode implements this mapping: rc 2 → placeholder, rc 1 → use stdout, rc 0 → use stdout. |
| 3 | Naive message truncation | ✅ Fixed | Spec §11.1 `truncate_message()` now: drops footer first, then trims at blank-line/city boundaries, and finally performs UTF-8-safe codepoint trimming by stripping continuation bytes. Adds `…` and guarantees ≤ 4096 chars. |
| 4 | Cron `--script` absolute path | ✅ Fixed | HLD §7.3 and Spec §10.4 now use `--script "daily_digest.py"` (bare filename) together with a symlink `ln -s …/AI-harness/scripts/daily_digest.py ~/.hermes/scripts/daily_digest.py`. This matches how existing Hermes cron jobs reference scripts. |
| 5 | Old cron job id verification | ✅ Verified | `984d5d5e9628` is confirmed present and active in `~/.hermes/cron/jobs.json` as “Погода Москва — ежедневно”, schedule `0 8 * * *`. All three documents reference this id with disable/remove commands and a fallback “disable by name if id differs”. |
| 6 | BRD OQ-02 still open | ✅ Fixed | BRD §20 now shows OQ-02 as resolved: “Решено: 08:00 МСК (Human Gate)”. BRD §11.4 / HLD Human Gate also lock the default to 08:00 MSK. |
| 7 | Missing rollback / dry-run | ✅ Fixed | HLD §7.5 and Spec §10.5 add dry-run, acceptance sign-off, rollback commands (remove new job + enable `984d5d5e9628`), and `jobs.json` backup. |
| 8 | Pseudocode bugs | ✅ Fixed | Spec §11.1 pseudocode now configures `logging.basicConfig` at INFO to stderr, maps `weather_daily.py` rc 1/2 correctly, validates only CLI cities, strips Markdown, and implements proper UTF-8-safe truncation. |
| 9 | Security acceptance test for Markdown escaping | ✅ Fixed | Spec §10.6 post-deployment validation includes “сообщение доставлено как plain text, Markdown-спецсимволы удалены”; FR-11 and §11.1 define the strip function; §7 error matrix implies the behavior. A dedicated security acceptance note is added below. |

---

## New / Remaining Findings (non-blocking)

| # | Finding | Severity | Recommendation |
|---|---------|----------|----------------|
| N-01 | `daily_digest.py` source file not yet present | ℹ️ Info | The review covers only the specification package. The actual script will need a follow-up code review once implemented. |
| N-02 | Duplicate city-count validation | 🟡 Low | Spec FR-05 and §11.1 pre-validate CLI city count. This is acceptable because it fails fast and matches `weather_daily.py` behavior, but it duplicates logic already inside `weather_daily.py`. Consider noting that env/config limits are still left to `weather_daily.py`. |
| N-03 | `~/.hermes/scripts/daily_digest.py` symlink target | 🟡 Low | Spec §10.4 and HLD §7.2 symlink from `AI-harness/scripts/daily_digest.py`, while the project folder is `AI-harness/projects/daily-telegram-digest/`. Confirm during implementation where the master copy lives; the current docs are self-consistent if the master copy is placed under `AI-harness/scripts/`. |
| N-04 | Default Telegram parse mode not documented | 🟡 Low | The docs correctly assume Hermes cron `no-agent` delivers stdout as plain text. If Hermes ever switches default parse mode, the `strip_markdown()` function will already mitigate most issues, but an explicit test should verify delivery in production. |
| N-05 | No structured metrics/alerting | 🟡 Low | BRD NFR-01 target of ≥95% availability is stated but not measured. Add a note that Hermes cron logs / `hermes cron list` last-run status are the source of monitoring. |
| N-06 | BRD section numbering | 🟡 Low | BRD jumps from §11 to §13 (missing §12). Cosmetic only, no content loss. |

---

## Security Acceptance Checklist (to be executed during implementation / deployment)

1. `daily_digest.py` never reads `TELEGRAM_BOT_TOKEN` or `TELEGRAM_HOME_CHANNEL`.
2. No `eval`, `exec`, `os.system`, or shell interpolation of user-provided city strings.
3. `strip_markdown()` removes reserved Markdown characters from `weather_daily.py` and `usd_rub_rate.py` stdout before final assembly.
4. Manual dry-run shows the delivered message as plain text (no bold/italic rendering unless explicitly enabled).
5. `~/.hermes/.env` file permissions are `600` and owned by `hermes_ai`.
6. After deployment, exactly one active cron job named `daily-telegram-digest` exists and old job `984d5d5e9628` is disabled or removed.

---

## Traceability Summary

- BRD → HLD: Human Gate decisions are captured; BRULE-05 plain-text policy is now consistent.
- HLD → Spec: All architectural components have matching FR / SR / AC / error matrix entries.
- Spec → Implementation: Pseudocode in §11.1 is close to runnable and addresses all prior pseudocode defects.

---

## Final Verdict

**Status: APPROVED**

The BRD / HLD / Spec package is ready for implementation. The developer may proceed to write `daily_digest.py`, create the `~/.hermes/scripts/daily_digest.py` symlink, set up the new `daily-telegram-digest` cron job, and disable the old `984d5d5e9628` weather job after manual dry-run acceptance.
