<!-- Source: /home/hermes_ai/my_agent/AI-harness/projects/multimanager-brd-review/source_ts.md | Snapshot: 2026-07-19 -->

# Requirements Summary: MultiManager TS.md

## Business Requirements

| ID | Description | Acceptance Criteria | Priority |
|----|-------------|---------------------|----------|
| BR-01 | Provide anti-detect browser core for Web3 automation | Local REST API + WebSocket, only 127.0.0.1 binding | Must |
| BR-02 | Support cross-platform desktop GUI for browser management | Electron + Vue 3 GUI on Windows/macOS/Linux | Must |
| BR-03 | Store browser profiles with fingerprint and credential isolation | profiles table with 30 columns, unique UUID per profile | Must |
| BR-04 | Manage proxies and validate connectivity | proxies table, proxy check/rotation endpoints | Must |
| BR-05 | Inject and export cookies per profile | cookies table, import/export netscape/json | Must |
| BR-06 | Load browser extensions for Web3 wallets | extensions directory with .enabled flag | Must |
| BR-07 | Orchestrate automation runs across profile×project matrix | projects, project_profile_config, runs, run_tasks tables | Must |
| BR-08 | Provide multi-control (master/slave keyboard/mouse sync) | MultiController + CDP tab mapping | Must |
| BR-09 | Capture OS keyboard events for synchronization | Native Windows hooks posting to /api/multi-control/os-keyboard | Must |
| BR-10 | Provide recovery and master password mode for encrypted secrets | AES-256-GCM with keytar/system_config fallback | Must |

## Business Rules

| ID | Description | Source |
|----|-------------|--------|
| BRULE-01 | Private wallet keys/seeds are NOT stored in DB; only temporary config/auto_sids.py | TS.md §3.3, security design |
| BRULE-02 | Automation Matrix reads active projects from DB, not filesystem directly | TS.md §3.3 / src/api/matrix.js |
| BRULE-03 | Core binds only to 127.0.0.1 | TS.md §2, src/index.js |
| BRULE-04 | Token passed via env PORT and --api-token from GUI to Core | TS.md §3.2, gui/src/main/core-manager.js |

## Functional Requirements

| ID | Description | Related SR | Acceptance Criteria |
|----|-------------|------------|---------------------|
| FR-01 | Start/stop/clean browser profile via REST API | SR-01, SR-02 | POST /api/browser/:id/start/stop/clean returns status and pid |
| FR-02 | Authenticate all HTTP requests with Bearer token | SR-03 | 401 on missing/invalid, 503 if token not initialized |
| FR-03 | CRUD profiles, proxies, cookies, extensions | SR-04 | Full CRUD endpoints under /api/profiles, /api/proxies, /api/cookies, /api/extensions |
| FR-04 | Sync projects from stAuto0 directory into DB | SR-05 | POST /api/projects/sync reads config/projects.py and *.py |
| FR-05 | Build and update project×profile matrix | SR-06 | GET /api/matrix returns active projects, profiles, enabled pairs |
| FR-06 | Create and execute automation runs | SR-07, SR-08 | POST /api/runs creates run, POST /api/runs/:id/start spawns Python per profile |
| FR-07 | Cancel running automation run | SR-09 | POST /api/runs/:id/cancel stops processes and marks tasks failed |
| FR-08 | Broadcast profile status and logs via WebSocket | SR-10 | /ws emits status/log/profiles_update messages |
| FR-09 | Multi-control: set master, add/remove slaves, sync mouse/keyboard/scroll/tab focus | SR-11 | /api/multi-control endpoints and CDP events |
| FR-10 | Window arrangement: grid/cascade/focus | SR-12 | /api/window-arranger endpoints |
| FR-11 | CDP-based actions: type text, Zerion auto-login | SR-13 | POST /api/browser/:id/type, /api/browser/:id/zerion-login |
| FR-12 | Fingerprint generation per profile seed | SR-14 | fingerprint module generates consistent fingerprint |
| FR-13 | Backup database | SR-15 | performBackup on startup |
| FR-14 | GUI: settings, profiles view, automation matrix/runs/history, window arranger | SR-16 | Vue views wired to backend endpoints |

## System Requirements

| ID | Description | Related FR |
|----|-------------|------------|
| SR-01 | Spawn CloakBrowser process with correct args and proxy | FR-01 |
| SR-02 | Graceful shutdown with SIGTERM fallback to SIGKILL | FR-01 |
| SR-03 | Express auth middleware using timingSafeEqual | FR-02 |
| SR-04 | SQLite schema with better-sqlite3, WAL, migration | FR-03 |
| SR-05 | Python project discovery and class import path resolution | FR-04 |
| SR-06 | Matrix query with active project filter and account ranges | FR-05 |
| SR-07 | RunExecutor groups tasks by profile, respects parallel_limit | FR-06 |
| SR-08 | Python child receives apiToken, mmPort, run-id, log path | FR-06 |
| SR-09 | Cancel kills child processes and updates DB | FR-07 |
| SR-10 | WebSocket server on /ws broadcasts JSON messages | FR-08 |
| SR-11 | CDP manager connects to browser DevTools ports and dispatches events | FR-09 |
| SR-12 | Native window position APIs per OS | FR-10 |
| SR-13 | CDP session creation and DOM evaluation helpers | FR-11 |
| SR-14 | Fingerprint seed → consistent UA, resolution, cores, memory | FR-12 |
| SR-15 | Hot backup of SQLite DB on startup | FR-13 |
| SR-16 | Electron main process forks Core, preload exposes safe APIs, renderer uses Pinia | FR-14 |

## Non-Functional Requirements

| ID | Category | Metric / Threshold |
|----|----------|---------------------|
| NFR-01 | Security | Core binds 127.0.0.1 only; auth token required |
| NFR-02 | Security | Secrets encrypted AES-256-GCM with keytar fallback |
| NFR-03 | Security | Recovery key available in Settings |
| NFR-04 | Performance | Proxy check timeout 10s default |
| NFR-05 | Reliability | WAL + ACID SQLite, hot backup on startup |
| NFR-06 | Portability | Cross-platform: Windows 11, macOS, Linux |
| NFR-07 | Testability | Vitest unit+integration, 654 tests |
| NFR-08 | Logging | pino JSON logs, profile-specific loggers |

## Glossary

| Term | Definition |
|------|------------|
| Core | Node.js backend process (Express + SQLite + WebSocket) |
| GUI | Electron + Vue 3 desktop application |
| Profile | Browser identity: fingerprint, proxy, cookies, credentials |
| CloakBrowser | Custom Chromium-based anti-detect browser |
| stAuto0 | Python automation framework integrated via Automation Matrix |
| CDP | Chrome DevTools Protocol for browser control |
| Multi-Control | Master/slave synchronization of keyboard/mouse/scroll/tabs |
| Automation Matrix | Profile × Project configuration grid |
| Run | Batch execution of selected matrix cells |
| MAPIC | Beeline internal API gateway (not used in this project) |

## Interfaces

| Type | Reference |
|------|-----------|
| REST API | /api/auth, /api/profiles, /api/proxies, /api/cookies, /api/extensions, /api/browser, /api/projects, /api/matrix, /api/runs, /api/settings, /api/internal, /api/multi-control, /api/window-arranger, /api/fingerprint, /api/logs |
| WebSocket | ws://127.0.0.1:port/ws |
| External binary | CloakBrowser Chromium (installed via cloakbrowser CLI) |
| External framework | stAuto0 Python scripts invoked per profile |

## Gap Analysis

| # | Type | Description | Severity |
|---|------|-------------|----------|
| 1 | Contradiction | TS.md says Multi-Control version 0.13.0, code shows 0.15.0 | Medium |
| 2 | Missing NFR | No explicit RTO / data-loss tolerance defined | Low |
| 3 | Incomplete glossary | "MAPIC" mentioned in skill context but not in project spec | Low |
| 4 | Empty section | Roadmap Ф1, Ф7 partially implemented; roadmap §11 not detailed in this snapshot | Medium |

## Next Steps

- Use this extracted summary for reverse-BA or quality-gate review.
- Cross-check with actual `src/` and `gui/src/` code for version drift and implementation gaps.
