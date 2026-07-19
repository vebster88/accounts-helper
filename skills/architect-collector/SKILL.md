---
name: architect-collector
description: "Gather architectural context for a project from local files, git history, remindb memory, and public web sources. Returns a structured Markdown or JSON summary for the architect-agent. Hermes adaptation: no Jira/Confluence/Oracle."
version: 1.0.0
category: software-development
---

# Architect Collector (Hermes)

## Purpose

Collect architectural context before the `architect` / `system-analyst` / `business-analyst` phase. Reads local project files, git history, long-term memory (remindb), and optionally public web sources, then returns a concise structured summary.

## When to Use

- Before starting HLD for a new or existing project.
- User says: "собери контекст для архитектора", "analyze project structure", "onboard this codebase".
- Called by `agent-orchestrator` before the Architect step.
- Called by `business-analyst` in Mode 2 (reverse-BA) to understand an existing codebase.

## Input

1. Project path — root directory of the codebase (local absolute path).
2. Optional: list of focus areas (e.g., API, database, security, deployment).
3. Optional: public URL to docs/repo.

## Not Supported

- Jira / Confluence / Oracle integration.
- Binary file parsing.
- Authenticated private web sources.

## Lookup Order

1. `MemorySearch` / `MemoryFetch` — existing project summaries and similar systems.
2. Local file scan via `search_files` and `read_file`.
3. Git history via `terminal`.
4. Public web sources via `browser_navigate` if URL provided.

## Workflow

### Step 1: Search memory

Query remindb for:
- Project name
- Similar projects
- Technology stack
- Known constraints
- Previous decisions

```
MemorySearch(query="<project_name> architecture stack constraints")
MemorySearch(query="<technology> deployment patterns")
```

### Step 2: Scan project structure

List key directories and files:

```bash
find <project_path> -maxdepth 3 -type f \( -name '*.js' -o -name '*.ts' -o -name '*.py' -o -name '*.json' -o -name '*.md' -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' \) | head -100
```

Identify:
- Language and framework
- Package manager and dependencies
- Config files
- Entry points
- Tests / CI
- Documentation

### Step 3: Read critical files

Always read if present:
- `README.md`
- `package.json` / `requirements.txt` / `Cargo.toml` / `pyproject.toml`
- `tsconfig.json` / `vite.config.*` / `webpack.config.*`
- `docker-compose.yml` / `Dockerfile`
- `.github/workflows/*`
- `.env.example`
- `src/index.*` or `main.*`
- Any `docs/*.md` files

### Step 4: Analyze technology stack

From package files and config, extract:

| Category | Examples |
|----------|----------|
| Runtime | Node.js ≥ 20, Python 3.11, etc. |
| Web framework | Express, FastAPI, Flask |
| Database | SQLite, PostgreSQL, better-sqlite3 |
| Frontend | Electron, Vue, React |
| Testing | Vitest, pytest, jest |
| Build | Vite, Webpack, esbuild |
| Deployment | Docker, systemd, cron |

### Step 5: Map modules and entry points

List key modules with one-line purpose:

| Module / File | Purpose |
|---------------|---------|
| `src/core/app.js` | Express app setup, middleware |
| `src/db/schema.js` | SQLite schema and migrations |
| `src/api/browser.js` | Browser lifecycle API |

### Step 6: Identify integration points

Find:
- External APIs called
- External binaries launched
- Databases / queues / caches
- Native modules / FFI
- Configuration sources

### Step 7: Detect constraints and risks

From code and docs, flag:
- Security concerns (plaintext secrets, no auth, exposed ports)
- Platform limitations (Windows-only native hooks)
- Hardcoded values (paths, IDs, URLs)
- Missing tests / CI
- Deprecated dependencies
- Version drift (doc vs code)

### Step 8: Git history (optional)

```bash
cd <project_path> && git log --oneline -20
cd <project_path> && git branch -a
cd <project_path> && git remote -v
```

### Step 9: Web source (optional)

If user provided public URL:
- `browser_navigate` to load docs or repo README.
- Extract architecture-relevant notes.

### Step 10: Assemble and save summary

Save to:
```
<project_path>/docs/architect-collector-summary.md
```

Structure:

```markdown
# Architect Collector Summary: <Project>

## Metadata

- Project path: ...
- Generated: YYYY-MM-DD
- Collector: architect-collector
- Focus areas: ...

## Executive Summary

2-3 sentences.

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|

## Module Map

| Module | Purpose |
|--------|---------|

## Integration Points

| Type | Name | Notes |
|------|------|-------|

## Constraints and Risks

| # | Risk | Severity | Notes |
|---|------|----------|-------|

## Memory Findings

Links to relevant remindb nodes.

## Git Snapshot

- Branch: ...
- Last commit: ...
- Remotes: ...

## Open Questions

| # | Question | Owner | Impact |
|---|----------|-------|--------|

## Raw Findings (for architect)

Concise JSON-like or bulleted dump of key facts.
```

### Step 11: Persist

Call `MemoryWrite` with concise Russian summary:
- Project name
- Tech stack
- Top 3 risks/constraints
- Key modules
- Open questions

## Output

- File: `docs/architect-collector-summary.md`
- Memory node in remindb

## Language

- Summary in Russian.
- Technical identifiers, file paths, package names remain as-is.

## Anti-patterns

- Do NOT read every file; sample and focus on architecture-relevant ones.
- Do NOT duplicate full file contents into memory; keep summaries under 500 tokens per file.
- Do NOT invent facts not supported by files/memory/git.
- Do NOT ignore security red flags.
- Do NOT skip remindb search.

## Tool Usage

- `MemorySearch`, `MemoryFetch` — memory.
- `search_files` — file discovery.
- `read_file` — key files.
- `terminal` — git, find, package managers.
- `browser_navigate`, `browser_snapshot` — optional web source.
- `write_file` — save summary.
- `MemoryWrite` — persist concise summary.
