---
name: decompose
description: "Decompose a feature into isolated work units with verification levels (L1/L2/L3). Separates vibecode (boilerplate), controlled (business logic), and verified (integration/risky) units. Hermes adaptation: Python/Node/cron-first, no Maven/MAPIC."
version: 1.0.0
category: software-development
---

# Feature Decomposition (Hermes)

## Purpose

Split a feature into isolated, verifiable work units before implementation. Each unit gets a verification level and category, so boilerplate can be generated in batches while risky parts get human review.

## When to Use

- After `system-analyst` completes the spec and before `developer` starts coding.
- User says: "decompose", "разбей на задачи", "plan implementation", "составь план разработки".
- Called by `agent-orchestrator` between **System Analyst** and **Quality Gate** (or before Developer if Quality Gate is skipped).

## Input

1. Project workdir.
2. Specification (`spec.md`) or BRD/HLD package.
3. Optional: existing codebase path to inspect.

## Categories

| Category | What | Verification | Examples |
|----------|------|--------------|----------|
| **Vibecode** | Boilerplate, no business logic | **L1**: syntax / type check | Config files, DTOs/Pydantic models, empty module stubs, CLI argument parser, schema migrations, env templates |
| **Controlled** | Business logic with clear contract | **L2**: tests pass | Service functions, API endpoints, cron job body, parser, validator, state machine |
| **Verified** | Integration, cross-cutting, risky | **L3**: human review / test stand | External API integration, database migration in production, cron deployment, systemd unit, native addon call, secrets handling |

## Verification Levels

| Level | Command | Who |
|-------|---------|-----|
| L1 | `python -m py_compile`, `node --check`, `ruff check`, `mypy <file>` | Model / automated |
| L2 | `pytest`, `vitest run`, `npm test`, integration smoke test | Model + test runner |
| L3 | Human review, test on real stand, security review | Developer / user |

## Workflow

### Step 1: Read spec and inspect codebase

- `read_file(spec_path)`
- `search_files(target='files')` in project path to understand structure.
- `MemorySearch` for similar previous decompositions.

### Step 2: Placement Map

Define which module/directory owns each domain concept. Prevents files landing in wrong places.

| Domain Concept | Owner Directory | Justification |
|----------------|-----------------|---------------|
| API client | `src/api/` | Existing route structure |
| Cron script | `scripts/` + `~/.hermes/scripts/` wrapper | Deployment rule |
| Config / env | `config/` or `.env.example` | Shared settings |
| Tests | `tests/` mirroring `src/` | Existing test layout |

### Step 3: Decomposition table

For each work unit:

| # | Category | Work Unit | Files | Verification | Dependencies |
|---|----------|-----------|-------|--------------|--------------|
| 1 | Vibecode | Config dataclass | `src/config.py` | L1: `python -m py_compile` | — |
| 2 | Vibecode | Pydantic request/response models | `src/models.py` | L1: `mypy` | — |
| 3 | Controlled | Core service function | `src/service.py` | L2: `pytest` | #1, #2 |
| 4 | Controlled | REST endpoint | `src/api/router.py` | L2: `pytest` | #3 |
| 5 | Verified | External HTTP client + retries | `src/client/external.py` | L3: review + smoke | #1 |
| 6 | Verified | Cron deployment wrapper | `~/.hermes/scripts/<name>_wrapper.sh` | L3: review | #4 |

Rules:
- Vibecode units must not depend on Controlled or Verified units.
- Vibecode units are independent of each other — can be batched.
- Each work unit = one logical change.

### Step 4: Implementation order

Sort by dependencies:
1. All Vibecode units in one batch.
2. Controlled units one-by-one (or in dependency-safe batches).
3. Verified units one-by-one with human gate.

### Step 5: Create PROGRESS.md

Save to:
```
<project_path>/docs/PROGRESS.md
```

Format:

```markdown
# PROGRESS: <Feature Name>

| # | Status | Work Unit | Category | Verification |
|---|--------|-----------|----------|--------------|
| 1 | [x] | Config dataclass | Vibecode | L1 |
| 2 | [~] | Pydantic models | Vibecode | L1 |
| 3 | [ ] | Core service | Controlled | L2 |
| 4 | [ ] | REST endpoint | Controlled | L2 |
| 5 | [ ] | External client | Verified | L3 |
| 6 | [ ] | Cron wrapper | Verified | L3 |
```

Status: `[x]` done, `[~]` in progress, `[ ]` pending.

`PROGRESS.md` is the recovery map. After model failure — resume from last `[x]`.

### Step 6: Confirm with user

Present decomposition table and PROGRESS.md. Ask:

> План декомпозиции выше. Подтверждаешь? Если нужно — скорректирую категории или порядок.

After confirmation → proceed to implementation.

## Implementation Rules

### Vibecode batch

1. Generate **all** vibecode units in one pass.
2. Run L1 verification once at the end.
3. Fix compile/syntax errors within the same pass.
4. Update `PROGRESS.md` — mark all vibecode `[x]`.
5. Notify user: "Vibecode batch complete, L1 passed. Ready for next step."
6. Do NOT commit automatically.

### Controlled units

1. Implement one at a time.
2. Run L2 verification after each.
3. Update `PROGRESS.md` after each unit.

### Verified units

1. Implement one at a time.
2. User reviews before proceeding.
3. Run L3 verification: human review + real test.

## Recovery

If model fails or produces broken code:

1. Read `PROGRESS.md`.
2. Find last `[x]` unit.
3. Revert to that state if needed (`git checkout` or manual).
4. Continue from the green state.

Vibecode units are safe recovery points — they should always compile.

## Output

- `docs/PROGRESS.md` — decomposition + status.
- `docs/decomposition-plan.md` — detailed table with files, verification, dependencies.
- Memory summary in remindb.

## Language

- Output artifacts in Russian.
- Work unit names and file paths remain Latin.

## Anti-patterns

- Do NOT make everything Verified — creates human bottleneck.
- Do NOT skip the dependency column.
- Do NOT skip the Placement Map.
- Do NOT start implementation before user confirms.
- Do NOT auto-commit — user decides when to commit.
- Do NOT skip PROGRESS.md updates.
- Do NOT decompose units larger than "one logical change".

## Tool Usage

- `read_file` — spec.
- `search_files` — codebase structure.
- `write_file` — PROGRESS.md and decomposition-plan.md.
- `terminal` — L1/L2 verification commands.
- `MemoryWrite`, `MemorySearch` — persistence and recall.
- `clarify` — confirm plan with user.

## Example: New Cron Job

| # | Category | Work Unit | Files | Verification | Dependencies |
|---|----------|-----------|-------|--------------|--------------|
| 1 | Vibecode | `.env.example` entries | `.env.example` | L1: n/a | — |
| 2 | Vibecode | Config dataclass | `src/config.py` | L1: `python -m py_compile` | — |
| 3 | Vibecode | Module stub | `scripts/my_job.py` | L1: `python -m py_compile` | — |
| 4 | Controlled | Fetch + parse logic | `scripts/my_job.py` | L2: `pytest scripts/test_my_job.py` | #2 |
| 5 | Controlled | Telegram output formatting | `scripts/my_job.py` | L2: `pytest` | #4 |
| 6 | Verified | Hermes cron wrapper | `~/.hermes/scripts/my_job_wrapper.sh` | L3: review + schedule test | #5 |
| 7 | Verified | systemd path / env check | review deployment notes | L3: review | #6 |
