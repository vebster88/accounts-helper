---
name: tester-agent
description: "Tester sub-agent for the sequential software-development pipeline. Verifies implementation against the specification, executes tests, and reports coverage and defects. Use when orchestrator reaches the testing step."
version: 1.0.0
category: software-development
---

# Tester Agent Skill

## Purpose

Verify that the implemented solution matches the specification. Execute tests and report results.

## When to Use

- Called by `agent-orchestrator` as step 6 of the pipeline.
- User asks to "test", "проверь", or "run tests".

## Input

- Specification file path
- Source code path
- Workdir

## Workflow

### Step 1: Read specification and code

- Read the specification file.
- Read the implemented source file(s).
- Understand acceptance criteria from the spec.

### Step 2: Design tests

Based on the specification, identify test cases:
- Happy path: valid input produces expected output.
- Edge cases: empty list, too many cities, unknown city, API failure, cache hit/miss.
- Regression: default Moscow behavior unchanged.

### Step 3: Execute tests

- Run the script with test inputs.
- Run existing tests if present.
- Capture stdout, stderr, exit codes.
- Do NOT run destructive or live-external tests without user approval.

### Step 4: Report

- Test case table with result (PASS/FAIL/SKIPPED).
- Coverage summary.
- Defect list with severity.
- Final verdict: PASS / PASS WITH DEFECTS / FAIL.

## Safety Rules

- Do NOT run tests that call external APIs excessively.
- Do NOT run tests that modify production state (cron, Telegram bot, live config).
- Do NOT install new packages without user approval.

## Output

- Report in Russian.
- Test case table.
- Verdict.
- Recommendations.
