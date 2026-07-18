---
name: developer-agent
description: "Developer sub-agent for the sequential software-development pipeline. Implements the solution according to the provided specification. Use when orchestrator reaches the implementation step."
version: 1.0.0
category: software-development
---

# Developer Agent Skill

## Purpose

Implement a software change according to the specification produced by the system analyst and approved by the quality gate.

## When to Use

- Called by `agent-orchestrator` as step 5 of the pipeline.
- User asks to "write code", "implement", or "develop" based on a specification.

## Input

- Specification file path
- Existing source code path
- Project workdir

## Workflow

### Step 1: Read specification and existing code

- Read the specification file.
- Read the target source file(s).
- Search remindb for related implementation notes if useful.

### Step 2: Plan changes

- Identify minimal, testable changes.
- Prefer backward-compatible additions.
- Do NOT change behavior that is not in scope.

### Step 3: Implement

- Edit code using `patch` or `write_file`.
- Add comments where necessary.
- Keep third-party dependencies minimal; prefer standard library.
- Add unit tests if specified.

### Step 4: Run smoke tests

- Run the script with basic arguments.
- Verify no syntax errors.
- Verify output format matches specification.

### Step 5: Report

- Return changed files list.
- Return test results.
- Return any TODOs or open issues.

## Safety Rules

- Do NOT run `sudo`, `systemctl`, destructive commands, or network-wide changes without explicit user approval.
- Do NOT delete files unless the specification explicitly requires it.
- Do NOT install new Python packages without user approval.
- If a test modifies live state (Telegram bot, cron, external API), run it only after user confirmation.

## Output

- Summary in Russian.
- List of modified files.
- Test results.
- Open questions / risks.
