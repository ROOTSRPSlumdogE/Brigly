# Brigly

The restaurant workspace in `demo.html` has been rebuilt around seven features:

- Team schedules: weekly roster, manager shift creation/editing/removal, overlap checks.
- Opening & closing lists: manager-maintained templates with completion recorded by person for each date and service.
- Specials: service-specific menu notes, prices, ingredient/allergy notes and availability.
- 86 list: shared unavailable items, alternatives and restoration by crew or managers.
- Shift onboarding: briefings authored by managers or crew; per-person acknowledgments reset on revisions.
- Crew orders: supply requests, manager approval/decline with feedback, ordering and receipt.
- Reservations: guest notes, party size, table assignment, two-hour table conflict checks and arrival lifecycle.

## Run locally

Requires Node 20+; no npm dependencies.

```powershell
npm run check
npm run build
npm run preview
```

Open `http://127.0.0.1:8000/demo.html`. The marketing homepage remains in `index.html`.

## Implementation

`assets/js/workspace-state.js` holds the versioned model, validation and mutations. `assets/js/demo.js` renders the seven sections and handles forms. `assets/css/demo.css` provides responsive layouts using Brigly's local Plus Jakarta Sans font and brand palette.

The preview starts with sample data for The Copper Room, seeded for the current local date. Active configured team members are available in the sidebar identity selector. Data is stored under the `brigly-workspace-v2` localStorage key and upgraded in place as features expand; the original nine-module prototype's separate key is preserved but not imported. There is no backend, sign-in, cross-device synchronization, supplier integration or reservation integration. Role controls demonstrate workflows, not security boundaries. Browser storage failures are surfaced in the footer.

Schedules support same-day and overnight assignments. Lists share templates but isolate progress by date and service. Specials, notes, briefings, 86 items and reservations are service-specific; supply requests carry across services. Table bookings use a fixed two-hour window. Allergy notes must be verified with the kitchen.

`npm run check` verifies static references and script syntax, plus state tests for persistence, role controls, scheduling conflicts, shift isolation, briefing revisions, supply approvals and reservation conflicts/lifecycles. `npm run build` writes the static deployment bundle to `dist/`.

## Expanded Team Schedules

The scheduling domain lives in `assets/js/schedule-state.js`; the schedule UI is in `assets/js/schedule-ui.js`. Existing browser data is upgraded in place, preserving all seven modules. Sample hourly rates are seeded for the demo; managers can edit defaults per person or rates and unpaid breaks per shift.

Crew can switch among the sample teammates through **Preview as**, see their weekly shifts and overlapping coworkers, submit time-off requests, report sickness or lateness, request a two-way shift exchange, respond to swap invitations and enter daily tips. Managers see attendance alerts, a review queue, a roster with absence/late markers, individual or whole-team earnings and per-person rate/absence defaults.

Calculation rules:

- Roster hours = shift duration minus unpaid breaks. Expected working hours also remove reported lateness and absences.
- Time off changes estimates only when approved. Managers can choose paid/unpaid for each request, including correcting approved leave.
- Sickness updates expected coverage immediately, using the person's saved paid/unpaid default provisionally; manager review can override it. No medical details are required.
- Lateness updates expected minutes immediately. A manager can confirm or correct the minutes, including zero. Sickness takes precedence over lateness to avoid double deductions.
- Gross wages = (expected working hours + paid absence hours) × the saved shift rate, rounded to cents per shift. Reported daily tips are added to the total. Editing a tip entry replaces that person's total for that date.
- Daily, Monday–Sunday weekly, calendar-month and overall summaries use the selected date and include all services. Past values remain estimates, not verified worked time. There is no tax, overtime, deductions or payroll processing.
- Default rate changes affect new shifts only. Existing shifts retain their rates. Absence default changes affect new requests only.
- Swaps require the invited teammate's acceptance and then manager approval. Both assignments exchange atomically; each person retains their prior rate for the exchange. Conflicts, approved leave and attendance are rechecked. Editing a referenced shift invalidates a pending swap.
- Browser tabs on the same origin receive updates. An open form becomes stale if another tab changes the workspace and must be reopened before saving. This is still a local prototype; it does not send external notifications or synchronize between devices.

Verification covers state migration, paid/unpaid overrides, absence and lateness calculations, tip replacement, period aggregation, actor restrictions, teammate consent, swap approval/conflicts, stale swaps and default rates. Browser checks cover the crew/manager workflows, persistence, tab updates, stale forms and desktop/mobile layouts.

## Shared shift operations and manager reporting

`shift-operations-state.js` and `shift-operations-ui.js` connect the schedule with notes, menu availability, reservations, team configuration and reports.

- A shared shift is a **service date + service name**. Notes appear in each matching crew shift card and in Onboarding. Manager-authored notes are highlighted and sorted first; crew can edit/archive their own notes. Crew need an assignment on that service to post.
- The 86 list is now service-specific. Crew submissions are **Reported** (unconfirmed); managers approve or decline with feedback. Manager-created items start **Approved**. Managers can mark stock available again. Earlier global 86 data migrates to its saved date/service. Pending reports are available across dates in the manager's **86 review** tab.
- Shift briefings display reservation arrivals, parties, tables, guest notes and status; the linked reservation editor retains the selected date/service.
- **Team & schedule setup** supports adding/editing/archiving people, role titles, default stations and manager/crew access. Archiving preserves history and prevents new assignments. Role and station names can be added/renamed; only unused options can be removed.
- Services can be added, renamed or archived, with default start/end times and unpaid breaks. Renaming preserves linked notes, reservations, 86 items and checklist progress. Time changes apply to new assignments by default; managers may explicitly update assignments from a chosen date. Conflicts block the entire change. Individual assignments remain editable.
- Overnight shifts are supported. An end time before its start finishes the following day. Reports attribute the whole assignment to its service/start date. Overlap checks span midnight.
- Manager dashboards show **estimated labor cost**, using gross wages including paid absence, excluding crew tips. Crew dashboards retain **expected gross earnings** including their tips. Employer taxes/benefits, overtime, clocked actual hours and payroll finalization are not modeled.
- **Team reports** generates live statistics for a chosen person and date range: shifts, roster/expected hours, paid/unpaid absence hours, sickness/time-off counts, reported and confirmed late shifts, late minutes, pending reviews, wage expense, separate tips, note/86 contributions and per-shift records. “Not recorded” is distinct from on-time attendance. There are no inferred performance scores or automated employment recommendations.
- CSV downloads contain the same person/date scope and per-shift data, with formula-safe text cells. Reports are recalculated in the app; no emails, external HR integrations or scheduled background jobs are sent or created.

The preview identity selector now includes all active configured team members. Manager access is a simulated application role; this browser-local prototype still requires a backend and real authorization before shared production use.

### Phone-first app and sample history

`demo.html` now defaults to dark mode, with a persistent light-mode toggle. Phones use bottom navigation (Shifts, Briefing, Lists, 86, More), day rosters, stacked record cards, and bottom-sheet forms. Desktop retains the weekly planning grid. Schedule sections separate shifts, requests, earnings/labor costs, employee reports, and manager setup. All seven workflows remain available.

`demo-history.js` appends a deterministic fictional history once per browser workspace, covering the current month and five previous months, plus a week of future planning. It preserves existing records and adds varied lunch, dinner, brunch, event and overnight shifts, extra crew, tips, reviewed absence/late reports, swaps, reservations, briefings, notes, checklist progress and menu availability. A fresh October 25, 2026 fixture contains 1,354 shifts and 2,451 reservations. Existing custom workspaces may have different totals. Sample history is labeled in the app; historical hours and wage costs remain schedule estimates, not time-clock or payroll records.

Employee reports start with the six-month range and include monthly wage-expense trends, range presets, expandable shift records and CSV export. Overall earnings charts group by month. Crew tips remain separate from employer wage expenses. The local-storage key is unchanged; a seed marker prevents duplicate history. Theme preference is stored separately as `brigly-theme`.

The app-specific `app.webmanifest` supplies standalone display metadata; it does not add offline caching, a backend, authentication or multi-device synchronization. Test data migration and report consistency with `node scripts/test-history.mjs` (also included in `npm run check`).

### Faster roster planning and employee lifecycle

Managers now have a day planner on phones and a drag-and-drop weekly grid on desktop. Drag the dotted handle to move a shift between people/dates; a mouse can also drag service-time presets into roster cells. Tap a preset and then a destination for repeat assignment, or tap an empty slot to choose a preset in a bottom sheet. The existing detailed editor remains available from each shift’s arrow.

Save a populated week as a named schedule, preview/apply it to another week, or copy the previous week. Templates preserve staff, service, station, times and breaks, while new shifts use current rates. Application is atomic: conflicts prevent the entire batch, exact existing assignments are skipped, and existing shifts are never replaced. Moves preserve the rate when the person stays the same and use the destination person’s rate for reassignment. Attendance-linked assignments must be reviewed before moving. Approved leave, overlaps and employment dates are checked.

Manager profiles include joining and last-working dates, current/former team filters and direct statistics links. Departures retain all historical records and CSV reports. Before recording a last working day, reassign any later shifts; another manager must archive the current manager. Missing employment dates stay explicitly unrecorded for custom profiles.

`restaurant-history.js` adds a second idempotent sample-data migration: two former employees with complete shift and tip histories, joining dates for sample staff, and missing notes, 86 records, specials, reservations, onboarding and checklist activity throughout the sample period. Existing records are preserved. A fresh October fixture now has 1,487 shifts and fits within the tested browser storage budget. This is fictional demonstration data, with estimated schedule-based wages.

Shift cards and manager shift sheets display service information directly, with note/86 actions, specials, onboarding acknowledgments and reservation actions available in place. The old nested briefing disclosure is removed. The standalone onboarding screen uses the same content without duplicating it. `node scripts/test-planner.mjs` checks planner permissions, atomic reuse, duplicate skipping, date guards, former employee statistics, historical service completeness and persistence.

### Low-friction daily maintenance

Each roster card now has explicit Move and Delete actions; tapping the shift opens its editor. Managers can select multiple shifts or a whole day and remove them together. Deletion retains the original assignments in `planning.removed`, with immediate Undo and a “Recently removed” recovery list under Week tools. Restore is atomic and checks for new conflicts; pending swaps are restored only when both original shift signatures still match. Absence-linked assignments require resolving the absence first. Notes, tips, reservations and other service records are not deleted with an assignment.

On phones, the planner shows the selected day’s assigned staff. Add shift fills times, breaks, station and rate from a template; Move temporarily shows all eligible destinations. Week tools holds copying, saved schedules, template creation and bulk selection, keeping setup controls off the everyday roster. Crew have a single Shift actions tray containing Add note, Report 86, Add tips, sickness, lateness and swap actions. Note/86 buttons are no longer duplicated farther down the crew shift card.

### App entry and contextual navigation

Opening without an explicit section hash now lands on Today, not the last dashboard page. The entry screen selects an ongoing assignment (including overnight shifts), otherwise the next assignment, otherwise the latest recorded shift; its label distinguishes today, upcoming and past shifts. Crew see the shift time, expected hours/wages, teammates, and six immediate actions plus time off. Managers see service coverage, guests, 86 count and six planning/service actions. At 375 × 667, browser measurements confirmed every primary action and crew time off sits above the fixed bottom navigation without scrolling.

Calendar is now a compact agenda: selecting an assignment opens its dedicated action screen. A Change selector provides nearby shifts and full-calendar access. On mobile, navigation switches between personal/manager workspace tools and service tools. The app header identifies the active screen with a one-tap return to Today. More puts service tools first when inside a service, and workspace tools first elsewhere. Reports, earnings, setup and requests remain separate screens; the website-style headings, summaries, stacked tabs and footer are removed from the mobile frame.

Service details now focus on notes and onboarding. Lists, menu availability, specials and reservations remain available as their own sections. Planner screens focus on assignments with a link to service details, instead of appending a long service report. Existing editing, approvals, tips, deletion/undo, templates and employment workflows are retained. `node scripts/test-home.mjs` verifies role-specific entry actions, assignment context, date selection, calendar access and empty states.

The app uses persistent grouped navigation on desktop and a stable Today / Calendar or Roster / Requests or Inbox / Service / More dock on phones. Service screens share a local section rail on mobile. Profile and preview-role controls are available from the avatar or desktop sidebar profile. The responsive shell lives in assets/css/app-layout.css; destinations are shared through assets/js/app-navigation.js.

Shift lists: opening and closing tasks use starter defaults until the manager customizes a dated service. Customization copies that shift’s tasks and completion records without changing other dates. Managers can start empty lists and add/edit tasks independently. Assigned crew can complete/reopen tasks; shared records show the completing teammate. The overview and full checklist use the same scoped model.

Private notes and to-dos: managers send to one active crew recipient. The application displays items only to the sender and recipient; recipients can mark notes read or complete/reopen to-dos. Senders can archive/restore their messages. This remains a local demo: same-origin browser tabs receive storage updates, but there is no cross-device backend, authentication, or server-enforced privacy. Do not use it to store real confidential messages. Automated coverage is in scripts/test-duties.mjs.

Station checklist UX: crew default to the station assigned on the selected shift; other teams are read-only. Managers switch between custom stations and Opening/Closing, then enter Edit list mode. Bulk entry accepts one task per line and skips exact duplicate titles in the same station/list. Clearing is limited to the selected station, phase and dated service. Completed tasks are collapsible, retain teammate attribution and can be reopened by assigned crew or a manager. Home checklist previews contain only the crew member’s assigned stations; full-list shortcuts select the matching phase.
