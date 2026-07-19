# Quality Gate Review — MultiManager Documentation Package

**Review date:** 2026-07-19  
**Scope:** `source_ts.md` (SRS), `brd.md`, API docs (`API.md`, `API.en.md`, `API.zh.md`), DB docs (`DATABASE.md`, `DATABASE.en.md`, `DATABASE.zh.md`), `DEPLOY.md`, `MULTI-CONTROL.md`.  
**Reviewer:** Quality gate sub-agent  
**Verdict:** **NOT READY**  
**Score:** 62 / 100

---

## Executive Summary

The documentation package covers most high-level features of MultiManager v2.0.0 and is internally coherent within a single language. However, multiple cross-document contradictions, incomplete database schema coverage, inconsistent multi-language API docs, and missing deployment/environment details make the package unsafe as the single source of truth for implementation or QA. The package must be revised before it can be considered READY.

---

## Top 5 Findings

1. **Critical contradiction: API docs conflict with TS.md on Automation Matrix project source.**  
   `TS.md §3.3` and `§4.16` state that `/api/matrix` reads projects from the DB table `projects` (only `is_active = 1`). `API.md` and `API.en.md` for `GET /api/matrix` state the opposite: "projects are read directly from `stAuto0/config/projects.py` … synchronization is not required." These two statements are mutually exclusive.  
   **Impact:** Implementer cannot know whether matrix configuration is database-driven or file-driven.  
   **Recommendation:** Pick the canonical source (DB per TS.md), update all API docs, and remove the stale `allowed_profile_ids` language if it no longer applies.

2. **Database schema docs are incomplete vs. TS.md / BRD.**  
   `TS.md §3.3` and `BR-05` require tables `projects`, `project_profile_config`, `runs`, `run_tasks`. The DATABASE docs (`*.md`, `*.en.md`, `*.zh.md`) only describe `profiles`, `proxies`, `cookies`, `profile_logs`, `system_config`. They omit the four Automation Matrix tables, their columns, indexes, and foreign-key relationships. They also mention `tasks` and `task_executions` in the relationships diagram, which are neither defined nor referenced elsewhere.  
   **Impact:** DB schema docs do not match the implemented/required schema; risk of integration drift.  
   **Recommendation:** Add full sections for `projects`, `project_profile_config`, `runs`, `run_tasks`; remove or define `tasks` / `task_executions`.

3. **Multi-Control version drift and native-hook limitation is under-documented in API docs.**  
   `TS.md` labels Multi-Control "v0.13.0", while `MULTI-CONTROL.md` says "Current: v0.15.0". The API docs repeat "v0.13.0". More importantly, the Windows-only nature of `WH_KEYBOARD_LL` hooks is explained in `DEPLOY.md` but is not reflected in the API/Multi-Control sections of `API.md`, `API.en.md`, or `API.zh.md` beyond a generic note about OS-level hooks.  
   **Impact:** macOS/Linux consumers may assume full keyboard sync parity.  
   **Recommendation:** Add an explicit "Platform Limitations" block to every API doc Multi-Control section stating that native hooks are Windows-only and CDP-only fallback applies on macOS/Linux.

4. **Deployment doc omits required runtime prerequisites and environment variables.**  
   `DEPLOY.md` covers build dependencies well, but does not document: the `PORT` environment variable (the canonical way the GUI passes the Core port per `TS.md §3.4`), `--api-token` CLI semantics, required Node version constraints for Electron vs. Core, Python/venv setup for stAuto0 integration, or how `STAUTO0_PATH` / `PYTHON_PATH` map to settings.  
   **Impact:** Dev/ops cannot reproduce a working environment from docs alone.  
   **Recommendation:** Add a "Runtime Environment" section covering `PORT`, `--api-token`, Node/Electron ABI compatibility, stAuto0 paths, and master-password/recovery-key first-run flow.

5. **Translation docs diverge in completeness and contain stale content.**  
   - `API.zh.md` omits the `/api/projects` full CRUD responses and the `PUT /api/settings/automation` `syncResult` response; it also lacks the "Projects / Matrix / Runs" sections present in `API.md` and `API.en.md` (the Chinese doc stops at Settings, then jumps to Profile Statuses).  
   - `API.zh.md` and `API.en.md` keep the stale `allowed_profile_ids` / "read from config file" matrix wording.  
   - `API.en.md` is missing the entire Projects/Matrix/Runs/Internal-runs sections that exist in `API.md`.  
   **Impact:** Non-Russian consumers cannot rely on localized docs; BRD/TS.md intent is not propagated.  
   **Recommendation:** Re-sync `API.en.md` and `API.zh.md` against the canonical `API.md`, ensuring every endpoint, status, and error is translated and consistent.

---

## Detailed Findings

### 1. Consistency TS.md ↔ API / DATABASE / DEPLOY / MULTI-CONTROL

| Area | TS.md / BRD | Docs | Status |
|------|-------------|------|--------|
| Matrix projects source | DB `projects` table, `is_active=1` | API.md / API.en.md say direct file read; API.zh.md omits section | ❌ Contradiction |
| `/api/projects` CRUD | `GET/POST(sync)/:name GET/PUT/DELETE` | Present in API.md; missing from API.en.md / API.zh.md | ❌ Inconsistent |
| `/api/runs` endpoints | Full CRUD + start/cancel + callback | Present in API.md; missing from API.en.md / API.zh.md | ❌ Inconsistent |
| `task_executions` table | Relationship diagram references it | Not defined anywhere | ❌ Undefined artifact |
| Auth token passing | `--api-token` + env `PORT` | API docs only mention `--api-token`; DEPLOY.md omits `PORT` | ⚠️ Incomplete |
| Core port | Env `PORT` per `TS.md §3.4` | API docs say default 3000; DEPLOY.md says 3000–3100; none specify env | ⚠️ Incomplete |
| Multi-Control version | TS.md: v0.13.0; MULTI-CONTROL.md: v0.15.0 | API docs: v0.13.0 | ⚠️ Drift |

### 2. API Contract Completeness

- **Profiles:** `POST /api/profiles` claims required fields are only `name` and `platform`, but `TS.md §3.2` says `timezone` is mandatory at creation. The doc says "timezone is required" in prose but does not enforce it in the "Required Fields" list. Minor inconsistency.
- **Browser / clean:** Doc says "only for stopped profiles" and shows 409, but `TS.md §4.8` says mutex during starting/running also returns 409. Wording is close enough but should mention mutex.
- **Settings:** `/api/settings/automation` response includes `availableProjects`, but there is no explicit endpoint to list available projects independently.
- **Internal API:** `POST /api/internal/runs/:id/task-status` is only documented in `API.md`/`API.en.md`; missing from `API.zh.md`.
- **WebSocket:** Not documented in any API doc, despite being part of the architecture (`TS.md §1`, `§9.6`).
- **Missing documented 503:** `TS.md §2` says 503 if token not initialized; no API doc error-code table includes 503.
- **Missing endpoint:** `POST /api/browser/shutdown` (mass shutdown) in `TS.md §4.9` is not present in API docs.

### 3. Database Schema Completeness

- Missing tables: `projects`, `project_profile_config`, `runs`, `run_tasks`.
- Missing column-level detail for `projects.name` PK, `default_config` JSON semantics, `run_tasks.log_file_path`, `attempts`, etc.
- `tasks` / `task_executions` are shown in the relationships diagram but not defined; `task_executions` is not mentioned in TS.md either. This appears to be a stale or implicit artifact that should be defined or removed.
- No DDL for foreign keys / cascading rules for the new tables.
- All three language versions are equally incomplete.

### 4. Deployment / Environment Coverage

- Good build steps for Windows NSIS, macOS DMG, Linux AppImage.
- Missing: first-run configuration, how the GUI forks Core, env `PORT`, `--api-token` regeneration, master-key setup, stAuto0 integration path, log directory layout, backup restore procedure.
- Native module ABI mismatch troubleshooting is present, but no guidance on pinning Electron Node ABI or using `electron-rebuild` in CI.

### 5. Multi-Control Cross-Platform Limitation

- `DEPLOY.md §6` and `§7` correctly note `hooks.node` is Windows-only and that macOS/Linux fall back to CDP-only.
- `MULTI-CONTROL.md` documents the native C++ addon and double-dispatch behavior in depth.
- `API.md`/`.en.md`/`.zh.md` Multi-Control sections do **not** contain a visible cross-platform limitation warning; a reader could assume native hooks work everywhere.

### 6. Gaps, Contradictions, Implicit Artifacts

- **BRD vs. TS.md on port passing:** `BRD §6` says GUI passes port through env `PORT`; this matches `TS.md §3.4`. However `BRD §6` also says "token passes through env PORT" which is a typo (token uses CLI `--api-token`).
- **Cookie drag-and-drop:** Marked "partial" in TS.md/BRD, not mentioned at all in API docs.
- **Window Arranger grouped endpoints:** Documented in API docs but marked not implemented in TS.md/BRD (cross-platform grouping). API docs present them without caveat.
- **`profiles.number` format:** `API Internal` `range=001-010` implies zero-padded 3-digit numbers, but schema says `INTEGER`; doc does not define the numbering rule.
- **`MULTI-CONTROL.md` file extraction artifact:** The cached result file is a JSON-escaped blob; the actual `MULTI-CONTROL.md` file content was not returned cleanly by `read_file`, suggesting the file may contain very long lines or encoding issues, but the content itself is usable and complete.

---

## Scoring Breakdown

| Criterion | Weight | Score | Notes |
|-----------|--------|-------|-------|
| Internal consistency (TS ↔ docs) | 25 % | 11 / 25 | Major contradictions on matrix source, version drift, missing shutdown endpoint. |
| API contract completeness | 20 % | 11 / 20 | Core endpoints present; missing WebSocket, 503, mass shutdown, internal callback in zh. |
| DB schema completeness | 20 % | 8 / 20 | Four tables missing; stale `tasks/task_executions` references. |
| Deployment / environment coverage | 15 % | 9 / 15 | Build covered; runtime env, token, port, stAuto0 setup missing. |
| Multi-language parity | 10 % | 4 / 10 | `en` and `zh` API docs are incomplete/stale vs. Russian canonical. |
| Multi-Control limitation clarity | 10 % | 6 / 10 | Clear in DEPLOY/MULTI-CONTROL; absent from API docs. |
| **Total** | **100 %** | **62 / 100** | |

---

## Required Actions Before Re-Review

1. Resolve and unify the Automation Matrix project source: update all API docs to match `TS.md` (DB-driven, `is_active=1`).
2. Add `projects`, `project_profile_config`, `runs`, `run_tasks` schema definitions to all DATABASE docs; remove or define `tasks` / `task_executions`.
3. Re-sync `API.en.md` and `API.zh.md` with `API.md` (Projects, Matrix, Runs, Internal callback, Settings syncResult).
4. Add a "Platform Limitations" callout to API Multi-Control sections (Windows-only native hooks).
5. Add a "Runtime Environment" section to `DEPLOY.md` covering `PORT`, `--api-token`, Node/Electron ABI, stAuto0 paths, backup restore.
6. Add missing endpoints/status codes: `POST /api/browser/shutdown`, 503, WebSocket event summary.
7. Fix `BRD §6` typo: token is passed via `--api-token`, port via env `PORT`.

---

## Verdict

**NOT READY** — The documentation package requires a revision pass focused on cross-document consistency, schema completeness, localized parity, and deployment/runtime clarity before it can support downstream system requirements or QA.
