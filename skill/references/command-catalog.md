# Command Catalog — Complete Definitions for All 20 Slash Commands

> **Purpose**: This file contains the full, project-agnostic definitions for every slash command
> that the `/setup-workflow` skill generates into `.claude/commands/`. During scaffolding,
> replace all `{{VARIABLE}}` placeholders with values from the resolved project configuration.
>
> **Usage**: The scaffold phase reads each `<!-- COMMAND: name -->` block, performs variable
> substitution, and writes the result to `.claude/commands/<name>.md`.

---

## Variable Reference

| Variable | Source | Example |
|---|---|---|
| `{{PROJECT_NAME}}` | Project config | `acme-saas` |
| `{{PREFIX}}` | Project config | `ACME` |
| `{{REPO_NAMES}}` | Detected repos | `backend, frontend` |
| `{{PRIMARY_REPO}}` | First detected repo | `backend` |
| `{{BRANCH_PATTERN}}` | Config or default | `feat/{{PREFIX}}-{id}-{slug}` |
| `{{TRUNK_BRANCH}}` | Config or default | `main` |
| `{{COVERAGE_THRESHOLD}}` | Config or default | `80` |
| `{{LINT_CMD}}` | Detected per repo | `npm run lint` |
| `{{FORMAT_CMD}}` | Detected per repo | `npm run format` |
| `{{TYPECHECK_CMD}}` | Detected per repo | `npm run typecheck` |
| `{{TEST_CMD}}` | Detected per repo | `npm run test` |
| `{{E2E_CMD}}` | Detected per repo | `npx playwright test` |
| `{{MAX_STORY_POINTS}}` | Config or default | `5` |
| `{{MAX_LINT_CYCLES}}` | Config or default | `3` |
| `{{MAX_REVIEW_CYCLES}}` | Config or default | `3` |
| `{{MAX_QA_CYCLES}}` | Config or default | `2` |
| `{{AGENTS_DIR}}` | Resolved path | `.claude/agents` |
| `{{COMMANDS_DIR}}` | Resolved path | `.claude/commands` |
| `{{BACKLOG_DIR}}` | Resolved path | `backlog` |
| `{{STORIES_DIR}}` | Resolved path | `backlog/stories` |
| `{{EPICS_DIR}}` | Resolved path | `backlog/epics` |
| `{{TEMPLATES_DIR}}` | Resolved path | `backlog/templates` |
| `{{TRACKER_PATH}}` | Resolved path | `backlog/tracker.md` |
| `{{SPRINT_BOARD_PATH}}` | Resolved path | `backlog/sprint-board.md` |
| `{{SPRINT_CURRENT_PATH}}` | Resolved path | `ceremonies/sprint-current.md` |
| `{{CEREMONIES_DIR}}` | Resolved path | `ceremonies` |
| `{{STANDARDS_DIR}}` | Resolved path | `docs/standards` |
| `{{CONTRACTS_DIR}}` | Resolved path | `docs/contracts` |
| `{{ADR_DIR}}` | Resolved path | `docs/ADR` |
| `{{FRD_PATH}}` | Detected path | `docs/frd.md` |

---

<!-- COMMAND: story-develop -->

```yaml
---
description: "Full automated pipeline: pickup -> implement -> lint -> review -> QA -> done-check -> epic-check"
argument-hint: "<story-id>"
---
```

You are the **pipeline orchestrator** for story development. You run a 7-step automated pipeline
that takes a story from `ready` to `done`, with built-in quality gates, reverse handoffs, and
checkpoint-based resumption.

## CRITICAL RULES

1. **Never write application code yourself.** Always dispatch to the responsible dev agent.
2. **Never leave findings unrouted.** Every review/QA finding MUST be sent back to the agent that owns the file.
3. **Route by file location.** Determine the responsible agent from the file path and the repo-to-agent mapping in CLAUDE.md.
4. **Respect CLAUDE.md guardrails.** Never bypass safety hooks, never commit, never push.
5. **Checkpoint immediately after each step.** Write progress to the story file before starting the next step.
6. **Status sync on every transition.** When a story status changes, update: story file frontmatter, {{SPRINT_BOARD_PATH}}, parent epic file, and {{TRACKER_PATH}}.

## PIPELINE PROGRESS TRACKING

Pipeline progress is tracked directly in the story file under a `## Pipeline Progress` section.
This enables resumption after context compaction or session interruption.

**Checkpoint format:**
```
## Pipeline Progress
- [x] STEP 0 — init — 2026-01-15, Initialized pipeline tracker
- [x] STEP 1 — pickup — 2026-01-15, Claimed story, branch created
- [x] STEP 2 — implement — 2026-01-15, All AC implemented across 4 files
- [ ] STEP 3 — lint
- [ ] STEP 4 — review
- [ ] STEP 5 — qa
- [ ] STEP 6 — done-check
- [ ] STEP 7 — epic-check
```

**Resumption logic:**
1. Read the story file.
2. Look for `## Pipeline Progress` section.
3. Parse all checkpoints.
4. Find the **first unchecked** step (`- [ ]`).
5. Jump directly to that step — do NOT re-run completed steps.
6. If no Pipeline Progress section exists, start from STEP 0.

## INPUT

The argument is a story ID (e.g., `{{PREFIX}}-042`).

1. Locate the story file: `{{STORIES_DIR}}/{{PREFIX}}-042.md`
2. Read the full story file.
3. Validate story exists and has status `ready` or `in-progress`.
   - If status is `done`: report "Story already done" and stop.
   - If status is `blocked`: report "Story is blocked — resolve blockers first" and stop.
   - If status is `draft`: report "Story is not ready — run /story-ready-check first" and stop.
4. Check for existing Pipeline Progress section and apply resumption logic.

---

### STEP 0 — INIT TRACKER
**Log prefix:** `[INIT]`

1. If the story file does NOT already have a `## Pipeline Progress` section, append one at the end of the file:
   ```
   ## Pipeline Progress
   - [ ] STEP 0 — init
   - [ ] STEP 1 — pickup
   - [ ] STEP 2 — implement
   - [ ] STEP 3 — lint
   - [ ] STEP 4 — review
   - [ ] STEP 5 — qa
   - [ ] STEP 6 — done-check
   - [ ] STEP 7 — epic-check
   ```
2. Mark STEP 0 complete: `- [x] STEP 0 — init — {date}, Initialized pipeline tracker`
3. Log: `[INIT] Pipeline tracker initialized for {{PREFIX}}-{id}`

---

### STEP 1 — PICKUP
**Log prefix:** `[PICKUP]`

1. **Verify story status is `ready`.**
   - If status is already `in-progress` (resumption case), skip to step 1.5.
   - If status is anything other than `ready` or `in-progress`, stop with error.

2. **Check dependencies.**
   - Read the `dependencies` field from story frontmatter.
   - For each dependency story ID, read its file and confirm status is `done`.
   - If any dependency is NOT `done`:
     - Log: `[PICKUP] BLOCKED — dependency {{PREFIX}}-{dep-id} is not done (status: {status})`
     - Set story status to `blocked`.
     - Sync status to {{SPRINT_BOARD_PATH}}, {{TRACKER_PATH}}, and parent epic.
     - STOP pipeline.

3. **Determine responsible dev agent.**
   - Read the `repo` field from story frontmatter.
   - Map the repo to the dev agent using the agent roster in CLAUDE.md.
   - If no repo field, infer from story context or prompt user.

4. **Create feature branch.**
   - The branch name follows the pattern: `{{BRANCH_PATTERN}}`
   - Replace `{id}` with the story ID number and `{slug}` with a kebab-case summary of the story title.
   - Instruct the dev agent to create this branch from `{{TRUNK_BRANCH}}`.
   - Log: `[PICKUP] Branch created: {branch-name}`

5. **Update story status to `in-progress`.**
   - Update frontmatter: `status: in-progress`
   - Sync status to {{SPRINT_BOARD_PATH}}, {{TRACKER_PATH}}, and parent epic.
   - Log: `[PICKUP] Story {{PREFIX}}-{id} status → in-progress`

6. **Checkpoint:** Mark STEP 1 complete with date and summary.
   `- [x] STEP 1 — pickup — {date}, Claimed story, branch {branch-name} created`

---

### STEP 2 — IMPLEMENT
**Log prefix:** `[IMPLEMENT]`

1. **Read the full story file** including:
   - User Story
   - Context / Technical Notes
   - Acceptance Criteria (Gherkin scenarios)
   - Test Plan
   - Cross-Repo Impact (if any)

2. **Dispatch to responsible dev agent.**
   - Send the dev agent the FULL story content.
   - Instruct the agent to implement ALL acceptance criteria.
   - The agent must:
     a. Read existing code in the affected areas first.
     b. Implement changes that satisfy every Gherkin scenario.
     c. Write/update unit tests per the test plan.
     d. Ensure no regressions in existing tests.
     e. Report back: list of files changed, summary of what was done, any concerns.

3. **Cross-repo coordination.**
   - If the story has a `cross-repo-impact` section, identify ALL repos affected.
   - Dispatch to each repo's dev agent with the relevant portion of changes.
   - Ensure contract alignment: if repo A changes an API, repo B's consumer must update too.
   - If a contract change is needed, invoke `/contract-update` logic before implementation.

4. **Verify implementation report.**
   - The dev agent must report back with:
     - Files changed (with paths)
     - AC coverage: which Gherkin scenarios are addressed by which changes
     - Test results: pass/fail counts
     - Concerns or open questions
   - If the agent reports issues, address them before moving on.

5. **Run tests.**
   - Instruct the dev agent to run `{{TEST_CMD}}` in the relevant repo(s).
   - All tests must pass before proceeding.
   - If tests fail:
     - Route failures back to the dev agent with file:line information.
     - Dev agent fixes and re-runs.
     - If tests still fail after 2 attempts, log concern and proceed to lint (lint may reveal the root cause).

6. **Checkpoint:** Mark STEP 2 complete.
   `- [x] STEP 2 — implement — {date}, Implemented across {n} files, all AC addressed`

---

### STEP 3 — LINT
**Log prefix:** `[LINT]`

Maximum cycles: {{MAX_LINT_CYCLES}}

**Cycle loop (max {{MAX_LINT_CYCLES}} iterations):**

1. **Identify changed files.**
   - Run `git diff {{TRUNK_BRANCH}}..HEAD --name-only` in the relevant repo(s).
   - Filter to source files only (exclude lock files, generated files, etc.).

2. **Run linter + formatter.**
   - Execute `{{LINT_CMD}}` on changed files.
   - Execute `{{FORMAT_CMD}}` on changed files.
   - Capture output: list of issues with file:line:rule:message.

3. **Run type checker.**
   - Execute `{{TYPECHECK_CMD}}` on changed files.
   - Capture output: list of type errors with file:line:message.

4. **Triage results.**
   - **Auto-fixed**: Count items the formatter/linter auto-corrected.
   - **Unfixable**: Items requiring manual intervention.
   - Log: `[LINT] Cycle {n}/{{MAX_LINT_CYCLES}}: {auto-fixed} auto-fixed, {unfixable} unfixable issues`

5. **If unfixable issues exist:**
   - Route each issue to the responsible dev agent with:
     - File path and line number
     - Rule name and message
     - Fix direction (brief guidance on how to resolve)
   - Dev agent applies fixes.
   - Increment cycle counter and loop back to step 1.

6. **If zero issues remain:**
   - Log: `[LINT] All clean after {n} cycle(s)`
   - Break out of loop.

7. **If max cycles exhausted and issues remain:**
   - Log: `[LINT] Max cycles ({{MAX_LINT_CYCLES}}) exhausted. {count} issues remain.`
   - **Create a bug story:**
     - File: `{{STORIES_DIR}}/{{PREFIX}}-{next-id}.md`
     - Title: `Bug: Unresolved lint issues from {{PREFIX}}-{story-id}`
     - Status: `ready`
     - Link: `blocked-by: {{PREFIX}}-{story-id}`
     - Include all remaining lint issues in the bug description.
   - Update {{TRACKER_PATH}} and {{SPRINT_BOARD_PATH}} with the new bug story.
   - Log: `[ESCALATE] Created bug {{PREFIX}}-{next-id} for unresolved lint issues`
   - **Continue pipeline** (do not block — review may catch these too).

8. **Checkpoint:** Mark STEP 3 complete.
   `- [x] STEP 3 — lint — {date}, Clean after {n} cycle(s)` OR
   `- [x] STEP 3 — lint — {date}, {count} issues escalated to {{PREFIX}}-{bug-id}`

---

### STEP 4 — CODE REVIEW
**Log prefix:** `[REVIEW]`

Maximum cycles: {{MAX_REVIEW_CYCLES}}
**This is a HARD GATE. Pipeline cannot proceed until review passes or max cycles are exhausted.**

**Cycle loop (max {{MAX_REVIEW_CYCLES}} iterations):**

1. **Spawn code-reviewer agent.**
   - The code-reviewer agent operates per `{{STANDARDS_DIR}}/code-review.md`.
   - Provide the agent with:
     - Story file (full content)
     - List of changed files (`git diff {{TRUNK_BRANCH}}..HEAD --name-only`)
     - The diff itself (`git diff {{TRUNK_BRANCH}}..HEAD`)

2. **Review checklist:**
   The code-reviewer agent evaluates against ALL criteria in `{{STANDARDS_DIR}}/code-review.md`:
   - **Correctness**: Does the code do what the AC specifies?
   - **Security**: No secrets, no SQL injection, no XSS, proper auth checks.
   - **Performance**: No N+1 queries, no unbounded loops, no memory leaks.
   - **Readability**: Clear naming, appropriate comments, no dead code.
   - **Architecture**: Follows project patterns, proper layering, no circular deps.
   - **Tests**: Adequate coverage, meaningful assertions, no flaky patterns.
   - **Contracts**: API changes match docs/contracts/ specs.
   - **Standards compliance**: Follows all rules in `{{STANDARDS_DIR}}/`.

3. **Verdict: APPROVE / REQUEST CHANGES / BLOCK**

   - **APPROVE**: Zero blocking findings. Log: `[REVIEW] APPROVED on cycle {n}`
     - Break out of loop. Proceed to STEP 5.

   - **REQUEST CHANGES**: Non-blocking findings exist.
     - The code-reviewer agent produces a findings list:
       ```
       FINDING: {severity} | {file}:{line} | {category}
       Description: {what's wrong}
       Fix direction: {how to fix it}
       Responsible: {agent-name based on file location}
       ```
     - **Reverse handoff**: Route each finding to the responsible dev agent.
       - Group findings by responsible agent.
       - Send each agent their grouped findings with file:line and fix direction.
       - Dev agent applies fixes and reports back.
     - **Reset downstream checkpoints:**
       - Uncheck STEP 5 (qa), STEP 6 (done-check), STEP 7 (epic-check) in Pipeline Progress.
       - This ensures QA re-runs after code changes.
     - Increment cycle counter and loop back to step 1.

   - **BLOCK**: Critical issue found (security vulnerability, data loss risk, architectural violation).
     - Log: `[REVIEW] BLOCKED — critical issue found`
     - Route finding to responsible dev agent with URGENT priority.
     - Dev agent must fix before re-review.
     - Increment cycle counter and loop back to step 1.

4. **If max cycles exhausted:**
   - Log: `[REVIEW] Max cycles ({{MAX_REVIEW_CYCLES}}) exhausted. Review did not pass.`
   - **Create a bug story:**
     - File: `{{STORIES_DIR}}/{{PREFIX}}-{next-id}.md`
     - Title: `Bug: Code review failures from {{PREFIX}}-{story-id}`
     - Status: `ready`
     - Link: `blocked-by: {{PREFIX}}-{story-id}`
     - Include all outstanding findings in the bug description.
   - Update story status to `blocked`.
   - Sync status to {{SPRINT_BOARD_PATH}}, {{TRACKER_PATH}}, and parent epic.
   - Update {{TRACKER_PATH}} and {{SPRINT_BOARD_PATH}} with the new bug story.
   - Log: `[ESCALATE] Created bug {{PREFIX}}-{next-id} — story {{PREFIX}}-{story-id} is blocked`
   - **STOP pipeline.** (Review is a hard gate.)

5. **Checkpoint:** Mark STEP 4 complete.
   `- [x] STEP 4 — review — {date}, APPROVED on cycle {n}` OR
   `- [x] STEP 4 — review — {date}, BLOCKED — escalated to {{PREFIX}}-{bug-id}`

---

### STEP 5 — QA VERIFICATION
**Log prefix:** `[QA]`

Maximum cycles: {{MAX_QA_CYCLES}}

**Cycle loop (max {{MAX_QA_CYCLES}} iterations):**

1. **Spawn QA agent.**
   - The QA agent operates per the test plan in the story file and the standards in `{{STANDARDS_DIR}}/`.
   - Provide the QA agent with:
     - Full story file (especially Gherkin AC and Test Plan sections)
     - List of changed files
     - Current test results from the dev agent

2. **QA verification scope:**
   - **AC Verification**: Walk through EVERY Gherkin scenario in the story.
     - For each scenario: verify it is testable, verify a test exists, verify the test passes.
     - Record: `PASS` or `FAIL` with evidence for each scenario.
   - **Edge Case Testing**: Verify edge cases from the test plan are covered.
   - **Regression Check**: Confirm no existing tests were broken.
   - **Coverage Check**: Verify test coverage meets `{{COVERAGE_THRESHOLD}}%` threshold.
   - **Integration Points**: If cross-repo, verify integration tests exist and pass.

3. **QA Report:**
   ```
   ## QA Verification Report — {{PREFIX}}-{id}

   | Scenario | Status | Evidence |
   |---|---|---|
   | Given/When/Then #1 | PASS | test_file.py::test_name passes |
   | Given/When/Then #2 | FAIL | Expected 404, got 500 — see file:line |

   Coverage: {actual}% (threshold: {{COVERAGE_THRESHOLD}}%)
   Regression: {pass/fail}
   Verdict: PASS / FAIL
   ```

4. **If PASS (all scenarios verified, coverage met, no regressions):**
   - Log: `[QA] PASSED on cycle {n} — all {count} scenarios verified`
   - Break out of loop. Proceed to STEP 6.

5. **If FAIL:**
   - **Reverse handoff**: Route each failure to the responsible dev agent.
     - For each failed scenario:
       ```
       QA FAILURE: {scenario-name}
       Expected: {expected behavior from Gherkin}
       Actual: {what happened}
       File: {file}:{line}
       Fix direction: {guidance}
       Responsible: {agent-name}
       ```
     - Group failures by responsible agent and dispatch.
     - Dev agent applies fixes and reports back.
   - **Reset downstream checkpoints:**
     - Uncheck STEP 6 (done-check) and STEP 7 (epic-check) in Pipeline Progress.
   - Increment cycle counter and loop back to step 1.

6. **If max cycles exhausted:**
   - Log: `[QA] Max cycles ({{MAX_QA_CYCLES}}) exhausted. QA did not pass.`
   - **Create a bug story:**
     - File: `{{STORIES_DIR}}/{{PREFIX}}-{next-id}.md`
     - Title: `Bug: QA failures from {{PREFIX}}-{story-id}`
     - Status: `ready`
     - Link: `blocked-by: {{PREFIX}}-{story-id}`
     - Include all outstanding QA failures in the bug description.
   - Update story status to `blocked`.
   - Sync status to {{SPRINT_BOARD_PATH}}, {{TRACKER_PATH}}, and parent epic.
   - Update {{TRACKER_PATH}} and {{SPRINT_BOARD_PATH}} with the new bug story.
   - Log: `[ESCALATE] Created bug {{PREFIX}}-{next-id} — story {{PREFIX}}-{story-id} is blocked`
   - **STOP pipeline.**

7. **Checkpoint:** Mark STEP 5 complete.
   `- [x] STEP 5 — qa — {date}, PASSED on cycle {n}, {count} scenarios verified` OR
   `- [x] STEP 5 — qa — {date}, FAILED — escalated to {{PREFIX}}-{bug-id}`

---

### STEP 6 — DONE CHECK
**Log prefix:** `[DONE]`

1. **Run the full Definition of Done checklist** (same as `/story-done-check`):

   **Implementation group:**
   - [ ] All acceptance criteria addressed (cross-reference each Gherkin scenario)
   - [ ] Code changes match story scope (no scope creep, no unrelated changes)
   - [ ] Implementation aligns with technical notes in story

   **Contracts group:**
   - [ ] API contracts updated if any endpoints were added/changed/removed
   - [ ] Contract files in `{{CONTRACTS_DIR}}/` are current

   **Tests group:**
   - [ ] Test coverage >= `{{COVERAGE_THRESHOLD}}%` on changed files
   - [ ] All tests green (zero failures)
   - [ ] No new flaky tests introduced
   - [ ] Edge cases from test plan are covered

   **Quality group:**
   - [ ] Lint clean (zero warnings, zero errors)
   - [ ] Type check clean (zero errors)
   - [ ] No new `TODO` comments without a linked story ID
   - [ ] No debug/console.log statements left in production code

   **Process group:**
   - [ ] Story status is `in-progress` (about to become `done`)
   - [ ] Tracker is synced
   - [ ] Commits reference story ID in the format `Refs: {{PREFIX}}-{id}`

   **QA Verification group:**
   - [ ] QA agent verified all AC with pass/fail evidence
   - [ ] QA report is attached to story

2. **If ALL checks pass:**
   - Update story status to `done`.
   - Sync status to {{SPRINT_BOARD_PATH}}, {{TRACKER_PATH}}, and parent epic.
   - Log: `[DONE] Story {{PREFIX}}-{id} status → done. All DoD checks passed.`

3. **If ANY check fails:**
   - Log each failure with its group and detail.
   - Route findings to responsible agent (implementation issues → dev agent, test issues → dev agent, process issues → orchestrator self-fix).
   - **Reset checkpoints**: Uncheck STEP 6 and STEP 7.
   - Return to the appropriate earlier step:
     - Implementation/Tests/Quality failures → return to STEP 2 (implement).
     - Contract failures → invoke `/contract-update` then return to STEP 2.
     - Process failures → fix inline (update tracker, add refs) then re-run STEP 6.
   - Do NOT increment a cycle counter for done-check — it is re-entrant from earlier steps.

4. **Checkpoint:** Mark STEP 6 complete.
   `- [x] STEP 6 — done-check — {date}, All DoD checks passed`

---

### STEP 7 — EPIC CHECK
**Log prefix:** `[EPIC]`

1. **Read parent epic.**
   - Get the `epic` field from story frontmatter.
   - Read the epic file: `{{EPICS_DIR}}/{epic-id}.md`

2. **Check all stories in the epic.**
   - Read the epic's story list.
   - For each story ID in the epic, check its status in `{{TRACKER_PATH}}`.

3. **If ALL stories in the epic have status `done`:**
   - Update epic status to `done`.
   - Update epic file frontmatter: `status: done`
   - Sync to {{TRACKER_PATH}} and {{SPRINT_BOARD_PATH}}.
   - Log: `[EPIC] Epic {epic-id} is COMPLETE — all {count} stories done`

4. **If NOT all stories are done:**
   - Log: `[EPIC] Epic {epic-id}: {done-count}/{total-count} stories done. Remaining: {list}`
   - No status change needed.

5. **Checkpoint:** Mark STEP 7 complete.
   `- [x] STEP 7 — epic-check — {date}, Epic {epic-id}: {done-count}/{total-count} done`

---

### PIPELINE COMPLETE

Log: `[PIPELINE] Story {{PREFIX}}-{id} pipeline complete.`

Report summary:
```
Pipeline Summary — {{PREFIX}}-{id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status:      done
Branch:      {branch-name}
Files:       {file-count} changed
Lint:        {lint-cycles} cycle(s)
Review:      {review-verdict} on cycle {n}
QA:          {qa-verdict} on cycle {n}
DoD:         PASS
Epic:        {epic-id} — {done-count}/{total-count} stories done
Bugs:        {bug-count} created (if any)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

<!-- /COMMAND -->

---

<!-- COMMAND: epic-develop -->

```yaml
---
description: "Automated backlog pipeline: parse requirements -> create epic -> generate stories -> enrich with AC -> validate DoR"
argument-hint: "<frd-section-or-change-request>"
---
```

You are the **backlog generation orchestrator**. You take a requirements reference or a change
request and produce a fully populated epic with ready-to-implement stories.

## INPUT MODES

**Mode A — FRD-based:**
```
/epic-develop "Section 3: Appointment Scheduling"
```
The argument references a section in the project's FRD (`{{FRD_PATH}}`). You will read that section and use it as the requirements source.

**Mode B — Change Request:**
```
/epic-develop "Add bulk CSV import with validation and rollback"
```
The argument is natural language describing a change. Treat it as a mini-requirements document.

## PIPELINE PROGRESS TRACKING

Progress is tracked in a temporary file: `{{EPICS_DIR}}/.epic-develop-progress.md`

**Checkpoint format:**
```
## Epic Develop Progress
Input: {argument}
- [x] STEP 1 — parse — {date}, {summary}
- [ ] STEP 2 — create-epic
- [ ] STEP 3 — generate-stories
- [ ] STEP 4 — enrich-ac
- [ ] STEP 5 — validate-dor
- [ ] STEP 6 — update-tracker
```

**Resumption logic:** Same pattern as `/story-develop` — find first unchecked step and jump there.

---

### STEP 1 — PARSE INPUT
**Log prefix:** `[PARSE]`

1. **Determine input mode:**
   - If the argument contains "Section" or references a known FRD heading → Mode A.
   - Otherwise → Mode B.

2. **Mode A — FRD Parse:**
   - Read `{{FRD_PATH}}`.
   - Locate the referenced section by heading match (fuzzy: match by number or title substring).
   - Extract the full section content including all subsections.
   - If section not found: list available sections and ask user to clarify.
   - Log: `[PARSE] FRD Mode — extracted section: "{heading}" ({line-count} lines)`

3. **Mode B — Change Request Parse:**
   - Treat the argument as a mini-requirements doc.
   - Identify: goal, affected areas, key behaviors, constraints.
   - Log: `[PARSE] Change Request Mode — goal: "{summary}"`

4. **Checkpoint:** `- [x] STEP 1 — parse — {date}, {mode}: {summary}`

---

### STEP 2 — CREATE EPIC
**Log prefix:** `[EPIC]`

1. **Determine next epic ID.**
   - Read `{{TRACKER_PATH}}`.
   - Find highest existing epic number, increment by 1.
   - Format: `EPIC-{nnn}` (zero-padded to 3 digits).

2. **Create epic file from template.**
   - Read template from `{{TEMPLATES_DIR}}/epic-template.md`.
   - Fill in:
     - `id`: the new epic ID
     - `title`: derived from the input (FRD section heading or change request summary)
     - `status`: `planning`
     - `frd-ref`: section reference (Mode A) or "Change Request" (Mode B)
     - `created`: current date

3. **Fill epic content using the parsed input:**
   - **Goal**: One sentence describing what this epic achieves for the user.
   - **In Scope**: Bullet list of features/behaviors included.
   - **Out of Scope**: Explicitly list what is NOT included (prevents scope creep).
   - **Success Criteria**: Measurable outcomes (e.g., "User can schedule an appointment in < 3 clicks").
   - **Dependencies**: Other epics, external systems, or prerequisites.
   - **Risks**: Known risks or assumptions.

4. **Write the epic file** to `{{EPICS_DIR}}/{epic-id}.md`.
5. **Log:** `[EPIC] Created {epic-id}: "{title}"`
6. **Checkpoint:** `- [x] STEP 2 — create-epic — {date}, {epic-id}: {title}`

---

### STEP 3 — GENERATE STORIES (BA Agent)
**Log prefix:** `[STORIES]`

1. **Spawn BA (Business Analyst) agent.**
   - Provide: epic file, parsed requirements, project context from CLAUDE.md.

2. **BA agent breaks the epic into stories.**
   - Each story must follow user story format: `As a {role}, I want {action}, so that {benefit}`
   - Each story must include:
     - **Context**: Background information and rationale.
     - **Technical Notes**: Implementation hints, affected components, patterns to follow.
     - **Cross-Repo Impact**: Which repos are affected (if multi-repo).
     - **Dependencies**: Other stories that must be done first.
     - **Repo assignment**: Which repo this story primarily belongs to.

3. **Sizing guidance for the BA agent:**
   - Each story should be ≤ {{MAX_STORY_POINTS}} points (≤ 3 days of work).
   - If a story feels larger, split it further.
   - Prefer vertical slices (end-to-end thin features) over horizontal slices (layers).

4. **Story ID assignment:**
   - Read `{{TRACKER_PATH}}` for the next available story ID.
   - Assign sequential IDs: `{{PREFIX}}-{nnn}` (zero-padded to 3 digits).

5. **Create story files** from `{{TEMPLATES_DIR}}/story-template.md`:
   - One file per story in `{{STORIES_DIR}}/`.
   - Frontmatter: id, title, epic, repo, status: `draft`, points: (leave blank for SM).
   - Body: user story, context, technical notes, cross-repo impact.
   - AC and test plan sections left as `<!-- TO BE FILLED BY QA -->`.

6. **Log:** `[STORIES] Generated {count} stories for {epic-id}`
7. **Checkpoint:** `- [x] STEP 3 — generate-stories — {date}, {count} stories created`

---

### STEP 4 — ENRICH WITH AC (QA Agent)
**Log prefix:** `[QA-ENRICH]`

1. **Spawn QA agent.**
   - Provide: all story files from STEP 3, epic file, FRD/requirements context.

2. **For each story, the QA agent adds:**

   **Acceptance Criteria (Gherkin format):**
   - Happy path scenarios (minimum 1 per story)
   - Validation/error scenarios (invalid inputs, boundary values)
   - Authorization scenarios (unauthorized access, role-based checks)
   - Edge case scenarios (empty states, concurrent access, large inputs)
   - Format:
     ```gherkin
     Scenario: {name}
       Given {precondition}
       When {action}
       Then {expected result}
     ```

   **Test Plan:**
   - Specific test targets (which functions/endpoints to test)
   - Coverage expectations per component
   - Integration test needs
   - Performance test needs (if applicable)
   - Test data requirements

3. **Update each story file** with the AC and test plan sections.
4. **Log:** `[QA-ENRICH] Enriched {count} stories with Gherkin AC and test plans`
5. **Checkpoint:** `- [x] STEP 4 — enrich-ac — {date}, {count} stories enriched`

---

### STEP 5 — VALIDATE DoR (SM Agent)
**Log prefix:** `[DOR]`

1. **Spawn SM (Scrum Master) agent.**
   - Provide: all story files from STEP 4.

2. **For each story, the SM agent validates the Definition of Ready checklist:**
   - [ ] Frontmatter complete: id, title, epic, repo present
   - [ ] FRD reference present (or Change Request note)
   - [ ] Parent epic exists and story is listed
   - [ ] User story in correct format
   - [ ] AC in Gherkin format with: happy path + validation + auth + edge cases
   - [ ] Test plan with specific targets
   - [ ] Dependencies listed (or "none")
   - [ ] Open questions resolved (none remaining)
   - [ ] Points assigned and ≤ {{MAX_STORY_POINTS}}
   - [ ] No secrets or PII in story content

3. **Sizing and splitting:**
   - SM assigns story points (1, 2, 3, or 5).
   - If a story is estimated > {{MAX_STORY_POINTS}} points, SM splits it:
     - Create child stories with new IDs.
     - Update parent to reference children.
     - Each child goes through its own DoR check.

4. **If DoR passes:**
   - Set status: `ready` in each story's frontmatter.
   - Log: `[DOR] {{PREFIX}}-{id}: READY ({points} pts)`

5. **If DoR fails:**
   - Log specific gaps.
   - Route back to BA (content gaps) or QA (AC gaps) agent for fixes.
   - Re-validate after fixes.

6. **Log:** `[DOR] {pass-count}/{total-count} stories validated. {split-count} stories split.`
7. **Checkpoint:** `- [x] STEP 5 — validate-dor — {date}, {pass-count} ready, {split-count} split`

---

### STEP 6 — UPDATE TRACKER AND SPRINT BOARD
**Log prefix:** `[SYNC]`

1. **Update `{{TRACKER_PATH}}`:**
   - Add new epic entry with status and story count.
   - Add all new story entries with their IDs, titles, epics, statuses, and points.

2. **Update `{{SPRINT_BOARD_PATH}}`:**
   - New stories go to the **Backlog** section by default.
   - If there is an active sprint and user requests, add to current sprint instead.
   - Group stories under their epic heading.

3. **Update epic file:**
   - Add the story list to the epic file.
   - Update epic status to `in-progress` (it now has ready stories).

4. **Delete temporary progress file:** `{{EPICS_DIR}}/.epic-develop-progress.md`

5. **Log:** `[SYNC] Tracker and sprint board updated. {count} stories in backlog.`
6. **Checkpoint:** `- [x] STEP 6 — update-tracker — {date}, {count} stories synced`

---

### PIPELINE COMPLETE

```
Epic Develop Summary — {epic-id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title:       {title}
Source:      {FRD section / Change Request}
Stories:     {count} created, {ready-count} ready
Points:      {total-points} total
Splits:      {split-count} stories were auto-split
Location:    {{EPICS_DIR}}/{epic-id}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next: Add stories to a sprint with /sprint-plan
```

<!-- /COMMAND -->

---

<!-- COMMAND: story-create -->

```yaml
---
description: "Create a single ad-hoc story from a natural language description, fully refined and ready to implement"
argument-hint: "<description>"
---
```

You create a single, fully populated story from a natural language description.
Unlike `/epic-develop` (which produces an entire epic with multiple stories), this command
produces exactly one story that is immediately ready for development.

## INPUT

Natural language description of the story:
```
/story-create "Fix: OTP expires silently — show toast notification"
/story-create "Add pagination to the appointments list API endpoint"
/story-create "Refactor: Extract email service into shared module"
```

## PIPELINE

### 1. Determine Next Story ID

1. Read `{{TRACKER_PATH}}`.
2. Find the highest existing story number.
3. Increment by 1 and format as `{{PREFIX}}-{nnn}`.
4. Log: `Creating story {{PREFIX}}-{id}`

### 2. BA Agent — Write Story Content

Spawn the BA agent with the user's description and project context from CLAUDE.md.

The BA agent produces:
- **Title**: Concise, actionable title derived from the description.
- **User Story**: `As a {role}, I want {action}, so that {benefit}`
- **Context**: Why this matters. Background info, user impact, related features.
- **Technical Notes**: Affected components, suggested approach, patterns to follow, files likely impacted.
- **Cross-Repo Impact**: Which repos are affected (or "none" for single-repo).
- **Dependencies**: Other stories that must be done first (or "none").
- **FRD Reference**: Link to relevant FRD section if one exists (or "Ad-hoc request").

The BA agent also suggests an epic assignment:
- If the description clearly belongs to an existing epic, assign it.
- If not, assign to a general "Ad-hoc" or "Maintenance" epic (create one if it does not exist).

### 3. QA Agent — Add Gherkin AC and Test Plan

Spawn the QA agent with the BA-produced story content.

The QA agent adds:
- **Acceptance Criteria** in Gherkin format:
  - At least 1 happy-path scenario.
  - Validation / error scenarios.
  - Authorization scenarios (if applicable).
  - Edge case scenarios.
- **Test Plan**:
  - Specific test targets (functions, endpoints, components).
  - Coverage expectations.
  - Test data requirements.
  - Integration test needs (if cross-repo).

### 4. SM Agent — Validate DoR, Size, and Assign

Spawn the SM agent with the enriched story.

The SM agent:
1. Runs the full DoR checklist (same as `/story-ready-check`).
2. Assigns story points (1, 2, 3, or 5).
   - If estimated > {{MAX_STORY_POINTS}}: flag for splitting (but do not auto-split for ad-hoc stories — inform user).
3. Assigns repo based on the technical notes and affected components.
4. Sets status: `ready`.

### 5. Write Story File

1. Create story file from `{{TEMPLATES_DIR}}/story-template.md`.
2. Write to `{{STORIES_DIR}}/{{PREFIX}}-{id}.md`.
3. Fill all frontmatter and body sections.

### 6. Update Tracker and Sprint Board

1. Add story entry to `{{TRACKER_PATH}}` with all metadata.
2. Add story to `{{SPRINT_BOARD_PATH}}`:
   - If an active sprint exists, add to the **current sprint's backlog** section.
   - Otherwise, add to the **Backlog** section.
3. Update the epic file to include this story in its story list.

### OUTPUT

```
Story Created — {{PREFIX}}-{id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title:    {title}
Epic:     {epic-id}
Repo:     {repo}
Points:   {points}
Status:   ready
File:     {{STORIES_DIR}}/{{PREFIX}}-{id}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next: /story-develop {{PREFIX}}-{id}
```

<!-- /COMMAND -->

---

<!-- COMMAND: story-new -->

```yaml
---
description: "Create an empty story file from template with pre-filled frontmatter"
argument-hint: "<epic-id> <title>"
---
```

You create a new story file from the project template. This is a **low-level** command that
only creates the file structure — it does NOT populate content. Use `/story-refine` or
`/story-create` if you want content filled automatically.

## INPUT

Two arguments:
- **Epic ID**: The parent epic (e.g., `EPIC-003`)
- **Title**: The story title in quotes

```
/story-new EPIC-003 "User can reset password via email link"
```

## STEPS

### 1. Validate Epic

1. Read `{{TRACKER_PATH}}`.
2. Confirm the specified epic ID exists.
3. If not found: list existing epics and ask user to choose or create one first.

### 2. Assign Story ID

1. Read `{{TRACKER_PATH}}`.
2. Find the highest existing story number.
3. Increment by 1 and format as `{{PREFIX}}-{nnn}`.

### 3. Create Story File

1. Read template from `{{TEMPLATES_DIR}}/story-template.md`.
2. Pre-fill frontmatter:
   - `id`: `{{PREFIX}}-{nnn}`
   - `title`: from argument
   - `epic`: from argument
   - `status`: `draft`
   - `repo`: (leave blank)
   - `points`: (leave blank)
   - `dependencies`: (leave blank)
   - `created`: current date
3. Leave all body sections as template placeholders.
4. Write to `{{STORIES_DIR}}/{{PREFIX}}-{nnn}.md`.

### 4. Update Tracker

1. Add an entry to `{{TRACKER_PATH}}`:
   - ID, title, epic, status: `draft`, points: `-`, repo: `-`
2. Add story to the parent epic's story list.

### OUTPUT

```
Story File Created — {{PREFIX}}-{id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title:    {title}
Epic:     {epic-id}
Status:   draft
File:     {{STORIES_DIR}}/{{PREFIX}}-{id}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next: /story-refine {{PREFIX}}-{id}  (interactive refinement)
  or: Fill sections manually, then /story-ready-check {{PREFIX}}-{id}
```

<!-- /COMMAND -->

---

<!-- COMMAND: story-refine -->

```yaml
---
description: "Interactive three-amigos refinement: walk through each story section with role-specific prompts"
argument-hint: "<story-id>"
---
```

You facilitate an interactive **three-amigos refinement session** for a story. You walk through
each section of the story file, prompt for gaps, and help the user (acting as the product voice)
collaborate with the BA, QA, and Dev perspectives.

**Important:** This command does NOT change the story's status. Only the SM agent (via
`/story-ready-check`) can set a story to `ready`.

## INPUT

Story ID: `{{PREFIX}}-{nnn}`

## PRE-CHECK

1. Read the story file: `{{STORIES_DIR}}/{{PREFIX}}-{nnn}.md`.
2. Confirm story exists.
3. Story should be in `draft` status (warn if already `ready` — refinement may be unnecessary).

## INTERACTIVE WALKTHROUGH

For each section below, read the current content and assess completeness. If the section is
empty or has template placeholders, prompt the relevant role for input. If the section has
content, review it for quality and gaps.

### Section 1: User Story
**Responsible role:** BA (Business Analyst)

- Must follow format: `As a {role}, I want {action}, so that {benefit}`
- Check: Is the role specific enough? Is the action clear? Is the benefit measurable?
- Prompt if missing: "What user role does this serve? What do they want to accomplish? Why?"

### Section 2: Context
**Responsible role:** BA

- Must explain: Why does this story exist? What user problem does it solve?
- Check: Is there enough background for a developer to understand the intent?
- Prompt if missing: "What is the business context? What happens today without this feature?"

### Section 3: Technical Notes
**Responsible role:** Dev

- Must include: Affected components, suggested approach, patterns to follow.
- Check: Does it reference specific files or modules? Does it mention architectural patterns?
- Prompt if missing: "Which parts of the codebase does this touch? What approach should be used?"

### Section 4: Cross-Repo Impact
**Responsible role:** Dev / Architect

- Only relevant for multi-repo setups.
- Must list: Which repos are affected and how.
- Prompt if missing (and multi-repo detected): "Does this change require updates in other repos?"

### Section 5: Acceptance Criteria
**Responsible role:** QA

- Must be in Gherkin format (Given/When/Then).
- Must cover: happy path, validation/error, authorization, edge cases.
- Check: Are scenarios specific enough to be testable? Are they exhaustive?
- Prompt if missing: "What are the happy-path scenarios? What should happen with invalid input?"

### Section 6: Test Plan
**Responsible role:** QA

- Must include: Specific test targets, coverage expectations, test data needs.
- Check: Are the targets concrete (function names, endpoint paths)?
- Prompt if missing: "What specifically should be tested? What coverage is expected?"

### Section 7: Dependencies
**Responsible role:** SM / BA

- List story IDs that must be done before this one.
- Check: Are the referenced stories valid? Are there implicit dependencies not listed?
- Prompt if missing: "Does this story depend on any other story being done first?"

### Section 8: Open Questions
**Responsible role:** All

- List any unresolved questions discovered during refinement.
- Each question should tag a responsible party.
- These MUST be resolved before the story can pass DoR.
- Prompt: "Are there any unanswered questions or assumptions that need validation?"

## COMPLETION

After walking through all sections:
1. Save the updated story file.
2. Summarize what was added or changed.
3. Report any remaining gaps or open questions.
4. Suggest next step:
   - If all sections look complete: "Run `/story-ready-check {{PREFIX}}-{id}` to validate DoR."
   - If gaps remain: "Address the open questions above, then re-run `/story-refine {{PREFIX}}-{id}`."

<!-- /COMMAND -->

---

<!-- COMMAND: story-ready-check -->

```yaml
---
description: "Definition of Ready gate: validate a story meets all DoR criteria before development"
argument-hint: "<story-id>"
---
```

You are the **Scrum Master agent** performing a Definition of Ready (DoR) gate check. This is
the formal quality gate that determines whether a story is ready for development.

## INPUT

Story ID: `{{PREFIX}}-{nnn}`

## PRE-CHECK

1. Read the story file: `{{STORIES_DIR}}/{{PREFIX}}-{nnn}.md`.
2. Confirm story exists.
3. If status is already `ready`: report "Story is already marked ready. Re-running DoR check."
4. If status is `done`: report "Story is already done. No DoR check needed." and stop.

## DoR CHECKLIST

Walk through each criterion. Record PASS or FAIL with details for each.

### Frontmatter Completeness
- [ ] `id` field is present and matches file name
- [ ] `title` field is present and non-empty
- [ ] `epic` field is present and references a valid epic ID
- [ ] `repo` field is present and matches a known repo from CLAUDE.md
- [ ] `points` field is present and is a valid number (1, 2, 3, or 5)

### FRD Reference
- [ ] Story references an FRD section or is marked as "Ad-hoc request" / "Change Request"
- [ ] If FRD reference exists, the section is findable in `{{FRD_PATH}}`

### Epic Linkage
- [ ] The referenced epic file exists in `{{EPICS_DIR}}/`
- [ ] This story is listed in the epic's story list

### User Story Format
- [ ] Follows `As a {role}, I want {action}, so that {benefit}` format
- [ ] Role is specific (not just "user")
- [ ] Action is clear and testable
- [ ] Benefit explains the "why"

### Acceptance Criteria
- [ ] Written in Gherkin format (Given/When/Then)
- [ ] At least 1 happy-path scenario
- [ ] At least 1 validation/error scenario
- [ ] At least 1 authorization scenario (if feature involves auth)
- [ ] At least 1 edge-case scenario
- [ ] Each scenario is specific enough to be testable

### Test Plan
- [ ] Specific test targets listed (functions, endpoints, components)
- [ ] Coverage expectations stated
- [ ] Test data requirements identified
- [ ] Integration test needs identified (if cross-repo)

### Dependencies
- [ ] Dependencies section is present
- [ ] Listed dependencies reference valid story IDs (or "none")
- [ ] No circular dependencies

### Open Questions
- [ ] Open questions section is present
- [ ] **Zero unresolved questions** (all questions must be answered or removed)

### Sizing
- [ ] Points ≤ {{MAX_STORY_POINTS}}
- [ ] If points > {{MAX_STORY_POINTS}}: FAIL — story must be split before it can be ready

### Content Safety
- [ ] No secrets, API keys, passwords, or tokens in story content
- [ ] No PII (personally identifiable information) in story content

## RESULTS

### If ALL checks PASS:
1. Update story frontmatter: `status: ready`
2. Update `{{TRACKER_PATH}}`: story status → `ready`
3. Update `{{SPRINT_BOARD_PATH}}`: story status → `ready`
4. Log:
   ```
   DoR Check — {{PREFIX}}-{id}: PASS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   All {count} criteria passed.
   Status updated to: ready
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Next: /story-develop {{PREFIX}}-{id}
   ```

### If ANY check FAILS:
1. Do NOT change status.
2. Report each failure:
   ```
   DoR Check — {{PREFIX}}-{id}: FAIL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Passed: {pass-count}/{total-count}

   FAILURES:
   - [FAIL] Acceptance Criteria: Missing edge-case scenario
   - [FAIL] Open Questions: 2 unresolved questions remain
   - [FAIL] Sizing: 8 points exceeds max of {{MAX_STORY_POINTS}}
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Fix the above, then re-run /story-ready-check {{PREFIX}}-{id}
   ```

<!-- /COMMAND -->

---

<!-- COMMAND: story-done-check -->

```yaml
---
description: "Definition of Done gate: validate a story meets all DoD criteria after development"
argument-hint: "<story-id>"
---
```

You are the **Scrum Master agent** performing a Definition of Done (DoD) gate check. This is
the formal quality gate that determines whether a completed story meets all required standards.

## INPUT

Story ID: `{{PREFIX}}-{nnn}`

## PRE-CHECK

1. Read the story file: `{{STORIES_DIR}}/{{PREFIX}}-{nnn}.md`.
2. Confirm story exists and status is `in-progress`.
   - If `ready`: "Story has not been started. Run /story-develop first."
   - If `done`: "Story is already marked done. Re-running DoD check."
   - If `draft`: "Story is not ready for development. Run /story-ready-check first."

## DoD CHECKLIST

### Implementation Group
- [ ] **All AC addressed**: Cross-reference each Gherkin scenario in the AC section. For each scenario, verify that implementation exists and the behavior is correct.
- [ ] **Scope match**: Code changes match the story scope. No unrelated changes, no scope creep beyond the AC.
- [ ] **Technical notes followed**: Implementation aligns with the approach described in technical notes.
- [ ] **No hardcoded values**: No magic numbers, hardcoded URLs, or environment-specific values in code.

### Contracts Group
- [ ] **API contracts current**: If any endpoints were added, changed, or removed, the corresponding contract file in `{{CONTRACTS_DIR}}/` has been updated.
- [ ] **Event contracts current**: If any events were added or changed, the event contract file has been updated.
- [ ] **No breaking changes without ADR**: If a breaking contract change was made, an ADR exists documenting the decision.

### Tests Group
- [ ] **Coverage threshold met**: Test coverage on changed files is >= `{{COVERAGE_THRESHOLD}}%`. Run `{{TEST_CMD}}` with coverage to verify.
- [ ] **All tests green**: Zero test failures. Run the full test suite for affected repos.
- [ ] **No new flaky tests**: New tests must not exhibit intermittent failures.
- [ ] **Edge cases covered**: Test plan targets from the story are all addressed.
- [ ] **Integration tests present**: If story involves cross-repo or cross-service interaction, integration tests exist.

### Quality Group
- [ ] **Lint clean**: `{{LINT_CMD}}` produces zero warnings and zero errors on changed files.
- [ ] **Type check clean**: `{{TYPECHECK_CMD}}` produces zero errors on changed files.
- [ ] **No dangling TODOs**: No new `TODO`, `FIXME`, or `HACK` comments without a linked story ID (e.g., `TODO({{PREFIX}}-099): description`).
- [ ] **No debug artifacts**: No `console.log`, `print()`, `debugger`, `binding.pry`, or similar debug statements in production code.
- [ ] **No commented-out code**: No blocks of commented-out code left behind.

### Process Group
- [ ] **Story status current**: Story status is `in-progress` (about to transition to `done`).
- [ ] **Tracker synced**: `{{TRACKER_PATH}}` reflects the current state of the story.
- [ ] **Sprint board synced**: `{{SPRINT_BOARD_PATH}}` reflects the current state of the story.
- [ ] **Commit references**: All commits for this story include `Refs: {{PREFIX}}-{id}` in the footer.
- [ ] **Branch naming**: Feature branch follows `{{BRANCH_PATTERN}}` convention.

### QA Verification Group
- [ ] **QA verification complete**: QA agent has verified all acceptance criteria with pass/fail verdicts.
- [ ] **QA evidence attached**: QA verification report is present in the story file or linked from it.
- [ ] **No open QA findings**: All QA-reported issues have been resolved.

## RESULTS

### If ALL checks PASS:
1. Update story frontmatter: `status: done`
2. Update `{{TRACKER_PATH}}`: story status → `done`
3. Update `{{SPRINT_BOARD_PATH}}`: story status → `done`
4. Update parent epic: check if epic should be marked done (all stories done?).
5. Log:
   ```
   DoD Check — {{PREFIX}}-{id}: PASS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   All {count} criteria passed.
   Status updated to: done
   Epic {epic-id}: {done-count}/{total-count} stories done
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

### If ANY check FAILS:
1. Do NOT change status.
2. Group failures by category and report with routable details:
   ```
   DoD Check — {{PREFIX}}-{id}: FAIL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Passed: {pass-count}/{total-count}

   IMPLEMENTATION FAILURES:
   - [FAIL] AC scenario "User sees error on invalid input" not addressed
     → Route to: {dev-agent} | Fix: Add validation handler in {file}:{line}

   TESTS FAILURES:
   - [FAIL] Coverage 72% < {{COVERAGE_THRESHOLD}}%
     → Route to: {dev-agent} | Fix: Add tests for {untested-file}

   QUALITY FAILURES:
   - [FAIL] 3 lint errors remain
     → Route to: {dev-agent} | Fix: Run {{LINT_CMD}} --fix
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Fix the above, then re-run /story-done-check {{PREFIX}}-{id}
   ```

<!-- /COMMAND -->

---

<!-- COMMAND: code-review -->

```yaml
---
description: "Independent code review against project standards with verdict and routable findings"
argument-hint: "<story-id-or-repo>"
---
```

You are the **code-reviewer agent**. You perform a structured code review of all changes
associated with a story or a repo branch. You produce a verdict and a list of actionable findings.

## INPUT

The argument can be:
- **Story ID** (e.g., `{{PREFIX}}-042`): Review changes associated with that story's branch.
- **Repo name** (e.g., `backend`): Review changes on the current branch vs `{{TRUNK_BRANCH}}`.

## MODES

### Standalone Mode
When invoked directly by the user (not from within `/story-develop`):
- Produce a verdict and findings report.
- Do NOT perform reverse handoffs (the user will decide what to do).

### Pipeline Mode
When invoked from within `/story-develop` STEP 4:
- Produce a verdict and findings.
- The orchestrator handles routing findings to responsible agents.

## REVIEW PROCESS

### 1. Gather Context

1. If story ID provided:
   - Read story file for AC, technical notes, and scope.
   - Determine repo from story frontmatter.
2. Identify changed files: `git diff {{TRUNK_BRANCH}}..HEAD --name-only`
3. Get the full diff: `git diff {{TRUNK_BRANCH}}..HEAD`
4. Read `{{STANDARDS_DIR}}/code-review.md` for the project's review criteria.

### 2. Review Checklist

Walk through each category. For each file in the diff, evaluate:

**Correctness**
- Does the code implement the behavior specified in the AC?
- Are all edge cases from the test plan handled?
- Are error paths handled gracefully (not swallowed)?

**Security**
- No hardcoded secrets, API keys, or passwords.
- No SQL injection vectors (use parameterized queries).
- No XSS vectors (proper output encoding).
- Proper authentication and authorization checks.
- No sensitive data in logs.
- Input validation on all external inputs.

**Performance**
- No N+1 query patterns.
- No unbounded loops or recursion.
- No memory leaks (unclosed resources, growing collections).
- Appropriate use of pagination for list endpoints.
- No blocking calls in async contexts.

**Readability**
- Clear, descriptive variable and function names.
- Functions are reasonably sized (not doing too many things).
- Comments explain "why", not "what".
- No dead code or unreachable branches.

**Architecture**
- Follows project patterns documented in CLAUDE.md and `{{STANDARDS_DIR}}/`.
- Proper separation of concerns (no business logic in controllers, no DB calls in services).
- No circular dependencies introduced.
- Proper error handling patterns (project-specific).

**Tests**
- Adequate test coverage for new code.
- Tests are meaningful (not just asserting true).
- No flaky test patterns (timing, external dependencies).
- Test names describe the behavior being tested.

**Contracts**
- API changes match `{{CONTRACTS_DIR}}/` specs.
- No undocumented API changes.
- Request/response shapes match contract definitions.

**Standards**
- Follows all rules in `{{STANDARDS_DIR}}/` documents.
- Commit messages follow convention.
- File/folder structure follows project conventions.

### 3. Produce Findings

For each issue found:
```
FINDING: {severity} | {file}:{line} | {category}
Description: {what's wrong and why it matters}
Fix direction: {specific guidance on how to resolve}
Responsible: {agent-name based on file path}
```

Severity levels:
- **CRITICAL**: Security vulnerability, data loss risk, breaking change. Blocks merge.
- **HIGH**: Bug, performance issue, missing error handling. Blocks merge.
- **MEDIUM**: Code smell, missing test, readability issue. Should fix.
- **LOW**: Style nit, suggestion, optional improvement. Nice to have.

### 4. Verdict

- **APPROVE**: Zero CRITICAL or HIGH findings. May have MEDIUM/LOW findings.
- **REQUEST CHANGES**: One or more HIGH findings. No CRITICAL findings.
- **BLOCK**: One or more CRITICAL findings.

### OUTPUT

```
Code Review — {{PREFIX}}-{id} / {repo}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files reviewed:  {count}
Findings:        {critical} critical, {high} high, {medium} medium, {low} low
Verdict:         {APPROVE / REQUEST CHANGES / BLOCK}

{findings list}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

<!-- /COMMAND -->

---

<!-- COMMAND: lint -->

```yaml
---
description: "Run linter, formatter, and type checker on changed files with auto-fix and routable report"
argument-hint: "<repo-name>"
---
```

You run the project's linter, formatter, and type checker on files changed in the current
branch. Auto-fixable issues are fixed automatically. Remaining issues are reported with
file:line detail for routing to the responsible agent.

## INPUT

Optional argument: repo name. If omitted, auto-detect from the current directory or the
story currently in-progress.

## STEPS

### 1. Identify Changed Files

1. Determine the repo and its root directory.
2. Run: `git diff {{TRUNK_BRANCH}}..HEAD --name-only`
3. Filter to source files only:
   - Include: files matching the repo's source patterns (e.g., `*.ts`, `*.py`, `*.go`).
   - Exclude: lock files, generated files, vendored dependencies, build artifacts.
4. If no changed files: report "No source files changed" and stop.

### 2. Run Formatter

1. Execute: `{{FORMAT_CMD}}` on the changed files.
2. Capture: list of files that were reformatted.
3. Log: `Formatted {count} file(s)`

### 3. Run Linter

1. Execute: `{{LINT_CMD}}` on the changed files.
2. Capture output: list of issues with file:line:column:rule:message.
3. Separate auto-fixed issues from remaining issues.
4. Log: `Lint: {auto-fixed} auto-fixed, {remaining} remaining`

### 4. Run Type Checker

1. Execute: `{{TYPECHECK_CMD}}` (typically runs on the whole project, but reports only relevant errors).
2. Capture output: list of type errors with file:line:message.
3. Filter to errors in changed files only.
4. Log: `Type check: {count} error(s) in changed files`

### 5. Report

```
Lint Report — {repo}
━━━━━━━━━━━━━━━━━━━━━━
Changed files:    {count}
Auto-formatted:   {count}
Auto-fixed (lint): {count}
Remaining issues: {count}

REMAINING ISSUES:
  {file}:{line}:{col} [{rule}] {message}
  {file}:{line}:{col} [{rule}] {message}
  ...

TYPE ERRORS:
  {file}:{line} {message}
  {file}:{line} {message}
  ...
━━━━━━━━━━━━━━━━━━━━━━
```

If invoked within a pipeline: the orchestrator will route remaining issues to the responsible agent.
If invoked standalone: the report is presented to the user for manual resolution.

<!-- /COMMAND -->

---

<!-- COMMAND: commit -->

```yaml
---
description: "Generate a suggested commit message from staged/unstaged changes following project convention"
argument-hint: "[repo-name]"
---
```

You generate a **suggested** commit message. You NEVER execute the commit yourself — the user
or dev agent handles all git operations.

## INPUT

Optional argument: repo name. If omitted, use the current working directory.

## STEPS

### 1. Read Changes

1. Check for staged changes: `git diff --cached --stat`
2. Check for unstaged changes: `git diff --stat`
3. If both staged and unstaged exist: generate message for staged only, note unstaged files.
4. If neither exist: report "No changes to commit" and stop.

### 2. Analyze the Diff

1. Read the full diff: `git diff --cached` (or `git diff` if nothing staged).
2. Identify:
   - Files added, modified, deleted.
   - Nature of changes: new feature, bug fix, refactor, test, docs, config, etc.
   - Scope: which component/module is affected.

### 3. Read Commit Convention

1. Read `{{STANDARDS_DIR}}/commit-convention.md` for the project's commit message format.
2. Typical format:
   ```
   <type>(<scope>): <subject>

   <body>

   Refs: {{PREFIX}}-<id>
   ```

### 4. Generate Message

1. Determine:
   - **Type**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style`, `perf`
   - **Scope**: component or module name (e.g., `auth`, `api`, `db`)
   - **Subject**: imperative mood, no period, max 72 chars
   - **Body**: optional, explains "why" not "what", wraps at 72 chars
   - **Footer**: `Refs: {{PREFIX}}-{id}` (detect story ID from branch name or prompt)
2. If story ID cannot be detected from branch name, ask: "Which story ID should this reference?"

### 5. Present to User

```
Suggested commit message:
━━━━━━━━━━━━━━━━━━━━━━━━━

feat(auth): add OTP expiration toast notification

Show a toast notification when OTP expires instead of failing silently.
The notification includes a "Resend OTP" action button.

Refs: {{PREFIX}}-042

━━━━━━━━━━━━━━━━━━━━━━━━━
Copy and use this message, or modify as needed.
Agent will NOT execute the commit.
```

<!-- /COMMAND -->

---

<!-- COMMAND: contract-update -->

```yaml
---
description: "Formal change request for API or event contracts — requires architect sign-off"
argument-hint: "<contract-name-or-endpoint>"
---
```

You manage **API and event contract changes**. Contract changes require formal review before
implementation because they affect multiple consumers.

## INPUT

The argument can be:
- An endpoint path (e.g., `/api/v1/appointments`)
- A contract file name (e.g., `appointments-api`)
- A description of the change (e.g., `"Add bulk delete endpoint to appointments"`)

## STEPS

### 1. Identify the Contract

1. Search `{{CONTRACTS_DIR}}/` for a matching contract file.
2. If found: read the existing contract spec.
3. If not found: this is a new contract — note that a new file will be created.

### 2. Describe the Proposed Change

1. Identify what is changing:
   - Endpoint (path, method)
   - Request shape (new fields, removed fields, type changes)
   - Response shape (new fields, removed fields, type changes)
   - Status codes
   - Authentication/authorization requirements
   - Rate limiting changes
2. For existing contracts: generate a diff showing before/after.
3. For new contracts: generate the full spec.

### 3. Impact Analysis

1. Identify all consumers of this contract:
   - Which repos call this endpoint?
   - Which services subscribe to this event?
2. Classify the change:
   - **Backward compatible**: New optional field, new endpoint, new event. Low risk.
   - **Breaking**: Removed field, changed type, removed endpoint. High risk — requires migration plan.
3. If breaking change:
   - Recommend: versioning strategy (new API version, deprecation period).
   - Require: ADR documenting the decision (invoke `/adr-new` if needed).

### 4. Request Sign-Off

Present the change request:
```
Contract Change Request
━━━━━━━━━━━━━━━━━━━━━━━
Contract:    {name}
Type:        {new / modification}
Compatibility: {backward-compatible / breaking}
Consumers:   {list}

Proposed Change:
{diff or new spec}

Impact:
{analysis}

Sign-off required from: Architect agent (or SM if no architect)
━━━━━━━━━━━━━━━━━━━━━━━
```

### 5. Upon Approval

1. Update (or create) the contract file in `{{CONTRACTS_DIR}}/`.
2. If breaking change: create or update the migration guide.
3. Log the change with date and approver.
4. Notify affected repo agents of the contract change.

### 6. Upon Rejection

1. Document the rejection reason.
2. Suggest alternatives if possible.
3. The requesting story may need to be re-scoped.

<!-- /COMMAND -->

---

<!-- COMMAND: adr-new -->

```yaml
---
description: "Create a new Architecture Decision Record from template in Nygard format"
argument-hint: "<title>"
---
```

You create a new **Architecture Decision Record (ADR)** using the Nygard format. ADRs
document significant architectural decisions and their rationale.

## INPUT

The argument is the ADR title:
```
/adr-new "Use PostgreSQL for primary data store"
/adr-new "Adopt event-driven architecture for notifications"
```

## STEPS

### 1. Determine Next ADR Number

1. List existing files in `{{ADR_DIR}}/`.
2. Find the highest existing ADR number.
3. Increment by 1.
4. Format: `ADR-{nnnn}` (zero-padded to 4 digits).
5. File name: `{{ADR_DIR}}/ADR-{nnnn}-{slug}.md` where `{slug}` is a kebab-case version of the title.

### 2. Create ADR from Template

Use the Nygard format:

```markdown
# ADR-{nnnn}: {title}

**Date:** {current-date}
**Status:** proposed
**Deciders:** {leave blank for user to fill}
**Context story:** {leave blank or link if invoked from a story}

## Context

{What is the issue that we're seeing that is motivating this decision or change?}

## Decision

{What is the change that we're proposing and/or doing?}

## Consequences

### Positive
- {What becomes easier or possible as a result of this change?}

### Negative
- {What becomes harder or impossible as a result of this change?}

### Neutral
- {What other changes or impacts does this decision have?}

## Alternatives Considered

### {Alternative 1}
- Pros: {list}
- Cons: {list}
- Why rejected: {reason}
```

### 3. Pre-Fill Context

- If the argument contains enough context, fill the Context section.
- Otherwise, leave it as a prompt for the user.

### 4. Write the File

1. Write to `{{ADR_DIR}}/ADR-{nnnn}-{slug}.md`.
2. Log: `Created ADR-{nnnn}: {title}`

### 5. Important Rules

- Once an ADR status is `accepted`, it is **immutable**. Never modify an accepted ADR.
- To change a decision: create a NEW ADR that **supersedes** the old one.
  - New ADR's Context section references the old ADR.
  - Old ADR's Status becomes `superseded by ADR-{new-number}`.
- Valid statuses: `proposed`, `accepted`, `rejected`, `deprecated`, `superseded by ADR-{nnnn}`

### OUTPUT

```
ADR Created — ADR-{nnnn}
━━━━━━━━━━━━━━━━━━━━━━━
Title:   {title}
Status:  proposed
File:    {{ADR_DIR}}/ADR-{nnnn}-{slug}.md
━━━━━━━━━━━━━━━━━━━━━━━
Fill in the Context, Decision, and Consequences sections.
When ready, update status to "accepted".
```

<!-- /COMMAND -->

---

<!-- COMMAND: epic-new -->

```yaml
---
description: "Create an empty epic from template with pre-filled frontmatter"
argument-hint: "<title>"
---
```

You create a new epic file from the project template. This is a **low-level** command that
creates the file structure with frontmatter. It does NOT generate stories — use `/epic-develop`
for full backlog generation.

## INPUT

The argument is the epic title:
```
/epic-new "User Authentication and Authorization"
/epic-new "Reporting Dashboard"
```

## STEPS

### 1. Determine Next Epic ID

1. Read `{{TRACKER_PATH}}`.
2. Find the highest existing epic number.
3. Increment by 1.
4. Format: `EPIC-{nnn}` (zero-padded to 3 digits).

### 2. Create Epic File

1. Read template from `{{TEMPLATES_DIR}}/epic-template.md`.
2. Pre-fill frontmatter:
   - `id`: `EPIC-{nnn}`
   - `title`: from argument
   - `status`: `planning`
   - `created`: current date
   - `stories`: (empty list)
   - `frd-ref`: (leave blank)

### 3. Prompt for Content

Interactively prompt the user for:
- **Goal**: What does this epic achieve for the user? (1-2 sentences)
- **In Scope**: What features/behaviors are included? (bullet list)
- **Out of Scope**: What is explicitly excluded? (bullet list)
- **Success Criteria**: How do we know this epic is done? (measurable outcomes)
- **Dependencies**: Other epics or external prerequisites.

### 4. Write the Epic File

1. Write to `{{EPICS_DIR}}/EPIC-{nnn}.md`.

### 5. Update Tracker

1. Add epic entry to `{{TRACKER_PATH}}`:
   - ID, title, status: `planning`, stories: 0

### OUTPUT

```
Epic Created — EPIC-{nnn}
━━━━━━━━━━━━━━━━━━━━━━━━
Title:    {title}
Status:   planning
Stories:  0
File:     {{EPICS_DIR}}/EPIC-{nnn}.md
━━━━━━━━━━━━━━━━━━━━━━━━
Next: /epic-develop EPIC-{nnn}  (generate stories from requirements)
  or: /story-new EPIC-{nnn} "story title"  (add stories manually)
```

<!-- /COMMAND -->

---

<!-- COMMAND: epic-biz-sync -->

```yaml
---
description: "Generate an executive summary of all epics for non-technical stakeholder sync"
argument-hint: ""
---
```

You generate a **stakeholder-friendly executive summary** of the project's current state.
This summary is formatted for non-technical readers (product owners, executives, business
stakeholders) and focuses on business outcomes, not implementation details.

## STEPS

### 1. Gather Data

1. Read `{{TRACKER_PATH}}` for all epics and their statuses.
2. Read `{{SPRINT_BOARD_PATH}}` for current sprint progress.
3. For each epic, read the epic file to get: goal, success criteria, story counts.
4. Read `{{SPRINT_CURRENT_PATH}}` for any recent activity.

### 2. Generate Executive Summary

```markdown
# Project Status — {{PROJECT_NAME}}
**Date:** {current-date}
**Sprint:** {current-sprint-number}

## Overall Progress
- Epics: {done}/{total} complete
- Stories: {done}/{total} complete ({percentage}%)
- Current velocity: {points-per-sprint} pts/sprint

## Epic Status

### Completed
| Epic | Goal | Completed |
|---|---|---|
| {epic-id} | {goal — 1 sentence} | {date} |

### In Progress
| Epic | Goal | Progress | ETA |
|---|---|---|---|
| {epic-id} | {goal — 1 sentence} | {done}/{total} stories | {estimated sprint} |

### Planned
| Epic | Goal | Stories | Target Sprint |
|---|---|---|---|
| {epic-id} | {goal — 1 sentence} | {count} | {sprint} |

## Key Metrics
- Sprint velocity (last 3 sprints): {trend}
- Cycle time (avg): {days} days per story
- Bug rate: {bugs-created}/{stories-completed}

## Blockers and Risks
- {list any blocked stories or epics with business impact}

## Upcoming Milestones
- {next sprint close date}
- {next epic expected completion}
```

### 3. Output

Present the summary. Do NOT write it to a file unless the user requests it.

<!-- /COMMAND -->

---

<!-- COMMAND: sprint-plan -->

```yaml
---
description: "Plan a sprint: pull ready stories from the backlog into a new or existing sprint"
argument-hint: "<sprint-number>"
---
```

You are the **Scrum Master agent** planning a sprint. You select stories from the ready backlog,
respect dependencies and capacity, and create the sprint plan.

## INPUT

The argument is the sprint number:
```
/sprint-plan 3
```

## STEPS

### 1. Read Backlog

1. Read `{{TRACKER_PATH}}` to get all stories with status `ready` that are not assigned to a sprint.
2. Read `{{SPRINT_BOARD_PATH}}` to see existing sprints and their contents.
3. Read each candidate story file to get: points, dependencies, repo, epic.

### 2. Check for Existing Sprint

1. If sprint {number} already exists in `{{SPRINT_BOARD_PATH}}`:
   - Show current contents.
   - Ask: "Sprint {number} already exists. Add more stories or replace?"
2. If sprint {number} does not exist: create a new sprint section.

### 3. Suggest Stories

Apply these rules to select stories:

**Dependency ordering:**
- A story cannot be in a sprint if its dependencies are not `done` or in an earlier/same sprint.
- Order stories so dependencies come first.

**Capacity respect:**
- Default sprint capacity: 20 points (adjustable by user).
- Fill to capacity but do not exceed.
- Prefer completing an epic over starting a new one (group stories from same epic).

**Priority:**
- Blocked stories are excluded.
- Higher-priority epics' stories come first.
- Within an epic, respect dependency ordering.

Present the suggested sprint plan:
```
Sprint {number} Plan (Suggested)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Capacity: {capacity} points
Selected: {total-points} points across {count} stories

| Story | Title | Epic | Points | Dependencies |
|---|---|---|---|---|
| {{PREFIX}}-001 | ... | EPIC-001 | 3 | none |
| {{PREFIX}}-002 | ... | EPIC-001 | 2 | {{PREFIX}}-001 |
| ... | | | | |

Remaining backlog: {count} stories ({points} points)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Accept this plan? (yes / modify / cancel)
```

### 4. Finalize Sprint

Upon acceptance:

1. **Update `{{SPRINT_BOARD_PATH}}`:**
   - Create sprint section: `## Sprint {number}`
   - Add stories in dependency order with status columns.
   - Format:
     ```
     ## Sprint {number}
     **Start:** {date}  |  **Status:** active

     | Story | Title | Points | Status | Epic |
     |---|---|---|---|---|
     | {{PREFIX}}-001 | ... | 3 | ready | EPIC-001 |
     ```

2. **Create `{{SPRINT_CURRENT_PATH}}`** from template:
   - Sprint number, start date, goals, story list.
   - Daily sync log section (empty).

3. **Update `{{TRACKER_PATH}}`:**
   - Set sprint assignment for each selected story.

4. **Update story files:**
   - Add `sprint: {number}` to each story's frontmatter.

### OUTPUT

```
Sprint {number} Planned
━━━━━━━━━━━━━━━━━━━━━━━
Stories:  {count}
Points:   {total}
Epics:    {list of epic IDs represented}
Start:    {date}
━━━━━━━━━━━━━━━━━━━━━━━
Next: /daily-sync (track progress)
  or: /story-develop {{PREFIX}}-{first-id} (start developing)
```

<!-- /COMMAND -->

---

<!-- COMMAND: sprint-review -->

```yaml
---
description: "Sprint close-out with E2E gate, bug auto-creation, retrospective, and archival"
argument-hint: "[sprint-number]"
---
```

You are the **Scrum Master agent** closing out a sprint. This is a critical ceremony that
includes an E2E quality gate — the sprint CANNOT close unless all stories are done AND E2E
tests pass.

## INPUT

Optional argument: sprint number. If omitted, use the current active sprint.

## PIPELINE

### 1. Read Sprint Status

1. Read `{{SPRINT_BOARD_PATH}}` for the specified sprint.
2. List all stories in the sprint with their statuses.
3. Read `{{TRACKER_PATH}}` for cross-reference.

### 2. Check Story Statuses

1. For each story in the sprint, verify status is `done`.
2. If ANY story is NOT `done`:
   ```
   Sprint {number} — NOT READY TO CLOSE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Stories not done:
   - {{PREFIX}}-{id}: {title} — status: {status}
   - {{PREFIX}}-{id}: {title} — status: {status}

   Action: Complete these stories or move them to the next sprint.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```
   - Ask user: "Move incomplete stories to next sprint, or keep sprint open?"
   - If move: update story sprint assignments and continue.
   - If keep: STOP — sprint stays open.

### 3. Run E2E Tests

1. **Invoke `/e2e-run` logic** for all stories in the sprint.
2. This spawns the QA E2E agent to run end-to-end tests covering the sprint's critical flows.
3. Wait for results.

### 4. Handle E2E Results

**If ALL E2E tests pass:**
- Log: `E2E gate: PASS — all critical flows verified`
- Proceed to step 5.

**If E2E tests fail:**
- For each failure:
  1. **Create a bug story:**
     - File: `{{STORIES_DIR}}/{{PREFIX}}-{next-id}.md`
     - Title: `Bug: E2E failure — {test-name}`
     - Status: `ready`
     - Sprint: current sprint (or next sprint, user's choice)
     - Include: failure details, screenshot reference, expected vs actual behavior.
  2. Update `{{TRACKER_PATH}}` and `{{SPRINT_BOARD_PATH}}` with bug stories.
  3. Log: `[ESCALATE] Created bug {{PREFIX}}-{id} for E2E failure: {test-name}`
- Report:
  ```
  E2E gate: FAIL — {count} test(s) failed
  Bug stories created: {list of IDs}
  Sprint stays OPEN until bugs are resolved.
  ```
- STOP — sprint cannot close.

### 5. Mark Sprint Done

1. Update `{{SPRINT_BOARD_PATH}}`:
   - Sprint status: `done`
   - Sprint end date: current date
2. Update `{{TRACKER_PATH}}`: all sprint stories confirmed done.

### 6. Generate Sprint Review Notes

```markdown
## Sprint {number} Review
**Period:** {start-date} — {end-date}
**Status:** done

### Stories Completed
| Story | Title | Points | Cycle Time |
|---|---|---|---|
| {{PREFIX}}-{id} | {title} | {points} | {days} days |

### Metrics
- Velocity: {total-points} points
- Stories completed: {count}
- Bugs created: {count}
- Average cycle time: {avg-days} days

### Carry-Over
- {list of stories moved to next sprint, if any}
```

### 7. Retrospective Prompts

Prompt the team (user) for retrospective input:
```
Sprint {number} Retrospective
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What went well?
> {prompt user}

What didn't go well?
> {prompt user}

Action items for next sprint:
> {prompt user}
```

Record responses in the sprint review notes.

### 8. Archive Sprint

1. Move sprint review notes to `{{CEREMONIES_DIR}}/sprint-archive/sprint-{number}-review.md`.
2. Clear `{{SPRINT_CURRENT_PATH}}` or reset it for the next sprint.
3. Log: `Sprint {number} archived to {{CEREMONIES_DIR}}/sprint-archive/`

### OUTPUT

```
Sprint {number} — CLOSED
━━━━━━━━━━━━━━━━━━━━━━━━
Velocity:     {points} points
Stories:      {count} completed
Cycle time:   {avg} days average
Bugs:         {count} created during sprint
Archived to:  {{CEREMONIES_DIR}}/sprint-archive/sprint-{number}-review.md
━━━━━━━━━━━━━━━━━━━━━━━━
Next: /sprint-plan {next-number}
```

<!-- /COMMAND -->

---

<!-- COMMAND: daily-sync -->

```yaml
---
description: "Async standup: show current sprint progress, blockers, and recent completions"
argument-hint: ""
---
```

You generate an **async daily standup** report for the current sprint. This replaces the
traditional standup meeting with a structured status snapshot.

## STEPS

### 1. Read Current Sprint

1. Read `{{SPRINT_BOARD_PATH}}` to find the active sprint.
2. If no active sprint: report "No active sprint. Run /sprint-plan to create one." and stop.
3. Read all stories in the active sprint with their current statuses.

### 2. Generate Standup

```
Daily Sync — Sprint {number} — {date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IN PROGRESS:
  {{PREFIX}}-{id}: {title} ({agent}) — {brief status note}
  {{PREFIX}}-{id}: {title} ({agent}) — {brief status note}

BLOCKED:
  {{PREFIX}}-{id}: {title} — blocked by: {reason or dependency}

DONE SINCE LAST SYNC:
  {{PREFIX}}-{id}: {title} — completed {date}

SPRINT PROGRESS:
  {done}/{total} stories | {done-points}/{total-points} points | {percentage}% complete

UPCOMING:
  {{PREFIX}}-{id}: {title} ({points} pts) — next in queue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. Log to Sprint Current

Append the standup entry to `{{SPRINT_CURRENT_PATH}}` under the daily log section:
```markdown
### {date}
- In progress: {count} stories
- Blocked: {count} stories
- Done since last sync: {count} stories
- Sprint progress: {percentage}%
```

<!-- /COMMAND -->

---

<!-- COMMAND: e2e-run -->

```yaml
---
description: "Run end-to-end tests for an epic or sprint — generates and executes critical flow tests"
argument-hint: "<epic-id-or-sprint-number>"
---
```

You orchestrate **end-to-end (E2E) testing** for a set of stories. You spawn the QA E2E agent
to generate and run tests covering critical user flows.

## INPUT

The argument can be:
- **Epic ID** (e.g., `EPIC-003`): Run E2E tests for all done stories in that epic.
- **Sprint number** (e.g., `3`): Run E2E tests for all done stories in that sprint.

## STEPS

### 1. Identify Stories in Scope

1. If epic ID: read the epic file and get all stories with status `done`.
2. If sprint number: read `{{SPRINT_BOARD_PATH}}` and get all stories with status `done` in that sprint.
3. If no done stories: report "No completed stories to test" and stop.

### 2. Identify Critical Flows

1. For each story, read the acceptance criteria (Gherkin scenarios).
2. Group scenarios into **critical user flows** — end-to-end paths through the application:
   - Example: "User registers → verifies email → logs in → creates appointment"
   - Each flow may span multiple stories.
3. Prioritize flows by business criticality and risk.

### 3. Spawn QA E2E Agent

1. Dispatch to the QA E2E agent with:
   - List of critical flows.
   - Gherkin scenarios per flow.
   - Relevant API contracts from `{{CONTRACTS_DIR}}/`.
   - Test environment configuration.

2. The QA E2E agent:
   - Generates Playwright/Cypress test files (or uses the project's E2E framework).
   - Each test covers one critical flow.
   - Tests include: setup, execution, assertions, teardown.
   - Tests capture screenshots on failure.

### 4. Execute Tests

1. Run: `{{E2E_CMD}}`
2. Capture results: pass/fail per test, timing, screenshots.

### 5. Report

```
E2E Test Report
━━━━━━━━━━━━━━━━━━━━━━━━
Scope:     {epic-id or sprint number}
Stories:   {count} in scope
Flows:     {count} critical flows tested
Duration:  {time}

RESULTS:
  PASS  {flow-name} ({duration})
  PASS  {flow-name} ({duration})
  FAIL  {flow-name} ({duration})
        Expected: {expected}
        Actual: {actual}
        Screenshot: {path}

Summary: {pass}/{total} flows passed
━━━━━━━━━━━━━━━━━━━━━━━━
```

If invoked within `/sprint-review`: failures block sprint closure and trigger bug auto-creation.
If invoked standalone: failures are reported for user action.

<!-- /COMMAND -->

---

<!-- COMMAND: sync-workspace -->

```yaml
---
description: "Multi-repo workspace bootstrap: verify all repos exist, check branches, pull latest"
argument-hint: ""
---
```

You synchronize a **multi-repo workspace**. This command is only relevant for projects with
multiple repositories. For single-repo projects, it reports "Single-repo project — no sync needed."

## STEPS

### 1. Read Topology

1. Read the repo topology from CLAUDE.md.
2. Extract: repo names, expected paths, expected branches.
3. If CLAUDE.md does not define a multi-repo topology: report "Single-repo project — no sync needed" and stop.

### 2. Verify Each Repo

For each repo in the topology:

1. **Existence check**: Verify the directory exists at the expected path.
   - If missing: report `MISSING — {repo}: expected at {path}`

2. **Branch check**: Verify the current branch.
   - Run `git branch --show-current` in the repo directory.
   - Report: `{repo}: on branch {branch}`
   - Warn if on `{{TRUNK_BRANCH}}` during active development (should be on feature branch).

3. **Status check**: Check for uncommitted changes.
   - Run `git status --porcelain` in the repo directory.
   - If dirty: report `{repo}: {count} uncommitted changes`

4. **Remote sync**: Pull latest from remote.
   - Run `git fetch origin` in the repo directory.
   - Check if behind remote: `git rev-list HEAD..origin/{{TRUNK_BRANCH}} --count`
   - If behind: report `{repo}: {count} commits behind origin/{{TRUNK_BRANCH}}`

### 3. Report

```
Workspace Sync — {{PROJECT_NAME}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Repos: {count}

| Repo | Path | Branch | Status | Behind Remote |
|---|---|---|---|---|
| backend | ./backend | feat/ACME-042 | clean | 0 |
| frontend | ./frontend | feat/ACME-042 | 3 changes | 2 commits |
| shared | ./shared | main | clean | 0 |

Warnings:
- frontend: 3 uncommitted changes — commit or stash before proceeding
- frontend: 2 commits behind remote — consider pulling

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

<!-- /COMMAND -->

---

<!-- COMMAND: story-pickup -->

```yaml
---
description: "Dev claims a story: verify readiness, check dependencies, create branch, set in-progress"
argument-hint: "<story-id>"
---
```

You handle the **story pickup** process — a developer (or dev agent) formally claims a story
and begins work on it.

## INPUT

Story ID: `{{PREFIX}}-{nnn}`

## STEPS

### 1. Read Story

1. Read the story file: `{{STORIES_DIR}}/{{PREFIX}}-{nnn}.md`.
2. Confirm story exists.

### 2. Verify Status

1. Check story status:
   - If `ready`: proceed.
   - If `in-progress`: "Story is already in-progress. Resume work or check pipeline progress."
   - If `done`: "Story is already done."
   - If `draft`: "Story is not ready. Run /story-ready-check first."
   - If `blocked`: "Story is blocked. Resolve blockers first."
2. If status is not `ready`, STOP.

### 3. Check Dependencies

1. Read the `dependencies` field from story frontmatter.
2. For each dependency:
   - Read the dependency story file.
   - Verify its status is `done`.
3. If any dependency is NOT `done`:
   ```
   Cannot pick up {{PREFIX}}-{id} — dependencies not met:
   - {{PREFIX}}-{dep-id}: {title} — status: {status}
   ```
   STOP.

### 4. Determine Dev Agent

1. Read the `repo` field from story frontmatter.
2. Map to the responsible dev agent using the agent roster in CLAUDE.md.
3. Log: `Assigned to: {agent-name} (repo: {repo})`

### 5. Create Feature Branch

1. Branch name follows: `{{BRANCH_PATTERN}}`
   - Replace `{id}` with the story ID number.
   - Replace `{slug}` with a kebab-case version of the story title (max 50 chars).
2. Create the branch from `{{TRUNK_BRANCH}}`:
   - `git checkout {{TRUNK_BRANCH}}`
   - `git pull origin {{TRUNK_BRANCH}}`
   - `git checkout -b {branch-name}`
3. Log: `Branch created: {branch-name}`

### 6. Update Status

1. Update story frontmatter: `status: in-progress`
2. Update `{{TRACKER_PATH}}`: story status → `in-progress`
3. Update `{{SPRINT_BOARD_PATH}}`: story status → `in-progress`
4. Update parent epic status to `in-progress` if it is still `planning`.

### OUTPUT

```
Story Picked Up — {{PREFIX}}-{id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title:    {title}
Agent:    {dev-agent-name}
Repo:     {repo}
Branch:   {branch-name}
Status:   in-progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next: /story-develop {{PREFIX}}-{id}  (run full pipeline)
  or: Start implementing manually
```

<!-- /COMMAND -->

---

## Scaffold Integration Notes

When the scaffold phase processes this catalog:

1. **Read each `<!-- COMMAND: name -->` block.**
2. **Extract the YAML frontmatter** (between the triple-backtick yaml fences).
3. **Extract the instruction body** (everything after the closing frontmatter fence, up to `<!-- /COMMAND -->`).
4. **Perform variable substitution**: Replace all `{{VARIABLE}}` placeholders with resolved values from the project configuration.
5. **Write to file**: `{{COMMANDS_DIR}}/{name}.md` — the file contains the YAML frontmatter followed by a blank line and the instruction body.
6. **Verify**: Confirm all 20 command files were created and no unresolved `{{VARIABLE}}` placeholders remain.

### Command File Output Format

Each generated command file should look like:
```
---
description: "Short description"
argument-hint: "<what-to-pass>"
---

{instruction body with all variables resolved}
```
