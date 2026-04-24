# Ontology Merge Log

This document tracks selective feature-by-feature work brought from the Ontology/widget codebase into this repository.

Source repo:

- `C:\_Code\test-project-tracker`

Target repo:

- `C:\_Code\react-project-tracker-sql`

Working branch for this merge stream:

- `feature/ontology-merge-clean`

## How To Use This Log

For each feature:

- record what was brought over
- record what was intentionally not brought over
- note any follow-up work or open questions

This is meant to stay lightweight and practical rather than become a full migration spec.

## Feature Status Legend

- `Not Started`
- `In Progress`
- `Partially Merged`
- `Merged`
- `Skipped`

## Features

### ✅ Settings Page

- Status: `Merged`
- Source area:
  - `src/features/settings/SettingsPage.tsx`
  - `src/shared/ThemeContext.tsx`
- Target area:
  - `frontend/src/features/settings/components/SettingsPage.tsx`
  - `frontend/src/features/settings/components/SettingsPanel.tsx`

What was brought over:

- tabbed settings page structure inspired by the widget flow
- a clearer separation between Preferences, User Information, and About
- a user-facing note that preferences can later move to Ontology-backed storage without changing the page layout much
- a lightweight About section that can show runtime version information when the current app exposes it

What was not brought over:

- widget-specific `UserContext` fields such as display name and email
- widget-side `VERSION` and `BUILD_INFO` module usage
- localStorage-backed theme provider implementation from the widget
- direct OSDK/Foundry preference storage

Why those parts were not brought over:

- the current app already has its own settings persistence and current-user model
- the current target repo exposes `currentUserName` and `userAccess`, not the richer widget user object
- the target app still uses the SQL-backed API and settings flow, so replacing storage would be a separate migration step

Current target behavior:

- `Preferences` uses the existing SQL-backed settings flow
- `User Information` shows current user, role, admin access, log access, and notes from the current app
- `About` shows app name plus runtime version when available from `/admin/environment`

Follow-up ideas:

- decide whether About should always show version/build info even for non-admin users
- decide whether user identity should grow beyond `currentUserName` in the target app
- later swap the storage layer behind preferences if this page becomes Ontology-backed

### ✅ Startup Documentation

- Status: `Merged`
- Source area:
  - practical startup knowledge discovered during local bring-up
- Target area:
  - `README.md`

What was brought over:

- quick-start commands for frontend and backend bring-up
- PowerShell virtual environment activation notes
- frontend `npm audit` note for the nested `frontend/package-lock.json`
- Vite IPv6 loopback troubleshooting note with `--host 127.0.0.1`

What was not brought over:

- no separate script automation was added yet
- no one-command bootstrap wrapper was added yet

Follow-up ideas:

- tighten the quick-start command order so it is fully copy-paste safe
- optionally add a root-level helper script for local setup

### ✅ Debug Console

- Status: `Merged`
- Source area:
  - `src/shared/components/DebugPanel.tsx`
  - `src/shared/services/diagnosticService.ts`
  - `src/shared/utils/debug.ts`
- Target area:
  - `frontend/src/shared/components/DebugPanel.tsx`
  - `frontend/src/shared/utils/debug.ts`
  - `frontend/src/shared/api/http.ts`
  - `frontend/src/features/admin/components/LogsTab.tsx`

What was brought over:

- a client-side debug logger with in-memory log capture and export support
- a frontend debug console panel with filtering by text, level, and category
- visibility for frontend request activity and request failures inside the Admin logs experience
- a combined logs view that now shows backend logs alongside frontend diagnostics
- a navigation-panel debug button that opens the frontend debug console in a modal from anywhere in the app

What was not brought over:

- OSDK-specific diagnostic routines
- ontology object metadata inspection
- widget-specific diagnostic checks for `MDProject`, `MDTask`, and `MDUser`
- correlation-ID-only filtering mode from the widget panel

Why those parts were not brought over:

- the target app does not use OSDK object queries in its current frontend architecture
- the current app already has a backend log viewer and admin diagnostics flow, so the useful addition here was the client-side console rather than the Foundry-specific checks
- frontend request logging was a cleaner fit than trying to reproduce widget-only ontology health checks

Current target behavior:

- backend logs still come from the API log viewer
- frontend diagnostics now capture `apiFetch(...)` request starts, successes, and failures
- admins can inspect both sources from the Logs tab
- users can also open the frontend debug console directly from the main sidebar navigation

Follow-up ideas:

- add more frontend feature-level logging around project import, task editing, and settings saves
- decide whether correlation IDs should also be surfaced into frontend debug entries
- consider a copy-to-clipboard action for filtered frontend logs

### ✅ Backend Log Viewer UX

- Status: `Merged`
- Source area:
  - `src/shared/components/DebugPanel.tsx`
- Target area:
  - `frontend/src/features/settings/components/LogViewerPanel.tsx`
  - `frontend/src/app/styles/app.css`

What was brought over:

- debug-console-style filtering controls for backend logs
- export and copy actions for the visible backend log set
- richer card-style entry rendering with badges, timestamps, and expandable metadata
- a more consistent operator-focused visual treatment between frontend and backend diagnostics

What was not brought over:

- the backend log viewer still uses server-fetched log lines rather than the in-memory frontend logger
- category filtering was not added because backend log lines do not currently expose a structured category field

Why those parts were not brought over:

- the backend and frontend logs remain different data sources even though their UX is now more aligned
- the current backend payload only exposes line number, level, timestamp, correlation ID, and content

Current target behavior:

- backend logs and frontend debug logs now feel like sibling tools rather than completely separate experiences
- admins can filter, export, and copy visible backend log entries directly from the log viewer
- the Admin logs area now gives backend and frontend diagnostics their own dedicated tabs so each tool has full-width space

Follow-up ideas:

- add structured backend log categories if the API can expose them
- consider reusable shared diagnostics list components if the two consoles converge further

### ✅ Admin Page

- Status: `Merged`
- Source area:
  - `src/shared/services/adminService.ts`
  - widget navigation/admin visibility patterns
- Target area:
  - `frontend/src/features/admin/components/AdminPage.tsx`
  - `frontend/src/features/admin/components/AccessEditorRow.tsx`

What was brought over:

- stronger admin-focused frontend diagnostics around admin status and admin actions
- explicit frontend logging for admin dashboard loads, correlation-ID copy actions, log-context navigation, and access saves
- an operator-friendly refresh action on the Admin page so admins can reload current data without leaving the screen

What was not brought over:

- widget OSDK-based admin role checks against `MDUser`
- widget hooks for loading admin users directly from Ontology
- a literal page layout port, because the target app already has a much richer SQL-backed Admin surface

Why those parts were not brought over:

- the target app already centralizes identity and permissions through `CurrentUserProvider` and workspace permission helpers
- the current Admin page already includes imports, access, environment, and logs tabs that do not exist in the widget in the same form
- the best fit here was to import admin-oriented diagnostics and operational affordances rather than replace the page architecture

Current target behavior:

- admin data loads now emit frontend debug entries
- access saves now emit frontend debug entries
- admins can manually refresh Admin data from the page header

Follow-up ideas:

- add a lightweight “last refreshed” timestamp in the Admin context card
- consider tab-level counts or badges for imports, access records, and logs
- decide whether non-admin users should see more explicit role/help text on the limited Admin landing state

### ✅ Home Page

- Status: `Merged`
- Source area:
  - `src/features/home/HomePage.tsx`
  - `src/features/home/ProjectSummaryTable.tsx`
- Target area:
  - `frontend/src/features/home/components/ProjectSummaryTable.tsx`

What was brought over:

- richer project summary table treatment inspired by the widget home screen
- project type badges with explanatory hover text
- milestone progress summary in the table
- visible percent-complete progress bars in the table

What was not brought over:

- OSDK project/task loading and conversion logic
- widget-side diagnostics that run automatically on Home page mount
- widget-specific page container and hero wrapper components

Why those parts were not brought over:

- the target app already has its own SQL-backed project data flow and Home page layout
- the current target Home page was already cleaner structurally, so the best merge was to bring over richer summary-table presentation rather than replace the whole page
- the OSDK diagnostics were specific to Ontology troubleshooting rather than the current backend architecture

Current target behavior:

- the Home page keeps the current app’s layout and data flow
- the summary table now exposes more useful portfolio detail at a glance without leaving the table

Follow-up ideas:

- decide whether the Home page should also include more explicit pagination context or summary cards
- consider reusing some of the same richer table treatment on My Work where appropriate

### ✅ My Work / Dashboard

- Status: `Merged`
- Source area:
  - `src/features/mywork/MyWorkPage.tsx`
- Target area:
  - `frontend/src/features/dashboard/components/MyDashboardPage.tsx`

What was brought over:

- lightweight search and status filtering inspired by the widget My Work page
- richer progress visualization for projects and tasks
- milestone visibility in the open-task list

What was not brought over:

- OSDK project/task loading hooks
- widget-side user matching logic based on the Ontology user context
- the widget’s older simpler ownership model

Why those parts were not brought over:

- the target app already has stronger permission-aware logic for ownership, assignment, and edit access
- the SQL-backed `useProjectData(...)` flow is the correct data source for the current app
- the best fit here was to bring over operator UX improvements while preserving the target repo’s authorization model

Current target behavior:

- My Work still respects the current app’s ownership and assignment permissions
- users can now narrow the project list by search term and status
- project and task progress are easier to scan visually

Follow-up ideas:

- decide whether My Work should also show milestone counts or overdue counts at the card header level
- consider reusing search/filter state in the main dashboard settings flow if users want it persisted

### ✅ Project Detail

- Status: `Merged`
- Source area:
  - `src/features/projects/components/ProjectDetailPage.tsx`
  - `src/features/projects/components/projectDetailUtils.tsx`
- Target area:
  - `frontend/src/features/projects/components/ProjectDetailPage.tsx`
  - `frontend/src/features/projects/components/ProjectPhasesTab.tsx`

What was brought over:

- a dedicated Phases tab inspired by the widget detail experience
- fuller imported-phase summaries with dates, task counts, milestone counts, and completion state

What was not brought over:

- widget OSDK update/delete flows
- widget-specific Gantt implementations
- widget permission handling for drag/drop task edits

Why those parts were not brought over:

- the target app already has its own SQL-backed project/task editing and permission model
- the current timeline and board architecture in the target repo is already more aligned with the SQL app than the widget’s older detail-page flow
- the safest migration step here was to add the missing phase-focused view without replacing the core detail page behavior

Current target behavior:

- project detail now exposes a dedicated phases view when summary-phase data exists
- the current overview, timeline, task, and board flows remain unchanged

Follow-up ideas:

- consider bringing over richer project-type explanations on the detail hero
- evaluate whether the timeline view should absorb any additional widget-style milestone presentation

### ✅ Import Planner

- Status: `Merged`
- Source area:
  - `src/features/projects/components/ImportPlannerPage.tsx`
  - `src/features/projects/utils/plannerParser.ts`
- Target area:
  - `frontend/src/features/projects/components/ImportPlannerPage.tsx`

What was brought over:

- clearer selected-file feedback before import
- stronger operator guidance around how to export from Microsoft Planner
- clearer explanation of what workbook data is parsed
- preview messaging that explains when only a subset of rows is shown before import

What was not brought over:

- widget OSDK create-project/create-task loops
- widget-side import audit log mutation
- widget file-validation flow that was tied to the older import implementation

Why those parts were not brought over:

- the target app already has a cleaner parser-to-API import path through `parsePlannerWorkbook(...)` and `handlePlannerImport(...)`
- the current SQL-backed app should keep import persistence and auditing on the backend side, not in frontend-only widget state
- the best fit here was to carry over guided import UX without regressing the current architecture

Current target behavior:

- the Planner import page keeps the current preview/import architecture
- users now get better feedback and instructions before committing an import

Follow-up ideas:

- consider replacing the local import activity box with the shared frontend debug console component
- decide whether workbook validation should happen automatically on file select again or remain explicit via Preview

## Explicitly Skipped

### Project Board View

- Status: `Skipped`

Reason:

- the board is not being used in the current target workflow, so we are intentionally not spending merge effort there

### Widget OSDK Service Layer

- Status: `Skipped`

Reason:

- the target app is SQL-backed and already has its own project/task/settings data flow
- bringing over OSDK service hooks would create parallel architectures instead of helping the migration

### Widget Auth And User Model

- Status: `Skipped`

Reason:

- the widget relies on a different user context shape and Ontology-driven assumptions
- the target repo already has a better-fitting current-user and permission model for this application

### Widget-Specific Gantt Implementations

- Status: `Skipped`

Reason:

- the target app already has its own timeline/detail experience
- porting the widget Gantt implementations would add overlap and maintenance cost without clear value right now

## Status Summary

| Status | Count | Features |
| --- | ---: | --- |
| ✅ Merged | 9 | Settings Page, Startup Documentation, Debug Console, Backend Log Viewer UX, Admin Page, Home Page, My Work / Dashboard, Project Detail, Import Planner |
| Partially Merged | 0 | None |
| Skipped | 4 | Project Board View, Widget OSDK Service Layer, Widget Auth And User Model, Widget-Specific Gantt Implementations |
| Not Started | 0 | None currently tracked |
