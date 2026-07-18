# Adapting OpenCode Agent Skills to Hermes Agent

This reference captures the mapping from OpenCode agent/skill conventions to
Hermes Agent conventions, based on the port of the `Analyst` harness.

## Why this mapping exists

OpenCode and Hermes both support skills and sub-agents, but their formats,
registration, and invocation mechanisms differ. A direct copy of OpenCode files
into Hermes does not work.

## High-level mapping

| OpenCode concept | Hermes equivalent | Notes |
|---|---|---|
| `agents/<name>.md` with frontmatter (`mode`, `model`, `permission`) | Not supported as `.md` files | Convert agent prompts into `SKILL.md` files |
| `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`) | `~/.hermes/skills/<name>/SKILL.md` with frontmatter (`name`, `description`, `version`, `category`) | Hermes also supports nested categories |
| Junction registration (`mklink /J`) | No junctions needed | Hermes scans `~/.hermes/skills/` automatically |
| Agent invocation via `@<name>` | `delegate_task` tool | Hermes sub-agents are spawned via `delegate_task` |
| `mode: primary` / `mode: subagent` | No direct equivalent | Orchestrator decides when to delegate |
| `permission` block (`edit`, `bash`, `webfetch`) | Hermes `approvals` config + toolsets | Control via `toolsets:` in `delegate_task` and `approvals.timeout` |
| `remindb_MemorySearch`, `remindb_MemoryFetch` | `MemorySearch`, `MemoryFetch`, `MemoryWrite` | Hermes exposes these through the remindb memory provider directly |
| Windows paths (`C:\Users\...`) | Linux paths | Replace with project workdir or `~/.hermes/` paths |
| `atlassian_confluence_*` / `atlassian_jira_*` MCP tools | Not bundled in Hermes | Either install a Confluence/Jira tool provider or replace with file-based workflow |
| `Glob` tool | `search_files` / `terminal` | Use Hermes file tools |

## Concrete adaptation steps

1. **Read the OpenCode `SKILL.md` and any paired `agents/<name>.md`.**
2. **Extract the workflow and principles.** Discard OpenCode-specific frontmatter (`mode`, `model`, `permission`, `color`).
3. **Create a Hermes skill** with proper frontmatter:
   ```yaml
   ---
   name: <skill-name>
   description: "<one-line trigger description>"
   version: 1.0.0
   category: software-development
   ---
   ```
4. **Rewrite tool calls:**
   - `remindb_MemorySearch(query=...)` → `MemorySearch(query=...)`
   - `remindb_MemoryFetch(...)` → `MemoryFetch(...)`
   - `remindb_MemoryFetchBatch(...)` → `MemoryFetchBatch(...)`
   - `remindb_MemoryWrite(...)` → `MemoryWrite(...)`
5. **Replace Windows paths** with Linux paths relative to the project workdir.
6. **Remove Confluence/Jira MCP calls** unless an equivalent Hermes tool is installed. Mark them as optional or TODO.
7. **Remove permission blocks.** Instead, pass `toolsets:` to `delegate_task` to scope sub-agent capabilities.
8. **Test the skill** by loading it and invoking it via `delegate_task` from a stub orchestrator.

## Common pitfalls

- **Tool names without `remindb_` prefix:** Hermes exposes `Memory*` tools directly. Using the OpenCode `remindb_*` names fails.
- **Nested delegation:** `delegate_task` has `max_spawn_depth=1`. A sub-agent cannot call `delegate_task`. The orchestrator must run the pipeline step-by-step. Do not design an OpenCode-style chain where each agent invokes the next one (`analyst → architect → system analyst`); in Hermes the analyst would fail when it tried to spawn the architect. Keep sub-agents as leaf workers and let the orchestrator drive every transition.
- **Concurrent limit:** At most 3 sub-agents can run in parallel. A 6-step pipeline must run sequentially or in at most 3 parallel groups.
- **Missing `category` in frontmatter:** Hermes skills benefit from a category for organization. Use `software-development` for code-related skills.
- **Windows line endings or backslashes:** Convert to Unix format before saving in `~/.hermes/skills/`.

## Example: converting an OpenCode agent

OpenCode agent file `agents/business-analyst.md`:
```yaml
---
description: "Business analyst..."
mode: primary
model: bee-ai/glm-xlarge
temperature: 0.3
permission:
  edit: allow
  bash:
    "git status*": allow
---
You are a senior business analyst...
```

Hermes equivalent is a skill `business-analyst/SKILL.md`:
```yaml
---
name: business-analyst
description: "Structures business requests into a BRD with DoR/DoD verification."
version: 1.0.0
category: software-development
---
# Business Analyst Skill
...
```

Invocation from orchestrator:
```text
delegate_task goal="Act as a business analyst..." toolsets=["file", "terminal", "code_exec"]
```

## When to port vs. when to keep OpenCode

- **Port to Hermes** when the user wants to run the harness inside the active Hermes session (Telegram, cron, etc.).
- **Keep OpenCode** when the user primarily codes in VS Code / OpenCode and only wants Hermes for reminders/messaging.
