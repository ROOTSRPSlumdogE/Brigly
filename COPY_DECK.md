# Brigly homepage · copy deck

Every headline, subhead, CTA and FAQ answer on `index.html`, in page order. US English. Feature names used everywhere (page, nav, footer, meta): Today · Scheduling · Checklists · Stock & 86s · Menu & allergens · POS · Reservations · Specials & events · Team & payroll · Training · Reports · Team chat.

## Meta

- **Title** (47 chars): Brigly — Run your whole restaurant from one app
- **Description** (153 chars): One workspace for restaurants and bars that replaces the scheduling app, clipboards, inventory spreadsheet and group text. Try the live demo, no sign-up.
- **OG description**: One workspace for the schedule, the checklists, the stock, the menu and the POS, built for independent restaurants and bars. Try the live demo, no sign-up.

## Nav

How it works · Features · For your team · About · FAQ · **Try the live demo** (`nav-primary`, `mobile-menu-primary`)

## 1 · Hero

- **H1:** Run your whole restaurant *from one app.*
- **Subhead:** Brigly replaces the scheduling app, the clipboards, the inventory spreadsheet and the staff group text with one workspace, so every screen agrees. Built for independent restaurants and bars.
- **CTA:** Try the live demo → `demo.html` (`hero-primary`). The only element besides the headline and subhead, at Jonas's request (status line, microcopy, secondary CTA and trust line were cut as clutter).
- **Preview status:** stated once in the device window bar: "Live preview · no sign-up · Today at The Copper Room".
- **Visual:** static Today screenshots (desktop + phone, dark and light variants), with a "Make it live ▸" button that boots the real app in place.
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

### Second example: a shift swap

- **Eyebrow:** Same idea, people side
- **H3:** A shift swap, start to finish.
- **Steps:**
  1. Sam asks to swap Friday — From the phone, in about ten seconds.
  2. Jamie approves on Today — It lands where the manager already is.
  3. The schedule updates for everyone — Checklists, the POS and pay read the new shift.
  4. Labor cost moves with it — Next week's number is right before Monday.
- **CTA:** Approve a swap on Today in the demo → `demo.html` (`aha-swap`)

## 4 · Features: a shift, start to finish (`#features`)

- **Eyebrow:** Features
- **H2:** A shift, start to finish.
- **Lede:** Every feature in Brigly sits where a restaurant day actually puts it. Pick a moment.
- **Tabs:** 01 Plan the week · 02 Before service · 03 During service · 04 After service

### 01 · Plan the week (photo: week-together · screen: Scheduling)

- **H3:** Plan the week in minutes, not Sunday night.
- Scheduling — Build the week by station, publish once, and watch labor against target as you go.
- Training — Short courses and practical sign-offs, tied to who is actually on the schedule.
- Team & payroll — Time clock to pay estimate without a spreadsheet, with reviews and write-ups in the same file.
- **CTA:** Build next week's schedule in the demo → `demo.html?screen=shifts` (`chapter-plan`)

### 02 · Before service (photo: table-welcome · screen: Checklists)

- **H3:** Walk in knowing what tonight needs.
- Today & pre-shift — One screen with who is on, what is 86'd, who is booked and what needs an approval.
- Checklists — Opening lists per station with temperatures, photos and sign-offs, so nothing gets skipped quietly.
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

## 5 · For your team (`#team`)

- **Eyebrow:** For your team
- **H2:** Managers run it. Your team lives in it.
- **Managers**
  - Approve swaps, sign-offs and low-stock orders from one screen, not five.
  - Change a dish, a price or a shift once. The POS, the lists and pay follow.
  - See the night's labor, sales and 86s before you lock the door.
  - CTA: Open the manager view → `demo.html?as=manager` (`team-managers`)
- **Servers, bartenders, cooks**
  - Your week, your swaps and your time off on your own phone.
  - Tonight's briefing, your lists and the specials before you walk in.
  - Hours, tips and training progress you can actually see.
  - CTA: Open the staff view → `demo.html?as=crew` (`team-staff`)
- **Owners line:** Owners: the numbers are ready without a spreadsheet. See the reports → `demo.html?screen=reports` (`team-owners`)

## 6 · About: founder (`#about`)

- **Eyebrow:** About
- **H2:** Built by someone who's worked the floor.
- **Note (first person):** I've spent 20 years in hospitality, in Europe and the US, from the first shift on the floor to running the house. Every place I worked ran on the same stack: clipboards by the pass, a group text that never stopped, and a Monday spent rebuilding the week in a spreadsheet. Nothing agreed, so somebody always had to be the person who knew. Brigly is the system I kept wishing someone would hand me: one record for the whole restaurant, so the team can just run the shift.
- **Signature:** Jonas Schramm — Founder, Brigly · 20 years in restaurants and bars
- **CTA:** Try the restaurant I built it for → `demo.html` (`about-cta`)
- TODOs in the HTML: founder photo (`<!-- TODO founder photo -->`, an initials card stands in), one real story (`<!-- TODO: add one real story -->`).

## 7 · FAQ (`#faq`)

- **Eyebrow:** FAQ · **H2:** Fair questions. · **Lede:** Short answers. The demo has the long ones.

1. **Is this real? Can I try it?** Yes. Every screenshot on this page comes from the working app, and "Make it live" swaps any of them for the real thing, running in your browser. The demo is a fictional restaurant, The Copper Room, with six months of sample history. There is no sign-up. Try the live demo (`faq-try`).
2. **What does it cost?** Brigly is in preview. The demo is free, with no account and no card. Pricing will come later, and it will be built for independents, not enterprise contracts.
3. **Do I have to replace my POS?** Not to try it. The demo includes Brigly's own POS so you can see what service looks like on one record. How Brigly fits beside an existing POS is a question for the first real customers, and we will be honest about what works.
4. **What hardware do I need?** None to start. Brigly runs in a browser on the computer, tablet or phone you already have. Card readers, printers and kitchen screens are not part of the preview yet.
5. **Does it work on my staff's own phones?** Yes. The staff view is built for phones first: bottom navigation, day schedules, one-tap sign-offs and the briefing before the shift. Nothing to install.
6. **What about allergens?** Recipes are marked as drafts until a manager verifies them. Only verified records count for service lookups and training, and allergy questions always point back to the kitchen record.
7. **Where is my data?** In the preview, only in your browser. The demo stores changes in your browser's local storage, sends nothing to a server, and resets if you clear it. There is no account or backend yet.
8. **How do the manager and staff views fit together?** Same shift, same record. When a server reads the briefing, submits a list or asks for a swap, it lands on the manager's Today screen for a one-tap approval. Switch roles in the demo to see both sides.

## 8 · Closing (dining-room photo)

- **Eyebrow:** The Copper Room · live demo
- **H2:** Calmer shifts start with one record.
- **CTA:** Try the live demo → `demo.html` (`closing-primary`)
- **Try first (three outlined buttons):** 86 a dish (`closing-86` → `#stock`) · Approve a shift swap (`closing-swap`) · Close out the night (`closing-close` → `#pos`)

## Sticky mobile bar

Try the live demo → `demo.html` (`sticky-primary`). Shown below 1000px once the hero scrolls away, hidden when the closing section is in view.

## Footer

- Tagline: Calm operations for modern hospitality. One workspace for independent restaurants and bars.
- Run the shift: Today · Checklists · Stock & 86s · Menu & allergens · POS · Reservations
- Run the week: Specials & events · Scheduling · Team & payroll · Training · Reports · Team chat
- Brigly: How it works · Features · For your team · About · FAQ · Privacy · Terms
- Bottom: © 2026 Brigly. Live preview, no sign-up. · Built for independent restaurants, bars and small hospitality groups.
