---
name: e2e-test
description: "End-to-end testing for local Python/Node/cron services: start service, run test scenarios, check responses/logs, stop service, report results. Hermes adaptation: no Java/PowerShell/Kafka, cross-platform Linux/macOS."
version: 1.0.0
category: software-development
---

# E2E Testing (Hermes)

## Purpose

Run end-to-end tests against a locally runnable service or script. Starts the service, sends requests or invokes CLI commands, checks outputs and logs, stops the service, and reports PASS/FAIL per scenario.

## When to Use

- User says: "e2e test", "run e2e", "прогнать e2e", "end-to-end test".
- After `developer` and `tester` steps in the pipeline.
- Before deployment to verify the whole chain works.

## Supported Targets

| Type | Example |
|------|---------|
| Python script | `python scripts/my_job.py --config config.yaml` |
| Python API | `uvicorn main:app --port 8000` |
| Node.js API | `npm start` or `node src/index.js` |
| Electron app | `npm run electron:start` |
| Cron job | `hermes cron run --id <job-id>` |

## Principles

1. **Ask, don't guess** — port, credentials, paths come from the user or README/env. Never hardcode defaults.
2. **Read README first** — `README.md` contains run instructions, required env vars, port.
3. **Only needed creds** — request only credentials the service actually uses.
4. **No .env creation** — user provides values verbally or via existing env; agent sets them in-process only.
5. **Cleanup in finally** — always stop the service/process after tests.
6. **Cross-platform** — use shell/python commands that work on Linux/macOS.

## Workflow

### Step 0: Gather service context

1. Read `README.md` to extract:
   - Run command
   - Required env vars
   - Default port
   - Dependencies
2. Inspect project files:
   - `package.json` for Node scripts
   - `pyproject.toml` / `requirements.txt` for Python
   - `docker-compose.yml` if present
   - `src/index.js`, `main.py`, etc.
3. Find existing tests in `tests/` or `e2e/`.
4. Ask user for:
   - Port (if not in README)
   - Required credentials
   - Test data or scenario to run

### Step 1: Verify prerequisites

1. Check runtime installed: `python3 --version`, `node --version`.
2. Check dependencies installed: `pip list`, `npm list`, or run install if needed.
3. Check port is free before starting.
4. Check required env vars are set.

### Step 2: Start target service

Start service as background process:

```bash
# Python API example
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 &
echo $! > /tmp/e2e_service.pid
```

```bash
# Node.js API example
npm start &
echo $! > /tmp/e2e_service.pid
```

```bash
# Python script example
python3 scripts/my_job.py --config config.yaml
# (no background, single-shot)
```

Wait for health/readiness:

```bash
curl -s http://127.0.0.1:8000/health
```

### Step 3: Run test scenarios

For each scenario:

1. Load test data template (JSON/YAML).
2. Replace placeholders: `__UUID__`, `__TIMESTAMP__`, `__TOKEN__`.
3. Send request or run CLI command.
4. Assert response status/body/output.
5. Check logs for expected patterns.
6. Record result.

Example scenario table:

| # | Name | Command / Request | Expected | Actual | Status |
|---|------|-------------------|----------|--------|--------|
| 1 | Health check | GET /health | 200 + ok | | |
| 2 | API data fetch | GET /api/data | 200 + JSON array | | |
| 3 | CLI script | python scripts/job.py | exit 0 | | |

### Step 4: Stop and report

1. Stop service:

```bash
kill $(cat /tmp/e2e_service.pid) 2>/dev/null
```

2. Print summary: passed/failed/skipped per scenario.
3. Save report to:

```
<project_path>/docs/e2e-report.md
```

## Output Document

```markdown
# E2E Test Report: <Project>

**Date:** YYYY-MM-DD
**Target:** <command/service>
**Duration:** N seconds

## Summary

| Total | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| 3 | 2 | 1 | 0 |

## Scenarios

| # | Name | Expected | Actual | Status |
|---|------|----------|--------|--------|
| 1 | Health check | 200 ok | 200 ok | PASS |
| 2 | API fetch | JSON array | timeout | FAIL |
| 3 | CLI script | exit 0 | exit 0 | PASS |

## Logs

...

## Notes

...
```

## Language

- Report in Russian.
- Technical identifiers, commands, paths remain as-is.

## Anti-patterns

- Do NOT hardcode ports/credentials.
- Do NOT create `.env` files with secrets.
- Do NOT leave services running after tests.
- Do NOT skip cleanup on failure.
- Do NOT run destructive tests without user approval.

## Tool Usage

- `read_file` — README, config, test data.
- `terminal` — start/stop service, run commands.
- `process` — background process management.
- `browser_navigate` — if testing web UI.
- `write_file` — save report.
- `MemoryWrite` — persist summary.
- `clarify` — ask user for missing parameters.

## Example: Python API E2E

User: "Прогоняй e2e для `usd_rub_rate.py`"

Steps:
1. Read `README.md` and `projects/usd-rub-rate/spec.md`.
2. Ask user for API token source.
3. Check `python3` and dependencies.
4. Start script / API.
5. Run scenarios:
   - health check
   - fetch rate
   - Telegram output format
6. Stop process.
7. Save `docs/e2e-report.md`.
