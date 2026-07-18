---
name: business-analyst
description: "Structures business requests into a Business Requirements Document (БФТ/BRD) with DoR/DoD verification. Russian output. Adapted for Hermes Agent from OpenCode harness."
version: 1.0.0
category: software-development
---

# Business Analyst Skill (Hermes)

## Purpose

Transform a raw business request into a structured BRD (БФТ). Verify readiness (DoR) and completion (DoD).

## When to Use

- User asks for "бизнес-анализ", "BRD", "БФТ", "собери требования".
- Called by `agent-orchestrator` as the first step of the development pipeline.

## Input

- Jira key, Confluence link, or raw text describing the business need.
- Project workdir where the BRD will be saved.

## Lookup Order

1. **remindb** — `MemorySearch`, `MemoryFetch`, `MemoryRelated`
2. Local files in the project
3. User-provided documents / screenshots

Do NOT invent business rules. If context is missing, flag as Open Question.

## Workflow

### Step 0: Load input

- Ask the user if they did not provide enough context.
- Search remindb for existing related BRD/ТЗ: `MemorySearch(query="<domain> БФТ BRD требование")`.

### Step 1: Create BRD file

Create a markdown file in the project directory, e.g.:
```
<workdir>/docs/brd/PFC-<NNN>.md
```

If no PFC key, use a generated filename based on topic.

### Step 2: Fill Problem Statement

Sections in Russian:
- `## Цель доработки`
- `## Текущая ситуация AS-IS`
- `## Желаемое состояние TO-BE`
- `## Бизнес-ценность`
- `## Границы`
- `## Допущения и ограничения`
- `## Глоссарий`
- `## User story` — "Я, как <роль>, хочу <потребность>, чтобы <цель>" with acceptance criteria

### Step 3: Generate CJM

Create a Mermaid BPMN-style diagram inside the BRD:
```
## Клиентский путь (CJM)
```mermaid
flowchart TD
    ...
```
```

### Step 4: DoR verification

Check mandatory criteria:

| # | Criterion | Level |
|---|---|---|
| D1 | Business customer identified | mandatory |
| D2 | Problem stated (AS-IS + TO-BE) | mandatory |
| D3 | Goal stated | mandatory |
| D4 | User story with acceptance criteria | mandatory |
| D5 | CJM/BPMN present | mandatory |
| D6 | Stakeholders / departments listed | mandatory |
| D7 | Systems / services identified | mandatory |
| D12 | Consumption NFR stated | mandatory |
| D13 | Performance / load NFR stated | mandatory |
| D14 | At least one BR exists | mandatory |

Report:
```
DoR: X/Y обязательных пройдено → ГОТОВ / УСЛОВНО ГОТОВ / НЕ ГОТОВ
```

If **НЕ ГОТОВ**, present only genuinely blocking questions to the user.

### Step 5: Fill requirements

Sections in Russian:
- `## Нормативные требования (REG-NN)`
- `## Бизнес-требования (BR-NN)` — description + acceptance criteria + priority
- `## Бизнес-правила (BRULE-NN)`
- `## Нефункциональные требования (NFR-NN)` — availability, security, reliability, performance

Requirement codes must match `^[A-Z]+-\d{2}$` (e.g. `BR-01`, `NFR-01`).

**Traceability preparation:** For every BR and BRULE, include a stable identifier and concise description so that the System Analyst can map them to FR/SR in the traceability matrix. Avoid vague or overlapping requirements.

### Step 6: Risks + prerequisites

- `## Риски (R-NN)`
- `## Заинтересованные стороны и зависимости`
- `## Предпосылки для системных требований`

### Step 7: DoD verification

| # | Criterion |
|---|---|
| DD1 | All BRD sections filled |
| DD2 | Every BR has acceptance criteria |
| DD3 | Every business rule has a source |
| DD4 | Every REG has a regulatory source |
| DD5 | No blocking open questions |
| DD6 | Stakeholders filled |
| DD7 | SR prerequisites filled |
| DD8 | **HUMAN GATE** — ask user for business-customer review |
| DD9 | MD file saved in project |

Report:
```
DoD: X/10
```

### Step 8: Finalize

- Update `status: review` in frontmatter.
- Save file.
- Provide summary to orchestrator / user in Russian, including the list of BR/BRULE/NFR identifiers. These identifiers will be used by the System Analyst to build the traceability matrix.
- **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the BRD (250-500 tokens). Include file path, goal, user story, key BR/BRULE/NFR identifiers with priorities, and main risks. For detailed questions, read the BRD file directly rather than duplicating its full text.

## Anti-patterns

- Do NOT invent business rules.
- Do NOT skip DoR verification.
- Do NOT create BRD in English unless explicitly asked.
- Do NOT use verbal requirement codes like `BR-DEL` or `NFR-AVAIL`.
- Do NOT copy the BRD file into `~/.hermes/memories/` or create symlinks there for indexing. remindb's source root is restricted and symlinks are ignored. Use `MemoryWrite` summaries instead.

## Output

- Full BRD markdown file.
- DoR/DoD reports.
- List of open questions with owners.

## Integration

- Load this skill automatically when `agent-orchestrator` delegates the analyst step.
- Persist final BRD content to remindb if needed: `MemoryWrite(payload="...")`.
