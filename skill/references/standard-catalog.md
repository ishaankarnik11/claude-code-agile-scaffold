# Standard Catalog — Document Templates

> **Purpose**: This file contains the full, project-agnostic templates for every
> coding and process standard generated into `docs/standards/` during the
> `/setup-workflow` skill run. Each template uses `{{VARIABLE}}` placeholders
> that are substituted at generation time.
>
> **Usage**: The skill reads the block between the `<!-- STANDARD: <name> -->`
> and `<!-- /STANDARD -->` delimiters, performs variable substitution, and writes
> the result to `docs/standards/<name>.md`.

---

<!-- ======================================================================= -->
<!-- STANDARD: commit-convention -->
<!-- ======================================================================= -->

# Commit Convention

## Purpose

Ensure every commit in `{{PROJECT_NAME}}` is machine-parseable, reviewer-friendly,
and traceable to a story in the tracker.

## Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Type (required)

| Type       | When to use                                                  |
|------------|--------------------------------------------------------------|
| `feat`     | A new feature or user-visible behavior                       |
| `fix`      | A bug fix                                                    |
| `docs`     | Documentation-only changes                                   |
| `style`    | Whitespace, formatting, missing semicolons — no logic change |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests only                                |
| `chore`    | Build tooling, CI config, dependency bumps                   |
| `perf`     | Performance improvements                                     |
| `security` | Security-related fixes or hardening                          |

### Scope (required when applicable)

The module or area affected. Examples: `auth`, `api`, `ui`, `db`, `ci`,
`{{SCOPE_EXAMPLE}}`.

- Use lowercase kebab-case.
- Omit scope only for truly cross-cutting changes.

### Subject (required)

- 72 characters or fewer.
- Imperative present tense ("add", not "added" or "adds").
- No trailing period.
- Lowercase first letter.

### Body (optional)

- Explain **why**, not **what** — the diff shows the what.
- Wrap at 80 columns.
- Separate from subject with a blank line.

### Footer (required elements)

Every commit **must** include a story reference in the footer:

```
Refs: {{PREFIX}}-<NNN>
```

Where `{{PREFIX}}` is the project tracker prefix and `<NNN>` is the story
number.

For breaking changes add:

```
BREAKING CHANGE: <description of what breaks and migration path>
```

Multiple footers are allowed, each on its own line.

## Examples

### feat — new feature

```
feat(auth): add OAuth2 PKCE flow for mobile clients

Implement the Authorization Code flow with PKCE so mobile apps can
authenticate without a client secret. This replaces the implicit flow
which is deprecated in OAuth 2.1.

Refs: {{PREFIX}}-142
```

### fix — bug fix

```
fix(api): return 404 instead of 500 when resource not found

The generic exception handler was swallowing ResourceNotFoundError and
returning a 500. Now it maps to a proper 404 with a JSON error body.

Refs: {{PREFIX}}-208
```

### docs — documentation

```
docs(readme): add local development setup instructions

Refs: {{PREFIX}}-55
```

### style — formatting

```
style(ui): apply prettier to all tsx files

Refs: {{PREFIX}}-301
```

### refactor — restructure

```
refactor(db): extract query builder into dedicated module

Reduces cyclomatic complexity in the repository layer and makes it
easier to unit-test query construction independently.

Refs: {{PREFIX}}-175
```

### test — tests only

```
test(auth): add edge-case tests for token refresh

Covers scenarios where the refresh token is expired, revoked, or
malformed.

Refs: {{PREFIX}}-142
```

### chore — tooling and deps

```
chore(ci): pin Node version to 20.x in GitHub Actions

Refs: {{PREFIX}}-310
```

### perf — performance

```
perf(api): add database connection pooling

Reduces average response time from 120 ms to 45 ms under load by
reusing connections instead of opening a new one per request.

Refs: {{PREFIX}}-289
```

### security — security hardening

```
security(api): sanitize user input in search endpoint

Prevent stored XSS by escaping HTML entities before persisting
user-supplied search terms.

Refs: {{PREFIX}}-400
```

### Breaking change

```
feat(api): change pagination from offset to cursor-based

BREAKING CHANGE: The `page` and `per_page` query parameters are removed.
Use `cursor` and `limit` instead. See migration guide in docs/migrations/.

Refs: {{PREFIX}}-350
```

## Enforcement

| Layer            | Mechanism                                                   |
|------------------|-------------------------------------------------------------|
| Local            | Pre-commit hook validates format before allowing commit      |
| Code Review      | Reviewer checks story reference and type accuracy            |
| CI (optional)    | commitlint or equivalent runs on PR commits                  |

---

<!-- /STANDARD -->

<!-- ======================================================================= -->
<!-- STANDARD: branching -->
<!-- ======================================================================= -->

# Branching Strategy

## Purpose

Define a simple, trunk-based branching model for `{{PROJECT_NAME}}` that keeps
`main` always deployable and limits work-in-progress.

## Principles

1. **Trunk-based development** with short-lived feature branches.
2. Feature branches live **3 days or fewer**. If a story takes longer, break it
   into smaller stories.
3. `main` (or `master`) is **protected** — no direct commits.
4. Every branch maps to **exactly one story**.
5. Rebase onto `main` — do not create merge commits.
6. Delete the branch immediately after merge.

## Branch Naming Convention

All branch names **must** include the story ID from the tracker.

| Branch type | Pattern                                          | Example                                |
|-------------|--------------------------------------------------|----------------------------------------|
| Feature     | `feat/{{PREFIX}}-<NNN>-<kebab-title>`            | `feat/{{PREFIX}}-142-oauth-pkce`       |
| Bug fix     | `fix/{{PREFIX}}-<NNN>-<kebab-title>`             | `fix/{{PREFIX}}-208-404-on-missing`    |
| Hotfix      | `hotfix/{{PREFIX}}-<NNN>-<kebab-title>`          | `hotfix/{{PREFIX}}-401-xss-search`     |

### Rules

- `<kebab-title>` is a short, lowercase, hyphen-separated summary (2-5 words).
- The story ID (`{{PREFIX}}-<NNN>`) is **mandatory**.
- No uppercase letters, no underscores, no trailing hyphens.

## Protected Branches

| Branch   | Protection rules                                              |
|----------|---------------------------------------------------------------|
| `main`   | Require PR, at least 1 approval, status checks pass, squash merge only |

## Workflow

```
main ──────────────────────────────────────────────────────►
  \                                          /
   feat/{{PREFIX}}-142-oauth-pkce ──────────► (squash merge, delete branch)
```

1. Pull latest `main`.
2. Create branch: `git checkout -b feat/{{PREFIX}}-<NNN>-<kebab-title>`.
3. Develop in small, compilable commits.
4. Rebase onto latest `main` before opening PR: `git fetch origin && git rebase origin/main`.
5. Open PR (see `git-workflow.md`).
6. After approval and merge, delete the remote branch.

## Hotfix Flow

Hotfixes follow the same model but use the `hotfix/` prefix and are prioritized
for immediate review and merge. After merging to `main`, verify the fix in
production before closing the incident story.

## Multi-Repo Projects

When `{{PROJECT_NAME}}` spans multiple repositories, use the **same branch name**
in each affected repo so cross-repo changes are easy to correlate.

Example: if `feat/{{PREFIX}}-142-oauth-pkce` touches both the backend and
frontend repos, create a branch with that exact name in both repos.

## What NOT to Do

- Do not create long-lived `develop` or `staging` branches.
- Do not push directly to `main`.
- Do not leave merged branches lying around.
- Do not use merge commits — always rebase.
- Do not work on multiple stories in one branch.

---

<!-- /STANDARD -->

<!-- ======================================================================= -->
<!-- STANDARD: git-workflow -->
<!-- ======================================================================= -->

# Git Workflow

## Purpose

Define the end-to-end git workflow for `{{PROJECT_NAME}}`, from branch creation
to merge, ensuring traceability, quality, and a clean commit history.

## Related Standards

- [Branching Strategy](branching.md) — branch naming and lifecycle
- [Commit Convention](commit-convention.md) — commit message format
- [Code Review](code-review.md) — review process and checklist

## Branch Naming

Follow the conventions defined in [branching.md](branching.md). Every branch
name includes the story ID.

## Commit Rhythm

- Make **small, logical commits**. Each commit should represent one coherent
  change.
- The codebase must **compile and pass linting** after every commit. Do not
  commit broken code.
- Commit frequently — at least once per meaningful unit of work.
- Follow the [commit convention](commit-convention.md) for every message.

## Pull Request Rules

### One Story per PR

Each PR maps to exactly one story. Do not bundle unrelated changes.

### PR Title

```
{{PREFIX}}-<NNN>: <story title>
```

Example: `{{PREFIX}}-142: Add OAuth2 PKCE flow for mobile clients`

### PR Body

The PR description must include:

1. **Story link**: Link to the story in the tracker.
2. **Acceptance Criteria checklist**: Copy the AC from the story and check each
   item that is satisfied.
3. **Test evidence**: Summary of tests added or updated. Include coverage
   numbers if available.
4. **Screenshots / recordings**: Required for any UI changes. Before/after
   screenshots or a short screen recording.
5. **Notes for reviewer**: Anything the reviewer should pay special attention to.

### PR Template

```markdown
## Story

[{{PREFIX}}-<NNN>]({{TRACKER_URL}}/{{PREFIX}}-<NNN>)

## Acceptance Criteria

- [ ] AC 1
- [ ] AC 2
- [ ] AC 3

## Test Evidence

- Unit tests: X added, Y updated
- Coverage on changed files: Z%

## Screenshots

<!-- Attach before/after screenshots for UI changes -->

## Notes for Reviewer

<!-- Anything the reviewer should focus on -->
```

### Approval Requirements

- At least **1 reviewer approval** is required before merge.
- The designated code-reviewer agent (or human reviewer) provides the approval.
- Status checks (lint, tests, build) must pass.

### Merge Strategy

- **Squash merge** — one commit per story on `main`.
- The squash commit message follows the commit convention:
  `feat(auth): add OAuth2 PKCE flow — Refs: {{PREFIX}}-142`
- Delete the branch after merge.

## Protected Branch Rules

| Rule                         | Setting  |
|------------------------------|----------|
| Direct commits to `main`     | Blocked  |
| Force push to `main`         | Blocked  |
| PR required                  | Yes      |
| Minimum approvals            | 1        |
| Status checks must pass      | Yes      |
| Merge method                 | Squash   |

## Agent Boundaries

Agents (AI coding assistants) are authorized to **write code only**. They must
**never**:

- Commit changes
- Push branches
- Merge pull requests
- Run database migrations
- Deploy to any environment

All git operations are performed by a human operator.

## Suggested Commit Message

Use the `/commit <repo>` command to generate a suggested commit message based
on staged changes. The human operator reviews and applies the suggestion.

## Step-by-Step Workflow

1. **Pick a story** — move it to "In Progress" on the sprint board.
2. **Pull latest main** — `git checkout main && git pull origin main`.
3. **Create branch** — `git checkout -b feat/{{PREFIX}}-<NNN>-<kebab-title>`.
4. **Develop** — write code in small, compilable commits.
5. **Run tests locally** — `{{BACKEND_TEST_CMD}}` / `{{FRONTEND_TEST_CMD}}`.
6. **Rebase onto main** — `git fetch origin && git rebase origin/main`.
7. **Push branch** — `git push origin feat/{{PREFIX}}-<NNN>-<kebab-title>`.
8. **Open PR** — fill out the PR template completely.
9. **Request review** — assign the code-reviewer agent or a human reviewer.
10. **Address feedback** — fix issues, push new commits, re-request review.
11. **Merge** — squash merge after approval and passing checks.
12. **Delete branch** — remove the remote branch.
13. **Update story** — move to "Done" on the sprint board.

---

<!-- /STANDARD -->

<!-- ======================================================================= -->
<!-- STANDARD: code-review -->
<!-- ======================================================================= -->

# Code Review Standards

## Purpose

Define how code reviews are conducted in `{{PROJECT_NAME}}` to ensure
correctness, safety, and maintainability while keeping the feedback loop fast.

## Reviewer Responsibilities

Reviewers evaluate changes in this priority order:

1. **Correctness** — Does the code do what it should? Are there logic errors?
2. **Safety** — Are there security vulnerabilities, data leaks, or unsafe
   operations?
3. **Maintainability** — Is the code readable, well-structured, and
   maintainable?

## Review Checklist

### Story Fidelity

- [ ] Does the code implement what the story asks for?
- [ ] Are all acceptance criteria addressed?
- [ ] Is the scope limited to the story — no unrelated changes?

### Correctness and Safety

- [ ] No logic errors in conditionals, loops, or state transitions
- [ ] Null/undefined handling — no unguarded access to nullable values
- [ ] Error propagation — errors are caught, logged, and surfaced appropriately
- [ ] No SQL injection vectors (parameterized queries or ORM used)
- [ ] No XSS vectors (user input is escaped before rendering)
- [ ] No hardcoded secrets, tokens, or credentials
- [ ] No PII logged or exposed in error messages
- [ ] Race conditions considered for concurrent operations

### Contract Discipline

- [ ] API request/response shapes match the contracts in `docs/contracts/`
- [ ] Breaking changes to APIs are documented and versioned
- [ ] Database schema changes have a corresponding migration script
- [ ] No undocumented side effects (e.g., modifying global state, writing files)

### Tests

- [ ] Coverage on new/changed code is at or above **{{COVERAGE_THRESHOLD}}%**
- [ ] All acceptance criteria scenarios have corresponding tests
- [ ] Edge cases are covered (empty input, boundary values, error paths)
- [ ] Tests are deterministic — no dependency on external services or timing
- [ ] Test names clearly describe what is being tested

### Maintainability

- [ ] Naming is clear and consistent with project conventions
- [ ] No unnecessary duplication — shared logic is extracted
- [ ] Cyclomatic complexity is reasonable (no deeply nested conditionals)
- [ ] File organization follows project structure conventions
- [ ] Comments explain "why", not "what" — the code should be self-documenting
- [ ] No TODO/FIXME/HACK left without a linked story

## Blocker vs Nit

| Category   | Definition                                          | Action required         |
|------------|-----------------------------------------------------|-------------------------|
| **Blocker** | Must be fixed before merge. Correctness, safety, or contract violation. | Author must resolve.    |
| **Nit**     | Style preference, minor improvement, or suggestion. Does not affect correctness. | Author may defer to a follow-up story. Do not block merge on nits. |

Always prefix nit comments with `nit:` so the author knows it is non-blocking.

## Finding Format

When leaving a review comment, use this structured format:

```
**[Category]** `file:line`

Issue: <description of the problem>

Suggested fix: <concrete suggestion or code snippet>

Route to: <Blocker | Nit>
```

### Categories

| Category             | Code    |
|----------------------|---------|
| Story fidelity       | `STORY` |
| Correctness          | `CORR`  |
| Safety / Security    | `SEC`   |
| Contract discipline  | `CONT`  |
| Test coverage        | `TEST`  |
| Maintainability      | `MAINT` |
| Performance          | `PERF`  |

### Example

```
**[SEC]** `src/api/users.py:45`

Issue: User-supplied `search_term` is interpolated directly into the SQL query,
creating a SQL injection vector.

Suggested fix: Use parameterized query:
    cursor.execute("SELECT * FROM users WHERE name LIKE %s", [f"%{search_term}%"])

Route to: Blocker
```

## Author Norms

- Keep PRs small — ideally under 400 lines of meaningful changes.
- Respond to **every** review comment, even if it is just "Done" or "Will
  address in follow-up story {{PREFIX}}-<NNN>".
- After addressing all blockers, push new commits and re-request review.
- Do not resolve reviewer comments yourself — let the reviewer verify and
  resolve.

## Turnaround

- Reviews should be completed within **4 working hours** of request.
- If a reviewer cannot review in time, they must reassign to another reviewer.

---

<!-- /STANDARD -->

<!-- ======================================================================= -->
<!-- STANDARD: testing-strategy -->
<!-- ======================================================================= -->

# Testing Strategy

## Purpose

Define the testing approach for `{{PROJECT_NAME}}` to ensure quality while
keeping feedback loops fast. Tests are the primary safety net — they must be
reliable, fast, and meaningful.

## Test Pyramid

```
        ┌───────┐
        │  E2E  │   Few — critical flows only
       ─┤       ├─
      ┌─┤       ├─┐
      │ Integration │   Every endpoint, happy + primary failure
     ─┤             ├─
    ┌─┤             ├─┐
    │    Unit Tests    │   Many — all logic, validation, transforms
    └──────────────────┘
```

More unit tests than integration tests. More integration tests than E2E tests.
The base of the pyramid runs fast and offline. The top runs slower and is
opt-in.

## Unit Tests

### Target

- Coverage threshold: **{{COVERAGE_THRESHOLD}}%** on changed files.
- Every PR must meet or exceed this threshold on new and modified code.

### What to Test

- Pure business logic and algorithms
- Input validation and sanitization
- Data transformations and mappings
- State transitions and finite state machines
- Error handling paths
- Utility and helper functions
- Edge cases: empty input, boundary values, null/undefined, large inputs

### What NOT to Unit Test

- Framework boilerplate (routing config, DI wiring)
- Third-party library internals
- Simple getters/setters with no logic

### Mocking

- **Mock all external dependencies**: database, HTTP APIs, file system, LLM
  calls, message queues.
- Tests must be **fast** (< 5 seconds total for the unit suite) and **offline**
  (no network calls).
- Use the project's standard mocking library — do not introduce alternatives.

### Commands

| Layer    | Command                  |
|----------|--------------------------|
| Backend  | `{{BACKEND_TEST_CMD}}`   |
| Frontend | `{{FRONTEND_TEST_CMD}}`  |

### Conventions

- Test files live next to the source file or in a parallel `tests/` directory,
  depending on project convention.
- Test file naming: `<module>.test.<ext>` or `test_<module>.<ext>`.
- Test names describe the scenario: `should return 404 when user not found`.
- One logical assertion per test. Multiple asserts are acceptable only when
  verifying a single behavior from different angles.
- No test interdependencies — each test sets up its own state.

## Integration Tests

### Target

- Every API endpoint must have at least:
  - One **happy path** test
  - One **primary failure mode** test (e.g., 400, 401, 404, 409)

### Scope

- Test the full request-response cycle through the application stack.
- Run against a **real test database** (not production) — seeded with known data
  and reset between test runs.
- Verify HTTP status codes, response shapes, headers, and side effects (e.g.,
  database state after a POST).

### Backend

- Mark integration tests with `@integration` (or equivalent marker/tag).
- Integration tests are **opt-in** — they do not run as part of the default test
  command.
- Run command: `{{BACKEND_TEST_CMD}} --integration` (or equivalent).

### Frontend

- Use **MSW** (Mock Service Worker) or an equivalent API mocking layer to
  intercept network requests.
- Test component behavior when APIs return success, error, and loading states.

### Conventions

- Integration test files are clearly separated from unit tests (e.g.,
  `<module>.integration.test.<ext>` or placed in an `integration/` directory).
- Each test is self-contained — sets up data, runs the operation, asserts, and
  cleans up.

## E2E Tests

### Target

- Cover **critical user flows only**:
  - Login / authentication
  - Primary CRUD operations (the core value of the application)
  - Checkout or payment flows (if applicable)
  - Any flow where failure has high business impact

### Tool

- **Playwright** (recommended) in headed mode for debugging, headless in CI.

### Conventions

- E2E tests live in a dedicated `e2e/` directory at the project root.
- Test files are named by flow: `login.e2e.test.<ext>`, `create-order.e2e.test.<ext>`.
- E2E tests run during **sprint review** as a gate — they are not part of the
  default test command or PR checks.
- Keep E2E tests focused on user-visible behavior, not implementation details.
- Use stable selectors (`data-testid` attributes) — never rely on CSS classes
  or DOM structure.

## Security Testing

### What to Test

| Category            | What to verify                                          |
|---------------------|---------------------------------------------------------|
| RBAC enforcement    | Users cannot access resources outside their role        |
| Auth bypass         | Protected endpoints reject unauthenticated requests     |
| Rate limiting       | Endpoints enforce rate limits and return 429             |
| Input sanitization  | Malicious input (XSS, SQL injection) is neutralized     |
| Token handling      | Expired/revoked/malformed tokens are rejected           |

### Where

- RBAC and auth tests belong in the **integration** test suite.
- Input sanitization tests belong in **unit** tests.
- Rate limiting tests belong in **integration** tests.

## Flaky Test Policy

**Zero tolerance for flaky tests.**

- A flaky test is any test that passes and fails without code changes.
- When a flaky test is detected:
  1. **Quarantine** it immediately (skip/disable with a comment linking to a bug
     story).
  2. **Create a bug story** to investigate and fix the root cause.
  3. **Fix or remove** the test within the current sprint.
- Common causes: timing dependencies, shared mutable state, external service
  calls, non-deterministic data.

## Default vs Opt-In Test Runs

| Suite        | When it runs                         | Network required |
|--------------|--------------------------------------|------------------|
| Unit         | Every commit, PR check, CI pipeline  | No               |
| Integration  | Opt-in (`--integration` flag)        | Local DB only    |
| E2E          | Sprint review gate, manual trigger   | Full stack       |

The **default test run** (`{{BACKEND_TEST_CMD}}` / `{{FRONTEND_TEST_CMD}}`)
executes **unit tests only** and must be fast and offline.

---

<!-- /STANDARD -->

<!-- ======================================================================= -->
<!-- STANDARD: team-workflow -->
<!-- ======================================================================= -->

# Team Workflow

## Purpose

Define how the team operates day-to-day on `{{PROJECT_NAME}}`, from story
creation through delivery. This is the single authoritative reference for the
team's process.

## Related Standards

All team members must be familiar with these companion documents:

| Standard                                              | Governs                                  |
|-------------------------------------------------------|------------------------------------------|
| [Commit Convention](commit-convention.md)             | Commit message format                    |
| [Branching Strategy](branching.md)                    | Branch naming and lifecycle              |
| [Git Workflow](git-workflow.md)                       | PR rules, merge strategy, protected branches |
| [Code Review](code-review.md)                        | Review checklist and feedback format     |
| [Testing Strategy](testing-strategy.md)              | Test pyramid, coverage, flaky test policy |
| [Backend API Standards](backend-api-standards.md)    | Backend code conventions                 |
| [Frontend UI Standards](frontend-ui-standards.md)    | Frontend code conventions                |

## Story Lifecycle

```
draft ──► ready ──► in-progress ──► review ──► done
                        │                        ▲
                        └── blocked ─────────────┘
```

| Status        | Definition                                                       |
|---------------|------------------------------------------------------------------|
| `draft`       | Story exists but is not yet fully specified.                     |
| `ready`       | Story has passed Definition of Ready (see below). Can be picked up. |
| `in-progress` | A developer is actively working on the story.                    |
| `review`      | PR is open and awaiting code review.                             |
| `blocked`     | Work cannot continue due to an external dependency or open question. |
| `done`        | Code merged, tests pass, story verified against AC.              |

## Sprint Ceremonies

| Ceremony       | Command              | Cadence          | Purpose                                        |
|----------------|----------------------|------------------|-------------------------------------------------|
| Sprint Planning | `/sprint-plan`      | Start of sprint  | Select stories, assign owners, set sprint goal  |
| Daily Sync      | `/daily-sync`       | Daily            | Surface blockers, sync progress                 |
| Sprint Review   | `/sprint-review`    | End of sprint    | Demo completed work, run E2E gate, retrospect   |

## Story Commands

| Command           | Purpose                                                      |
|-------------------|--------------------------------------------------------------|
| `/story-create`   | Create a new story with AC, tasks, and size estimate         |
| `/epic-develop`   | Break an epic into stories and plan the development sequence |
| `/story-develop`  | Develop a story end-to-end (code, tests, PR)                 |

## Quality Gates

| Gate                   | Command               | When                          | What it checks                                            |
|------------------------|-----------------------|-------------------------------|-----------------------------------------------------------|
| Definition of Ready    | `/story-ready-check`  | Before moving to `ready`      | AC defined, dependencies resolved, design approved        |
| Definition of Done     | `/story-done-check`   | Before moving to `done`       | Code merged, tests pass, AC verified, docs updated        |
| Code Review            | `/code-review`        | Before merge                  | Full review checklist (see code-review.md)                |
| E2E Gate               | `/e2e-run`            | Sprint review                 | Critical user flows pass end-to-end                       |

## Sprint Board as Single Source of Truth

The sprint board is the **single source of truth** for project status. All other
views (epics, trackers, dashboards) derive from it.

### Status Sync Rules

Every time a story's status changes, the following must be updated **together**:

1. **Story status** on the sprint board
2. **Epic progress** (if the story belongs to an epic)
3. **Tracker** (external tool, if used)
4. **Any linked artifacts** (PR description, related stories)

No status change is complete until all four are in sync.

## Bug Auto-Creation

When `/story-develop` encounters an issue it cannot resolve (e.g., a failing
test caused by an external dependency, or an ambiguous AC), it **escalates**:

1. Logs the issue in the current story.
2. If the issue is a defect in existing code, creates a **new bug story**
   automatically with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Link to the originating story
3. The bug story enters the backlog for triage.

## Sprint Done Gate

A sprint is considered **done** only when:

- [ ] All committed stories are in `done` status
- [ ] E2E tests pass (`/e2e-run`)
- [ ] Sprint review ceremony is completed
- [ ] Retrospective action items are logged

If any story is not done, it rolls over to the next sprint with a note
explaining why.

## Escalation Protocol

**When in doubt, stop and ask.**

- Do not invent requirements, assume business rules, or guess at unclear AC.
- Log the question as an **open question** in the story.
- Tag the relevant stakeholder for resolution.
- Do not resume work on the ambiguous part until the question is answered.

## Golden Rules

1. **Ask when in doubt** — never invent requirements or make assumptions.
2. **Document open questions** — every unresolved question is logged in the
   story and tracked to resolution.
3. **No secrets or PII in any file** — no API keys, passwords, tokens, or
   personally identifiable information in code, configs, docs, or stories.
4. **FRD is immutable** — the Functional Requirements Document is the
   authoritative source. Changes go through a formal change request process.
5. **One story = one repo** — unless the story explicitly requires cross-repo
   changes with architect sign-off.
6. **Agents never commit, push, or run migrations** — AI agents write code and
   suggest commands. Humans execute all git operations, migrations, and
   deployments.

---

<!-- /STANDARD -->

<!-- ======================================================================= -->
<!-- STANDARD: backend-api-standards -->
<!-- ======================================================================= -->

# Backend API Standards

## Purpose

Define coding conventions, folder structure, and architectural patterns for the
`{{PROJECT_NAME}}` backend built with **{{BACKEND_FRAMEWORK}}**
({{BACKEND_LANGUAGE}}).

## Folder Structure

```
{{BACKEND_ROOT}}/
├── {{BACKEND_SRC_DIR}}/
│   ├── {{CONFIG_DIR}}/           # App configuration, env loading
│   │   ├── settings.{{BACKEND_EXT}}
│   │   └── database.{{BACKEND_EXT}}
│   ├── {{MODELS_DIR}}/           # Database models / entities
│   │   └── user.{{BACKEND_EXT}}
│   ├── {{SCHEMAS_DIR}}/          # Request/response schemas (DTOs, serializers)
│   │   └── user.{{BACKEND_EXT}}
│   ├── {{ROUTES_DIR}}/           # Route definitions / controllers
│   │   └── user.{{BACKEND_EXT}}
│   ├── {{SERVICES_DIR}}/         # Business logic layer
│   │   └── user.{{BACKEND_EXT}}
│   ├── {{REPOSITORIES_DIR}}/     # Data access layer
│   │   └── user.{{BACKEND_EXT}}
│   ├── {{MIDDLEWARE_DIR}}/        # Middleware (auth, logging, error handling)
│   │   ├── auth.{{BACKEND_EXT}}
│   │   └── error_handler.{{BACKEND_EXT}}
│   ├── {{UTILS_DIR}}/            # Shared utilities and helpers
│   │   └── pagination.{{BACKEND_EXT}}
│   └── {{MAIN_ENTRY}}            # Application entry point
├── {{BACKEND_TEST_DIR}}/         # Tests (mirrors src structure)
│   ├── unit/
│   └── integration/
├── {{MIGRATIONS_DIR}}/           # Database migration scripts
└── {{BACKEND_CONFIG_FILES}}      # Config files (requirements.txt, package.json, go.mod, etc.)
```

> Adjust directory names to match the conventions of **{{BACKEND_FRAMEWORK}}**.
> The layering (routes -> services -> repositories -> models) is mandatory
> regardless of framework.

## Naming Conventions

| Element              | Convention                          | Example                        |
|----------------------|-------------------------------------|--------------------------------|
| Files                | {{BACKEND_FILE_CASE}}               | {{BACKEND_FILE_EXAMPLE}}       |
| Functions / methods  | {{BACKEND_FUNC_CASE}}               | {{BACKEND_FUNC_EXAMPLE}}       |
| Classes / types      | PascalCase                          | `UserService`, `OrderModel`    |
| Constants            | UPPER_SNAKE_CASE                    | `MAX_RETRY_COUNT`              |
| Database tables      | snake_case, plural                  | `users`, `order_items`         |
| Database columns     | snake_case                          | `created_at`, `is_active`      |
| API endpoints        | kebab-case, plural nouns            | `/api/v1/user-profiles`        |
| Environment vars     | UPPER_SNAKE_CASE                    | `DATABASE_URL`                 |

## API Response Format

All API responses use a **standardized wrapper**:

### Success Response

```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

- `data` contains the payload (object or array).
- `meta` is included only for paginated responses.

### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User with ID 42 not found.",
    "details": []
  }
}
```

- `code` is a machine-readable error code (UPPER_SNAKE_CASE).
- `message` is a human-readable description.
- `details` is an optional array of field-level errors (for validation).

### Validation Error Response

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address."
      },
      {
        "field": "age",
        "message": "Must be a positive integer."
      }
    ]
  }
}
```

## HTTP Status Code Conventions

| Status | When to use                                                   |
|--------|---------------------------------------------------------------|
| `200`  | Successful GET, PUT, PATCH                                    |
| `201`  | Successful POST that creates a resource                       |
| `204`  | Successful DELETE (no body)                                    |
| `400`  | Validation error, malformed request                           |
| `401`  | Missing or invalid authentication                             |
| `403`  | Authenticated but not authorized for this resource            |
| `404`  | Resource not found                                            |
| `409`  | Conflict (duplicate resource, optimistic lock failure)        |
| `422`  | Semantic validation error (valid syntax but business rule violation) |
| `429`  | Rate limit exceeded                                           |
| `500`  | Unhandled server error (should never happen intentionally)    |

## Error Handling

### Centralized Error Handler

All errors flow through a **single error-handling middleware** that:

1. Catches all unhandled exceptions.
2. Maps known exception types to appropriate HTTP status codes.
3. Formats the response using the standard error wrapper.
4. Logs the error with context (request ID, user ID, endpoint).
5. **Never exposes stack traces or internal details** in production responses.

### Error Propagation

- Service layer throws **domain-specific exceptions** (e.g.,
  `ResourceNotFoundError`, `AuthorizationError`).
- The error handler maps these to HTTP status codes.
- Do not catch exceptions silently — either handle them meaningfully or let them
  propagate.

## Validation

### Request Validation (Schema Layer)

- Validate request body, query parameters, and path parameters at the
  **schema/DTO layer** before reaching the service.
- Use {{BACKEND_FRAMEWORK}}'s native validation or a dedicated validation
  library.
- Return `400` with detailed field-level errors.

### Business Validation (Service Layer)

- Business rules (e.g., "user cannot have more than 5 active orders") are
  validated in the **service layer**.
- Return `422` for business rule violations.

## Database Access

### ORM First

- All database access goes through the **ORM** ({{ORM_NAME}}).
- No raw SQL unless there is a justified performance reason, documented in a
  code comment with a link to the relevant story.

### Repository Pattern

- Database queries live in the **repository layer**, not in services or routes.
- Services call repositories — they never construct queries directly.
- Repositories return domain objects, not raw database rows.

### Transactions

- Multi-step writes that must be atomic are wrapped in a **database
  transaction**.
- The service layer owns the transaction boundary.

## Migration Discipline

- **Every schema change** (new table, new column, index, constraint) requires a
  **migration script**.
- Migrations are **versioned and sequential** (e.g., `001_create_users.sql`,
  `002_add_email_index.sql`).
- Agents write migration scripts but **never execute them**. A human operator
  runs migrations.
- Migrations must be **reversible** — include both `up` and `down` operations.
- Never modify a migration that has already been applied. Create a new migration
  instead.

## Async Patterns

> _This section applies if the backend uses async capabilities._

- Use **{{ASYNC_PATTERN}}** for I/O-bound operations (database queries, HTTP
  calls, file operations).
- CPU-bound tasks should be offloaded to a **background worker / task queue**
  ({{TASK_QUEUE}}).
- Never block the event loop with synchronous I/O.

## Logging Conventions

| Level    | When to use                                                    |
|----------|----------------------------------------------------------------|
| `ERROR`  | Unhandled exceptions, failed operations that need attention    |
| `WARN`   | Recoverable issues, deprecated usage, approaching limits      |
| `INFO`   | Request start/end, significant business events, state changes  |
| `DEBUG`  | Detailed diagnostic info, variable values (dev/staging only)   |

### Rules

- Use **structured logging** (JSON format) — not plain text.
- Include **request ID** in every log entry for traceability.
- **Never log** secrets, tokens, passwords, or PII.
- Log at the **service layer**, not in routes or repositories (avoid duplicate
  logs).

## Security

- All endpoints require **authentication** unless explicitly marked as public.
- Use **role-based access control** (RBAC) enforced at the middleware layer.
- Validate and sanitize all user input — trust nothing from the client.
- Use **parameterized queries** — never interpolate user input into SQL.
- Set appropriate **CORS** configuration — do not use `*` in production.
- Rate-limit sensitive endpoints (login, registration, password reset).

---

<!-- /STANDARD -->

<!-- ======================================================================= -->
<!-- STANDARD: frontend-ui-standards -->
<!-- ======================================================================= -->

# Frontend UI Standards

## Purpose

Define coding conventions, component organization, and UI patterns for the
`{{PROJECT_NAME}}` frontend built with **{{FRONTEND_FRAMEWORK}}**
({{FRONTEND_LANGUAGE}}).

## Folder Structure

```
{{FRONTEND_ROOT}}/
├── {{FRONTEND_SRC_DIR}}/
│   ├── {{PAGES_DIR}}/             # Page-level components (one per route)
│   │   ├── {{DASHBOARD_EXAMPLE}}
│   │   └── {{LOGIN_EXAMPLE}}
│   ├── {{COMPONENTS_DIR}}/        # Reusable UI components
│   │   ├── {{COMMON_DIR}}/        # Generic components (Button, Modal, Input)
│   │   └── {{FEATURE_DIR}}/       # Feature-specific components
│   ├── {{HOOKS_DIR}}/             # Custom hooks / composables
│   │   └── {{HOOK_EXAMPLE}}
│   ├── {{API_DIR}}/               # API client and endpoint definitions
│   │   ├── client.{{FRONTEND_EXT}}
│   │   └── {{API_ENDPOINT_EXAMPLE}}
│   ├── {{STORE_DIR}}/             # State management ({{STATE_MANAGEMENT}})
│   │   └── {{STORE_EXAMPLE}}
│   ├── {{STYLES_DIR}}/            # Global styles and design tokens
│   │   ├── tokens.{{STYLE_EXT}}
│   │   └── global.{{STYLE_EXT}}
│   ├── {{TYPES_DIR}}/             # Shared type definitions
│   │   └── {{TYPES_EXAMPLE}}
│   ├── {{UTILS_DIR}}/             # Utility functions
│   │   └── {{UTILS_EXAMPLE}}
│   ├── {{ROUTER_FILE}}            # Route definitions
│   └── {{APP_ENTRY}}              # Application entry point
├── {{FRONTEND_TEST_DIR}}/         # Tests (mirrors src structure)
├── {{PUBLIC_DIR}}/                # Static assets
└── {{FRONTEND_CONFIG_FILES}}      # Config files (package.json, tsconfig, vite.config, etc.)
```

> Adjust directory names to match the conventions of **{{FRONTEND_FRAMEWORK}}**.

## Naming Conventions

| Element               | Convention              | Example                          |
|-----------------------|-------------------------|----------------------------------|
| Component files       | PascalCase              | `UserProfile.{{FRONTEND_EXT}}`   |
| Component names       | PascalCase              | `UserProfile`, `OrderList`       |
| Hook/composable files | camelCase               | `useAuth.{{FRONTEND_EXT}}`       |
| Hook/composable names | camelCase with `use` prefix | `useAuth`, `usePagination`    |
| Utility files         | camelCase               | `formatDate.{{FRONTEND_EXT}}`    |
| Type/interface files  | PascalCase              | `User.{{FRONTEND_EXT}}`          |
| CSS class names       | {{CSS_CLASS_CONVENTION}}| {{CSS_CLASS_EXAMPLE}}            |
| Constants             | UPPER_SNAKE_CASE        | `MAX_FILE_SIZE`                  |
| Route paths           | kebab-case              | `/user-profile`, `/order-history`|

## Component Organization

### Component Structure

Each component file follows a consistent internal structure:

1. Imports (external libraries, then internal modules)
2. Type definitions / interfaces (if not in a separate types file)
3. Component definition
4. Styles (if co-located)

### Component Size

- Components should be **under 200 lines**. If a component exceeds this, break
  it into smaller sub-components.
- Extract logic into custom hooks/composables when a component has complex state
  management or side effects.

### Props

- Define explicit **type interfaces** for all component props.
- Use descriptive prop names — avoid abbreviations.
- Provide **default values** where sensible.
- Document non-obvious props with comments.

## State Management

### Approach: {{STATE_MANAGEMENT}}

- **Local state** for UI-only concerns (form inputs, toggles, modals).
- **Global state** ({{STATE_MANAGEMENT}}) for data shared across multiple
  components or pages.
- Keep global state **minimal** — if only one component uses it, it should be
  local state.

### Rules

- State shape is defined with **typed interfaces**.
- Actions/mutations have **descriptive names** that indicate intent.
- Async operations (API calls) live in **dedicated actions/thunks**, not in
  components.
- Never mutate state directly — always use the prescribed state update mechanism.

## UI Component Library

### Library: {{COMPONENT_LIB}}

- Use **{{COMPONENT_LIB}}** as the primary UI component library.
- Do not mix multiple component libraries — consistency is more important than
  finding the "perfect" component.
- When {{COMPONENT_LIB}} does not provide a needed component, build a custom one
  that matches the library's design language.
- Wrap third-party components in project-specific wrappers when you need to
  enforce consistent props or behavior.

## CSS Approach

### Method: {{CSS_APPROACH}}

- Use **{{CSS_APPROACH}}** for all styling.
- **No inline styles** — all styles must go through the defined CSS approach.
- Use design tokens for all visual values (see below).

## Design Tokens

All visual values are centralized in design tokens. **Never hardcode** colors,
spacing, font sizes, or other visual values directly in components.

### Token Categories

| Category     | What it covers                          | Example token              |
|--------------|-----------------------------------------|----------------------------|
| Colors       | Brand, semantic, neutral, feedback      | `--color-primary-500`      |
| Spacing      | Margins, padding, gaps                  | `--space-4`, `--space-8`   |
| Typography   | Font families, sizes, weights, line heights | `--font-size-body`     |
| Borders      | Border widths, radii                    | `--radius-md`              |
| Shadows      | Box shadows, text shadows               | `--shadow-card`            |
| Breakpoints  | Responsive breakpoints                  | `--breakpoint-md`          |
| Z-index      | Stacking layers                         | `--z-modal`, `--z-tooltip` |

### Token Usage

```css
/* Correct — uses design tokens */
.card {
  background-color: var(--color-surface);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

/* Incorrect — hardcoded values */
.card {
  background-color: #ffffff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

## Accessibility Requirements

Accessibility is **mandatory**, not optional.

### Keyboard Navigation

- All interactive elements must be **reachable and operable via keyboard**.
- Focus order follows a logical reading order.
- Custom components implement standard keyboard patterns (e.g., arrow keys for
  lists, Escape to close modals).

### Focus States

- Every interactive element has a **visible focus indicator**.
- Do not remove the default focus outline without providing an alternative.

### ARIA Labels

- Use semantic HTML elements first (`<button>`, `<nav>`, `<main>`, `<form>`).
- Add `aria-label`, `aria-labelledby`, or `aria-describedby` when semantic HTML
  alone is insufficient.
- Dynamic content updates use `aria-live` regions.

### Screen Reader Support

- Images have meaningful `alt` text (or `alt=""` for decorative images).
- Form inputs have associated `<label>` elements.
- Error messages are programmatically associated with their inputs.
- Page titles update on route changes.

### Color Contrast

- Text must meet **WCAG 2.1 AA** contrast ratios:
  - Normal text: 4.5:1
  - Large text: 3:1
- Do not rely on color alone to convey information.

## Responsive Breakpoints

| Name    | Min width | Target devices              |
|---------|-----------|-----------------------------|
| `xs`    | 0px       | Small phones                |
| `sm`    | 640px     | Large phones                |
| `md`    | 768px     | Tablets                     |
| `lg`    | 1024px    | Small desktops / landscape tablets |
| `xl`    | 1280px    | Desktops                    |
| `2xl`   | 1536px    | Large desktops              |

- Design **mobile-first** — base styles target the smallest screen, then use
  `min-width` media queries to add complexity.
- Test all pages at every breakpoint.

## Form Handling

### Conventions

- Use a **form library** ({{FORM_LIB}}) for complex forms — do not manage form
  state manually for forms with more than 3 fields.
- Validation schema defined separately from the component (reusable, testable).
- Show **inline validation errors** next to the relevant field.
- Disable submit button while the form is submitting (prevent double submission).
- Show a **loading indicator** during async submission.
- Handle and display **server-side errors** gracefully.

### Validation

- **Client-side validation** for immediate feedback (required fields, format,
  length).
- **Server-side validation** is authoritative — never trust client-side
  validation alone.
- Display validation errors **on blur** and **on submit**, not on every
  keystroke.

## Testing Approach

### Component Tests

- Use **Testing Library** ({{TESTING_LIB}}) for all component tests.
- Test **user behavior**, not implementation details.
- Use **user-centric queries** in this priority order:
  1. `getByRole` — accessible role queries (preferred)
  2. `getByLabelText` — form element queries
  3. `getByPlaceholderText` — fallback for inputs
  4. `getByText` — visible text queries
  5. `getByTestId` — last resort only

### What to Test

- Component renders correctly with various prop combinations
- User interactions (click, type, select) produce expected outcomes
- Loading, error, and empty states render correctly
- Conditional rendering logic works
- Accessibility: focus management, keyboard navigation

### What NOT to Test

- Internal state implementation
- CSS class names or inline styles
- Third-party library internals
- Snapshot tests (they are brittle and low-signal)

## Icons

- Use a **consistent icon library** ({{ICON_LIB}}).
- Do not use emoji or Unicode symbols as icons.
- Icons must have accessible labels (`aria-label` or accompanying text).
- Use consistent icon sizes that align with the design token scale.

## Miscellaneous Rules

- **No inline styles** — use the defined CSS approach.
- **No `console.log`** in committed code — use the project's logging utility
  or remove before committing.
- **No `any` type** (TypeScript) or equivalent type escape hatches unless
  justified with a comment.
- **No magic numbers** — extract into named constants or design tokens.
- **No commented-out code** — use version control for history.
- **Import order**: external libraries first, then internal modules, then
  styles. Enforce with linter rules.

---

<!-- /STANDARD -->
