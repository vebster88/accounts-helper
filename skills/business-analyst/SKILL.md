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
- User provides a URL to an existing ТЗ/SRS/specification and asks to "посмотри как бизнес-аналитик", "разбери ТЗ", "составь BRD из ТЗ".
- Called by `agent-orchestrator` as the first step of the development pipeline.

## Modes

### Mode 1: Greenfield BRD from a raw business request

Use the standard workflow below. Ask for context if needed, then create BRD from scratch.

### Mode 2: Reverse BA from an external specification

When user provides an existing specification (local file or URL, e.g. GitHub `TS.md`):

1. Download/read the source document.
2. Create a copy of the source in the project directory for traceability (`source_ts.md` or similar).
3. Extract the **business layer** only:
   - product goal and problem statement,
   - AS-IS state (what is already implemented ✅ / partial ⚠️ / not implemented ❌),
   - TO-BE desired state (roadmap, scope, frozen items),
   - business value / metrics,
   - scope in/out,
   - stakeholders,
   - glossary / domain terms,
   - core user stories (3–7),
   - business requirements (BR-NN), business rules (BRULE-NN), non-functional requirements (NFR-NN),
   - risks (R-NN).
4. Do NOT copy implementation details (code paths, endpoints, file names) into BR as requirements unless they are genuine business constraints.
5. Treat implementation-heavy sections as AS-IS context; convert them into business language where possible.
6. Flag unclear scope, contradictions, or missing business owner decisions as open questions.
7. Run DoR/DoD and stop after BA — do not proceed to Architect/Developer unless explicitly asked.
8. When the user later answers open questions, update the BRD to close them and adjust DoD accordingly.

## Input

- Jira key, Confluence link, GitHub URL, or raw text describing the business need / existing specification.
- Project workdir where the BRD will be saved.

## Lookup Order

1. **remindb** — `MemorySearch`, `MemoryFetch`, `MemoryRelated`
2. Local files in the project
3. User-provided documents / screenshots / URLs

Do NOT invent business rules. If context is missing, flag as Open Question.

## Workflow

### Step 0: Load input

- Ask the user if they did not provide enough context.
- If user provides a URL to an existing spec/TS/design doc, download it and treat it as source material (not as a final BRD). Extract business intent, current state, and gaps from it.
- Search remindb for existing related BRD/ТЗ: `MemorySearch(query="<domain> БФТ BRD требование")`.

### Step 0.5: Input Gate / Pre-DoR

Before creating the BRD skeleton, verify that the minimum input needed for analysis is available. If any mandatory criterion is missing, stop and ask the user for the missing information. Do NOT proceed to Step 1 until the input gate is satisfied.

| # | Criterion | Mandatory |
|---|---|---|
| I1 | Business request or source specification is provided | yes |
| I2 | Project workdir for saving artifacts is known | yes |
| I3 | Business customer or domain owner is identifiable | yes |
| I4 | Problem/goal is at least partially stated | yes |
| I5 | Access to source systems (Jira/Confluence/GitHub) is confirmed | if applicable |

Report:
```
Input Gate: X/Y mandatory criteria satisfied → PASS / BLOCKED
```

If **BLOCKED**, present only the missing mandatory items to the user and wait for answers. Do not start drafting the BRD.

### Step 0a: Analyze external specification (optional)

When the user asks to analyze an external ТЗ/SRS/specification (e.g., from a GitHub URL) and produce a BRD:

1. Download the source document.
2. Identify:
   - Product goal and problem statement
   - AS-IS architecture/implementation state
   - TO-BE desired state (if stated) or infer from roadmap/open items
   - Scope (implemented ✅, partial ⚠️, frozen ❌)
   - Stakeholders and business context
   - Glossary/domain terms
3. Do NOT accept the spec as a BRD directly — reframe it from a business-requirements perspective.
4. Flag implementation details that are not yet requirements as assumptions or open questions.
5. Create a fresh BRD based on the extracted business layer.

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

Check mandatory and if-applicable criteria. Criteria are split into 5 groups: completeness, artifacts, consistency, NFR/BR, and if-applicable. Each criterion is marked «обязательный» (mandatory — blocks work) or «при наличии» (if applicable — does not block, but records gaps).

#### Group A: Completeness (Полнота запроса)

| # | Criterion | Level |
|---|---|---|
| D1 | Business customer identified | mandatory |
| D2 | Problem stated (AS-IS + TO-BE) | mandatory |
| D3 | Goal stated | mandatory |
| D4 | User story with acceptance criteria | mandatory |
| D5 | CJM/BPMN present | mandatory |
| D6 | Stakeholders / departments listed | mandatory |
| D7 | Systems / services identified | mandatory |

#### Group B: Artifacts (Артефакты)

| # | Criterion | Level |
|---|---|---|
| D8 | Related Jira / tasks / blockers read | if applicable |
| D9 | Related Confluence / spec links checked | if applicable |
| D10 | Local / remindb context reused | mandatory |

#### Group C: Consistency (Непротиворечивость)

| # | Criterion | Level |
|---|---|---|
| D11 | No internal contradictions | mandatory |
| D12 | No contradictions with regulatory requirements | mandatory |

#### Group D: NFR and BR

| # | Criterion | Level |
|---|---|---|
| D13 | Consumption NFR stated | mandatory |
| D14 | Performance / load NFR stated | mandatory |
| D15 | At least one BR exists | mandatory |
| D16 | No blocking open questions without answers | mandatory |

#### Group E: If applicable (При наличии — does not block)

| # | Criterion | Level |
|---|---|---|
| D17 | PFC / Epic / Jira reference | if applicable |
| D18 | HLD / architectural context link | if applicable |

#### DoR verdict

| Verdict | Condition | Action |
|---|---|---|
| **ГОТОВ** | All mandatory PASS + all if-applicable PASS or N/A | → Step 5 (Fill requirements) |
| **УСЛОВНО ГОТОВ** | All mandatory PASS, any if-applicable FAIL | → Step 5 with Open Questions for failed if-applicable items |
| **НЕ ГОТОВ** | Any mandatory FAIL | → Elicitation / ask user |

**Report:**
```
DoR: X/Y обязательных пройдено, Z/W при наличии пройдено → ГОТОВ / УСЛОВНО ГОТОВ / НЕ ГОТОВ
```

If **НЕ ГОТОВ**, present only genuinely blocking questions to the user.

### Step 5: Fill Business Requirements + Rules + Regulations

Sections in Russian:
- `## Нормативные требования (REG-NN)`
- `## Бизнес-требования (BR-NN)` — description + acceptance criteria + priority
- `## Бизнес-правила (BRULE-NN)`
- `## Нефункциональные требования (NFR-NN)` — availability, security, reliability, performance

**Development and deployment context:** Explicitly capture in a dedicated section or within NFRs:
- Target Python version and whether a project-level `venv` is required.
- Whether the solution must be stdlib-only or may use dependencies (and how they will be managed via `requirements.txt` / `pyproject.toml`).
- Expected deployment environment (server, cron, systemd, container, etc.).
- Any OS/runtime constraints that affect portability.
If the user did not specify these, flag them as open questions or propose sensible defaults.
Requirement codes must match `^[A-Z]+-\d{2}$` (e.g. `BR-01`, `NFR-01`).

**Traceability preparation:** For every BR and BRULE, include a stable identifier and concise description so that the System Analyst can map them to FR/SR in the traceability matrix. Avoid vague or overlapping requirements.

### Step 6: Risks + prerequisites

- `## Риски (R-NN)` — include deployment/runtime risks (e.g., missing venv, Python version mismatch, dependency conflicts).
- `## Заинтересованные стороны и зависимости`
- `## Предпосылки для системных требований` — include: Python version, venv creation, dependency management, deployment target.
- `## Среда разработки и развёртывания` — capture: local dev setup, CI/CD, target host, scheduler, environment isolation.

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
DoD: X/9
```

### Step 8: Finalize

- Update `status: review` in frontmatter.
- Save file.
- Provide summary to orchestrator / user in Russian, including the list of BR/BRULE/NFR identifiers. These identifiers will be used by the System Analyst to build the traceability matrix.
- **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the BRD (250-500 tokens / ~600-1250 characters). Include file path, goal, user story, key BR/BRULE/NFR identifiers with priorities, and main risks. For detailed questions, read the BRD file directly rather than duplicating its full text. See `agent-orchestrator/references/remindb-artifact-search.md`.

## Anti-patterns

- Do NOT invent business rules.
- Do NOT skip DoR verification.
- Do NOT create BRD in English unless explicitly asked.
- Do NOT use verbal requirement codes like `BR-DEL` or `NFR-AVAIL`.
- Do NOT copy the BRD file into `~/.hermes/memories/` or create symlinks there for indexing. remindb's source root is restricted and symlinks are ignored. Use concise `MemoryWrite` summaries (250-500 tokens) and read the source file for details.

## Output

- Full BRD markdown file.
- Source specification copy (for reverse-BA mode).
- DoR/DoD reports.
- List of open questions with owners.

## Integration

- Load this skill automatically when `agent-orchestrator` delegates the analyst step.
- Persist final BRD content to remindb if needed: `MemoryWrite(payload="...")`.
