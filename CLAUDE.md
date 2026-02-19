# EmergencyResponseCoordination — Claude Code Instructions

## Solution Identity
- **Solution Name:** EmergencyResponseCoordination
- **Publisher:** StateEmergencyOps
- **Prefix:** seo
- **Platform:** Microsoft Power Platform / Dataverse (GCC)
- **Target Users:** State, city, and local fire/EMS jurisdictions

## Phased Build Plan
| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Solution setup + data model + project scaffolding + documentation | **COMPLETE** |
| 2 | Security model + roles | **COMPLETE** |
| 3 | Power Automate flows | **COMPLETE** |
| 4 | Canvas app (mobile responder) | Pending |
| 5 | Model-driven app (dispatch/supervisor) | Pending |
| 6 | Reporting / Power BI layer | Pending |
| 7 | Deployment + GCC auth scripts | Pending |

**Rule:** Build incrementally. Do NOT scaffold future phases prematurely.

## Documentation Standards

### Living Documents (in /docs)
| File | Purpose |
|------|---------|
| `PROMPT-LOG.md` | Running log of every user prompt + actions taken |
| `RELEASE-NOTES.md` | Semver release notes per phase |
| `TECHNICAL.md` | Architecture, data model, data dictionary, ERD, integrations |
| `USER-GUIDE.md` | End-user documentation for apps and workflows |
| `SESSION-MEMORY.md` | Claude's session state — read FIRST at session start |

### DOCUMENTATION UPDATE RULES
- At the END of every session, before pushing to GitHub, update ALL relevant docs (prompt log, release notes, technical, user guide, session memory).
- Whenever the user says "update our MDs and push to git" (or anything similar), immediately:
  1. Update all relevant .md files with current session work
  2. Git add, commit with a meaningful message, and push
- The prompt log and session memory MUST be updated every session, no exceptions. The others update only if relevant work was done.

## Conventions
- Table names: `seo_PascalCase`
- Column names: `seo_camelCase`
- Choice columns: `seo_PascalCase` with options as readable labels
- Relationships: named as `seo_ParentTable_ChildTable`
- Environment variables: `seo_VariableName`
- Connection references: `seo_ConnectorName`
- Use ALM best practices: environment variables, connection references, solution layering
- Target: GCC Dataverse — respect GCC-specific constraints

## User Preferences
- Refer to the user as "O'G"
- Be concise; skip preamble
- Use imperative mood for commits, conventional prefixes (feat, fix, refactor, docs, test, chore)
- Package management: npm with exact versions
- TypeScript by default for any custom code
