# Review: usd-rub-rate BRD / HLD / Specification

**Review date:** 2026-07-19
**Artifacts reviewed:**
- `brd.md`
- `hld.md`
- `spec.md`

## Verdict

**APPROVED WITH COMMENTS (CONDITIONAL PASS)**

The updated package is coherent, complete, and correctly switches the primary data source to the official CBR XML API. BRD → HLD → Specification traceability is mostly intact, XML parsing requirements are accurate, and NFR/security coverage is adequate for a small stdlib-only script. The findings below are non-blocking but should be fixed before hand-off to development/testing.

---

## Top 3 Findings

### 1. Traceability matrix references incorrect HLD section numbers

The traceability matrix in `spec.md` uses HLD section numbers that do not match the actual structure of `hld.md`:

| Matrix reference | Actual HLD section |
|---|---|
| HLD 3.4 "Форматирование вывода" | **HLD 8** "Формат вывода" |
| HLD 5.1 "Таймауты и retry" | No such section (timeout is in **HLD 7** CLI + **HLD 4.3** order) |
| HLD 5.3 "Обработка ошибок" | **HLD 5** "Стратегия обработки ошибок" |

**Impact:** Cross-referencing during implementation or QA will be confusing and may slow down traceability audits.
**Recommendation:** Regenerate the matrix using the actual HLD section numbers.

### 2. BRULE-04 appears in the traceability matrix but is not defined in the BRD

`spec.md` traceability matrix contains a row for **BRULE-04 — Отключение fallback**, but `brd.md` only defines **BRULE-01..BRULE-03**.

**Impact:** A business rule referenced in the specification has no source in the business requirements, creating a traceability gap.
**Recommendation:** Either:
- add `BRULE-04` to `brd.md` with rationale (CLI argument `--no-fallback` lets the user disable fallback), or
- remove the `BRULE-04` row from the matrix and map fallback-disable behavior to `BR-04` / `FR-04` only.

### 3. BRD requires "дата/время актуальности", but CBR XML only provides a date

`brd.md` US-01 acceptance criterion #3 and `BRULE-03` ask to display a date/time of relevance. The official CBR XML endpoint (`XML_daily.asp`) only returns an operational **date** in `ValCurs/@Date` (`DD.MM.YYYY`), not a time-of-day. `hld.md` 8.1 and `spec.md` FR-03 correctly treat CBR output as an operational date and fallback output as UTC→MSK timestamp.

**Impact:** Ambiguity in acceptance criteria could lead to unnecessary implementation churn or test disputes.
**Recommendation:** Update `brd.md` US-01/#3 and `BRULE-03` to explicitly state that CBR shows the operational date and fallback shows the MSK date/time.

---

## Detailed Review

### Completeness
- **BRD:** all required sections present (AS-IS/TO-BE, business value, scope, user story, CJM, BR/NFR/risks, DoR/DoD).
- **HLD:** architecture, component breakdown, source selection, API contracts, error handling, caching strategy, CLI, output format, exit codes, and test suggestions are included.
- **Spec:** functional/system requirements, CLI arguments, cache schema, error matrix, acceptance criteria, and traceability matrix are included.
- No missing sections for the stated MVP scope.

### Consistency BRD → HLD → Spec
- Switch to the CBR XML API as the primary source is reflected consistently across all three documents.
- Stdlib-only requirement is aligned.
- Output format, default error message, and exit codes (`0` success, `1` data error, `2` argument error) are consistent.
- **Minor:** HLD 2.1 labels the Cache component as "Optional file cache", while `spec.md` FR-05 makes caching default-enabled with TTL=5 min. Wording should be aligned: the default cache is mandatory behavior, while stale-cache fallback is optional.

### Traceability
- The traceability matrix is a good addition but has the section-number and `BRULE-04` issues noted above.
- Once fixed, `BRULE-03` should map to HLD 8.1 / Spec FR-03 + SR-10.

### XML parsing correctness
- Correctly identifies the historical `windows-1251` encoding with `utf-8` fallback.
- Correctly identifies the path `ValCurs/Valute[CharCode='USD']/Value` and the comma-to-dot normalization.
- Correctly identifies `ValCurs/@Date` parsing as `DD.MM.YYYY`.
- No explicit XML security note. Python's `xml.etree.ElementTree` does not expand external entities by default in Python 3.11+, but adding a one-line security note would help future reviewers.

### NFR coverage
- **Performance:** 10-second timeout is specified in BRD, HLD, and Spec.
- **Reliability:** fallback logic, no-traceback default, and stale-cache option are covered.
- **Security:** no secrets/PII/API keys; only `https://` allowed.
- **Resources:** stdlib-only and < 50 KB file-size limit are covered.

### Security
- URLs are restricted to `https://` (Spec SR-05).
- No API keys, cookies, or personal data are transmitted.
- `User-Agent: usd-rub-rate/<version>` is benign and stable.
- `--timeout` and `--source` inputs are validated.
- Consider adding a short note that XML parsing uses safe stdlib `ElementTree` without external entity expansion.

---

## Recommendations Summary

1. Fix HLD section references in the traceability matrix.
2. Resolve the `BRULE-04` gap by adding it to `brd.md` or removing it from the matrix.
3. Clarify in `brd.md` that the CBR source provides an operational date, not a date/time.
4. Align HLD wording: default cache is required behavior, stale-cache is optional.
5. Add a one-line security note about safe XML parsing in `hld.md` / `spec.md`.

---

## Final Verdict

**APPROVED WITH COMMENTS** — the artifact package is ready for implementation once the top-3 findings are corrected.
