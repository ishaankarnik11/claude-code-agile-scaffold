# /setup-workflow — AI-Assisted Agile Development Framework

## What this does

One command bootstraps a complete AI-assisted development workflow for your project:
- Validates your requirements document (FRD/PRD/BRD) for implementation readiness
- Detects your tech stack and repo structure automatically
- Generates: root contract (CLAUDE.md), specialist agents, 20 workflow commands, safety hooks, coding standards, story/epic templates
- Creates a populated backlog: epics, ready-to-implement stories, and a sprint board — all derived from your requirements document
- Sets up sprint tracking with automated status sync, E2E gates, and bug auto-creation

## Prerequisites

- [Claude Code](https://claude.ai/code) installed
- A project directory containing:
  - A requirements document (FRD, PRD, or BRD) in any format (.md, .html, .pdf)
  - Optionally, existing code — the skill auto-detects your tech stack from manifest files

## Supported Tech Stacks

| Backend | Frontend | Database | Migrations |
|---|---|---|---|
| Python (FastAPI, Django, Flask) | React | MySQL | Alembic |
| Go (Gin, Echo, Fiber) | Vue | PostgreSQL | Prisma |
| Java/Kotlin (Spring Boot) | Angular | MongoDB | Knex |
| Node.js (Express, Nest) | Svelte | SQLite | Flyway |
| C# (.NET) | Next.js | MSSQL | Goose |
| Rust (Actix, Axum) | Nuxt | | Django |

## Quick Start

### 1. Install the skill

**Option A: npx (recommended)** — from your project directory:
```
npx github:ishaankarnik11/claude-code-agile-scaffold
```
Or target another directory: `npx github:ishaankarnik11/claude-code-agile-scaffold ./path/to/project`

**Option B: Manual** — clone this repo and copy its `skill/` folder to `.claude/skills/setup-workflow/` in your project:
```
your-project/
  .claude/
    skills/
      setup-workflow/    ← contents of this repo's skill/ folder
        SKILL.md
        references/
  docs/
    your-frd.md          ← your requirements document
  src/                   ← your code (optional)
```

### 2. Run the skill
Open Claude Code in your project directory and run:
```
/setup-workflow
```

### 3. What happens
The skill runs 5 phases automatically:

| Phase | What it does | Your input needed? |
|---|---|---|
| **0. FRD Confidence Gate** | Scores your requirements doc (0-100). Flags gaps, pitfalls, ambiguities | Only if score < 70 |
| **1. Discover** | Scans for tech stack, repo topology, FRD content | Confirm/override detections |
| **2. Configure** | Generates project config (name, prefix, agent roster) | Confirm/adjust values |
| **3. Scaffold** | Writes all files: agents, commands, hooks, standards, backlog, sprint board | None — fully automated |
| **4. Verify** | Cross-checks all generated files, suggests next steps | None |

## After Setup — Your Daily Workflow

| Goal | Command | What it does |
|---|---|---|
| **Develop a story** | `/story-develop {ID}` | Full automated pipeline: implement → lint → review → QA → done |
| **New epic from FRD** | `/epic-develop "Section 3: Auth"` | Parse FRD section → epic + ready stories |
| **New epic (change request)** | `/epic-develop "Add CSV import"` | Natural language → epic + ready stories |
| **Single ad-hoc story** | `/story-create "Fix: OTP toast"` | Description → one ready story |
| **Close a sprint** | `/sprint-review` | E2E gate → bug auto-creation → sprint done |
| **Plan next sprint** | `/sprint-plan` | Pull ready stories into new sprint |
| **Review code** | `/code-review {ID}` | Independent code review with routable findings |

## Key Concepts

- **Stories start as `ready`** — fully populated with acceptance criteria and test plans. No manual refinement needed.
- **Sprint board is the single source of truth** — all status changes auto-sync across stories, epics, and the board.
- **Agents never commit or push** — you handle all git operations. Use `/commit` to get a suggested commit message.
- **Everything is resumable** — if a session ends mid-pipeline, it picks up from the last checkpoint.
- **Bugs auto-created** — if a story can't be resolved after max retries, a bug story is created in the same sprint.
- **Sprints can't close early** — `/sprint-review` requires ALL stories done AND E2E tests passing.

## What Gets Generated

```
your-project/
├── CLAUDE.md                    # Root contract for all agents
├── .claude/
│   ├── agents/                  # 4-12 specialist agents (based on your stack)
│   ├── commands/                # 20 workflow commands
│   ├── settings.json            # Auto-format + safety hooks
│   └── skills/                  # Space for project-specific skills
├── docs/
│   ├── standards/               # Coding, git, testing, review standards
│   ├── contracts/               # API & event contract stubs
│   ├── ADR/                     # Architecture Decision Records
│   ├── architecture.md          # Tech stack overview
│   ├── glossary.md              # Domain terms from your FRD
│   └── metrics.md               # Sprint velocity tracking
├── backlog/
│   ├── epics/                   # Populated from your FRD
│   ├── stories/                 # Ready-to-implement stories
│   ├── sprint-board.md          # Sprint plan + backlog
│   ├── tracker.md               # Epic/story status dashboard
│   └── templates/               # Story & epic templates
├── ceremonies/                  # Sprint logs
└── techstack/                   # Tech stack documentation
```

## Troubleshooting

| Problem | Solution |
|---|---|
| FRD score too low | Address the gaps listed in the confidence report, then re-run |
| Tech stack not detected | Ensure manifest files exist (package.json, pyproject.toml, etc.) or specify manually when prompted |
| Want to re-run after changes | The skill detects existing scaffolding and asks: merge or overwrite |
| Need a stack not listed | The skill falls back to manual configuration — specify your tools when prompted |

## Learn More

After setup, read `docs/standards/team-workflow.md` for the full workflow documentation.
