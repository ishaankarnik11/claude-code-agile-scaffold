# FRD Confidence Scoring Reference

> Used by the FRD Confidence Analyzer subagent in Phase 0 of `/setup-workflow`.
> Provides the rubric, gap analysis rules, stack compatibility checks, and output format.

---

## 1. Purpose

Before scaffolding any workflow infrastructure, the skill validates that the requirements document (FRD/PRD/BRD) is detailed enough for implementation. This file defines how to score it.

The analyzer reads the full document, scores 8 categories, identifies gaps, and returns a structured report. The orchestrator uses the total score as a hard gate.

---

## 2. Scoring Rubric (100 Points Total)

### Functional Completeness (25 pts)

| Score | Criteria |
|---|---|
| 25 | Every feature has enough detail to derive acceptance criteria. CRUD is complete (create, read, update, delete all addressed). Flows have clear entry and exit points. Error states defined. |
| 20 | Most features detailed. Minor gaps in edge cases or secondary flows. |
| 15 | Core features clear but supporting features (admin, settings, export) are vague. |
| 10 | Only a high-level feature list exists. Individual features lack detail. |
| 5 | Features mentioned by name only — no descriptions or flows. |
| 0 | No feature description present. |

**What to check**:
- Does each feature section describe what the user can do, step by step?
- Are CRUD operations complete? (e.g., if "create appointment" exists, do "edit" and "cancel" also exist?)
- Are error/failure states described? (What happens when validation fails?)
- Are search, filter, and pagination described for list views?
- Are notifications/alerts described with triggers, content, and channels?

### User Roles & Permissions (15 pts)

| Score | Criteria |
|---|---|
| 15 | All roles defined with explicit permission matrix. Access control model named (RBAC, ABAC). Role-feature mapping is clear. |
| 12 | Roles defined. Permissions described in prose but not as a matrix. |
| 8 | Roles listed but permissions are vague or incomplete. |
| 4 | Roles mentioned casually but not formally defined. |
| 0 | No role definitions. |

**What to check**:
- Is there a roles table or section?
- For each feature, is it clear which roles can access it?
- Are there features where access control is ambiguous?
- Is the auth mechanism described (password, OTP, SSO, OAuth)?

### Data Model Clarity (15 pts)

| Score | Criteria |
|---|---|
| 15 | Entities, relationships, key fields, constraints, and cardinality all described. ER diagram or table descriptions present. |
| 12 | Entities and relationships described. Some fields missing or constraints implied. |
| 8 | Major entities listed. Relationships implied but not explicit. No field-level detail. |
| 4 | Data mentioned in passing but no structured model description. |
| 0 | No data model information. |

**What to check**:
- Are the main entities (users, orders, appointments, etc.) named?
- Are relationships between entities clear (one-to-many, many-to-many)?
- Are key fields identified (required fields, unique constraints, foreign keys)?
- Are status fields and their valid transitions documented?

### UI/UX Specification (10 pts)

| Score | Criteria |
|---|---|
| 10 | Screens/pages enumerated. Navigation flow described. Form fields and validation rules listed. Wireframes or prototypes referenced. |
| 7 | Screens listed with field descriptions. No wireframes but enough to build from. |
| 4 | Page names mentioned. Minimal field detail. |
| 2 | "Dashboard" or "Admin panel" mentioned with no specifics. |
| 0 | No UI description. |

**What to check**:
- Are all screens/pages listed?
- For forms: are fields, types, validations, and error messages specified?
- Is the navigation flow described (what links to what)?
- Are responsive requirements mentioned?

### Integration Points (10 pts)

| Score | Criteria |
|---|---|
| 10 | External APIs/services identified with endpoints or contracts. Data flows documented. Error handling for integrations specified. |
| 7 | External systems identified. Data flow described. Error handling incomplete. |
| 4 | External systems mentioned. No detail on integration approach. |
| 0 | No integration points mentioned. (If the project is standalone with no integrations, award full 10 points.) |

**What to check**:
- Are all external systems listed?
- Is the data exchange format specified (REST, GraphQL, SOAP, file-based)?
- What happens when an external system is unavailable?
- Are authentication requirements for external APIs documented?

### Non-Functional Requirements (10 pts)

| Score | Criteria |
|---|---|
| 10 | Performance targets (response time, throughput), security requirements (encryption, compliance), scalability considerations, and availability targets all present with specific numbers. |
| 7 | Some NFRs mentioned with vague targets ("must be fast", "should be secure"). |
| 4 | Passing references to performance or security. No specific targets. |
| 0 | No NFRs. |

**What to check**:
- Response time targets? (e.g., "API responses under 500ms")
- Concurrent user expectations? (e.g., "support 100 concurrent users")
- Security requirements? (encryption at rest/transit, compliance standards)
- Availability targets? (e.g., "99.9% uptime")
- Data retention policies?

### Tech Stack Compatibility (10 pts)

| Score | Criteria |
|---|---|
| 10 | All chosen technologies are compatible. No known anti-patterns in the combination. |
| 7 | Minor advisory issues (e.g., using Jest with Vite when Vitest is the native choice). |
| 4 | Warnings present (e.g., sync ORM with async framework without adapter). |
| 0 | Errors present (e.g., MongoDB + Alembic, Prisma + Python). |

This category is scored using the Stack Compatibility Matrix below, combined with the detected tech stack from Phase 1.

### Testability (5 pts)

| Score | Criteria |
|---|---|
| 5 | Acceptance criteria present per feature. Success and failure conditions are explicit and verifiable. |
| 3 | AC derivable from feature descriptions. Some conditions implicit but interpretable. |
| 1 | Features described but AC would require significant interpretation. |
| 0 | No testable conditions can be derived. |

---

## 3. Gap Analysis Rules

Regardless of the score, the analyzer MUST check for these categories of gaps and report any found.

### Glaring Functional Gaps

Check for each of these. Report any that apply:

- Features referenced in one section but never described elsewhere (e.g., "see Reports module" with no Reports section)
- Incomplete CRUD — create exists but edit/delete missing
- Auth/login mentioned but no auth flow described (how does the user authenticate?)
- Error states never defined for any feature
- Search/filter mentioned but no search criteria specified
- Notifications mentioned but no trigger, template, or delivery channel defined
- "Admin" features mentioned but no admin workflows described
- Data export mentioned but no format or field list specified
- Multi-tenancy implied but data isolation rules missing
- File upload mentioned but no size limits, allowed types, or storage approach
- Approval workflows mentioned but no states/transitions defined
- Reporting mentioned but no specific reports, fields, or groupings described

### Obvious Pitfalls

Check the tech stack and architecture for these risks:

- Async framework (FastAPI, Express) paired with sync-only ORM without explicit adapter
- No rate limiting mentioned for authentication endpoints (brute force risk)
- File upload without size or type constraints (DoS risk)
- User-generated content without sanitization mention (XSS risk)
- Raw SQL in requirements without ORM (SQL injection risk)
- No mention of CORS or CSP for web applications
- JWT auth without refresh token or session revocation strategy
- No pagination for list endpoints that could return unbounded results
- Real-time features without WebSocket/SSE technology plan
- Cost-bearing external API calls without budget or rate limiting
- Single point of failure in architecture (single DB, no backup strategy)
- No logging or observability mentioned for production debugging

### Ambiguities

Check for:

- Role names used inconsistently across sections (e.g., "Admin" vs "Administrator" vs "Super User")
- Features that could reasonably be interpreted two or more ways
- "TBD", "to be decided", "later", "Phase 2" markers that block implementation
- Conflicting statements in different sections
- Implicit assumptions not stated (e.g., assumes single-tenant but never says so)
- Undefined edge cases (what if zero records? What if the list has 10,000 items?)
- Unclear ownership of shared functionality (which team/module owns shared components?)

### Missing Sections

Check whether these common sections are present. Report any that are absent:

- [ ] Authentication & authorization flow
- [ ] Error handling strategy (global error format, retry policy)
- [ ] Data migration / seeding plan (how does initial data get in?)
- [ ] Deployment topology (where does this run?)
- [ ] Logging & observability (what gets logged, where do logs go?)
- [ ] Backup & recovery strategy
- [ ] API versioning strategy
- [ ] Internationalization / localization requirements
- [ ] Accessibility requirements (WCAG level)
- [ ] Audit trail requirements (who changed what, when)
- [ ] Performance testing plan
- [ ] Data privacy / GDPR / compliance requirements

---

## 4. Stack Compatibility Matrix

### Errors (Score 0 — Cannot Proceed)

These combinations are fundamentally incompatible:

| Combination | Issue |
|---|---|
| MongoDB + Alembic | Alembic is for SQL databases only. Use Mongoose migrations or manual scripts. |
| Prisma + Python backend | Prisma ORM is JavaScript/TypeScript only. Use SQLAlchemy or Django ORM. |
| TypeORM + Python backend | TypeORM is JavaScript/TypeScript only. |
| SQLAlchemy + Node.js backend | SQLAlchemy is Python only. Use Prisma, TypeORM, or Sequelize. |
| Django ORM + non-Django framework | Django ORM is tightly coupled to Django. Cannot use with FastAPI/Flask. |
| Entity Framework + non-.NET backend | EF Core is .NET only. |
| GORM + non-Go backend | GORM is Go only. |

### Warnings (Score 4 — Proceed with Caution)

| Combination | Issue | Mitigation |
|---|---|---|
| FastAPI + sync SQLAlchemy (no async driver) | Event loop blocking. All DB calls block the async framework. | Use `aiomysql`/`asyncpg` with `create_async_engine()`. |
| Express + Sequelize without connection pooling | Performance degradation under load. | Configure pool size in Sequelize options. |
| Spring Boot + MongoDB without Spring Data MongoDB | Manual driver management, lose repository abstraction. | Add `spring-boot-starter-data-mongodb`. |
| React + Redux for very small apps (< 5 screens) | Over-engineered state management. | Consider React Context or Zustand instead. |
| Any framework + no database migration tool | Schema drift between environments. | Add a migration tool appropriate to the ORM. |

### Advisories (Score 7 — Consider Alternatives)

| Combination | Issue | Suggestion |
|---|---|---|
| Jest + Vite project | Jest doesn't natively understand Vite's module resolution. | Use Vitest (native to Vite ecosystem). |
| Webpack for new projects | Vite/Turbopack offer significantly faster dev experience. | Consider Vite unless Webpack plugins are essential. |
| Class components with React 18+ | Functional components are the modern standard. | Use functional components + hooks. |
| Moment.js for date handling | Large bundle size, deprecated. | Use `date-fns` or `dayjs`. |
| Lodash for simple utilities | Tree-shaking issues, many utilities now native. | Use native JS methods where possible. |
| Create React App | Deprecated, slow, limited configuration. | Use Vite with `@vitejs/plugin-react`. |

---

## 5. Output Format

The analyzer MUST return the report in exactly this format:

```markdown
## FRD Confidence Report

**Document**: [filename]
**Analyzed**: [YYYY-MM-DD]
**Score: [TOTAL]/100** — [VERDICT]

### Score Breakdown

| Category | Score | Max | Evidence |
|---|---|---|---|
| Functional Completeness | X | 25 | [Brief evidence — quote FRD or note what's missing] |
| User Roles & Permissions | X | 15 | [Evidence] |
| Data Model Clarity | X | 15 | [Evidence] |
| UI/UX Specification | X | 10 | [Evidence] |
| Integration Points | X | 10 | [Evidence] |
| Non-Functional Requirements | X | 10 | [Evidence] |
| Tech Stack Compatibility | X | 10 | [Evidence] |
| Testability | X | 5 | [Evidence] |
| **Total** | **XX** | **100** | |

### Glaring Functional Gaps
- [ ] [Gap description — specific, actionable]
- [ ] [Gap description]

### Obvious Pitfalls
- [ ] [Pitfall — what could go wrong and why]
- [ ] [Pitfall]

### Ambiguities
- [ ] [Ambiguity — what's unclear and what interpretations exist]
- [ ] [Ambiguity]

### Missing Sections
- [ ] [Section name] — [why it matters for this project]
- [ ] [Section name] — [why it matters]

### Stack Compatibility Issues
- [ERROR] [Issue — blocks proceeding]
- [WARNING] [Issue — proceed with documented mitigation]
- [ADVISORY] [Issue — consider alternative]

### Verdict

[One of:]
- **Score >= 70**: "Sufficient for implementation scaffolding. The advisory observations above should be addressed during development but do not block project setup."
- **Score 50-69**: "The FRD has gaps that may cause implementation ambiguity. We recommend addressing the items above before proceeding. If you choose to proceed, expect some stories to require additional refinement."
- **Score < 50**: "The FRD needs further refinement before implementation scaffolding. The gaps identified above are significant enough that stories derived from this document would be unreliable. Please address the high-priority items and re-run the analysis."
```

---

## 6. Scoring Instructions for the Analyzer Agent

When scoring, follow these rules:

1. **Read the entire document** before scoring any category. Context from later sections can inform earlier scores.
2. **Score each category independently**. A strong data model doesn't compensate for missing roles.
3. **Be conservative**. If evidence is ambiguous, score lower. It's better to flag a potential gap than to miss one.
4. **Quote the FRD** in the Evidence column. Short quotes (5-15 words) that justify the score.
5. **Functional Completeness gets the most weight** (25 pts) because vague features cause the most implementation rework.
6. **Stack compatibility uses the detected stack**, not the FRD alone. The skill passes the detected stack summary to the analyzer.
7. **If the FRD doesn't mention a category at all**, that category scores 0 (not N/A). The absence of information is itself a gap.
8. **Report concisely**. Bullet points, not paragraphs. Each gap/pitfall/ambiguity should be one actionable sentence.
9. **The gap analysis is always produced**, even if the score is 100. There may be advisories worth noting.
10. **Do not invent requirements**. If the FRD says nothing about auth, report "auth flow missing" — do not assume or suggest an auth approach.
