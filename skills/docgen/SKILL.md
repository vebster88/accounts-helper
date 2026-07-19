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

Output file: `<workdir>/docs/spec/YYYY-MM-DD_<short-title>.md`

Structure:

```markdown
# Technical Specification: <Title>

## 1. Constraints

## 2. Glossary

| Term | Definition |
|------|------------|

## 3. Business Rules

| ID | Rule | Priority |
|----|------|----------|
| BRULE-01 | ... | High |

## 4. Use Cases

## 5. Functional Requirements

| ID | Description | Acceptance Criteria | Priority |
|----|-------------|---------------------|----------|
| FR-01 | ... | ... | Must |

## 6. System Requirements

| ID | Description | Related FR |
|----|-------------|------------|
| SR-01 | ... | FR-01 |

## 7. Interface Descriptions

### 7.1 Swimlane

### 7.2 Sequence

### 7.3 API Methods

### 7.4 Error Specification

### 7.5 Kafka Topics

## 8. Non-Functional Requirements

### 8.1 Usability
### 8.2 Performance
### 8.3 Security
### 8.4 Switchability
### 8.5 Scalability
### 8.6 Reliability
### 8.7 Availability
### 8.8 Logging
### 8.9 Monitoring

## 9. Appendix
```

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

- Keep structure intact.
- Do not remove empty sections; mark as "Не используется" / "Отсутствует" if not applicable.
- Number requirements sequentially: BRULE-01, FR-01, SR-01, NFR-01.
- Do not invent content.

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
