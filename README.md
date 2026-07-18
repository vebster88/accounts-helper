# AI-harness

Hermes Agent multi-agent software-development harness.

## Structure

- `agents/` — agent role definitions (orchestrator, analyst, architect, system analyst, quality gate, developer, tester).
- `skills/` — Hermes Agent skills for each role.
- `projects/` — per-project artifacts (BRD, HLD, spec, reviews, test reports).
- `scripts/` — reusable automation scripts.
- `docs/` — general documentation and skill reviews.

## Sync rule

Skills in `skills/` are the **source of truth**. When a skill is updated in `~/.hermes/skills/`,
copy the change back into this repository and commit it. The reverse is also true: after pulling
updates from GitHub, copy skills into `~/.hermes/skills/` to activate them.

## Push rule

Only the following categories are committed to this repository:
- Agent definitions (`agents/`)
- Hermes skills (`skills/`)
- Project artifacts (`projects/`)
- Reusable scripts (`scripts/`)
- General docs (`docs/`)

Excluded: archives, credentials, logs, caches, OS/IDE files, and anything marked private/temporary.
