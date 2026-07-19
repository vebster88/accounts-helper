---
name: agent-orchestrator
description: "Orchestrates a sequential multi-agent software-development pipeline: chat -> analyst -> architect -> system analyst -> quality gate -> developer -> tester. Use when the user asks to run the harness, develop a feature through agents, or delegate a complex task to the agent team."
version: 1.0.0
category: software-development
---

# Agent Orchestrator Skill

## Purpose

Run a structured, sequential harness of sub-agents for software-development tasks. Each agent transforms the artifact produced by the previous agent.

## Supported Pipeline

```
chat / user request
    ↓
Orchestrator (this skill)
    ↓
0. Context gathering (optional)
   ├─ read-spec — if external spec given
   └─ architect-collector — if codebase given
    ↓
1. Analyst — BRD
    ↓
2. Architect — HLD
    ↓
3. System Analyst — specification
    ↓
4. Quality Gate — docs review
    ↓
5. Decompose — implementation plan
    ↓
6. Developer — code
    ↓
7. Tester — tests
    ↓
8. Quality Gate 2 — code review
```

### Quality Gate 2

After testing, run `quality-gate-2` to review the actual code diff:
- finds bugs, security issues, performance traps, error-handling gaps, test coverage problems
- produces `code-review-report.md`
- verdict: `APPROVE` / `CONDITIONALLY APPROVE` / `REQUEST CHANGES`

The pipeline of sub-agents is complete after Quality Gate 2. The orchestrator then delivers a final summary to the user.

## Adapting OpenCode Skills to Hermes

This skill is typically built by porting an existing OpenCode harness.

See `references/opencode-vs-hermes-skill-porting.md` for the practical mapping decisions made while porting the user's `Analyst` archive into Hermes skills, including dead-code finding pitfall, DoR placement, verdict vocabulary, and output path differences.

See `references/opencode-skills-inventory.md` for the full list of OpenCode skills available in the user's `Analyst.tar` archive, their port status, and recommended next ports.

See `references/quality-gate-vs-quality-gate-2.md` for the distinction between pre-development documentation review (`quality-gate`) and post-implementation code review (`quality-gate-2`), including pipeline placement and verdict vocabularies.

See `references/remindb-artifact-search.md` for the current preferred way to make pipeline artifacts searchable in remindb: use concise `MemoryWrite` summaries (250–500 tokens) and read the source artifact for details. Do not duplicate files into `~/.hermes/memories/`; remindb's source root is restricted and symlinks are not indexed.
See `references/hermes-cron-script-path-workaround.md` for the exact Hermes cron script-path limitation and the wrapper-file workaround used to deploy `daily_digest.py`.

See `references/quality-gate-hermes-cron-pitfalls.md` for the consolidated Hermes cron deployment checks a quality gate should apply to any spec/HLD that schedules scripts.

See `references/pipeline-example-daily-telegram-digest.md` for the concrete end-to-end
run that combined `weather_daily.py` and `usd_rub_rate.py` into a single cron job, including the Hermes cron path workaround and the plain-text Markdown stripping pitfall.

See `references/telegram-plain-text-markdown-stripping.md` for the safe character set when stripping Markdown formatting from child-script output that will be delivered as Telegram plain text.

See `references/opencode-to-hermes-adaptation.md` for the generic mapping of
OpenCode concepts (`agents/*.md`, `remindb_Memory*`, Windows paths,
MCP tools) to Hermes tools and skills.

See `references/opencode-mcp-replacement-guide.md` for concrete substitutions
when an OpenCode skill depends on Confluence, Jira, Swagger, Oracle, or GitLab
MCP tools that are not available in Hermes.

See `references/pipeline-example-weather-multi-city.md` for the concrete end-to-end
run that produced the multi-city `weather_daily.py` implementation.

See `references/pipeline-example-usd-rub-rate.md` for the concrete end-to-end
run that produced the `usd_rub_rate.py` implementation, including the remindb
memory-strategy correction and the human-gate fix after the BA stage.

See `references/pipeline-example-daily-telegram-digest.md` for the concrete end-to-end
run that combined `weather_daily.py` and `usd_rub_rate.py` into a single cron job,
including the Hermes cron path workaround and the plain-text Markdown stripping pitfall.

See `references/opencode-skills-inventory.md` for the full list of OpenCode skills
available in the user's `Analyst.tar` archive, their port status, and recommended
next ports (`architect` is the biggest remaining gap after `quality-gate`).

See `references/opencode-to-hermes-harness-port.md` for the concrete
end-to-end port of the `Analyst` harness, including the sequential-pipeline
correction.

See `references/github-sync-and-memory-workflow.md` for the concrete
GitHub sync, PAT authentication, skill copy-back rule, and remindb
artifact-persistence workflow used in production runs.

See `references/human-gate-checklist.md` and `references/human-gate-rules.md` for the human gate decision tree, the hard stop rules after every document stage, and the specific correction learned when the orchestrator once proceeded past a BA-stage DoD 9/10 instead of stopping for approval.

See `references/traceability-matrix-standard.md` for the required traceability matrix format and mapping rules (BRD → HLD → Spec → AC → Test Case).

See `references/pipeline-runbook.md` for real-world patterns, the
GitHub sync/remindb memory checklist, and traceability expectations.

## Constraints of Hermes delegate_task

- `max_spawn_depth = 1` — a sub-agent cannot spawn its own sub-agents. **This is a hard limit.** Do not instruct sub-agents to delegate further; they will fail.
- `max_concurrent_children = 3` — at most three sub-agents may run in parallel.

Because of `max_spawn_depth = 1`, the orchestrator itself must manage the **entire sequential chain**. Each step is a separate `delegate_task` call that returns its result to the orchestrator, which then feeds it to the next step.

### Pitfall: "each agent calls the next agent"

A natural but wrong design is: analyst → delegates to architect → delegates to system analyst → ... . In Hermes this fails at depth 2 because the analyst sub-agent cannot call `delegate_task`.

**Correct pattern:** the orchestrator holds the full pipeline state. After each `delegate_task` returns, the orchestrator reads the produced artifact and calls the next `delegate_task` with that artifact in the context. Sub-agents are leaf workers only.

### Deployment / cron pitfall: Hermes script path

When the final artifact is a script that must be scheduled with `hermes cron create --script`, the orchestrator must verify the script placement **before** telling the user deployment is complete. Hermes cron accepts only a bare filename of a real file located directly in `~/.hermes/scripts/`; symlinks resolving outside that directory and absolute paths are rejected. The correct pattern is:

1. Master copy in `AI-harness/scripts/<name>.py`.
2. Real (not symlinked) wrapper file in `~/.hermes/scripts/<name>_wrapper.sh` that `exec`s the master copy.
3. Cron command uses `--script "<name>_wrapper.sh"`.

See `references/hermes-cron-script-path-workaround.md`.

See `quality-gate/references/hermes-cron-pitfalls.md` for the consolidated Hermes cron deployment checks a quality gate should apply to any spec/HLD that schedules scripts.

### Plain-text Telegram pitfall: Markdown stripping

If the cron job delivers child-script output as plain text, strip only the Markdown formatting characters from that child output. Do not strip dots, dashes, spaces, braces, exclamation marks, or pipe — those are safe in plain text and removing them corrupts numbers, dates, city names, and readability. See `references/telegram-plain-text-markdown-stripping.md`.

## When to Use

- User says: "запусти harness", "разработай через агентов", "orchestrator", "пайплайн разработки".
- Complex task that benefits from decomposition into analysis → architecture → requirements → implementation → testing.
- Porting an existing OpenCode agent harness into Hermes.
- A wrapper script must be scheduled by `hermes cron`.

## Workflow

### Step 0: Capture the request

Record in this session:
- Original user request
- Target project / workdir
- Any existing context (links, files, remindb anchors)

### Step 1: Analyst

Run the `business-analyst` skill with the request.

```text
goal: "Act as a business analyst. Read the attached user request and produce a concise Business Requirements Document (БФТ) in Russian. Include: goal, AS-IS/TO-BE, user story, CJM (Mermaid), business requirements (BR-NN), business rules (BRULE-NN), non-functional requirements (NFR-NN), risks, DoR/DoD verdict."
context: "User request: <...>"
toolsets: ["file", "terminal", "code_exec"]
```

**Before the analyst step, if the user provided an external spec or codebase:**

1. If a spec URL/path is provided → run `read-spec` first. Save `source-spec.md` and `source-spec-analysis.md`.
2. If a codebase path is provided → run `architect-collector` first. Save `architect-collector-summary.md`.
3. Feed the collected context into the analyst as `context`.
4. Persist both collector summaries to remindb via `MemoryWrite`.

**After the analyst sub-agent returns:**
1. If it produced a new or updated artifact, copy it into `AI-harness/projects/<project-name>/` (creating the folder if needed).
2. Commit and push to GitHub with a descriptive message (e.g., `feat(brd): <project> business requirements`).
- **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the artifact (250-500 tokens / ~600-1250 characters) including the file path, stage, key decisions/requirements, identifiers, and any unresolved findings. For detailed questions, read the source artifact directly. Do NOT duplicate the artifact file into `~/.hermes/memories/`; remindb's source root is restricted and symlinks are not indexed. See `references/remindb-artifact-search.md`.
4. Optionally run `MemorySearch` with a representative query to verify the summary is retrievable.

**Human Gate after Analyst (hard stop):** If the BRD DoD is not 10/10 (i.e., DD8 human gate is pending) or there are blocking open questions, the orchestrator MUST stop and ask the user for approval before proceeding to the Architect. Do NOT proceed automatically.

### Step 2: Architect (only after BA human gate approval)

Run the `architect` skill with the BRD and the collector summaries (if any).

```text
goal: "Act as a software architect. Read the provided BRD and produce a high-level design: components, interfaces, data model, technology choices, integration points, deployment and environment strategy (venv, runtime, prod deployment)."
context: "BRD from previous step: <...>\nCollector summaries: <...>"
toolsets: ["file", "terminal", "code_exec"]
```

**After the architect sub-agent returns:**
1. Copy the produced HLD into `AI-harness/projects/<project-name>/`, commit and push with a message like `feat(hld): <project> high-level design`.
2. **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the HLD (250-500 tokens) including file path, architectural components, source selection, API contracts, cache strategy, CLI flags, deployment/environment notes, and any unresolved findings. For details, read the HLD file directly.

**Human Gate after Architect:** If the HLD contains unresolved critical findings, unresolved open questions inherited from the BRD, or the user has not yet approved the previous BRD human gate, the orchestrator MUST stop and ask the user before proceeding to the System Analyst.

### Step 3: System Analyst (only after architect approval)

Delegate to the `system-analyst` skill with BRD + HLD.

```text
goal: "Act as a system analyst. Read the BRD and HLD and produce a detailed specification: functional requirements (FR-NN), system requirements (SR-NN), API contracts, data-model details, deployment/environment requirements, acceptance criteria."
context: "BRD: <...>\nHLD: <...>"
toolsets: ["file", "terminal", "code_exec"]
```

**After the system analyst sub-agent returns:**
1. Copy the produced specification into `AI-harness/projects/<project-name>/`, commit and push with a message like `feat(spec): <project> specification`.
2. **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the specification (250-500 tokens) including file path, key FR/SR identifiers, CLI reference and conflicts, deployment/environment requirements, cache TTL rule, and traceability matrix summary. For details, read the spec file directly.

**Human Gate after System Analyst:** If the specification contains unresolved critical findings, unresolved open questions, or traceability gaps that block implementation, the orchestrator MUST stop and ask the user before proceeding to the Quality Gate.

### Step 4: Quality Gate (only after SA human gate approval)

Delegate to the `quality-gate` skill with the full package.

```text
goal: "Act as a quality gate. Review the BRD, HLD, and specification at paths <brd>, <hld>, <spec> for project <project>. Save review to <workdir>/projects/<project>/review.md. Report verdict (READY / CONDITIONALLY READY / NOT READY) and top findings."
context: "Full package: BRD=<...>, HLD=<...>, Spec=<...>, project=<...>, workdir=<...>"
toolsets: ["file", "terminal"]
```

**After the quality-gate sub-agent returns (even if the pipeline stops):**
1. Copy the review report into `AI-harness/projects/<project-name>/`, commit and push with a message like `feat(review): <project> quality gate review`.
2. **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the review (250-500 tokens) including file path, verdict, all findings with severity, recommendations, and any actions taken or still required. For details, read the review file directly.
3. **Human Gate rule (hard stop):** The orchestrator MUST present the BRD/HLD/spec and the quality-gate findings to the user and explicitly ask for approval before proceeding. If the user does **not** approve (or asks to stop/fix/rework), the pipeline ends here. Do NOT call the Developer or Tester sub-agents without confirmed human gate approval.
4. Human gate must also be checked if the quality-gate verdict is `FAIL` or if there are unresolved critical findings. In those cases, stop and ask the user whether to fix the artifacts first or proceed at their own risk.

### Step 5: Decompose (only after human gate approval of the spec)

Run the `decompose` skill with the approved specification.

```text
goal: "Decompose the approved specification into vibecode, controlled, and verified work units. Produce docs/decomposition-plan.md and docs/PROGRESS.md. Confirm the plan with the user before implementation."
context: "Specification: <...>, project path: <...>, existing codebase structure if known."
toolsets: ["file", "terminal"]
```

**After the decompose sub-agent returns:**
1. Copy `docs/decomposition-plan.md` and `docs/PROGRESS.md` into `AI-harness/projects/<project-name>/`, commit and push with a message like `feat(plan): <project> decomposition and progress`.
2. **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the decomposition (250-500 tokens) including file paths, work unit count by category, verification levels, and top dependencies.

**Human Gate after Decompose:** The orchestrator MUST present the decomposition plan and PROGRESS.md to the user and ask for approval before the Developer starts. If the user rejects or asks to change the plan, stop and rework.

### Step 6: Developer (only after decomposition approval)

Run the `developer` skill with the approved specification and decomposition plan.

**After the developer sub-agent returns:**
1. Copy any new or updated scripts into `AI-harness/scripts/` (or `AI-harness/projects/<project-name>/` if they are project-specific), commit and push with a message like `feat(dev): <project> implementation`.
2. **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the implementation (250-500 tokens) including changed files, key decisions, test results, exit codes, and any deviations from the specification. For details, read the source files directly.

### Step 7: Tester (only after human gate approval)

Run the `tester` skill with the implementation.

```text
goal: "Act as a tester. Verify the implementation against the specification, write/execute tests, report coverage and defects."
context: "Implementation: <...>\nSpecification: <...>"
toolsets: ["file", "terminal", "code_exec"]
```

**After the tester sub-agent returns:**
1. Copy the test report into `AI-harness/projects/<project-name>/`, commit and push with a message like `feat(test): <project> test report`.
2. **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the test report (250-500 tokens) including file path, verdict, executed test cases, coverage, top defects with severity, and recommendations. For details, read the test report directly.

### Step 8: Quality Gate 2 — Code Review (only after tester returns)

Run the `quality-gate-2` skill with the implementation diff and test report.

```text
goal: "Act as a code reviewer. Review the implementation diff for bugs, security, performance, error handling, and test coverage. Save code-review-report.md and report verdict."
context: "Project: <...>, workdir: <...>, test report: <...>, last commit / branch diff."
toolsets: ["file", "terminal"]
```

**After the quality-gate-2 sub-agent returns:**
1. Copy the code review report into `AI-harness/projects/<project-name>/`, commit and push with a message like `feat(code-review): <project> quality gate 2 report`.
2. **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the code review (250-500 tokens) including file path, verdict, critical/warning/info counts, top findings, and required fixes. For details, read the report directly.
3. **Human Gate rule (hard stop):** If the verdict is `REQUEST CHANGES` or there are critical findings, stop and ask the user whether to fix the code first or proceed. Do NOT consider the pipeline complete without user decision.

**If any skill was updated during the pipeline:** copy the updated skill from `~/.hermes/skills/` into `AI-harness/skills/`, commit and push with a message like `feat(skills): update <skill-name>`. Also persist a concise summary of the skill change to remindb.

## Final summary

- If the pipeline stopped at the human gate: report that subsequent steps were skipped pending user approval, and ask what the user wants to do next.
- If the pipeline ran through Developer, Tester, and Quality Gate 2: summarize to the user in Russian:
  - What was requested
  - Key decisions made by each agent
  - DoR/DoD/quality-gate results
  - What code/tests were produced
  - Quality Gate 2 verdict and any required fixes
  - Any remaining open questions or risks

## Memory and Context

- Before delegating or answering project questions, search remindb first: `MemorySearch` with keywords from the request. Only fall back to reading files or running terminal commands if memory is missing, unclear, or the user explicitly asks for a fresh/verified read. See `references/memory-first-lookup-rule.md`.
- After each sub-agent returns, persist a concise summary via `MemoryWrite` (see `references/remindb-artifact-search.md`). Read the source artifact directly when the user asks for details.

## Output Language

- Russian for user-facing artifacts.
- Requirement codes (BR-NN, FR-NN, SR-NN, NFR-NN) remain Latin.

## Safety Rules

- Never run `sudo`, `systemctl restart`, destructive commands, or network-wide changes without explicit user approval at the current step.
- The developer sub-agent must ask for approval before running tests that modify state or use external services.
- Each sub-agent must fit its output within the available context window; use summaries when artifacts are large.
- **GitHub sync rule:** project artifacts, skills, and agent definitions live in the user's GitHub repository (`AI-harness`). Push only `agents/`, `skills/`, `projects/`, `scripts/`, `docs/`; exclude archives, credentials, logs, caches, OS/IDE files. After editing skills in `~/.hermes/skills/`, copy changes back to the repo and commit/push. After pulling updates, copy `skills/` into `~/.hermes/skills/` to activate them.
