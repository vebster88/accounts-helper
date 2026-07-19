# Test Report: daily_digest.py

**Project:** daily-telegram-digest  
**Spec:** `/home/hermes_ai/my_agent/AI-harness/projects/daily-telegram-digest/spec.md`  
**Implementation:** `/home/hermes_ai/my_agent/AI-harness/scripts/daily_digest.py`  
**Symlink:** `~/.hermes/scripts/daily_digest.py`  
**Date:** 2026-07-19  
**Tester:** Hermes Tester Sub-Agent  

## Summary

| Metric | Value |
|---|---|
| Total test cases | 10 |
| Passed | 9 |
| Failed | 0 |
| Passed with findings | 1 |
| Verdict | **PASS WITH DEFECTS** |

The implementation meets the core functional requirements. The only finding is a minor deviation from FR-11 (plain text / no Markdown special characters): the footer uses the `|` (pipe) character, which is listed as a Markdown special character to be removed from the digest text. Because the spec's own example footer in FR-08 also contains `|`, this is treated as a documentation/spec inconsistency rather than a critical bug.

## Test Results

| ID | Case | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| TC-01 | Default run (Moscow) | `python3 daily_digest.py` | Exit 0; stdout contains header, Moscow weather, USD/RUB rate, footer; stderr has logs | Exit 0; message 499 chars; all four blocks present; stderr contains weather logs | PASS |
| TC-02 | Multiple cities | `python3 daily_digest.py Москва Санкт-Петербург Казань` | Exit 0; message contains all three cities | Exit 0; message 1290 chars; Москва, Санкт-Петербург, Казань all present | PASS |
| TC-03 | >10 cities | `python3 daily_digest.py 1 2 … 11` | Exit 2; error in stderr | Exit 2; `Максимальное количество городов — 10` printed to stderr | PASS |
| TC-04 | Empty CLI cities | `python3 daily_digest.py ""` | Falls back to weather_daily.py default (Moscow), exit 0 | Exit 0; output is the Moscow default digest | PASS |
| TC-05 | Partial failure simulation | Patched `RATE_SCRIPT` to a fake script that exits 1 | Placeholder `❌ Курс недоступен` appears in stdout, exit 0 | Placeholder present, exit 0; weather block intact | PASS |
| TC-06 | Message length ≤ 4096 | Patched `WEATHER_SCRIPT` to produce very long output | Final stdout length ≤ 4096 | Exit 0; output length 3985 chars; ends with `…` | PASS |
| TC-07 | Plain text — no Markdown special chars | Check stdout for `*_[]()~`>#+=\|{}!` | No Markdown special characters except safe punctuation | `|` found in footer line `🤖 Hermes daily digest  \|  📅 19.07.2026` | PASS WITH FINDING |
| TC-08 | stdout only message, stderr has logs | Run script and separate stdout/stderr | stdout contains only digest; stderr contains logs | stdout has 23 lines of digest; stderr has 2 INFO/WARNING lines; no digest text in stderr | PASS |
| TC-09 | Symlink works and script is executable | Execute via `~/.hermes/scripts/daily_digest.py` | Script runs from symlink, produces digest | Symlink resolves; executable bit set; exit 0; output 499 chars | PASS |
| TC-10 | Exit codes 0/1/2 | Run default, one city, >10 cities, and a crashing script | 0 for success, 2 for >10 cities, 1 for unhandled exception | default=0, one_city=0, gt10=2, crash=1 | PASS |

## Findings

### Minor — Footer uses Markdown `|` character
- **Location:** `assemble_message()` line `f"🤖 Hermes daily digest  |  📅 {today}"`
- **Spec reference:** FR-11 says Markdown special characters (`*`, `_`, `[`, `]`, `(`, `)`, `~`, `` ` ``, `>`, `#`, `+`, `=`, `|`, `{`, `}`, `!`) are removed from `weather_daily.py` / `usd_rub_rate.py` output. The footer is hard-coded in `daily_digest.py` and contains `|`.
- **Impact:** Low. Telegram plain-text mode renders `|` literally; it is only a Markdown special character in Markdown mode. The spec itself shows `|` in the FR-08 footer example, creating a contradiction.
- **Recommendation:** Either remove `|` from the footer or clarify in the spec that footer separators are exempt from the Markdown sanitization rule. Current implementation matches the FR-08 example exactly.

## Defects

No blocking defects identified.

## Coverage Notes

- FR-01 through FR-10, FR-16 exercised via the ten test cases.
- FR-11 partially exercised; minor footer separator inconsistency noted.
- FR-14 / FR-15 (cron setup and disabling old job) were not tested because the task explicitly excludes `sudo/systemctl` and cron management was considered deployment, not runtime script behavior. These are deployment steps documented in the spec and should be verified separately during deployment.
- SR-01 through SR-12 reviewed; the script uses only stdlib, has correct paths, writes logs to stderr, returns proper exit codes, and respects execution timeouts.

## Verdict

**PASS WITH DEFECTS**

`daily_digest.py` is functionally correct and ready for deployment. The only actionable item is the minor `|` character in the footer, which should be resolved by aligning the spec with the implementation or vice versa.
