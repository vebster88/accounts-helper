---
name: system-analyst
description: "System analyst sub-agent for the sequential software-development pipeline. Produces detailed specification (FR/SR) from BRD and HLD. Use when orchestrator reaches the requirements step."
version: 1.0.0
category: software-development
---

# System Analyst Skill (Hermes)

## Purpose

Transform BRD and HLD into a detailed technical specification (ТЗ) with functional requirements (FR), system requirements (SR), API contracts, and acceptance criteria.

## When to Use

- Called by `agent-orchestrator` as step 3 of the pipeline.
- User asks to "напиши ТЗ", "системные требования", or "specification".

## Input

- BRD file path
- HLD file path
- Project workdir

## Workflow

### Step 1: Read BRD and HLD

Read both documents carefully. Extract:
- Business requirements (BR-NN)
- Business rules (BRULE-NN)
- Non-functional requirements (NFR-NN)
- User stories and acceptance criteria
- Risks and constraints
- Architectural decisions from HLD

### Step 2: Write functional requirements (FR-NN)

Map each BR to concrete FRs. Use numbering `FR-01`, `FR-02`, etc. with pattern `^[A-Z]+-\d{2}$`.

For each FR include:
- Description
- Acceptance criteria
- Priority (Must/Should/Could)
- Trace to source BR

### Step 3: Write system requirements (SR-NN)

Technical requirements covering:
- API endpoints and contracts
- Data formats and schemas
- Error handling
- Performance, timeouts, caching
- Security and validation
- CLI/input contracts

### Step 4: API contracts

Document with examples:
- Endpoint URLs
- Request method and headers
- Response schema
- Fields used by the script
- Fallback strategy

### Step 5: CLI and configuration

If applicable, document:
- Positional arguments
- Optional flags
- Environment variables
- Config files
- Default values

### Step 6: Acceptance criteria

List concrete, verifiable acceptance criteria (AC-NN) covering happy path, edge cases, and error scenarios.

### Step 7: Traceability matrix

**Mandatory section at the end of the specification.** Create a table mapping:

| BRD | HLD | Specification | Acceptance Criteria | Test Case |
|---|---|---|---|---|
| BR-01 ... | HLD section | FR-01, FR-02, SR-01 | AC-01 | TC-01 (to be defined by tester) |

Include all BRs, BRULEs, NFRs, and user stories. Test Case column may contain placeholder references (TC-NN) to be filled by the tester.

### Step 8: Finalize

- Save spec to `<project>/spec.md`.
- Include DoD check for the spec itself: all BRs traced, all FRs have acceptance criteria, matrix is complete.
- Provide summary to orchestrator in Russian.

## Output Language

- Russian for user-facing content.
- Requirement codes (BR-NN, FR-NN, SR-NN, AC-NN, TC-NN) remain Latin.

## Anti-patterns

- Do NOT introduce new business rules not present in BRD.
- Do NOT skip the traceability matrix.
- Do NOT use verbal requirement codes.

## Integration

- Load this skill automatically when `agent-orchestrator` delegates the system analyst step.
- Persist final spec metadata to remindb if needed: `MemoryWrite(payload="...")`.
