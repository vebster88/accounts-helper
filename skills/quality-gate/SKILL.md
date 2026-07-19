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

- Called by `agent-orchestrator` as step 4 of the development pipeline (before Developer).
- Input: BRD + HLD + Spec package.
- A second, separate `quality-gate-2` skill is called by the orchestrator after Tester for post-implementation code review. Do not confuse the two gates.

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
2. If the package is an external / third-party documentation set (e.g., open-source TS.md + API.md + DATABASE.md + DEPLOY.md), see `references/external-doc-package-review.md` for additional cross-document consistency hotspots.
3. Identify artifact type (BRD, HLD, spec, code review, or mixed package).
4. Run the relevant checklist sections from this skill.
5. Write `review.md` next to the reviewed files or in the project directory.
6. Return verdict and top findings.

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

For every external system, module, file, config, process, or hidden assumption mentioned but not documented, list:

| Object / Assumption | Type | Commonly Understood? | Where to verify | Risk if missing |
|---|---|---|---|---|

Supported artifact types: `external API`, `internal service`, `database`, `queue/topic`, `file/config`, `secret/credential`, `environment/runtime`, `script/binary`, `process/procedure`, `assumption`.

For each row:
- **Commonly Understood?** = `yes` only if the object is standard and its contract is well-known to the team (e.g., `os.path.join`, `python3`). Otherwise `no`.
- **Where to verify** = BRD section, HLD section, Spec section, `remindb` node, external link, or `requires clarification`.
- **Risk if missing** = one-sentence description of what breaks if the object/assumption is not properly specified.

Also record unresolved open questions that block development.

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

## Implicit Artifacts / Assumptions / Open Questions

| Object / Assumption | Type | Commonly Understood? | Where to verify | Risk if missing |
|---|---|---|---|---|

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
- Match the output language to the artifacts: if the reviewed documents are in Russian, write the review in Russian by default; if in English, write in English. Use structural labels (BR-NN, FR-NN, etc.) in English regardless of output language.
- When the user explicitly requests the review in Russian, translate verdicts as `READY / ГОТОВ`, `CONDITIONALLY READY / УСЛОВНО ГОТОВ`, `NOT READY / НЕ ГОТОВ`. See `references/example-russian-review.md`.
- For third-party/open-source documentation packages (e.g. TS.md + API.md + DATABASE.md + DEPLOY.md + MULTI-CONTROL.md), also check: (a) contradictions between TS and API docs, (b) missing DB tables vs claimed schema, (c) version drift across docs, (d) stale/incomplete translations, (e) missing runtime environment details, (f) platform limitations not propagated to API docs. See `references/external-doc-package-review.md` and `references/review-multimanager-example.md`.

## References

- `references/review-template.md` — standard review report format.
- `references/hermes-cron-pitfalls.md` — Hermes cron script-path, symlink, and lifecycle gotchas for deployment checks.
- `references/telegram-plain-text-markdown-stripping.md` — safe Markdown-stripping set when child-script output is delivered as Telegram plain text.
- `references/external-doc-package-review.md` — how to review a third-party / open-source documentation package against a BRD.
- `references/example-russian-review.md` — example Russian-language review of an external doc package, including verdict labels and section layout.
- `references/code-review-vs-quality-gate.md` — distinction between pre-dev `quality-gate` (docs/design) and post-dev `quality-gate-2` (code review), with verdict mapping differences.

## Tool Usage

- `read_file` — read artifacts.
- `search_files` — find referenced files or recent specs.
- `terminal` — check file existence, run lightweight validations (`py_compile`, `grep`), verify cron setup.
- `MemoryWrite` — persist review summary if called from orchestrator or standalone long review.

## Anti-patterns

- Do not rubber-stamp a spec as READY without thorough analysis.
- Do not skip checklist sections because they seem obvious.
- Do not conflate missing with N/A.
- Do not suggest fixes that contradict existing requirements without flagging it.
- Do not approve a deployment section that relies on absolute paths for `hermes cron --script` or uses symlinks that the cron runner rejects.
