---
name: read-spec
description: "Read and analyze technical specifications from Confluence, Jira, local files, or URLs. Extracts structured requirements (FR/SR/BR/NFR), performs gap analysis, traces Jira links, compares versions, and saves snapshots. Hermes adaptation: no MCP tools; uses web, terminal, and file tools. Russian output by default."
version: 1.0.0
category: software-development
---

# read-spec — Read & Analyze Technical Specifications (Hermes)

## Purpose

Load a specification from Confluence, Jira, GitHub URL, or local file, extract structured requirements, find gaps, and optionally save a local snapshot for downstream pipeline use.

## When to Use

- User says: "прочитай ТЗ", "read spec", "проанализируй spec", "сравни версии ТЗ".
- User provides Confluence URL, Jira key, GitHub URL to a spec, or local path.
- Called by `business-analyst` / `system-analyst` / `quality-gate` to load external source material.

## Input

1. Source identifier — one of:
   - Confluence URL (`https://.../pages/123456789/...`)
   - Confluence page title + space key
   - Jira issue key (`PFC-881`, `UST-123`)
   - GitHub URL to Markdown spec
   - Local file path
   - Raw text pasted by user
2. Project workdir — where to save local snapshot.

## Constraints of Hermes

- **No MCP tools.** `atlassian_confluence_*` and `atlassian_jira_*` are not available.
- Use instead:
  - `browser_navigate` + `browser_console` / `browser_snapshot` for web-based Confluence/Jira (if accessible via web)
  - `terminal` + `curl` for REST API calls with token from environment
  - `read_file` for local files
  - `browser_navigate` or `terminal` with `curl` for GitHub raw URLs
- **Never hardcode tokens.** Read from environment variables or user-provided values.
- `delegate_task` max_spawn_depth=1; this skill is usually called directly by the main agent, not delegated.

## Lookup Order

1. `MemorySearch` / `MemoryFetch` — if spec was already read and summarized.
2. Local snapshot in project directory.
3. Web / REST source.

## Workflow

### Step 1: Resolve and load the source

#### 1.1 Confluence URL

Extract `page_id` from URL path.

Load via browser:
- `browser_navigate` to the URL.
- If public/readable: `browser_snapshot full=true`.
- If requires auth: ask user for token, then use `curl` with `Authorization: Bearer $CONFLUENCE_TOKEN`.

REST fallback:
```bash
curl -s -H "Authorization: Bearer $CONFLUENCE_TOKEN" \
  "https://bwiki.beeline.ru/rest/api/content/{page_id}?expand=body.storage,version" \
  | jq '.body.storage.value, .version.number'
```

#### 1.2 Confluence by title

Search via REST:
```bash
curl -s -H "Authorization: Bearer $CONFLUENCE_TOKEN" \
  "https://bwiki.beeline.ru/rest/api/content?spaceKey={space}&title={title}&expand=body.storage,version"
```

#### 1.3 Jira issue

```bash
curl -s -H "Authorization: Bearer $JIRA_TOKEN" \
  "https://jira.example.com/rest/api/2/issue/{key}?fields=summary,description,attachment,comment,issuelinks,customfield_*"
```

Extract Confluence URLs from `description` and `comments`.

#### 1.4 GitHub URL

Convert to raw URL:
- `https://github.com/owner/repo/blob/branch/path.md` → `https://raw.githubusercontent.com/owner/branch/path.md`

Use `browser_navigate` or `curl`.

#### 1.5 Local file

`read_file(path)`.

#### 1.6 Raw text

Use directly.

### Step 2: Convert to Markdown (if needed)

If source returned HTML or Confluence storage format:

- Use browser text extraction.
- Or use Python with `html2text` / `markdownify` / `BeautifulSoup` via `execute_code`.
- Strip Confluence macros, preserve Mermaid blocks.

### Step 3: Save local snapshot

Create file in project directory:

```
<workdir>/docs/source-spec.md
```

Add snapshot header:

```markdown
<!-- Source: {url_or_key} | Snapshot: YYYY-MM-DD | Version: {version} -->
```

If source was already summarized in remindb and no changes detected, reuse snapshot.

### Step 4: Extract structured requirements

Parse the Markdown spec and produce:

| Section | Prefix | Extract |
|---------|--------|---------|
| Business Rules | BR-NN / BRULE-NN | ID, description, priority, source |
| Functional Requirements | FR-NN | ID, description, related SR, acceptance criteria |
| System Requirements | SR-NN | ID, description, related FR |
| Non-Functional Requirements | NFR-NN | Category, metric, threshold |
| Glossary | — | Term, definition |
| Interfaces | — | API endpoints, Kafka topics, swimlane references |

Output format:

```markdown
## Requirements Summary

### Business Rules
| ID | Description | Priority |
|----|-------------|----------|
| BR-01 | ... | High |

### Functional Requirements
| ID | Description | Related SR | Acceptance Criteria |
|----|-------------|------------|---------------------|
| FR-01 | ... | SR-03 | ... |
```

### Step 5: Gap analysis

| Check | Description |
|-------|-------------|
| FR without SR | Functional requirement has no covering system requirement |
| SR without FR | System requirement not traced to any FR |
| Missing NFR | No performance, availability, security requirement |
| Empty sections | Template sections with no content |
| Contradictions | FRs contradict each other or conflict with BRs |
| Orphan links | References to non-existent requirement IDs |
| Incomplete glossary | Technical terms used but not defined |

Output as table with severity High/Medium/Low.

### Step 6: Traceability to Jira

If user provided Jira context or asks for traceability:

1. Search Jira for issues referencing spec title or FR IDs.
2. Cross-reference: which FRs have tasks, which do not.

```bash
curl -s -H "Authorization: Bearer $JIRA_TOKEN" \
  "https://jira.example.com/rest/api/2/search?jql=project%20%3D%20{PROJECT}%20AND%20description%20~%20%27{spec_title}%27"
```

Output traceability matrix:

```markdown
| Requirement | Jira Issue | Status | Coverage |
|-------------|-----------|--------|----------|
| FR-01 | UST-123 | In Progress | Covered |
| FR-02 | — | — | **No task** |
```

### Step 7: Version comparison

If user asks to compare versions:

1. Read Confluence page history via REST:
```bash
curl -s -H "Authorization: Bearer $CONFLUENCE_TOKEN" \
  "https://bwiki.beeline.ru/rest/api/content/{page_id}/history"
```

2. Fetch older version:
```bash
curl -s -H "Authorization: Bearer $CONFLUENCE_TOKEN" \
  "https://bwiki.beeline.ru/rest/api/content/{page_id}?status=historical&version={N}&expand=body.storage"
```

3. Convert both versions to Markdown and diff with `diff` or Python.

4. Report:
   - Added requirements
   - Modified requirements
   - Removed requirements
   - Restructured sections

### Step 8: Persist and return

1. Save all extracted tables and gap analysis to:
   ```
   <workdir>/docs/source-spec-analysis.md
   ```
2. Commit and push if this is part of pipeline workflow.
3. Call `MemoryWrite` with concise Russian summary:
   - Source URL/key
   - Snapshot path
   - Number of extracted FR/SR/BR/NFR
   - Top 3 gaps
   - Traceability status

## Output

- `source-spec.md` — local snapshot of raw spec.
- `source-spec-analysis.md` — extracted requirements, gaps, traceability.
- Memory summary node in remindb.

## Language

- Output artifacts in Russian.
- Requirement codes (BR-NN, FR-NN, SR-NN, NFR-NN) remain Latin.

## Anti-patterns

- Do NOT hardcode Confluence/Jira tokens.
- Do NOT use `webfetch` for SAML-protected Confluence.
- Do NOT ignore version numbers when saving snapshots.
- Do NOT create Jira issues automatically without user approval.
- Do NOT overwrite Confluence pages without reading current version first.
- Do NOT duplicate the full spec into `~/.hermes/memories/`; use concise `MemoryWrite` summaries.

## Tool Usage

- `browser_navigate`, `browser_snapshot`, `browser_console` — web sources.
- `terminal` — `curl` for REST APIs.
- `read_file`, `write_file`, `search_files` — local files.
- `execute_code` — conversion HTML→Markdown, diff, parsing.
- `MemoryWrite`, `MemorySearch` — persistence and recall.
