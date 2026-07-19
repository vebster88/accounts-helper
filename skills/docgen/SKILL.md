---
name: docgen
description: "Generate project documents from predefined templates: Minutes of Meeting (MoM) and Technical Specification (RD/Spec). Fills templates with user-provided context and produces ready-to-use Markdown. Hermes adaptation: no Confluence/Jira, local Markdown only."
version: 1.0.0
category: software-development
---

# Document Generation from Templates (Hermes)

## Purpose

Generate ready-to-use Markdown documents from structured templates:
- **MoM** — Minutes of Meeting
- **RD/Spec** — Technical Specification

Useful for fast standardization of recurring documents.

## When to Use

- User says: "сформируй MoM", "create MoM", "создай ТЗ", "create technical specification".
- Called by `business-analyst` or `system-analyst` to bootstrap a document.
- Called by `agent-orchestrator` when user explicitly asks for MoM/Spec generation.

## Input

1. Template type: `mom` or `rd`.
2. Required fields (see below).
3. Project workdir for saving output.

## Not Supported

- Confluence publishing.
- Jira integration.
- DOCX/PDF export (use `docx-to-md` in reverse if needed).

## Templates

### MoM

Output file: `<workdir>/docs/mom/YYYY-MM-DD_<topic>.md`

Structure:

```markdown
# MoM: <Meeting Topic>

- **Date:** YYYY-MM-DD
- **Participants:** ...
- **Recording:** link

## Discussed

- ...

## Decisions

- ...

## Action Items

| # | Task | Owner | Deadline | Status |
|---|------|-------|----------|--------|
| 1 | ... | ... | ... | pending |
```

Required fields:
| Field | Required |
|-------|----------|
| Meeting topic | yes |
| Date | yes |
| Participants | yes |
| Discussed | yes |
| Decisions | if any |
| Action items | if any |
| Recording link | if any |

### RD / Spec

Template source: `skills/docgen/templates/spec-template.md`

Output file: `<workdir>/docs/spec/YYYY-MM-DD_<short-title>.md`

Structure:
1. Constraints
2. Glossary
3. Business Rules (BRULE-NN)
4. Use Cases
5. Functional Requirements (FR-NN)
6. System Requirements (SR-NN)
7. Interface Descriptions
   7.1 Swimlane
   7.2 Sequence
   7.3 API Methods
   7.4 Error Specification
   7.5 Kafka Topics
8. Non-Functional Requirements
9. Appendix

Auto-numbering rules:
- Business rules: BRULE-01, BRULE-02, ...
- Functional requirements: FR-01, FR-02, ...
- System requirements: SR-01, SR-02, ...
- Non-functional requirements: NFR-01, NFR-02, ...

If the user provides items without IDs, assign sequential IDs automatically.
If the user provides IDs, preserve them and verify there are no gaps.

Required fields:
| Field | Required |
|-------|----------|
| Document title | yes |
| Constraints | if known |
| Glossary | if known |
| Business rules | if known |
| Use cases | if known |
| Functional requirements | if known |
| System requirements | if known |
| Interfaces | if known |
| NFR | if known |

## Workflow

### Step 1: Identify template

Ask if unclear.

### Step 2: Gather input

Collect required fields from user. If user provides raw notes or transcript — extract structured information.

### Step 3: Fill template

1. Load the template file:
   - MoM: use built-in structure.
   - RD/Spec: read `skills/docgen/templates/spec-template.md`.
2. Replace placeholders with collected data.
3. Auto-number requirements if IDs are missing.
4. Keep structure intact.
5. Do not remove empty sections; mark as "Не используется" / "Отсутствует" if not applicable.
6. Do not invent content.

### Step 4: Post-check gate

Before saving, verify:

| # | Check | On FAIL |
|---|-------|---------|
| V1 | File can be written | Re-save |
| V2 | Template structure preserved | Re-fill |
| V3 | Required fields filled | Ask user |
| V4 | Sequential numbering correct | Renumber |
| V5 | No invented content | Remove fabricated data |

### Step 5: Save

Save to:
- MoM: `<workdir>/docs/mom/YYYY-MM-DD_<short-title>.md`
- RD: `<workdir>/docs/spec/YYYY-MM-DD_<short-title>.md`

### Step 6: Persist

Call `MemoryWrite` with concise Russian summary:
- Template type
- Output file path
- Key sections filled
- Open sections / missing data

## Output

- Generated Markdown file.
- Memory summary in remindb.

## Language

- Russian output by default.
- Structural identifiers (BRULE, FR, SR, NFR) remain Latin.

## Anti-patterns

- Do NOT invent business rules or regulatory requirements.
- Do NOT skip empty sections — mark them explicitly.
- Do NOT publish to Confluence/Jira automatically.
- Do NOT duplicate full document into `~/.hermes/memories/`.

## Tool Usage

- `clarify` — collect missing fields from user.
- `write_file` — save generated document.
- `MemoryWrite` — persist summary.

## Example

User: "Сформируй MoM по встрече 20 июля 2026: участники Алиса, Боб; обсуждали интеграцию remindb; решили сделать memory-first поиск; action: я подготовлю skill до 25 июля."

Output: `docs/mom/2026-07-20_remindb_integration.md`
