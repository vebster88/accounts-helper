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
- **Environment and deployment:** Python version, venv setup, dependency management (`requirements.txt`/`pyproject.toml`), deployment target (server/cron/systemd/container), OS/runtime constraints, environment isolation.

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
- **Persist to memory:** Call `MemoryWrite` with a concise Russian summary of the specification (250-500 tokens / ~600-1250 characters). Include file path, key FR/SR identifiers, CLI flags and conflicts, cache behavior, and traceability matrix summary. For detailed questions, read the spec file directly rather than duplicating its full text. See `agent-orchestrator/references/remindb-artifact-search.md`.

## Output Language

- Russian for user-facing content.
- Requirement codes (BR-NN, FR-NN, SR-NN, AC-NN, TC-NN) remain Latin.

## Maintaining an Existing Specification

When the user asks to update an existing spec — especially changing a primary data source, API endpoint, or response format — treat it as a consistency pass across the whole document, not a single-line edit.

### Workflow

1. **Read the full context** in parallel: `brd.md`, `hld.md`, `spec.md` (and any related implementation or test files if they exist).
2. **Identify every place the old source is referenced**: URL, endpoint path, field names, response examples, encoding notes, parsing logic, fallback triggers.
3. **Update the primary FR** that defines the source. Include new extraction/parsing rules (e.g., XML vs JSON, charset, element path, attribute path, decimal-separator normalization).
4. **Update the API contract section** with the new endpoint, request headers, full example response, field table, fallback/error triggers, and encoding quirks.
5. **Cascade the change to dependent sections**:
   - Output formatting and timezone handling
   - Error matrix (parsing errors, missing-field errors)
   - Cache schema and timestamp semantics
   - CLI help/examples if source-specific
   - Acceptance criteria
   - Risks and mitigations
   - Traceability matrix
6. **Search for stale references** using the old URL, old domain, or old field names. Remove or update every hit.
7. **Verify** by reading the modified FR, API contract, output examples, error matrix, and traceability matrix; search again to confirm zero stale references.

### Quick Checklist

- [ ] Primary FR references the new source URL and format
- [ ] Parsing rules (XML/JSON, charset, element/attribute path, decimal separator) documented
- [ ] API contract has a real example response in the new format
- [ ] Field table uses new field/attribute names
- [ ] Fallback triggers match the new contract
- [ ] Output examples updated for new date/time semantics
- [ ] Error matrix reflects new parsing errors (e.g., `invalid XML`, missing `Valute`)
- [ ] Cache schema updated if timestamp format changed
- [ ] Acceptance criteria updated
- [ ] Risks updated
- [ ] Traceability matrix updated
- [ ] Zero stale references to old URL/fields remain

## Anti-patterns

- Do NOT introduce new business rules not present in BRD.
- Do NOT skip the traceability matrix.
- Do NOT use verbal requirement codes.
- Do NOT leave stale references to an old API endpoint, URL, or field name after changing the primary data source. Search and update the FR, contract, examples, error matrix, cache schema, AC, risks, and traceability matrix.
- Do NOT copy the spec or related files into `~/.hermes/memories/` or create symlinks there for indexing. remindb's source root is restricted and symlinks are ignored. Use concise `MemoryWrite` summaries (250-500 tokens) and read the source file for details.

## Integration

- Load this skill automatically when `agent-orchestrator` delegates the system analyst step.
- Persist final spec metadata to remindb if needed: `MemoryWrite(payload="...")`.
