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
1. Analyst — structures the request into a Business Requirements Document (БФТ/BRD)
    ↓
2. Architect — designs the technical solution
    ↓
3. System Analyst — derives system requirements and specification
    ↓
4. Quality Gate — reviews the specification for completeness and risks
    ↓
5. Developer — implements the solution
    ↓
6. Tester — verifies and writes tests
```

## Adapting OpenCode Skills to Hermes

This skill is typically built by porting an existing OpenCode harness. See
See `references/opencode-to-hermes-adaptation.md` for the generic mapping of
OpenCode concepts (`agents/*.md`, `remindb_Memory*`, Windows paths,
permission blocks) to Hermes equivalents (`delegate_task`, `Memory*`,
Linux paths, toolsets).

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

## When to Use

- User says: "запусти harness", "разработай через агентов", "orchestrator", "пайплайн разработки".
- Complex task that benefits from decomposition into analysis → architecture → requirements → implementation → testing.
- Porting an existing OpenCode agent harness into Hermes.

## Workflow

### Step 0: Capture the request

Record in this session:
- Original user request
- Target project / workdir
- Any existing context (links, files, remindb anchors)

### Step 1: Analyst

Delegate to the `business-analyst` skill with the request.

```text
goal: "Act as a business analyst. Read the attached user request and produce a concise Business Requirements Document (БФТ) in Russian. Include: goal, AS-IS/TO-BE, user story, CJM (Mermaid), business requirements (BR-NN), business rules (BRULE-NN), non-functional requirements (NFR-NN), risks, DoR/DoD verdict."
context: "User request: <...>"
toolsets: ["file", "terminal", "code_exec"]
```

**After each sub-agent returns:**
1. If it produced a new or updated artifact, copy it into `AI-harness/projects/<project-name>/` (creating the folder if needed).
2. Commit and push to GitHub with a descriptive message (e.g., `feat(brd): <project> business requirements`).
3. Copy the same artifact(s) into `~/.hermes/memories/projects/<project-name>/` for semantic search indexing.
4. Run `remindb compile /home/hermes_ai/.hermes/memories --db /home/hermes_ai/.cache/remindb/hermes.db --message "Index <project> <stage>"`.
5. Persist the artifact metadata to remindb with `MemoryWrite`.

**Human Gate after Analyst (hard stop):** If the BRD DoD is not 10/10 (i.e., DD8 human gate is pending) or there are blocking open questions, the orchestrator MUST stop and ask the user for approval before proceeding to the Architect. Do NOT proceed automatically.

### Step 2: Architect (only after BA human gate approval)

Delegate to the `architect` skill with the BRD.

```text
goal: "Act as a software architect. Read the provided BRD and produce a high-level design: components, interfaces, data model, technology choices, integration points, risks."
context: "BRD from previous step: <...>"
toolsets: ["file", "terminal", "code_exec"]
```

**After the architect sub-agent returns:**
1. Copy the produced HLD into `AI-harness/projects/<project-name>/`, commit and push with a message like `feat(hld): <project> high-level design`.
2. Persist the artifact metadata to remindb with `MemoryWrite`. Payload example: "Created HLD for project <name> at AI-harness/projects/<project>/hld.md. Key decisions: <brief list>."

**Human Gate after Architect:** If the HLD contains unresolved critical findings, unresolved open questions inherited from the BRD, or the user has not yet approved the previous BRD human gate, the orchestrator MUST stop and ask the user before proceeding to the System Analyst.

### Step 3: System Analyst (only after architect approval)

Delegate to the `system-analyst` skill with BRD + HLD.

```text
goal: "Act as a system analyst. Read the BRD and HLD and produce a detailed specification: functional requirements (FR-NN), system requirements (SR-NN), API contracts, data-model details, acceptance criteria."
context: "BRD: <...>\nHLD: <...>"
toolsets: ["file", "terminal", "code_exec"]
```

**After the system analyst sub-agent returns:**
1. Copy the produced specification into `AI-harness/projects/<project-name>/`, commit and push with a message like `feat(spec): <project> specification`.
2. Persist the artifact metadata to remindb with `MemoryWrite`. Payload example: "Created specification for project <name> at AI-harness/projects/<project>/spec.md. FR count: N, SR count: M."

**Human Gate after System Analyst:** If the specification contains unresolved critical findings, unresolved open questions, or traceability gaps that block implementation, the orchestrator MUST stop and ask the user before proceeding to the Quality Gate.

### Step 4: Quality Gate (only after SA human gate approval)

Delegate to the `quality-gate` skill with the full specification.

```text
goal: "Act as a quality gate. Review the BRD, HLD, and specification against the checklist: completeness, consistency, traceability, NFR coverage, security, risks, human gate (DD8). Report a pass/fail verdict with findings."
context: "Full package: <...>"
toolsets: ["file", "terminal"]
```

**Human Gate rule (hard stop):** After the quality-gate sub-agent returns, the orchestrator MUST present the BRD/HLD/spec and the quality-gate findings to the user and explicitly ask for approval before proceeding. If the user does **not** approve (or asks to stop/fix/rework), the pipeline ends here. Do NOT call the Developer or Tester sub-agents without confirmed human gate approval.

**After the quality-gate sub-agent returns (even if the pipeline stops):**
1. Copy the review report into `AI-harness/projects/<project-name>/`, commit and push with a message like `feat(review): <project> quality gate review`.
2. Persist the review verdict and findings to remindb with `MemoryWrite`. Payload example: "Quality gate review for project <name>: PASS WITH FINDINGS. Top findings: ..."

Human gate must also be checked if the quality-gate verdict is `FAIL` or if there are unresolved critical findings. In those cases, stop and ask the user whether to fix the artifacts first or proceed at their own risk.

### Step 5: Developer (only after human gate approval)

Delegate to the `developer` skill with the approved specification.

```text
goal: "Act as a developer. Implement the solution described in the specification. Write code, tests, and update documentation. Prefer small, testable changes."
context: "Specification: <...>"
toolsets: ["file", "terminal", "code_exec"]
```

**After the developer sub-agent returns:**
1. Copy any new or updated scripts into `AI-harness/scripts/` (or `AI-harness/projects/<project-name>/` if they are project-specific), commit and push with a message like `feat(dev): <project> implementation`.
2. Persist the implementation metadata to remindb with `MemoryWrite`. Payload example: "Implemented project <name>. Changed files: <list>. Test results: <brief>."

### Step 6: Tester (only after human gate approval)

Delegate to the `tester` skill with the implementation.

```text
goal: "Act as a tester. Verify the implementation against the specification, write/execute tests, report coverage and defects."
context: "Implementation: <...>\nSpecification: <...>"
toolsets: ["file", "terminal", "code_exec"]
```

**After the tester sub-agent returns:**
1. Copy the test report into `AI-harness/projects/<project-name>/`, commit and push with a message like `feat(test): <project> test report`.
2. Persist the test verdict and top findings to remindb with `MemoryWrite`. Payload example: "Test report for project <name>: PASS WITH DEFECTS. Top findings: ..."

**If any skill was updated during the pipeline:** copy the updated skill from `~/.hermes/skills/` into `AI-harness/skills/`, commit and push with a message like `feat(skills): update <skill-name>`. Also persist the skill update to remindb.

### Step 7: Final summary

- If the pipeline stopped at the human gate: report that the implementation and testing steps were skipped pending user approval, and ask what the user wants to do next.
- If the pipeline ran through Developer and Tester: summarize to the user in Russian:
  - What was requested
  - Key decisions made by each agent
  - DoR/DoD/quality-gate result
  - What code/tests were produced
  - Any remaining open questions or risks

## Memory and Context

- Before delegating, search remindb for relevant context: `MemorySearch` with keywords from the request.
- After each delegation, consider persisting key artifacts with `MemoryWrite` if they are likely to be reused.

## Output Language

- Russian for user-facing artifacts.
- Requirement codes (BR-NN, FR-NN, SR-NN, NFR-NN) remain Latin.

## Safety Rules

- Never run `sudo`, `systemctl restart`, destructive commands, or network-wide changes without explicit user approval at the current step.
- The developer sub-agent must ask for approval before running tests that modify state or use external services.
- Each sub-agent must fit its output within the available context window; use summaries when artifacts are large.
- **GitHub sync rule:** project artifacts, skills, and agent definitions live in the user's GitHub repository (`AI-harness`). Push only `agents/`, `skills/`, `projects/`, `scripts/`, `docs/`; exclude archives, credentials, logs, caches, OS/IDE files. After editing skills in `~/.hermes/skills/`, copy changes back to the repo and commit/push. After pulling updates, copy `skills/` into `~/.hermes/skills/` to activate them.
