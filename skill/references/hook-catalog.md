# Hook Catalog — Claude Code settings.json Hooks

> **Purpose**: This file is the canonical reference for all hooks auto-generated
> into `.claude/settings.json` during the `/setup-workflow` skill run. Hooks are
> assembled dynamically based on the detected tech stack. Three hook types exist:
> `PostToolUse` (auto-format on save), `PreToolUse` (safety gates), and
> `SessionStart` (session reminder).
>
> **Usage contract**: The scaffold engine reads this file to build the `hooks`
> array in `settings.json`. Each section documents the JSON structure, per-stack
> variants, and generation rules. All `{{VARIABLE}}` placeholders are substituted
> at generation time using values discovered during project analysis.

---

## 1. Hook Types Overview

| Type | Trigger | Purpose |
|---|---|---|
| `PostToolUse` | Fires **after** a tool call completes | Auto-format files touched by Write or Edit |
| `PreToolUse` | Fires **before** a tool call executes | Block dangerous Bash commands (safety gate) |
| `SessionStart` | Fires once when a session begins | Inject a system-level reminder into context |

All hooks live inside the top-level `hooks` object in `.claude/settings.json`.

---

## 2. PostToolUse — Auto-Format Hook

### 2.1 Base JSON Structure

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "<shell command using $CLAUDE_FILE_PATH>",
            "timeout": 30,
            "statusMessage": "Formatting..."
          }
        ]
      }
    ]
  }
}
```

**Key fields**:

| Field | Value | Notes |
|---|---|---|
| `matcher` | `"Write\|Edit"` | Triggers on file writes and edits |
| `type` | `"command"` | Always `"command"` for shell hooks |
| `command` | varies | The format command; receives `$CLAUDE_FILE_PATH` |
| `timeout` | `30` | Seconds before the hook is killed |
| `statusMessage` | `"Formatting..."` | Shown in the Claude Code status bar |

### 2.2 Per-Extension Format Commands

| Extension(s) | Tool(s) | Command |
|---|---|---|
| `.py` | ruff | `ruff check --fix "$CLAUDE_FILE_PATH" && ruff format "$CLAUDE_FILE_PATH"` |
| `.js`, `.jsx`, `.ts`, `.tsx` | eslint + prettier | `npx eslint --fix "$CLAUDE_FILE_PATH" && npx prettier --write "$CLAUDE_FILE_PATH"` |
| `.go` | gofmt + goimports | `gofmt -w "$CLAUDE_FILE_PATH" && goimports -w "$CLAUDE_FILE_PATH"` |
| `.rs` | rustfmt | `rustfmt "$CLAUDE_FILE_PATH"` |
| `.java` | google-java-format | `google-java-format --replace "$CLAUDE_FILE_PATH"` |
| `.kt` | ktlint | `ktlint --format "$CLAUDE_FILE_PATH"` |
| `.cs` | dotnet format | `dotnet format --include "$CLAUDE_FILE_PATH"` |

### 2.3 Combined Shell Command Template

When a project uses multiple languages (e.g., Python backend + TypeScript frontend),
the hook must handle all relevant extensions in a single command using a `case`
statement keyed on the file extension extracted from `$CLAUDE_FILE_PATH`.

```bash
ext="${CLAUDE_FILE_PATH##*.}"; case "$ext" in
  py) ruff check --fix "$CLAUDE_FILE_PATH" && ruff format "$CLAUDE_FILE_PATH" ;;
  js|jsx|ts|tsx) npx eslint --fix "$CLAUDE_FILE_PATH" && npx prettier --write "$CLAUDE_FILE_PATH" ;;
  go) gofmt -w "$CLAUDE_FILE_PATH" && goimports -w "$CLAUDE_FILE_PATH" ;;
  rs) rustfmt "$CLAUDE_FILE_PATH" ;;
  java) google-java-format --replace "$CLAUDE_FILE_PATH" ;;
  kt) ktlint --format "$CLAUDE_FILE_PATH" ;;
  cs) dotnet format --include "$CLAUDE_FILE_PATH" ;;
esac
```

Only include `case` branches for extensions actually present in the detected stack.

### 2.4 Full Examples — Common Stack Combos

#### Python + React (FastAPI + React/TS)

```json
{
  "type": "command",
  "command": "ext=\"${CLAUDE_FILE_PATH##*.}\"; case \"$ext\" in py) ruff check --fix \"$CLAUDE_FILE_PATH\" && ruff format \"$CLAUDE_FILE_PATH\" ;; js|jsx|ts|tsx) npx eslint --fix \"$CLAUDE_FILE_PATH\" && npx prettier --write \"$CLAUDE_FILE_PATH\" ;; esac",
  "timeout": 30,
  "statusMessage": "Formatting..."
}
```

#### Go + React (Gin + React/TS)

```json
{
  "type": "command",
  "command": "ext=\"${CLAUDE_FILE_PATH##*.}\"; case \"$ext\" in go) gofmt -w \"$CLAUDE_FILE_PATH\" && goimports -w \"$CLAUDE_FILE_PATH\" ;; js|jsx|ts|tsx) npx eslint --fix \"$CLAUDE_FILE_PATH\" && npx prettier --write \"$CLAUDE_FILE_PATH\" ;; esac",
  "timeout": 30,
  "statusMessage": "Formatting..."
}
```

#### Node + React (Express + React/TS)

```json
{
  "type": "command",
  "command": "npx eslint --fix \"$CLAUDE_FILE_PATH\" && npx prettier --write \"$CLAUDE_FILE_PATH\"",
  "timeout": 30,
  "statusMessage": "Formatting..."
}
```

Note: When backend and frontend share the same language family (JS/TS), no `case`
statement is needed. A single eslint + prettier invocation covers all files.

#### Java + Angular (Spring Boot + Angular/TS)

```json
{
  "type": "command",
  "command": "ext=\"${CLAUDE_FILE_PATH##*.}\"; case \"$ext\" in java) google-java-format --replace \"$CLAUDE_FILE_PATH\" ;; js|jsx|ts|tsx) npx eslint --fix \"$CLAUDE_FILE_PATH\" && npx prettier --write \"$CLAUDE_FILE_PATH\" ;; esac",
  "timeout": 30,
  "statusMessage": "Formatting..."
}
```

#### Python-only API (no frontend)

```json
{
  "type": "command",
  "command": "ruff check --fix \"$CLAUDE_FILE_PATH\" && ruff format \"$CLAUDE_FILE_PATH\"",
  "timeout": 30,
  "statusMessage": "Formatting..."
}
```

---

## 3. PreToolUse — Safety Gates

### 3.1 Base JSON Structure

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "<safety check script>",
            "timeout": 5,
            "statusMessage": "Safety check..."
          }
        ]
      }
    ]
  }
}
```

The safety gate runs **before** every Bash tool invocation. If the command exits
with a non-zero status, the Bash call is blocked.

### 3.2 Universal Blocked Patterns

These patterns are **always** included regardless of stack.

| Pattern | Reason |
|---|---|
| `git commit` | Commits must go through the human review workflow |
| `git push` | Pushes must go through the human review workflow |
| `git merge` | Merges must go through the human review workflow |
| `git push --force` / `git push -f` | Force-push can destroy shared history |
| `rm -rf` | Recursive force-delete is too dangerous for automation |
| `DROP TABLE` | Destructive DDL must never be automated |
| `DROP DATABASE` | Destructive DDL must never be automated |
| `TRUNCATE TABLE` | Destructive DML must never be automated |

### 3.3 Per-Migration-Tool Blocked Patterns

These are appended when the corresponding `{{MIGRATION_TOOL}}` is detected.

| Migration Tool | Blocked Patterns | Reason |
|---|---|---|
| alembic | `alembic upgrade`, `alembic downgrade` | Schema changes require human review |
| prisma | `prisma db push`, `prisma migrate deploy`, `prisma migrate reset` | Schema changes require human review |
| knex | `knex migrate:latest`, `knex migrate:rollback` | Schema changes require human review |
| flyway | `flyway migrate`, `flyway clean` | Schema changes require human review |
| goose | `goose up`, `goose down` | Schema changes require human review |
| django | `manage.py migrate`, `manage.py makemigrations` | Schema changes require human review |
| typeorm | `typeorm migration:run`, `typeorm schema:sync` | Schema changes require human review |
| sequelize | `sequelize db:migrate` | Schema changes require human review |

### 3.4 Per-Stack Blocked Patterns

Additional patterns blocked based on the detected language/framework.

| Stack | Blocked Patterns | Reason |
|---|---|---|
| Python / SQLAlchemy | `create_all`, `.sync(`, `metadata.create_all` | Direct schema creation bypasses migrations |
| Node / npm | `npm publish` | Publishing packages must be a human action |
| Python / pip | `pip upload`, `twine upload` | Publishing packages must be a human action |
| Docker | `docker push` | Pushing images must go through CI/CD |

### 3.5 Shell Command Template for Safety Check

The safety gate uses `grep -qi` to check the incoming command against all blocked
patterns. The command string is piped via `echo` and tested against a combined
regex alternation.

```bash
BLOCKED="git commit|git push|git merge|git push --force|git push -f|rm -rf|DROP TABLE|DROP DATABASE|TRUNCATE TABLE"
echo "$CLAUDE_BASH_COMMAND" | grep -qiE "$BLOCKED" && echo "BLOCKED: command matches a restricted pattern" && exit 1; exit 0
```

When migration-tool and stack-specific patterns are added, they are appended to
the `BLOCKED` variable with additional `|` separators.

**Example — Python/FastAPI + Alembic + SQLAlchemy**:

```bash
BLOCKED="git commit|git push|git merge|git push --force|git push -f|rm -rf|DROP TABLE|DROP DATABASE|TRUNCATE TABLE|alembic upgrade|alembic downgrade|create_all|metadata.create_all"
echo "$CLAUDE_BASH_COMMAND" | grep -qiE "$BLOCKED" && echo "BLOCKED: command matches a restricted pattern" && exit 1; exit 0
```

**Example — Node/Express + Prisma**:

```bash
BLOCKED="git commit|git push|git merge|git push --force|git push -f|rm -rf|DROP TABLE|DROP DATABASE|TRUNCATE TABLE|prisma db push|prisma migrate deploy|prisma migrate reset|npm publish"
echo "$CLAUDE_BASH_COMMAND" | grep -qiE "$BLOCKED" && echo "BLOCKED: command matches a restricted pattern" && exit 1; exit 0
```

---

## 4. SessionStart — Reminder Hook

### 4.1 JSON Structure

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'REMINDER: ...'",
            "timeout": 5,
            "statusMessage": "Loading session reminder..."
          }
        ]
      }
    ]
  }
}
```

Note: `SessionStart` hooks have no `matcher` field — they fire unconditionally
at the beginning of every session.

### 4.2 Parameterized Reminder Template

```
REMINDER: Read /CLAUDE.md and your agent definition before doing any work.
Refs: {{PREFIX}}-<id> — always confirm which story you are working on.
Safety: never run git commit, git push, or {{MIGRATION_TOOL}} commands.
```

The template is substituted with project-specific values:

| Placeholder | Example Value |
|---|---|
| `{{PREFIX}}` | `PROJ` |
| `{{MIGRATION_TOOL}}` | `alembic` / `prisma` / `knex` / etc. |

### 4.3 Full SessionStart Example

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "echo 'REMINDER: Read /CLAUDE.md and your agent definition before doing any work. Refs: PROJ-<id> — always confirm which story you are working on. Safety: never run git commit, git push, or alembic commands.'",
      "timeout": 5,
      "statusMessage": "Loading session reminder..."
    }
  ]
}
```

---

## 5. Complete settings.json Examples

### 5.1 Python/FastAPI + React/TS + MySQL/Alembic

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "ext=\"${CLAUDE_FILE_PATH##*.}\"; case \"$ext\" in py) ruff check --fix \"$CLAUDE_FILE_PATH\" && ruff format \"$CLAUDE_FILE_PATH\" ;; js|jsx|ts|tsx) npx eslint --fix \"$CLAUDE_FILE_PATH\" && npx prettier --write \"$CLAUDE_FILE_PATH\" ;; esac",
            "timeout": 30,
            "statusMessage": "Formatting..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "BLOCKED=\"git commit|git push|git merge|git push --force|git push -f|rm -rf|DROP TABLE|DROP DATABASE|TRUNCATE TABLE|alembic upgrade|alembic downgrade|create_all|metadata.create_all\"; echo \"$CLAUDE_BASH_COMMAND\" | grep -qiE \"$BLOCKED\" && echo \"BLOCKED: command matches a restricted pattern\" && exit 1; exit 0",
            "timeout": 5,
            "statusMessage": "Safety check..."
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'REMINDER: Read /CLAUDE.md and your agent definition before doing any work. Refs: PROJ-<id> — always confirm which story you are working on. Safety: never run git commit, git push, or alembic commands.'",
            "timeout": 5,
            "statusMessage": "Loading session reminder..."
          }
        ]
      }
    ]
  }
}
```

### 5.2 Go/Gin + React/TS + PostgreSQL/Goose

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "ext=\"${CLAUDE_FILE_PATH##*.}\"; case \"$ext\" in go) gofmt -w \"$CLAUDE_FILE_PATH\" && goimports -w \"$CLAUDE_FILE_PATH\" ;; js|jsx|ts|tsx) npx eslint --fix \"$CLAUDE_FILE_PATH\" && npx prettier --write \"$CLAUDE_FILE_PATH\" ;; esac",
            "timeout": 30,
            "statusMessage": "Formatting..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "BLOCKED=\"git commit|git push|git merge|git push --force|git push -f|rm -rf|DROP TABLE|DROP DATABASE|TRUNCATE TABLE|goose up|goose down\"; echo \"$CLAUDE_BASH_COMMAND\" | grep -qiE \"$BLOCKED\" && echo \"BLOCKED: command matches a restricted pattern\" && exit 1; exit 0",
            "timeout": 5,
            "statusMessage": "Safety check..."
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'REMINDER: Read /CLAUDE.md and your agent definition before doing any work. Refs: PROJ-<id> — always confirm which story you are working on. Safety: never run git commit, git push, or goose commands.'",
            "timeout": 5,
            "statusMessage": "Loading session reminder..."
          }
        ]
      }
    ]
  }
}
```

### 5.3 Node/Express + React/TS + PostgreSQL/Prisma

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx eslint --fix \"$CLAUDE_FILE_PATH\" && npx prettier --write \"$CLAUDE_FILE_PATH\"",
            "timeout": 30,
            "statusMessage": "Formatting..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "BLOCKED=\"git commit|git push|git merge|git push --force|git push -f|rm -rf|DROP TABLE|DROP DATABASE|TRUNCATE TABLE|prisma db push|prisma migrate deploy|prisma migrate reset|npm publish\"; echo \"$CLAUDE_BASH_COMMAND\" | grep -qiE \"$BLOCKED\" && echo \"BLOCKED: command matches a restricted pattern\" && exit 1; exit 0",
            "timeout": 5,
            "statusMessage": "Safety check..."
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'REMINDER: Read /CLAUDE.md and your agent definition before doing any work. Refs: PROJ-<id> — always confirm which story you are working on. Safety: never run git commit, git push, or prisma commands.'",
            "timeout": 5,
            "statusMessage": "Loading session reminder..."
          }
        ]
      }
    ]
  }
}
```

### 5.4 Java/Spring Boot + Angular/TS + PostgreSQL/Flyway

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "ext=\"${CLAUDE_FILE_PATH##*.}\"; case \"$ext\" in java) google-java-format --replace \"$CLAUDE_FILE_PATH\" ;; js|jsx|ts|tsx) npx eslint --fix \"$CLAUDE_FILE_PATH\" && npx prettier --write \"$CLAUDE_FILE_PATH\" ;; esac",
            "timeout": 30,
            "statusMessage": "Formatting..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "BLOCKED=\"git commit|git push|git merge|git push --force|git push -f|rm -rf|DROP TABLE|DROP DATABASE|TRUNCATE TABLE|flyway migrate|flyway clean\"; echo \"$CLAUDE_BASH_COMMAND\" | grep -qiE \"$BLOCKED\" && echo \"BLOCKED: command matches a restricted pattern\" && exit 1; exit 0",
            "timeout": 5,
            "statusMessage": "Safety check..."
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'REMINDER: Read /CLAUDE.md and your agent definition before doing any work. Refs: PROJ-<id> — always confirm which story you are working on. Safety: never run git commit, git push, or flyway commands.'",
            "timeout": 5,
            "statusMessage": "Loading session reminder..."
          }
        ]
      }
    ]
  }
}
```

### 5.5 Python-only API (no frontend)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "ruff check --fix \"$CLAUDE_FILE_PATH\" && ruff format \"$CLAUDE_FILE_PATH\"",
            "timeout": 30,
            "statusMessage": "Formatting..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "BLOCKED=\"git commit|git push|git merge|git push --force|git push -f|rm -rf|DROP TABLE|DROP DATABASE|TRUNCATE TABLE|alembic upgrade|alembic downgrade|create_all|metadata.create_all|pip upload|twine upload\"; echo \"$CLAUDE_BASH_COMMAND\" | grep -qiE \"$BLOCKED\" && echo \"BLOCKED: command matches a restricted pattern\" && exit 1; exit 0",
            "timeout": 5,
            "statusMessage": "Safety check..."
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'REMINDER: Read /CLAUDE.md and your agent definition before doing any work. Refs: PROJ-<id> — always confirm which story you are working on. Safety: never run git commit, git push, or alembic commands.'",
            "timeout": 5,
            "statusMessage": "Loading session reminder..."
          }
        ]
      }
    ]
  }
}
```

---

## 6. Generation Logic

### 6.1 Algorithm — Assembling settings.json

The scaffold engine builds the `hooks` object in `.claude/settings.json` using
the following algorithm:

```
FUNCTION buildHooks(detectedStack):

  # ── Step 1: Build the PostToolUse format command ──────────────────────
  extensions = []
  IF detectedStack.backendLanguage == "Python":
      extensions.append(("py", "ruff check --fix \"$CLAUDE_FILE_PATH\" && ruff format \"$CLAUDE_FILE_PATH\""))
  IF detectedStack.backendLanguage == "Go":
      extensions.append(("go", "gofmt -w \"$CLAUDE_FILE_PATH\" && goimports -w \"$CLAUDE_FILE_PATH\""))
  IF detectedStack.backendLanguage == "Java":
      extensions.append(("java", "google-java-format --replace \"$CLAUDE_FILE_PATH\""))
  IF detectedStack.backendLanguage == "Kotlin":
      extensions.append(("kt", "ktlint --format \"$CLAUDE_FILE_PATH\""))
  IF detectedStack.backendLanguage == "Rust":
      extensions.append(("rs", "rustfmt \"$CLAUDE_FILE_PATH\""))
  IF detectedStack.backendLanguage == "C#":
      extensions.append(("cs", "dotnet format --include \"$CLAUDE_FILE_PATH\""))
  IF detectedStack.frontendLanguage in ["JavaScript", "TypeScript"]:
      extensions.append(("js|jsx|ts|tsx", "npx eslint --fix \"$CLAUDE_FILE_PATH\" && npx prettier --write \"$CLAUDE_FILE_PATH\""))
  # Also covers Node.js backends using JS/TS without a separate frontend
  IF detectedStack.backendLanguage in ["JavaScript", "TypeScript"] AND no frontend entry yet:
      extensions.append(("js|jsx|ts|tsx", "npx eslint --fix \"$CLAUDE_FILE_PATH\" && npx prettier --write \"$CLAUDE_FILE_PATH\""))

  IF len(extensions) == 1:
      formatCommand = extensions[0].command   # no case statement needed
  ELSE:
      formatCommand = buildCaseStatement(extensions)

  # ── Step 2: Build the PreToolUse blocked patterns ─────────────────────
  blocked = UNIVERSAL_BLOCKED_PATTERNS   # always included

  IF detectedStack.migrationTool:
      blocked += MIGRATION_TOOL_PATTERNS[detectedStack.migrationTool]

  IF detectedStack.backendLanguage == "Python" AND detectedStack.orm == "SQLAlchemy":
      blocked += ["create_all", "metadata.create_all"]
  IF detectedStack.backendLanguage in ["JavaScript", "TypeScript"]:
      blocked += ["npm publish"]
  IF detectedStack.backendLanguage == "Python":
      blocked += ["pip upload", "twine upload"]
  IF detectedStack.usesDocker:
      blocked += ["docker push"]

  blockedRegex = join(blocked, "|")
  safetyCommand = buildSafetyCommand(blockedRegex)

  # ── Step 3: Build the SessionStart reminder ───────────────────────────
  reminderText = REMINDER_TEMPLATE
      .replace("{{PREFIX}}", detectedStack.prefix)
      .replace("{{MIGRATION_TOOL}}", detectedStack.migrationTool or "migration")

  # ── Step 4: Assemble the full hooks object ────────────────────────────
  hooks = {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{ "type": "command", "command": formatCommand, "timeout": 30, "statusMessage": "Formatting..." }]
    }],
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": safetyCommand, "timeout": 5, "statusMessage": "Safety check..." }]
    }],
    "SessionStart": [{
      "hooks": [{ "type": "command", "command": "echo '" + reminderText + "'", "timeout": 5, "statusMessage": "Loading session reminder..." }]
    }]
  }

  RETURN hooks
```

### 6.2 Helper — buildCaseStatement

```
FUNCTION buildCaseStatement(extensions):
  parts = ['ext="${CLAUDE_FILE_PATH##*.}"; case "$ext" in']
  FOR (pattern, cmd) IN extensions:
      parts.append('  ' + pattern + ') ' + cmd + ' ;;')
  parts.append('esac')
  RETURN join(parts, ' ')
```

### 6.3 Helper — buildSafetyCommand

```
FUNCTION buildSafetyCommand(blockedRegex):
  RETURN 'BLOCKED="' + blockedRegex + '"; echo "$CLAUDE_BASH_COMMAND" | grep -qiE "$BLOCKED" && echo "BLOCKED: command matches a restricted pattern" && exit 1; exit 0'
```

### 6.4 Handling Existing settings.json

When `.claude/settings.json` already exists, the engine **merges** rather than
overwrites:

1. **Read** the existing file and parse its JSON.
2. **Preserve** any keys outside of `hooks` (e.g., `permissions`, `env`).
3. **Within `hooks`**, merge each hook type:
   - If the existing file has no `PostToolUse`, add it entirely.
   - If the existing file already has a `PostToolUse` entry with matcher
     `Write|Edit`, **replace** its `command` with the newly generated one.
   - Same logic for `PreToolUse` (matcher `Bash`) and `SessionStart`.
4. **Do not** remove hook entries that are not managed by the scaffold engine
   (e.g., custom user hooks with different matchers).
5. **Write** the merged result back to `.claude/settings.json`.

This ensures that:
- Re-running the scaffold on an evolving project updates hooks without data loss.
- User-defined hooks (custom matchers, additional PreToolUse gates) survive.
- Non-hook settings remain untouched.
