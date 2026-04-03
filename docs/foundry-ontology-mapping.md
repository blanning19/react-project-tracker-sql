# Foundry / Ontology Mapping Draft

This document sketches how the current PostgreSQL-backed Project Tracker application could be modeled in Palantir Foundry if the Ontology became the operational layer instead of Postgres.

This is a design draft, not a committed implementation plan. It is based on the current live schema documented in [database-schema.md](/c:/_Code/react-project-tracker-sql/docs/database-schema.md).

## Goal

Translate the current application model:
- projects
- tasks
- import events
- user access
- user settings
- managers
- team members

into a Foundry-native shape built around:
- Ontology object types
- link types
- action types
- backing datasets and transforms

## High-Level Recommendation

If this app moves into Foundry and the Ontology becomes the source of truth, the cleanest model is:

- `Project` as a primary Ontology object
- `Task` as a primary Ontology object
- `Import Event` as an operational audit object
- `Workspace User` as the access/control object
- `Manager` and `Team Member` either as separate people objects or unified into one `Person` object

Recommended relationship style:
- `Project` owns many `Task`
- `Import Event` optionally references a `Project`
- `Task` is assigned to one or more `Person`
- `Project` is managed by one `Person`

## Recommended Object Types

### `Project`

Maps from:
- `projects`

Suggested primary key:
- `projectUid`

Suggested properties:
- `projectUid`
- `projectName`
- `projectManagerName`
- `createdDate`
- `calendarName`
- `startDate`
- `finishDate`
- `durationDays`
- `percentComplete`
- `status`
- `priority`
- `notes`
- `sourceFileName`
- `isOverdue`

Notes:
- `isOverdue` is probably best treated as a computed property, not a persisted writeback field.
- `durationDays` and `percentComplete` may also be better computed depending on how much you want the Ontology to derive from tasks vs store source values.

### `Task`

Maps from:
- `tasks`

Suggested primary key:
- `taskUid`

Suggested properties:
- `taskUid`
- `taskName`
- `outlineLevel`
- `outlineNumber`
- `wbs`
- `isSummary`
- `predecessors`
- `resourceNames`
- `startDate`
- `finishDate`
- `durationDays`
- `percentComplete`
- `status`
- `isMilestone`
- `notes`
- `isOverdue`

Notes:
- `resourceNames` is a legacy relational/string field. In Foundry, that should ideally become links to `Person` instead of remaining the main assignment representation.
- `predecessors` may remain a display property at first, but a stronger long-term model would create task-to-task dependency links.

### `Import Event`

Maps from:
- `import_events`

Suggested primary key:
- `importEventId`
  or
- `correlationId` if you want a stable event-level operational identifier exposed throughout the app

Suggested properties:
- `importEventId`
- `createdAt`
- `correlationId`
- `sourceFileName`
- `importedBy`
- `status`
- `projectUid`
- `projectName`
- `taskCount`
- `message`
- `failureReason`
- `technicalDetails`

Notes:
- This object maps very naturally to Foundry operational audit views.
- Depending on Foundry usage, some of this could also be represented through Action logs, but keeping `Import Event` as an explicit object is likely clearer for this app.

### `Workspace User`

Maps from:
- `user_access`
- some overlap with `user_settings`

Suggested primary key:
- `userName`
  or
- enterprise identity key if Foundry identity is available

Suggested properties:
- `userName`
- `role`
- `canViewAdmin`
- `canViewLogs`
- `notes`
- `theme`
- `dashboardSortField`
- `dashboardSortDirection`

Notes:
- In a more Foundry-native implementation, access control should likely come from platform identity/groups rather than app-owned booleans alone.
- `theme` and sort preferences are closer to per-user app preferences than business ontology facts, so they may also belong outside the Ontology depending on the app framework chosen.

### `Person`

Recommended consolidation of:
- `managers`
- `team_members`

Suggested primary key:
- `displayName`
  or a better enterprise/person identifier if one exists

Suggested properties:
- `displayName`
- `personType`
  - example values: `Manager`, `TeamMember`, `Both`

Why unify:
- the current relational split exists mostly to populate dropdowns
- in an Ontology, one people object with role semantics is usually cleaner than two parallel lookup tables

## Recommended Link Types

### `Project -> Task`

Type:
- one-to-many

Meaning:
- a project contains tasks

Current relational source:
- `tasks.ProjectUID -> projects.ProjectUID`

### `Project -> Person`

Type:
- many-to-one

Meaning:
- project is managed by person

Current source:
- `projects.ProjectManager`

Notes:
- this is currently string-based, so Foundry ingestion would need a name-to-person matching rule unless a better source identifier exists

### `Task -> Person`

Type:
- many-to-many

Meaning:
- task is assigned to one or more people

Current source:
- `tasks.ResourceNames`

Notes:
- this is one of the biggest modeling upgrades available in Foundry
- instead of comma-separated names, task assignments should become first-class links

### `Import Event -> Project`

Type:
- many-to-zero-or-one

Meaning:
- successful imports can reference the created/imported project

Current source:
- `import_events.project_uid`

### Optional: `Task -> Task`

Type:
- many-to-many directed dependency

Meaning:
- predecessor / successor relationships

Current source:
- `tasks.Predecessors`

Notes:
- if the import pipeline can parse task dependency references into resolvable task identities, this would be a strong Ontology upgrade

## Recommended Action Types

If this app becomes Ontology-native, the current CRUD endpoints would likely map to actions like:

### `Create Project`
- inputs:
  - project metadata
- outputs:
  - creates a `Project`

### `Update Project`
- edits:
  - name, manager, dates, status, priority, notes

### `Delete Project`
- deletes:
  - project and potentially cascaded/related task records depending on Foundry design

### `Create Task`
- inputs:
  - project
  - task details
  - assignees

### `Update Task`
- edits:
  - task schedule/status/assignment fields

### `Delete Task`
- deletes:
  - task

### `Import Microsoft Project XML`
- inputs:
  - uploaded file
  - importing user
- side effects:
  - creates or updates `Project`
  - creates `Task`
  - creates `Import Event`
  - optionally creates/links `Person`

### `Update Workspace Access`
- edits:
  - role
  - admin/log visibility

Notes:
- If Foundry identity/group controls are adopted, this action may shrink or disappear.

## Backing Dataset / Pipeline Draft

### Option A: Keep Postgres as the upstream source at first

Flow:
- Postgres tables remain the write system
- Foundry ingests `projects`, `tasks`, `import_events`, `user_access`, and `user_settings`
- Ontology objects are materialized from those datasets

Pros:
- smallest migration step
- existing backend can stay in place

Cons:
- Ontology is not the source of truth
- two application layers may coexist awkwardly

### Option B: Move writes into Foundry

Flow:
- imports and manual edits are handled by Foundry Actions
- backing datasets materialize Ontology objects directly
- Postgres is retired or becomes a temporary staging source

Pros:
- most Foundry-native
- simpler long-term architecture once complete

Cons:
- bigger rewrite
- requires rethinking current FastAPI backend responsibilities

## Field-by-Field Mapping Notes

### Good direct mappings
- `ProjectName -> projectName`
- `Status -> status`
- `Priority -> priority`
- `Notes -> notes`
- `Start/Finish -> startDate/finishDate`
- `CalendarName -> calendarName`
- `failure_reason -> failureReason`
- `technical_details -> technicalDetails`
- `correlation_id -> correlationId`

### Fields that should likely become derived in Foundry
- `Project.durationDays`
- `Project.percentComplete`
- `Project.isOverdue`
- `Task.durationDays`
- `Task.isOverdue`

### Fields that should likely become links, not plain properties
- `ProjectManager`
- `ResourceNames`
- `Predecessors`

## Identity Recommendations

### Near-term
- keep numeric `projectUid` and `taskUid` if Postgres remains upstream

### Long-term Foundry-native
- consider whether object identity should remain these relational IDs
- if imports remain dominant, preserving the current numeric IDs may still be useful for traceability

## Admin / Logging Mapping

The current Admin page functionality maps reasonably well to Foundry:

- `Imports` tab:
  - driven by `Import Event` object set
- `Access` tab:
  - driven by `Workspace User` object set or Foundry group-backed permissions
- `Environment` tab:
  - likely partly outside Ontology and partly app-config driven
- `Logs` tab:
  - could remain app/service level rather than Ontology level

Important distinction:
- operational logs are still not a natural Ontology replacement
- audit records like `Import Event` are a good Ontology fit
- raw backend log streaming is still more of an application/service concern

## Suggested Migration Sequence

1. Keep Postgres as source of truth and ingest current tables into Foundry.
2. Build Ontology objects for `Project`, `Task`, `Import Event`, and `Person`.
3. Replace string-based people references with Ontology links.
4. Add Action-backed create/update flows in Foundry.
5. Move manual entry and XML import into Foundry-native actions.
6. Retire or reduce the FastAPI/Postgres write path if desired.

## Open Questions

- Should `Manager` and `Team Member` stay separate, or unify into one `Person` object?
- Should `UserSettings` live in the Ontology, or remain application-local state?
- Should `Import Event` be a dedicated object type, or should some of its role be handled by Foundry Action log capabilities?
- Are project/task IDs expected to remain stable enterprise-wide identifiers, or are they only app-local IDs?
- Will XML import remain a first-class workflow in Foundry, or become an upstream ingestion pipeline instead?

## Draft Summary

Best first-pass Ontology model:
- `Project`
- `Task`
- `Import Event`
- `Person`
- `Workspace User`

Best first-pass link model:
- `Project contains Task`
- `Project managed by Person`
- `Task assigned to Person`
- `Import Event references Project`

Best first-pass action model:
- create/update/delete project
- create/update/delete task
- import project XML
- update workspace access

This gives the clearest migration path from the current relational application into a Foundry-native application model without losing the current business behavior.
