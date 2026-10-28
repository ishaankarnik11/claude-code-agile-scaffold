# /setup-workflow

**One command to turn a requirements document into a working AI-driven agile development pipeline.**

`/setup-workflow` is a [Claude Code](https://claude.ai/code) skill, distributed with an npx installer. Point it at an FRD, PRD or BRD and it generates the scaffolding a team needs to build with AI agents: roles, commands, guardrails, standards and a ready-to-work backlog.

## How it works

Five automated phases:

| Phase | What it does |
|---|---|
| **0. FRD Confidence Gate** | Scores the requirements doc 0–100 for implementation readiness and flags gaps and ambiguities before any work starts |
| **1. Discover** | Detects tech stack and repo topology from manifest files |
| **2. Configure** | Generates the project manifest (name, story prefix, agent roster) |
| **3. Scaffold** | Writes every file listed below |
| **4. Verify** | Cross-checks the output and suggests next steps |

## What it generates

- `CLAUDE.md` root contract for all agents
- 4–12 specialist agents, sized to your stack
- 20 slash commands (`/story-develop`, `/epic-develop`, `/sprint-plan`, `/sprint-review`, `/code-review`, …)
- Safety hooks (auto-format, guardrails)
- Coding, git, testing and review standards, plus ADRs and API contract stubs
- A populated backlog: epics, stories that start in `ready` status with acceptance criteria and test plans, and a sprint board

## Install

### Option A: npx

From your project directory:

```bash
npx github:ishaankarnik11/claude-code-agile-scaffold
```

To install into another directory:

```bash
npx github:ishaankarnik11/claude-code-agile-scaffold ./path/to/project
```

This copies the skill to `.claude/skills/setup-workflow/` and adds `HOW-TO-USE.md` to the project root.

### Option B: Manual

```bash
git clone https://github.com/ishaankarnik11/claude-code-agile-scaffold.git
mkdir -p your-project/.claude/skills
cp -r claude-code-agile-scaffold/skill your-project/.claude/skills/setup-workflow
```

Either way, the result should look like this:

```
your-project/
  .claude/skills/setup-workflow/
    SKILL.md
    references/
  docs/your-frd.md        ← your requirements document
```

## Usage

Open Claude Code in your project and run:

```
/setup-workflow
```

Then see [HOW-TO-USE.md](HOW-TO-USE.md) for the daily workflow, generated structure and troubleshooting.

## Design principles

- **Stack-agnostic**: Python, Go, Java/Kotlin, Node, .NET and Rust backends; React, Vue, Angular, Svelte, Next and Nuxt frontends; common SQL/NoSQL databases and migration tools.
- **Sprint board as the single source of truth**: status syncs across stories, epics and the board.
- **Quality gates**: sprints can't close until all stories are done and E2E tests pass. Unresolved failures auto-create bug stories.
- **Human owns git**: agents never commit or push.
- **Resumable**: pipelines pick up from the last checkpoint.

## Repository layout

```
bin/install.js     npx installer
skill/SKILL.md     skill entry point (the orchestrator)
skill/references/  catalogs and rubrics: agents, commands, hooks, standards, templates, FRD scoring, stack detection
HOW-TO-USE.md      user guide
```

## Requirements

- [Claude Code](https://claude.ai/code)
- Node.js 16+ (only for the npx installer)

## License

[MIT](LICENSE) © Ishaan Karnik
