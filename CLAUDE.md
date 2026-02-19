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
| 4 | Canvas app (mobile responder) | **COMPLETE** |
| 5 | Model-driven app (dispatch/supervisor) | **COMPLETE** |
| 6 | Reporting / Power BI layer | **COMPLETE** |
| 7 | Deployment + GCC auth scripts | **COMPLETE** |

**Rule:** Build incrementally. Do NOT scaffold future phases prematurely.

## Solution Generator
The solution .zip generator creates a valid Dataverse unmanaged solution from the JSON spec files:

```bash
cd scripts && npx tsx generate-solution.ts          # with solution checker
cd scripts && npx tsx generate-solution.ts --skip-check  # without checker
```

Output: `EmergencyResponseCoordination.zip` in project root. Import via make.powerapps.com or:
```bash
pac solution import --path EmergencyResponseCoordination.zip --publish-changes --async
```

### Known Limitations
- **Environment variables** are NOT in the solution .zip (cause generic import errors in GCC). Create manually post-import.
- **Calculated fields** (seo_responseTimeMinutes, seo_totalDurationMinutes) must be configured in maker portal post-import.
- **seo_Hydrant.seo_hydrantId** was auto-renamed to `seo_hydrant_name` to avoid collision with auto-generated primary key.

### Dataverse XML Reference
See `docs/DATAVERSE-SOLUTION-XML-GUIDE.md` for 19 documented issues and resolutions from the initial deployment.

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
