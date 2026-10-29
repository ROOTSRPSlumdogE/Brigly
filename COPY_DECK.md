# Brigly homepage · copy deck

Every headline, subhead, CTA and FAQ answer on `index.html`, in page order. US English. Feature names used everywhere (page, nav, footer, meta): Today · Scheduling · Checklists · Stock & 86s · Menu & allergens · POS · Reservations · Specials & events · Team & payroll · Training · Reports · Team chat.

## Meta

- **Title** (47 chars): Brigly — Run your whole restaurant from one app
- **Description** (139 chars): One workspace for restaurants and bars: scheduling, checklists, stock, POS and staff training on one record. Try the live demo, no sign-up.
- **OG description**: One workspace for the schedule, the checklists, the stock, the POS and staff training, built for independent restaurants and bars. Try the live demo, no sign-up.

## Nav

How it works · For your team · Features · About · FAQ · **Try the live demo** (`nav-primary`, `mobile-menu-primary`). No separate Training link: Jonas asked to drop it on 2026-10-29 since Training is one story in the For your team section (`#training` still works as an anchor).

Page order (2026-10-29 restructure, at Jonas's request to go deeper on team management): Hero · What Brigly replaces · How it works (the 86 flow) · For your team (seven feature stories, Training among them) · Features (the four chapter tabs + all twelve features) · What's next (three products in development) · About · FAQ · Closing.

## 1 · Hero

- **H1:** Run your whole restaurant *from one app.*
- **Subhead:** Brigly replaces the scheduling app, the clipboards, the inventory spreadsheet, the training binder and the staff group text with one workspace, so every screen agrees. Built for independent restaurants and bars.
- **CTA:** Try the live demo → `demo.html` (`hero-primary`). The only element besides the headline and subhead, at Jonas's request (status line, microcopy, secondary CTA and trust line were cut as clutter).
- **Preview status:** stated once in the device window bar: "Live preview · no sign-up · Today at The Copper Room".
- **Visual:** static Today screenshots (desktop + phone, dark and light variants; the light desktop shots were regenerated on 2026-10-29 after the app's sidebar was made to follow the light theme). The "Make it live" buttons that used to boot the real app in place were removed on 2026-10-29 at Jonas's request; the only way into the app is now the demo links.
- Verified for later use: `demo.html?as=crew` opens the staff view outside embed mode (used in the team section).

### The five headline options

1. **Run your whole restaurant from one app.** ← picked
2. One app for the schedule, the lists, the stock and the POS.
3. Calmer shifts. One system for the whole restaurant.
4. Your restaurant, on one shared record.
5. Every shift, run from one screen.

Why 1: it names the category (an app), the audience (restaurant) and the outcome (run the whole thing) in seven plain words, and "from one app" is the differentiator a GM already understands. Option 2 lists features before the benefit and runs long on a phone. Option 3 leads with a feeling, and "system" is vaguer than "app". Option 4 is the real idea but "shared record" is our language, not the operator's. Option 5 never says restaurant. The other four are kept in an HTML comment above the H1.

## 2 · What Brigly replaces (`#replaces`)

- **Eyebrow:** What Brigly replaces
- **H2:** Six tools. One group text. Zero agreement.
- **Lede:** Most restaurants run on a pile of apps that never talk to each other. Brigly puts the whole pile on one record.
- **Old stack:** Clipboard checklists · The staff group text · A scheduling app · The inventory spreadsheet · A separate POS · The training binder
- **New stack card:** One workspace. Scheduling, checklists, stock, menu, POS, reservations, team, training and reports on the same record.
- **CTA:** See it all in one place → `demo.html` (`replaces-cta`)

## 3 · How it works: one action, everywhere (`#how`)

- **Eyebrow:** How it works
- **H2:** 86 it once. Everyone knows.
- **Lede:** The kitchen runs out of sea bass. One tap in Stock, and every screen that matters updates at the same moment.
- **Center record:** Stock & 86s · Kitchen / Sea bass / 86'd · 8:42 PM / Tapped once by the kitchen
- **Nodes, in animation order:**
  1. Stock — Sea bass · 0 of par 5 — Added to the next order
  2. Menu & allergens — ~~Pan-roasted sea bass~~ — Marked off for dinner
  3. POS — Sea bass · unavailable — Servers can't ring it in
  4. Pre-shift — "Sea bass is 86'd. Offer the halibut." — In the briefing every server reads
  5. Today — 1 item 86'd · reorder waiting — On the manager's screen, no text needed
- **Foot line:** No re-entering. No "did anyone tell the bar?". The record changed, so everything that reads it changed.
- **CTA:** Try it yourself: 86 a dish in the demo → `demo.html#stock` (`aha-86`)

The shift-swap strip that used to follow the flow was cut on 2026-10-29; the Scheduling story below covers it.

## 4 · For your team: where a POS stops (`#team`)

Seven feature stories, alternating visual left/right, each: eyebrow (the feature name), headline, one sentence, three proof points, one demo link. The team-management side is what a POS lacks, so it sits right after the 86 flow.

- **Eyebrow:** For your team
- **H2:** Where a POS stops, Brigly starts.
- **Lede:** A POS takes the order. Brigly runs the people too: onboarding, training, lists, schedules, chat and pay, on one record.

### Shift onboarding (visual: the Shift Onboarding & Overview dialog over a server's Today, desktop)

Jonas clarified on 2026-10-29 that "onboarding" here means the pre-shift Shift Onboarding (the briefing every person on shift confirms), not the new-hire checklist in Manage. The new-hire checklist is still real and could become a story later.

- **H3:** Nobody starts the shift cold.
- The manager approves tonight's plan once. Everyone on shift reads the briefing, the handover and the 86s, then confirms.
- Who is on, by station, and the handover notes from the shift before. · Rollover tasks and items 86'd at lunch carry into dinner. · One tap to confirm. The manager sees who has not yet.
- **Link:** Read tonight's briefing in the demo → `demo.html?as=crew` (`story-briefing`)
- Screenshot note: the dialog is hidden in embed mode unless `body[data-embed-open]` is set, so the shot script sets that flag and clicks the "Open Shift Onboarding" button. "Make it live" on this story boots the server's Today screen with the briefing card; the dialog itself only opens in the full demo.

### Training (visual: staff Training screen, desktop + phone stage) · `#training`

- **H3:** Training your team will actually finish.
- **Lede:** Short courses by role, a quiz, then a practical signed off on shift. No binder, and no guessing who is trained.
- **Steps:** 1. Learn — Short lessons you read, watch or decide, a few minutes each, on your own phone. 2. Pass the quiz — One question at a time, with the answer explained as you go. Retake it as often as you like. 3. Prove it on shift — Show it on the floor. A manager or trainer signs it off, and the certificate lands in your file.
- **Note:** XP, streaks, badges and duels with teammates keep people coming back. Managers build a course in minutes, assign it with a due date, and see who is role-ready.
- **CTA:** Take a course in the demo → `demo.html?screen=training&as=crew` (`training-staff`) · See the manager overview → `&as=manager` (`training-managers`)

### Checklists (visual: staff Checklists, phone)

- **H3:** Lists that know who skipped what.
- Opening, mid-shift and closing lists per station, with due times and notes, and a history of who did what and when.
- An overdue task shows who is on that station right now. · Tasks can be assigned to one person, with a note on why. · History for audits: every task, who did it, and every note they left.
- **Link:** Run tonight's opening list in the demo → `demo.html#lists` (`story-checklists`)

### To-dos (visual: Manage → To do, desktop)

- **H3:** One to-do list, from every part of Brigly.
- Managers see what needs them today: the close-out, timesheets, sign-offs, overdue courses. Staff get to-dos in chat.
- Urgent first, with the fix one tap away. · A to-do sent in chat carries a name and a due date. · Checked off with who did it and when.
- **Link:** See today's to-do list in the demo → `demo.html?screen=manage` (`story-todos`)

### Scheduling & time off (visual: staff My space, desktop)

- **H3:** The schedule that answers its own texts.
- Build the week from shift templates. Swaps, time off and running-late notes come in from the phone and get approved on Today.
- Shift templates per service, and drag a shift to move it. · Sick leave and paid time off accrue by the hour, under your own policy. · Everyone sees their week, expected pay and tips on their phone.
- **Link:** Build next week's schedule in the demo → `demo.html?screen=shifts` (`story-schedule`)

### Team chat (visual: Team chat open on the manager's Today, desktop)

- **H3:** The group text, with a memory.
- One channel for the whole team, one per station, one per role, and direct messages, with photos, voice notes and to-dos.
- Station channels, so the bar does not read the kitchen's thread. · Photos and voice notes from the floor, in the same app as the shift. · The pre-shift briefing shows who has read it.
- **Link:** Open team chat in the demo → `demo.html` (`story-chat`)

### My file & pay (visual: My file and My earnings, two phones)

- **H3:** Every hour on the record, and they can see it.
- The time clock feeds timesheets, pay estimates and pay stubs. Reviews, write-ups and time off live in the same file, open to the person.
- A pay estimate from clocked hours, before payroll runs. · 90-day and annual reviews, scheduled from the hire date. · Warnings and write-ups the team member acknowledges on their phone.
- **Link:** Open My file in the demo → `demo.html?screen=myfile&as=crew` (`story-file`)

### Roles line (closes the section)

Managers: open the manager view → `demo.html?as=manager` (`team-managers`) · Servers, bartenders, cooks: open the staff view → `demo.html?as=crew` (`team-staff`) · Owners: see the reports → `demo.html?screen=reports` (`team-owners`)

## 5 · Features: a shift, start to finish (`#features`)

- **Eyebrow:** Features
- **H2:** A shift, start to finish.
- **Lede:** Every feature in Brigly sits where a restaurant day actually puts it. Pick a moment.
- **Tabs:** 01 Plan the week · 02 Before service · 03 During service · 04 After service

### 01 · Plan the week (photo: week-together · screen: Scheduling)

- **H3:** Plan the week in minutes, not Sunday night.
- Scheduling — Build the week by station, publish once, and see the labor cost as you go. (Softened 2026-10-29: the app shows the week's labor cost, not a target.)
- Training — Courses by role, quizzes and on-shift sign-offs, so a new hire is ready before the first Friday.
- Team & payroll — Time clock to pay estimate without a spreadsheet, with reviews and write-ups in the same file.
- **CTA:** Build next week's schedule in the demo → `demo.html?screen=shifts` (`chapter-plan`)

### 02 · Before service (photo: table-welcome · screen: Checklists)

- **H3:** Walk in knowing what tonight needs.
- Today & pre-shift — One screen with who is on, what is 86'd, who is booked and what needs an approval.
- Checklists — Opening lists per station with due times, notes and sign-offs, so nothing gets skipped quietly. (Softened 2026-10-29: checklists have no temperature or photo fields.)
- Specials & events — Publish tonight's specials and events once. They show up in the briefing, the menu and the POS.
- Reservations — A drawn floor plan, covers by the hour and guest notes before the first table sits.
- **CTA:** Run tonight's opening list in the demo → `demo.html#lists` (`chapter-before`)

### 03 · During service (photo: kitchen-service · screen: POS)

- **H3:** Service runs on the same record as everything else.
- POS — Orders, coursing, splits, tips and refunds on your own menu and floor plan.
- Menu & allergens — Verified dish specs and allergens that servers, the POS and training all read.
- Stock & 86s — Counts, par levels and 86s per station, with an 86 reaching every screen at once.
- Team chat — Station channels with photos and to-dos, plus alerts for anything that needs a decision.
- **CTA:** See tonight's floor in the demo → `demo.html#pos` (`chapter-during`)

### 04 · After service (photo: service-editorial · screen: Reports)

- **H3:** Close out, and the numbers are already done.
- Closing checklists — Every station signed off with proof, and the skipped ones visible by name.
- Close-out — Cash drawers, tips and the daily close from the POS, not from a calculator.
- Reports — Sales, labor, food cost and guests from real shifts, compared with the weeks before.
- **CTA:** Read last week's numbers in the demo → `demo.html?screen=reports` (`chapter-after`)

### All twelve features (grid under the tabs, added 2026-10-29 so the whole product is visible at a glance)

- **H3:** And everything else, on the same record.
- **Sub:** Twelve parts, one app. Each one reads what the others write.
- **Popups (added 2026-10-29 at Jonas's request):** clicking a grid item opens a dialog instead of jumping to the demo: feature name, a headline, two sentences, three facts, a desktop screenshot (dark/light, follows the theme) and one orange CTA into the demo (`feat-<key>`, same href as the grid link). Close with the × button, Escape or a click outside; focus returns to the grid item. Without JavaScript the grid links still go straight to the demo. Markup: one `<template data-feature="…">` per feature plus a single `<dialog id="feature-dialog">`; script in `site.js` under "Feature popups".
  - Today — The shift, on one screen. · Scheduling — Build the week, then let it run. · Checklists — Lists with a memory. · Stock & 86s — One catalog, every station. · Menu & allergens — Recipes that cost themselves. · POS — Service on the same record. · Reservations — The floor plan, drawn by you. · Specials & events — Publish once, everywhere. · Team & payroll — From time clock to pay run. · Training — Courses that end on the floor. · Reports — The numbers, already done. · Team chat — The group text, with a memory.
  - Full popup copy lives in the templates in `index.html`; every fact was checked against the app's module headers (stock, menu, pos, floor, payroll, manage, training, team-chat, reports).
- Today — The live shift: who is on, sales so far, what needs an approval. (`all-today` → `demo.html`)
- Scheduling — Shift templates, swaps, time off and the week's labor cost. (`all-scheduling` → `?screen=shifts`)
- Checklists — Station lists with due times, notes and a history of who did what. (`all-checklists` → `#lists`)
- Stock & 86s — Counts, par levels, vendor orders and the 86 board. (`all-stock` → `#stock`)
- Menu & allergens — Recipes with cost, margin and allergens derived from the ingredients. (`all-menu` → `#menu`)
- POS — Checks, courses, splits, tips, the cash drawer and the close-out. (`all-pos` → `#pos`)
- Reservations — A drawn floor plan, tonight's bookings and guest notes. (`all-reservations` → `#reservations`)
- Specials & events — Published once, then in the briefing, the menu and the POS. (`all-specials` → `#specials`)
- Team & payroll — Time clock, timesheets, pay runs and every HR file. (`all-payroll` → `?screen=manage`)
- Training — Courses by role, quizzes, on-shift sign-offs and certificates. (`all-training` → `?screen=training`)
- Reports — Sales, labor, stock, people and operations, against the period before. (`all-reports` → `?screen=reports`)
- Team chat — Channels per station and role, with photos, voice notes and to-dos. (`all-chat` → `demo.html`)

The former "Managers run it. Your team lives in it." role cards were cut on 2026-10-29; the stories above and the roles line replace them.

## 6 · What's next (`#next`)

Added 2026-10-29 at Jonas's request: three products in development. Jonas then asked for it to be more visual and less specific, since the details will change (his descriptions were examples, not commitments). Three cards, each with a line icon in a tinted ring (orange, amber, sage), the product name, a headline and one sentence. No screenshots, no CTA, no feature lists, no "in development" badge per card: the lede carries the status once.

- **Eyebrow:** What's next · **H2:** Three directions we're building toward. · **Lede:** In development, so details will change. None of it is in the preview yet, and all of it grows out of the record you already keep.
- **Brigly Vendor** — Your vendors, in the loop. Order, track and settle with the people who supply you, without leaving Brigly.
- **Brigly Intelligence** — Your restaurant, with an assistant. Help for managers, the crew and your guests, built on your own record.
- **Brigly API** — Your record, on your website. Connect what you keep in Brigly to your own website and tools.
- The three headlines follow one pattern ("Your X, Y.") and wrap to two lines each, with the sentences at matching length, so the cards line up. Jonas asked for this after the first version's headlines ran one, three and two lines.
- Footer "Brigly" column has a "What's next" link to `#next`. Not in the main nav.

## 7 · About: founder (`#about`)

- **Eyebrow:** About
- **H2:** Built by someone who's worked the floor.
- **Note (first person):** I've spent 20 years in hospitality, in Europe and the US, from the first shift on the floor to running the house. Every place I worked ran on the same stack: clipboards by the pass, a group text that never stopped, and a Monday spent rebuilding the week in a spreadsheet. Nothing agreed, so somebody always had to be the person who knew. Brigly is the system I kept wishing someone would hand me: one record for the whole restaurant, so the team can just run the shift.
- **Signature:** Jonas Schramm — Founder, Brigly · 20 years in restaurants and bars
- **CTA:** Try the restaurant I built it for → `demo.html` (`about-cta`)
- TODOs in the HTML: founder photo (`<!-- TODO founder photo -->`, an initials card stands in), one real story (`<!-- TODO: add one real story -->`).

## 8 · FAQ (`#faq`)

- **Eyebrow:** FAQ · **H2:** Fair questions. · **Lede:** Short answers. The demo has the long ones.

1. **Is this real? Can I try it?** Yes. Every screenshot on this page comes from the working app, and the demo is that same app, running in your browser. The demo is a fictional restaurant, The Copper Room, with six months of sample history. There is no sign-up. Try the live demo (`faq-try`).
2. **What does it cost?** Brigly is in preview. The demo is free, with no account and no card. Pricing will come later, and it will be built for independents, not enterprise contracts.
3. **Do I have to replace my POS?** Not to try it. The demo includes Brigly's own POS so you can see what service looks like on one record. How Brigly fits beside an existing POS is a question for the first real customers, and we will be honest about what works.
4. **What hardware do I need?** None to start. Brigly runs in a browser on the computer, tablet or phone you already have. Card readers, printers and kitchen screens are not part of the preview yet.
5. **Does it work on my staff's own phones?** Yes. The staff view is built for phones first: bottom navigation, day schedules, one-tap sign-offs and the briefing before the shift. Nothing to install.
6. **How does training work?** Every role has a path of short courses. Each one is a few lessons, a quiz and a practical that a manager or trainer signs off on shift. Finishing earns XP, badges and a certificate, and it shows up in Reports and the person's file. Managers build and assign courses in the app, with a due date. Take a course in the demo (`faq-training`).
7. **What about allergens?** Recipes are marked as drafts until a manager verifies them. Only verified records count for service lookups and training, and allergy questions always point back to the kitchen record.
8. **Where is my data?** In the preview, only in your browser. The demo stores changes in your browser's local storage, sends nothing to a server, and resets if you clear it. There is no account or backend yet.
9. **How do the manager and staff views fit together?** Same shift, same record. When a server reads the briefing, submits a list or asks for a swap, it lands on the manager's Today screen for a one-tap approval. Switch roles in the demo to see both sides.

## 9 · Closing (dining-room photo)

- **Eyebrow:** The Copper Room · live demo
- **H2:** Calmer shifts start with one record.
- **CTA:** Try the live demo → `demo.html` (`closing-primary`)
- **Try first (three outlined buttons):** 86 a dish (`closing-86` → `#stock`) · Approve a shift swap (`closing-swap`) · Take a training course (`closing-training` → `?screen=training&as=crew`)

## Sticky mobile bar

Try the live demo → `demo.html` (`sticky-primary`). Shown below 1000px once the hero scrolls away, hidden when the closing section is in view.

## Footer

- Tagline: Calm operations for modern hospitality. One workspace for independent restaurants and bars.
- Run the shift: Today · Checklists · Stock & 86s · Menu & allergens · POS · Reservations
- Run the week: Specials & events · Scheduling · Team & payroll · Training · Reports · Team chat
- Brigly: How it works · For your team · Features · About · FAQ · Privacy · Terms
- Bottom: © 2026 Brigly. Live preview, no sign-up. · Built for independent restaurants, bars and small hospitality groups.
