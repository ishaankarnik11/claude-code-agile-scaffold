# FRD Analysis Rules

> Canonical reference for BA, QA, and SM subagents operating in Phase 3.
> These rules govern how a Functional Requirements Document (FRD) is parsed,
> decomposed, and transformed into epics, user stories, acceptance criteria,
> a test plan, and a sprint board.

---

## 1. Purpose

This document defines the deterministic rule set that Phase 3 subagents follow
when they receive an FRD (or equivalent requirements document) and must produce:

- **Epics** -- high-level functional groupings mapped from FRD sections.
- **User Stories** -- INVEST-compliant work items derived from each epic.
- **Story Points** -- sizing estimates using a Fibonacci-adjacent scale.
- **Acceptance Criteria** -- Gherkin-formatted conditions of satisfaction.
- **Test Plans** -- unit, integration, E2E, and manual test outlines.
- **Sprint Board** -- stories assigned to sprints with dependency ordering.
- **Domain Glossary** -- extracted business terms and definitions.

Subagent responsibilities:

| Subagent | Primary Outputs                         |
|----------|-----------------------------------------|
| BA       | Epics, stories, sizing, domain glossary |
| QA       | Acceptance criteria, test plans         |
| SM       | Sprint board, dependency ordering       |

All three subagents share this rule set so their outputs remain internally
consistent. When a rule says "extract", the BA subagent performs the extraction.
When a rule says "verify", the QA subagent validates. When a rule says "assign",
the SM subagent handles placement.

---

## 2. Document Discovery

### 2.1 Search Patterns

Search for requirements documents using the following filename patterns, applied
in order of priority (first match wins within each priority tier):

| Priority | Glob Pattern           | Description                          |
|----------|------------------------|--------------------------------------|
| 1        | `*FRD*`                | Functional Requirements Document     |
| 1        | `*functional*req*`     | Alternate FRD naming                 |
| 2        | `*PRD*`                | Product Requirements Document        |
| 2        | `*product*req*`        | Alternate PRD naming                 |
| 3        | `*BRD*`                | Business Requirements Document       |
| 3        | `*business*req*`       | Alternate BRD naming                 |
| 4        | `*SRS*`                | Software Requirements Specification  |
| 4        | `*requirements*`       | Generic requirements document        |
| 5        | `*spec*`               | Specification document               |
| 5        | `*feature*`            | Feature description document         |

Pattern matching MUST be case-insensitive.

### 2.2 Search Locations

Search the following directories in order. Stop searching additional locations
once at least one document is found at the current location:

```
1. docs/FRD/
2. docs/frd/
3. docs/requirements/
4. docs/
5. requirements/
6. specs/
7. . (project root)
8. planning/
9. design/
```

### 2.3 Supported Formats

| Extension | Parser Strategy                                     |
|-----------|-----------------------------------------------------|
| `.md`     | Native markdown parsing, heading-level extraction   |
| `.html`   | Strip HTML tags, then parse as structured text       |
| `.pdf`    | Use PDF read tool, extract text per page             |
| `.txt`    | Treat as unstructured; use blank-line section splits |
| `.docx`   | Convert to markdown first, then parse               |
| `.rst`    | Convert reStructuredText to markdown, then parse     |

Prefer `.md` over other formats when multiple formats of the same document exist.

### 2.4 Multiple Documents Found

When multiple candidate documents are discovered:

1. If one file is clearly the latest version (e.g., `FRD-v3.md` vs `FRD-v1.md`),
   use the highest version number.
2. If documents are at different priority tiers (see 2.1), use the
   highest-priority document.
3. If documents are at the same tier and no version indicator exists, read all
   of them and merge non-overlapping sections. Flag overlapping sections as
   conflicts in the output and note which document each interpretation came from.
4. Always log which document(s) were selected and why.

### 2.5 No Document Found

When no requirements document is discovered:

1. Check for a `README.md` in the project root and attempt to extract feature
   descriptions from it.
2. Check for issue tracker exports (`issues.json`, `issues.csv`, `backlog.*`).
3. If still nothing is found, halt Phase 3 and emit:
   ```
   ERROR: No FRD or equivalent requirements document found.
   Searched locations: [list attempted paths]
   Searched patterns: [list attempted globs]
   Action required: Place a requirements document in docs/FRD/ and re-run.
   ```
4. Do NOT fabricate requirements. Do NOT proceed with assumptions.

---

## 3. Section Extraction Rules

### 3.1 Identifying Epic Candidates

An FRD section qualifies as an epic candidate when ALL of the following hold:

- It is a **top-level heading** (H1 or H2 in markdown, or the first two levels
  of the document's heading hierarchy).
- It describes a **functional module** -- a coherent area of user-facing or
  system behavior.
- It contains at least one **describable user action** or **system behavior**
  beneath it.
- It is NOT on the exclusion list (see 3.3).

If the FRD uses only H1 headings with no H2, then H1 = epic level.
If the FRD uses H1 for the document title and H2 for sections, then H2 = epic level.
If the FRD uses H1 for the title, H2 for groupings, and H3 for modules, then
H3 = epic level (but only when H2 sections are too broad to be actionable epics).

### 3.2 Patterns That Indicate Epics

The following heading patterns strongly suggest an epic boundary:

```
"Module: X"           -> Epic: X
"X Module"            -> Epic: X
"X Management"        -> Epic: X Management
"X System"            -> Epic: X System
"X Feature"           -> Epic: X
"X Functionality"     -> Epic: X
"X Operations"        -> Epic: X Operations
"X Workflow"          -> Epic: X Workflow
"X Integration"       -> Epic: X Integration
"User X"              -> Epic: User X
"Admin X"             -> Epic: Admin X
"N. Section Name"     -> Epic: Section Name  (strip numbering)
"N.M Section Name"    -> Epic: Section Name  (strip numbering)
```

### 3.3 Patterns That Do NOT Map to Epics

The following sections must be EXCLUDED from epic generation. They are
informational or architectural, not functional:

| Exclusion Pattern          | Reason                                |
|----------------------------|---------------------------------------|
| `Introduction`             | Meta-document, not a feature          |
| `Overview`                 | Summary, not actionable               |
| `Scope`                    | Boundary definition, not a feature    |
| `Tech Stack`               | Implementation choice, not a feature  |
| `Technology`               | Implementation choice, not a feature  |
| `Architecture`             | Structural decision, not a feature    |
| `System Architecture`      | Structural decision, not a feature    |
| `Non-Functional Req*`      | Handled as cross-cutting concerns     |
| `NFR*`                     | Handled as cross-cutting concerns     |
| `Glossary`                 | Reference material                    |
| `Definitions`              | Reference material                    |
| `Appendix`                 | Supplementary material                |
| `Appendices`               | Supplementary material                |
| `References`               | Bibliography, not a feature           |
| `Assumptions`              | Constraints, not a feature            |
| `Constraints`              | Constraints, not a feature            |
| `Revision History`         | Document meta                         |
| `Change Log`               | Document meta                         |
| `Sign-Off`                 | Approval meta                         |
| `Approval`                 | Approval meta                         |
| `Table of Contents`        | Navigation aid                        |
| `Document Control`         | Document meta                         |

However, content WITHIN excluded sections may still inform other outputs:

- **Non-Functional Requirements**: feed into acceptance criteria as
  cross-cutting constraints (e.g., "page load < 2s" becomes an AC on
  relevant stories).
- **Glossary/Definitions**: feed directly into the domain glossary output.
- **Tech Stack/Architecture**: inform story sizing and dependency inference.

### 3.4 Epic Naming Conventions

- Strip leading section numbers: `3.2 User Management` -> `User Management`.
- Strip trailing punctuation.
- Use Title Case.
- Keep names concise: 2-5 words preferred.
- Prefix with the project prefix: `EPIC-{PREFIX}-NNN`.
- Number sequentially starting from `001` (reserve `000` for Foundation epic).

---

## 4. Story Derivation Rules

### 4.1 INVEST Criteria

Every generated story MUST satisfy all INVEST criteria:

| Criterion     | Rule                                                      |
|---------------|-----------------------------------------------------------|
| Independent   | Can be developed without waiting for another story in the  |
|               | same sprint (cross-sprint dependencies are acceptable).    |
| Negotiable    | Describes WHAT not HOW; implementation is not prescribed.  |
| Valuable      | Delivers observable value to at least one user role.       |
| Estimable     | Sized using the heuristics table (Section 5).              |
| Small          | No story exceeds 5 story points. Split if larger.          |
| Testable      | Has at least 2 acceptance criteria in Gherkin format.      |

### 4.2 Decomposition Rules

Apply these rules to decompose FRD content into individual stories:

**Rule 4.2.1 -- One Action, One Story**
Each distinct user action described in the FRD becomes exactly one story.
"The user can create, view, edit, and delete projects" yields FOUR stories,
not one.

**Rule 4.2.2 -- CRUD Expansion**
When the FRD describes CRUD operations on a major entity, generate one story
per operation:

| Operation | Story Template                                        |
|-----------|-------------------------------------------------------|
| Create    | "As a [ROLE], I can create a new [ENTITY]"            |
| Read      | "As a [ROLE], I can view [ENTITY] details"            |
| Read-List | "As a [ROLE], I can view a list of [ENTITY]s"         |
| Update    | "As a [ROLE], I can edit an existing [ENTITY]"        |
| Delete    | "As a [ROLE], I can delete an [ENTITY]"               |

If the FRD explicitly mentions only a subset of CRUD, generate only
those mentioned. Do NOT assume full CRUD unless stated.

**Rule 4.2.3 -- Integration Story Isolation**
Each external system integration becomes its own story, separate from the
feature that consumes it:

- "Payment via Stripe" -> one integration story for Stripe, separate from
  the checkout feature story.
- "Email notifications via SendGrid" -> one integration story for SendGrid,
  separate from the notification trigger story.

**Rule 4.2.4 -- Frontend/Backend Separation**
When a feature requires both backend API and frontend UI:

- **Backend story**: "Implement API endpoint for [FEATURE]"
- **Frontend story**: "Implement UI for [FEATURE]"

The frontend story depends on the backend story. They are sized independently.
Exception: trivial features (2pts total) may be combined into a single
full-stack story if the team velocity supports it.

**Rule 4.2.5 -- Screen-Per-Story**
Each distinct screen, page, or view described in the FRD becomes at least one
frontend story. Complex screens with multiple interactive sections may be
decomposed further:

- Dashboard with 3 widget areas -> 1 dashboard layout story + 1 story per widget.
- Form with 15+ fields and multi-step wizard -> 1 story per wizard step.
- Settings page with 4 tabs -> 1 story per tab.

**Rule 4.2.6 -- Auth Separation**
Authentication and authorization are ALWAYS separate stories from the features
they protect:

- "Login" is its own story.
- "Registration" is its own story.
- "Role-based access control" is its own story.
- "Password reset" is its own story.
- Feature stories reference auth as a dependency, not as inline work.

**Rule 4.2.7 -- Search and Filter Separation**
If a list view has search and/or filter capabilities, those are separate
stories from the base list view:

- "View list of orders" -> 1 story.
- "Search orders by keyword" -> 1 story.
- "Filter orders by status/date" -> 1 story.

**Rule 4.2.8 -- Notification Separation**
Each notification channel (email, SMS, push, in-app) is a separate story from
the event that triggers it:

- "Send email when order is placed" -> 1 story.
- "Show in-app notification when order status changes" -> 1 story.

**Rule 4.2.9 -- Report Separation**
Each report or analytics view is its own story. If a report has an export
function, the export is a separate story.

### 4.3 Story Title Format

```
[STORY-{PREFIX}-{NNN}] As a {ROLE}, I can {ACTION} [so that {BENEFIT}]
```

- `{PREFIX}` matches the project prefix.
- `{NNN}` is a zero-padded sequential number starting from 001.
- `{ROLE}` is extracted per Section 6.
- `{ACTION}` uses present tense, active voice.
- `{BENEFIT}` is optional but strongly encouraged when the value is not obvious.

### 4.4 Story Description Template

```markdown
## Description
[1-3 sentences summarizing what this story delivers]

## FRD Reference
Section: [FRD section name]
Paragraph/Line: [approximate location in FRD]

## Technical Notes
- [Any implementation hints from the FRD, not prescriptive]

## Dependencies
- [STORY-{PREFIX}-{NNN}] [title] -- [reason for dependency]

## Story Points: {N}
```

---

## 5. Story Sizing Heuristics

### 5.1 Reference Table

| Story Type                          | Points | Examples / Notes                            |
|-------------------------------------|--------|---------------------------------------------|
| Simple CRUD (single entity, no BL)  | 2      | Create/read/update/delete with basic fields |
| CRUD with business rules            | 3      | Validation logic, computed fields, status   |
|                                     |        | transitions, conditional required fields    |
| Complex business logic              | 5      | Multi-step workflows, state machines,       |
|                                     |        | complex calculations, rule engines          |
| UI form (basic)                     | 3      | Standard input form, client-side validation |
| UI data table with filters/search   | 3      | Sortable columns, pagination, filter panel  |
| External API integration            | 5      | Third-party API, OAuth, webhook handling    |
| Auth / RBAC implementation          | 5      | Login, registration, role management,       |
|                                     |        | permission matrices, token handling         |
| Report / dashboard (simple)         | 3      | Static data display, basic charts           |
| Report / dashboard (complex)        | 5      | Interactive charts, drill-down, real-time   |
|                                     |        | data, multiple data sources                 |
| File upload / download              | 3      | Single file type, size validation, storage  |
| File processing / transformation    | 5      | Parse CSV/Excel, transform data, bulk ops   |
| Real-time feature                   | 5      | WebSocket, SSE, live updates, presence      |
| Email / notification send           | 3      | Template rendering, single channel          |
| Multi-channel notification          | 5      | Email + SMS + push, preference management   |
| Static/informational page           | 1      | About page, terms of service, help page     |
| Configuration / settings page       | 3      | User preferences, system settings           |
| Search (basic keyword)              | 2      | Single-field search, simple matching        |
| Search (advanced / faceted)         | 5      | Multi-field, faceted filters, relevance     |
| Data import (bulk)                  | 5      | File parsing, validation, error reporting   |
| Data export                         | 3      | CSV/PDF export of existing data             |

### 5.2 Sizing Modifiers

Apply these modifiers when the base heuristic needs adjustment:

| Modifier                            | Adjustment |
|-------------------------------------|------------|
| Feature spans 3+ roles              | +1 point   |
| Feature requires audit logging      | +1 point   |
| Feature has i18n / l10n requirement | +1 point   |
| Feature has offline support         | +2 points  |
| Feature is purely backend, no UI    | -1 point   |

After applying modifiers, if the total exceeds 5, the story MUST be split.

### 5.3 Split Rules for Oversized Stories

When a story exceeds 5 points after sizing:

1. **Split by layer**: backend API story + frontend UI story.
2. **Split by operation**: separate CRUD operations if combined.
3. **Split by role**: if multiple roles have different interactions, create
   one story per role.
4. **Split by phase**: "basic version" (2-3 pts) + "enhanced version" (2-3 pts).
   Basic delivers core value; enhanced adds polish.
5. **Split by data scope**: if handling multiple entity types, one story per type.

After splitting, each resulting story must independently satisfy INVEST and must
individually be sized at 2-5 points. A 1-point story is acceptable only for
trivial UI or config changes.

---

## 6. Role Extraction Rules

### 6.1 Detection Patterns

Scan the FRD for role definitions using these patterns (in priority order):

| Pattern                             | Extraction Rule                          |
|-------------------------------------|------------------------------------------|
| "User Types" / "User Roles" section | Direct extraction of listed roles        |
| "Actors" section                    | Direct extraction of listed actors       |
| "As a [ROLE], ..."                  | Extract ROLE from user story format      |
| "The [ROLE] can ..."               | Extract ROLE from capability statements  |
| "Available to [ROLE]s"             | Extract ROLE from access statements      |
| Permission matrix / RBAC table      | Extract roles from matrix rows/columns   |
| "logged-in user" / "guest"         | Map to authenticated/unauthenticated     |

### 6.2 Role Classification

Classify each extracted role into exactly one category:

| Category       | Criteria                                        | Examples                    |
|----------------|-------------------------------------------------|-----------------------------|
| Primary User   | The main user the system is built for.          | Customer, Student, Employee |
|                | Appears most frequently in the FRD.             |                             |
| Admin          | Has elevated privileges, manages the system     | Admin, Manager, Moderator,  |
|                | or other users. Mentioned in management or      | Supervisor, Operator        |
|                | configuration contexts.                         |                             |
| System         | Non-human actor. Performs automated tasks,       | System, Scheduler, Cron,    |
|                | scheduled jobs, or background processes.        | API Client, Webhook         |
| Secondary User | Human user with limited scope. Appears in       | Reviewer, Auditor, Viewer,  |
|                | fewer FRD sections than the primary user.       | Guest                       |

### 6.3 Default Roles

If the FRD does not explicitly define roles, infer the following defaults:

- If auth is mentioned: `User` (primary) and `Admin` (admin).
- If no auth is mentioned: `User` (primary) only.
- If API access is mentioned: add `API Consumer` (system).

### 6.4 Role Usage in Stories

- Every story MUST reference at least one role in its "As a..." statement.
- If a story applies to all roles, use the primary role.
- If a story is admin-only, use the admin role.
- System roles appear in backend/integration stories: "As the System, I
  process scheduled [TASK] so that [OUTCOME]."

---

## 7. Domain Term Extraction

### 7.1 Detection Criteria

A term qualifies for the domain glossary when ANY of these hold:

1. **Frequency**: A capitalized noun phrase appears 3 or more times in the FRD.
2. **Explicit definition**: The FRD defines it (e.g., "An Order is a...").
3. **Acronym with expansion**: The FRD introduces it with an expansion
   (e.g., "SKU (Stock Keeping Unit)").
4. **Business-specific meaning**: A common word used with a specific business
   meaning that differs from its everyday meaning (e.g., "Sprint" in a
   non-Scrum context meaning "delivery cycle").
5. **Entity name**: Appears as a database entity, API resource, or data model
   object in the FRD.
6. **Status/enum value**: Named states or categories (e.g., "Pending",
   "Approved", "Rejected" when describing a workflow).

### 7.2 Extraction Process

1. Scan the FRD for all capitalized multi-word phrases (e.g., "Purchase Order",
   "Service Level Agreement").
2. Scan for all acronyms (2+ consecutive uppercase letters).
3. Scan for quoted terms used as identifiers (e.g., 'active', 'archived').
4. Scan the Glossary/Definitions section if present -- adopt all terms verbatim.
5. Scan entity-relationship descriptions for entity names and their attributes.
6. Scan status flow or state machine descriptions for state names.
7. Deduplicate: merge singular/plural forms, merge acronym with expansion.

### 7.3 Glossary Entry Format

Each extracted term produces an entry in this format:

```markdown
### {TERM}
- **Also known as**: {aliases, acronyms, alternate spellings}
- **Definition**: {1-2 sentence business definition}
- **Entity?**: Yes/No
- **Status values**: {if entity, list possible states; otherwise "N/A"}
- **FRD reference**: {section where term is defined or most prominently used}
- **Related terms**: {other glossary terms this connects to}
```

### 7.4 Term Usage Consistency

Once a term is in the glossary:

- Stories MUST use the canonical glossary term, not synonyms.
- If the FRD uses synonyms inconsistently (e.g., "Order" and "Purchase" for the
  same entity), the glossary picks one as canonical and lists the other as an
  alias. All stories use the canonical form.
- Acceptance criteria use the glossary term exactly as spelled.

---

## 8. Dependency Inference Rules

### 8.1 Structural Dependencies

These dependencies are always true and do not need to be stated in the FRD:

| Upstream                     | Downstream                      | Reason                           |
|------------------------------|---------------------------------|----------------------------------|
| Data model / schema          | Business logic using that model | Cannot operate on undefined data |
| Backend API endpoint         | Frontend consuming that API     | UI needs data source             |
| Auth foundation              | Any feature requiring auth      | Cannot gate without auth         |
| Base entity CRUD             | Operations on that entity       | Cannot process non-existent data |
| Database setup               | All data-dependent features     | Storage must exist first         |
| Project scaffold             | All implementation stories      | Framework must exist first       |
| User registration            | User profile management         | Must have users to manage        |
| Entity creation              | Entity listing                  | Must have data to list           |
| Entity listing               | Entity search / filter          | Search operates on the list      |
| Basic notification setup     | Channel-specific notifications  | Infrastructure before channels   |
| File storage setup           | File upload / download features | Storage must exist first         |

### 8.2 Inferred Dependencies from FRD

Scan the FRD for these dependency indicators:

| FRD Language                           | Dependency Type              |
|----------------------------------------|------------------------------|
| "after [X] is complete"               | X -> current feature         |
| "requires [X]"                        | X -> current feature         |
| "depends on [X]"                      | X -> current feature         |
| "once [X] exists"                     | X -> current feature         |
| "builds on [X]"                       | X -> current feature         |
| "uses data from [X]"                  | X -> current feature         |
| "triggered by [X]"                    | X -> current feature         |
| "only if [X] is configured"           | X config -> current feature  |
| "[X] feeds into [Y]"                  | X -> Y                       |

### 8.3 Sprint Assignment Rules

Use dependency ordering to assign stories to sprints:

**Sprint 1 -- Foundation**
- Foundation epic (EPIC-{PREFIX}-000) stories: scaffold, DB, API base, frontend
  base, auth foundation.
- Stories with zero upstream dependencies that other stories depend on.
- Data model / schema stories.
- Maximum capacity: 20-25 story points.

**Sprint 2 -- Core Features**
- Core CRUD stories for primary entities.
- Primary user workflow stories.
- Stories that unblock the most downstream work.
- Maximum capacity: 20-25 story points.

**Sprint 3+ -- Secondary Features**
- Features that depend on Sprint 2 deliverables.
- Reporting and analytics stories.
- Nice-to-have features.
- Integration stories (unless critical path).
- Maximum capacity: 20-25 story points per sprint.

**Assignment Algorithm:**

1. Build a directed acyclic graph (DAG) of story dependencies.
2. Topologically sort the DAG.
3. Assign stories to the earliest sprint where:
   a. All upstream dependencies are in earlier sprints (not the same sprint).
   b. The sprint has remaining capacity (target: 20-25 points).
4. If a story has no dependencies, assign to the earliest sprint with capacity,
   but prefer Sprint 2+ over Sprint 1 (reserve Sprint 1 for foundation).
5. Validate: no circular dependencies. If detected, flag as an error and
   list the cycle.

### 8.4 Cross-Epic Dependencies

When a story in Epic A depends on a story in Epic B:

- Both stories must note the cross-epic dependency explicitly.
- The SM subagent ensures the upstream story is in an earlier sprint.
- If the dependency creates a bottleneck (many stories blocked by one),
  flag it for review.

---

## 9. Acceptance Criteria Generation

### 9.1 Gherkin Format Template

Every acceptance criterion MUST follow this structure:

```gherkin
Scenario: {Descriptive scenario name}
  Given {precondition -- system state before the action}
  When {action -- what the user does}
  Then {outcome -- observable result}
  And {additional outcome, if any}
```

### 9.2 Required Scenario Categories

Each story MUST have acceptance criteria covering AT LEAST these categories
(when applicable):

**Category 1: Happy Path (REQUIRED for every story)**
```gherkin
Scenario: Successful {action}
  Given {valid preconditions}
  When the {ROLE} {performs action} with valid data
  Then the system {expected success outcome}
  And {confirmation feedback is shown / data is persisted / etc.}
```

**Category 2: Validation Failures (REQUIRED for any story with user input)**
```gherkin
Scenario: {action} with invalid {field}
  Given {preconditions}
  When the {ROLE} {performs action} with {invalid input description}
  Then the system displays a validation error for {field}
  And the {action} is not completed
```

Generate one validation scenario per input field that has constraints.

**Category 3: Authorization (REQUIRED for any story with role restrictions)**
```gherkin
Scenario: Unauthorized {action} attempt
  Given the user is authenticated as {UNAUTHORIZED_ROLE}
  When the user attempts to {perform action}
  Then the system denies access
  And displays an authorization error message
```

**Category 4: Edge Cases (REQUIRED: at least one per story)**
```gherkin
Scenario: {action} when {edge condition}
  Given {edge condition setup}
  When the {ROLE} {performs action}
  Then {expected behavior under edge condition}
```

Common edge cases to consider:

| Edge Case Type            | When to Include                         |
|---------------------------|-----------------------------------------|
| Empty state               | List/table views with no data           |
| Boundary values           | Numeric inputs, text length limits      |
| Duplicate entry           | Create operations on unique fields      |
| Concurrent modification   | Update operations on shared resources   |
| Large dataset             | List/search operations                  |
| Network failure           | External API integrations               |
| Session expiry            | Any authenticated operation             |
| Partial data              | Forms with optional fields              |
| Special characters        | Text input fields                       |
| Max file size             | File upload features                    |

### 9.3 Derivation Heuristics

When generating acceptance criteria from FRD content:

1. **Happy path**: Directly derived from the FRD's description of the feature
   flow. If the FRD says "the user enters X and clicks Submit, the system saves
   Y", that becomes the happy-path scenario.

2. **Validation per input field**: For every input field mentioned in the FRD,
   generate one validation failure scenario. Infer constraints from:
   - Data types mentioned (e.g., "email address" implies email format).
   - Size/length mentioned (e.g., "up to 255 characters").
   - Required vs optional indication.
   - Allowed values / enumerations.

3. **Authorization per role**: For every role mentioned in Section 6, determine
   if the feature is accessible. Generate a denial scenario for each role that
   should NOT have access.

4. **Empty state**: If the story displays data, include a scenario for when no
   data exists.

5. **Boundary conditions**: If numeric ranges or text limits are mentioned,
   test at the boundary (min, max, min-1, max+1).

6. **External system failures**: If the story involves an external API, include
   a scenario for when the external system is unavailable or returns an error.

---

## 10. Test Plan Generation

### 10.1 Unit Tests

Generate unit test specifications for each story covering:

| Test Category         | What to Test                                    |
|-----------------------|-------------------------------------------------|
| Input validation      | Each field's constraints (type, length, format,  |
|                       | required, allowed values)                        |
| Business rules        | Each conditional or computed behavior described  |
|                       | in the FRD                                       |
| Data transformations  | Input-to-output mappings, formatting, conversion|
| Error handling        | Each identified error condition                  |
| State transitions     | Each valid and invalid state change              |
| Calculations          | Each formula or computed value                   |
| Default values        | Each field with a default                        |

Unit test specification format:

```markdown
### UT-{STORY_ID}-{NNN}: {Test name}
- **Input**: {test input data}
- **Expected**: {expected output or behavior}
- **Category**: validation | business-rule | transformation | error | state
```

### 10.2 Integration Tests

Generate integration test specifications for stories involving:

| Integration Point     | What to Test                                    |
|-----------------------|-------------------------------------------------|
| API endpoints         | Request/response contract, status codes, headers|
| Database operations   | CRUD operations persist/retrieve correctly       |
| External APIs         | Mocked external calls, error handling           |
| Authentication flow   | Token issuance, validation, refresh, revocation |
| File storage          | Upload, retrieve, delete operations             |
| Message queues        | Publish and consume operations                  |
| Cache operations      | Set, get, invalidate, TTL behavior              |

Integration test specification format:

```markdown
### IT-{STORY_ID}-{NNN}: {Test name}
- **Setup**: {required state / test data}
- **Action**: {API call or operation}
- **Assertions**: {expected response / side effects}
- **Teardown**: {cleanup steps}
```

### 10.3 End-to-End Tests

Generate E2E test specifications for critical user flows. A "critical flow" is
any multi-step process that delivers primary business value:

| E2E Test Candidates                                  |
|------------------------------------------------------|
| User registration -> login -> first use              |
| Complete CRUD cycle on primary entity                |
| Primary business workflow from start to finish       |
| Payment / checkout flow (if applicable)              |
| Admin creates resource -> user consumes resource     |
| Search -> find -> act on result                      |

E2E test specification format:

```markdown
### E2E-{NNN}: {Flow name}
- **Preconditions**: {required system state}
- **Steps**:
  1. {User action} -> {Expected result}
  2. {User action} -> {Expected result}
  ...
- **Final Assertion**: {End state verification}
- **Stories Covered**: {list of STORY IDs this flow exercises}
```

### 10.4 Manual Tests

Generate manual test specifications for aspects that are difficult or
impractical to automate:

| Manual Test Category  | What to Verify                                  |
|-----------------------|-------------------------------------------------|
| UI fidelity           | Visual design matches mockups / design spec     |
| Responsive design     | Layout adapts correctly to mobile/tablet/desktop|
| Accessibility (a11y)  | Keyboard navigation, screen reader, contrast    |
| Usability             | Flow is intuitive, labels are clear, feedback   |
|                       | is timely                                       |
| Cross-browser         | Functionality in Chrome, Firefox, Safari, Edge  |
| Performance (feel)    | Perceived responsiveness, no janky animations   |
| Print layout          | Printable views render correctly (if applicable)|
| Localization          | Translated strings display correctly (if i18n)  |

Manual test specification format:

```markdown
### MT-{NNN}: {Test name}
- **Area**: UI fidelity | responsive | a11y | usability | cross-browser
- **Page/Screen**: {which screen to test}
- **Steps**: {what to do and observe}
- **Pass Criteria**: {what "good" looks like}
```

---

## 11. Foundation Epic Rules

### 11.1 Overview

Every project receives a Foundation epic as the first epic, regardless of what
the FRD contains. This epic provides the technical scaffolding that all
subsequent stories depend on.

Epic ID: `EPIC-{PREFIX}-000`
Epic Name: `Foundation & Project Setup`
Sprint: Always Sprint 1.
This epic is ALWAYS generated, even if the FRD does not mention infrastructure.

### 11.2 Standard Foundation Stories

| Story ID                  | Title                              | Points | Condition              |
|---------------------------|------------------------------------|--------|------------------------|
| STORY-{PREFIX}-001        | Set up project scaffold            | 2      | Always                 |
| STORY-{PREFIX}-002        | Set up database and initial schema | 3      | Always (if data store) |
| STORY-{PREFIX}-003        | Set up base API structure          | 2      | Always (if backend)    |
| STORY-{PREFIX}-004        | Set up frontend scaffold           | 3      | If frontend exists     |
| STORY-{PREFIX}-005        | Implement auth foundation          | 5      | If auth is mentioned   |

### 11.3 Foundation Story Details

**STORY-{PREFIX}-001: Set up project scaffold (2 pts)**

Description: Initialize the project repository with the chosen tech stack,
configure linting, formatting, testing framework, CI/CD pipeline skeleton,
and environment configuration.

Acceptance Criteria:
```gherkin
Scenario: Project builds successfully
  Given the repository is freshly cloned
  When the developer runs the install command
  Then all dependencies install without errors
  And the project builds successfully

Scenario: Code quality tools are configured
  Given the project is set up
  When the developer runs the lint command
  Then the linter executes without configuration errors

Scenario: Test framework is configured
  Given the project is set up
  When the developer runs the test command
  Then the test runner executes (even if no tests exist yet)
```

---

**STORY-{PREFIX}-002: Set up database and initial schema (3 pts)**

Description: Configure the database connection, ORM/query builder, migration
framework, and seed data utilities. Create the initial migration for any base
tables (e.g., users table if auth is present).

Acceptance Criteria:
```gherkin
Scenario: Database connection is established
  Given the database server is running
  When the application starts
  Then it connects to the database without errors

Scenario: Migrations run successfully
  Given a fresh database
  When the developer runs the migration command
  Then all migrations execute in order without errors

Scenario: Seed data is loadable
  Given migrations have been run
  When the developer runs the seed command
  Then seed data is inserted without errors
```

---

**STORY-{PREFIX}-003: Set up base API structure (2 pts)**

Description: Configure the API framework, set up routing, middleware pipeline
(CORS, body parsing, error handling, request logging), and health check
endpoint.

Acceptance Criteria:
```gherkin
Scenario: Health check endpoint responds
  Given the API server is running
  When a GET request is sent to /health
  Then the response status is 200
  And the response body indicates healthy status

Scenario: CORS is configured
  Given the API server is running
  When a preflight OPTIONS request is sent from an allowed origin
  Then the response includes appropriate CORS headers

Scenario: Unknown routes return 404
  Given the API server is running
  When a request is sent to a non-existent route
  Then the response status is 404
  And the response body contains a structured error message
```

---

**STORY-{PREFIX}-004: Set up frontend scaffold (3 pts)**

Condition: Only generated if the FRD describes a user interface, web
application, or frontend component.

Description: Initialize the frontend framework, configure routing, state
management, UI component library, and base layout (header, footer, sidebar
if applicable).

Acceptance Criteria:
```gherkin
Scenario: Frontend application loads
  Given the frontend dev server is running
  When a user navigates to the root URL
  Then the base layout renders without errors

Scenario: Routing is functional
  Given the frontend application is loaded
  When the user navigates to a defined route
  Then the correct page component renders

Scenario: Frontend connects to backend API
  Given both frontend and backend are running
  When the frontend makes an API call
  Then the response is received without CORS errors
```

---

**STORY-{PREFIX}-005: Implement auth foundation (5 pts)**

Condition: Only generated if the FRD mentions authentication, authorization,
login, user accounts, roles, or permissions.

Description: Implement the authentication system including login, registration
(if applicable), JWT/session management, password hashing, and route
protection middleware. Set up role-based access control skeleton if roles are
defined in the FRD.

Acceptance Criteria:
```gherkin
Scenario: User can register
  Given no account exists for the email
  When a user submits valid registration data
  Then an account is created
  And the user receives an auth token

Scenario: User can log in
  Given a registered account exists
  When the user submits valid credentials
  Then the user receives an auth token
  And the token contains the user's role

Scenario: Invalid credentials are rejected
  Given a registered account exists
  When the user submits incorrect credentials
  Then the system returns an authentication error
  And no token is issued

Scenario: Protected routes require authentication
  Given the user is not authenticated
  When the user accesses a protected endpoint
  Then the system returns a 401 Unauthorized response

Scenario: Role-based access is enforced
  Given the user is authenticated with role {ROLE}
  When the user accesses an endpoint restricted to a different role
  Then the system returns a 403 Forbidden response
```

### 11.4 Foundation Epic Dependencies

The Foundation epic has NO upstream dependencies. All other epics depend on at
least one Foundation story:

```
STORY-001 (scaffold)  <-- every other story
STORY-002 (database)  <-- every data-layer story
STORY-003 (API base)  <-- every API story
STORY-004 (frontend)  <-- every frontend story
STORY-005 (auth)      <-- every story requiring authentication
```

### 11.5 Conditional Foundation Extensions

If the FRD describes certain capabilities, additional foundation stories are
added:

| FRD Mentions                    | Additional Foundation Story            | Pts |
|---------------------------------|----------------------------------------|-----|
| File uploads / attachments      | Set up file storage infrastructure     | 3   |
| Real-time / WebSocket           | Set up WebSocket infrastructure        | 3   |
| Background jobs / queues        | Set up job queue infrastructure        | 3   |
| Email / notifications           | Set up notification infrastructure     | 3   |
| Search (full-text)              | Set up search engine infrastructure    | 3   |
| Caching requirements            | Set up caching infrastructure          | 2   |
| Multi-tenancy                   | Set up tenant isolation infrastructure | 5   |

These extension stories follow the same numbering sequence (STORY-{PREFIX}-006,
007, etc.) and remain in Sprint 1 if sprint capacity allows, otherwise overflow
to Sprint 2 with highest priority.

---

## 12. Output Validation Checklist

Before finalizing Phase 3 outputs, the subagents collectively verify:

| #  | Check                                                           | Owner |
|----|-----------------------------------------------------------------|-------|
| 1  | Every FRD functional section maps to exactly one epic           | BA    |
| 2  | Every epic has at least 2 stories                               | BA    |
| 3  | Every story satisfies INVEST                                    | BA    |
| 4  | Every story is sized between 1-5 points                         | BA    |
| 5  | No story exceeds 5 points                                       | BA    |
| 6  | Every story references at least one role                        | BA    |
| 7  | Every story has at least 2 acceptance criteria                  | QA    |
| 8  | Every AC with user input has a validation failure scenario      | QA    |
| 9  | Every role-restricted story has an authorization AC             | QA    |
| 10 | Every story has unit test specifications                        | QA    |
| 11 | Critical flows have E2E test specifications                     | QA    |
| 12 | No circular dependencies exist in the story graph               | SM    |
| 13 | Sprint 1 contains only Foundation stories + zero-dep enablers   | SM    |
| 14 | No sprint exceeds 25 story points                               | SM    |
| 15 | Cross-epic dependencies are explicitly documented               | SM    |
| 16 | Domain glossary contains all extracted terms                    | BA    |
| 17 | Stories use canonical glossary terms consistently               | BA    |
| 18 | Foundation epic EPIC-{PREFIX}-000 exists                        | SM    |
| 19 | All foundation stories are assigned to Sprint 1                 | SM    |
| 20 | Total story count is reasonable (not over-decomposed)           | ALL   |

A reasonable story count heuristic: expect 5-15 stories per epic for a
medium-complexity FRD. Fewer than 3 stories per epic suggests under-decomposition.
More than 20 stories per epic suggests the epic should be split.

---

## 13. Error Handling and Edge Cases

### 13.1 Ambiguous FRD Sections

When an FRD section is ambiguous about whether it describes a functional feature
or a non-functional concern:

1. Check if the section contains user actions (verbs like "create", "view",
   "submit", "approve"). If yes, treat as functional -> generate epic.
2. Check if the section contains system qualities (adjectives like "scalable",
   "secure", "performant"). If exclusively qualities, treat as non-functional
   -> extract as cross-cutting acceptance criteria.
3. If mixed, split: functional aspects become epic/stories, quality aspects
   become acceptance criteria on those stories.

### 13.2 Extremely Short FRD

If the FRD contains fewer than 3 identifiable sections:

1. Generate a Foundation epic (always).
2. Generate one epic per identifiable section, even if only 1-2.
3. Add a warning: "FRD appears incomplete. Generated backlog may not cover
   all necessary features. Recommend FRD review before development."

### 13.3 Extremely Long FRD

If the FRD contains more than 20 top-level sections:

1. Check if sections can be grouped into higher-level categories.
2. If groupable, use the groupings as epics and sections as story sources.
3. If not groupable, proceed with 20+ epics but flag: "Large number of epics
   detected. Consider grouping related epics into program increments."

### 13.4 FRD with Contradictions

If two sections of the FRD contradict each other:

1. Flag the contradiction in the output.
2. Use the LATER section's definition (assumes it supersedes).
3. Generate stories for both interpretations, marking the contradicted one
   as "NEEDS CLARIFICATION".
4. Do not silently drop either interpretation.

---

*End of FRD Analysis Rules*
