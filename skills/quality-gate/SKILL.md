---
name: quality-gate
version: 1.0.0
category: software-development
description: |
  Quality gate skill for Hermes Agent. Two modes:
  1) Pipeline mode: review BRD/HLD/Spec package before developer handoff.
  2) Standalone mode: review any existing specification, ТЗ, design doc, or code change on user request.
  Produces a structured review with verdict (READY / CONDITIONALLY READY / NOT READY), findings by severity, and remediation actions.
---

# Quality Gate Skill

## Purpose

Find gaps in requirements and design documents before development starts. Review for completeness, consistency, traceability, security, deployment/environment, and readiness.

## When to Use

### Pipeline mode

- Called by `agent-orchestrator` as step 4 of the development pipeline.
- Input: BRD + HLD + Spec package.

### Standalone mode

- User says: "проверь ТЗ", "review spec", "оцени готовность документа", "quality gate для ...".
- Input: path to one or more markdown files (spec, design, BRD, code review).

## Input

### Pipeline mode

- BRD file path
- HLD file path
- Spec file path
- Project workdir

### Standalone mode

- One or more file paths to review
- Optional: what type of review (spec, code, design, all)

## Output

Always produce a markdown review file with:

1. Executive summary (verdict + score)
2. Findings table with severity (critical / warning / info)
3. Checklist results
4. Implicit artifacts / open questions
5. Remediation actions
6. Verdict

## Workflow

### Standalone review

When user asks to review an existing document:

1. Read all provided file paths.
2. Identify artifact type (BRD, HLD, spec, code review, or mixed package).
3. Run the relevant checklist sections from this skill.
4. Write `review.md` next to the reviewed files or in the project directory.
5. Return verdict and top findings.

### Pipeline review

Called by `agent-orchestrator` after System Analyst. See `agent-orchestrator` skill Step 4.

## Step-by-Step Checklist

### Step 1: Read artifacts

Use `read_file` to read all provided documents. Also read related scripts/code if referenced.

### Step 2: Cross-check consistency

Verify:
- BRD business requirements (BR-NN) ↔ HLD components ↔ Spec FR/SR
- BRD priorities ↔ Spec priorities
- HLD API contracts ↔ Spec API contracts
- HLD deployment strategy ↔ Spec deployment requirements
- Traceability matrix matches actual BRD/HLD sections

### Step 3: Run checklist

#### A. General / Document quality (always)

| # | Check | Criterion |
|---|-------|-----------|
| A1 | Goal stated | Clear goal of what the artifact achieves |
| A2 | Scope defined | In and out of scope explicitly listed |
| A3 | AS-IS / TO-BE described | For BRD/HLD: current and target states |
| A4 | Stakeholders identified | For BRD: customer, requestor, PM, reviewers |
| A5 | Glossary / terms | Domain terms defined |
| A6 | No ambiguity | Requirements are clear and unambiguous |
| A7 | No contradictions | Requirements do not contradict each other |
| A8 | Measurable / testable | Each requirement has acceptance criteria |
| A9 | Stable identifiers | BR-NN, FR-NN, SR-NN, AC-NN used consistently |
| A10 | Version / history | For updated docs: changelog present |

#### B. Requirements (always)

| # | Check | Criterion |
|---|-------|-----------|
| B1 | BRD business requirements | BR-NN cover user needs, priorities, acceptance criteria |
| B2 | Business rules | BRULE-NN cover decisions, constraints, defaults |
| B3 | NFRs | NFR-NN cover availability, reliability, performance, security, portability |
| B4 | Functional requirements | FR-NN map to BRs with priorities and AC |
| B5 | System requirements | SR-NN cover API, data, errors, performance, security, env/deployment |
| B6 | Acceptance criteria | AC-NN are verifiable |

#### C. Traceability (always)

| # | Check | Criterion |
|---|-------|-----------|
| C1 | Traceability matrix present | In Spec: maps BRD/HLD/NFR → FR/SR/AC |
| C2 | All BRs traced | Every BR has at least one FR |
| C3 | All FRs traced | Every FR has source BR and AC |
| C4 | HLD sections referenced | HLD sections used in matrix match actual headings |
| C5 | No orphan requirements | No FR/SR/AC without source or test case |

#### D. Design / HLD (if HLD provided)

| # | Check | Criterion |
|---|-------|-----------|
| D1 | Components defined | High-level components and responsibilities |
| D2 | Interfaces described | How components interact |
| D3 | Data model | Data structures, schemas, files |
| D4 | Integration points | External APIs, DBs, queues |
| D5 | Deployment / environment | venv, Python version, dependencies, prod target |
| D6 | Error handling strategy | How failures are handled across components |
| D7 | Security considerations | Token handling, input validation, secrets |

#### E. Implementation readiness

| # | Check | Criterion |
|---|-------|-----------|
| E1 | API contracts | Endpoint, method, request/response schema, examples |
| E2 | CLI / config | Arguments, env vars, defaults documented |
| E3 | Error matrix | Known errors with exit codes / behavior |
| E4 | Logging / observability | What and where to log |
| E5 | Cache / state | Caching rules, TTL, state files |
| E6 | Test strategy | Unit/integration/manual tests described |

#### F. Security (always)

| # | Check | Criterion |
|---|-------|-----------|
| F1 | Secrets | Tokens/passwords not hardcoded, sourced from env |
| F2 | Input validation | User input sanitized / validated |
| F3 | HTTPS only | External calls use HTTPS |
| F4 | No arbitrary execution | No eval/exec/shell from user input |

#### G. Deployment / environment (always for software projects)

| # | Check | Criterion |
|---|-------|-----------|
| G1 | Python version | Target version specified |
| G2 | venv / isolation | Project venv recommended |
| G3 | Dependencies | stdlib vs requirements.txt/pyproject.toml |
| G4 | Production target | cron / systemd / container / server |
| G5 | Rollback / dry-run | Deployment checklist includes safe rollback |
| G6 | Paths | Scripts accessible from target runtime |

### Step 4: Implicit artifacts and open questions

For every external system, module, file, config, or process mentioned but not documented, list:

| Object | Artifact Type | Commonly Understood? | What to request |
|--------|---------------|----------------------|----------------|

Record unresolved open questions that block development.

### Step 5: Score and verdict

```
Score = PASS / (PASS + FAIL) * 100%
```

| Verdict | Score | Meaning |
|---------|-------|---------|
| READY | 95–100% | No blocking gaps, ready for development |
| CONDITIONALLY READY | 75–94% | Minor gaps with clear remediation path |
| NOT READY | 0–74% | Critical gaps or contradictions, must rework |

A single critical finding can downgrade the verdict regardless of score.

### Step 6: Write review.md

Save to project directory:

```
<workdir>/projects/<project>/review.md   # pipeline mode
<path>.review.md                         # standalone mode, optional
```

Structure:

```markdown
# Quality Gate Review — <project>

**Date:** <YYYY-MM-DD>
**Scope:** <files reviewed>
**Verdict:** <READY / CONDITIONALLY READY / NOT READY>
**Score:** <X%>

## Executive Summary

## Critical Findings

## Checklist Results

## Implicit Artifacts / Open Questions

## Remediation Actions

## Next Steps
```

### Step 7: Pipeline handoff

If called from orchestrator:
- Return verdict and top findings.
- Orchestrator MUST present review and ask for explicit approval before Developer.
- If NOT READY or unresolved critical findings, stop pipeline.

If standalone:
- Present summary to user.
- Offer to fix findings or proceed.

## Rules

- Never skip consistency check between BRD/HLD/Spec.
- Never mark FAIL without specific finding and recommendation.
- Never mark N/A without justification.
- Treat every assertion with skepticism.
- Do not invent requirements or business rules not present in artifacts.
- Do not modify reviewed artifacts — only report findings.
- Russian language for findings; structural labels (BR-NN, FR-NN, etc.) in English.

## Tool Usage

- `read_file` — read artifacts.
- `search_files` — find referenced files or recent specs.
- `terminal` — check file existence, run lightweight validations (`py_compile`, `grep`).
- `MemoryWrite` — persist review summary if called from orchestrator or standalone long review.

## Anti-patterns

- Do not rubber-stamp a spec as READY without thorough analysis.
- Do not skip checklist sections because they seem obvious.
- Do not conflate missing with N/A.
- Do not suggest fixes that contradict existing requirements without flagging it.
