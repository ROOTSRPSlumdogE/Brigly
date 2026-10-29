# Prompt: Rewrite the Brigly homepage for clarity and conversion

> **Before you paste this:** fill in the five `[[ … ]]` blanks in section 0. Everything else can stay as is.
> Run it in Claude Code (or similar) from inside the `Website` folder so it can edit `index.html`, `assets/css/site.css` and `assets/js/site.js`.

---

You are a senior conversion copywriter and product designer for B2B hospitality software. Rewrite and redesign the Brigly marketing homepage (`index.html`, styled by `assets/css/site.css`, behaviour in `assets/js/site.js`). Do **not** touch the demo app (`demo.html` and its `assets/js/*-state.js` / `*-ui.js` files) except to link into it.

## 0. Facts you must use (filled in by the founder)

- **Primary conversion goal** (what a visitor should do besides trying the demo): [[ e.g. "join the early-access waitlist" / "apply to be a pilot restaurant" / "book a 15-minute walkthrough" ]]
- **Where that goes** (form endpoint, Calendly link, Netlify form, mailto): [[ … ]]
- **Target market and spelling**: [[ e.g. "US independent restaurants & bars, US English: schedule, check, labor" OR "UK/AU: roster, till, labour" ]]
- **Pricing / availability line we can honestly say**: [[ e.g. "Free for pilot restaurants through 2027" / "Pricing announced at launch" ]]
- **Proof we actually have** (pilot venues, quotes, founder background, hours of interviews — or "none yet"): [[ … ]]

Never invent testimonials, customer logos, metrics or integrations. If proof is "none yet", use founder credibility and the live demo as proof instead.

## 1. What Brigly is (source of truth)

Brigly is one workspace for running a restaurant or bar: schedule/roster, opening & closing checklists, stock & 86s, menu & allergens, POS, reservations & floor plan, specials/events, team & pay, training and reports. Owners, managers and crew all use it; managers on desktop and phone, crew mainly on phone.

**The one idea that makes it different:** everything runs on *one shared record*, so the pieces agree without re-entry. Examples already true in the product:
- An 86 in the kitchen updates stock, the menu, the POS and the crew briefing at once.
- The schedule feeds checklists, the till, training and pay — nobody re-enters who's working.
- Anything that needs a decision (swap, late clock-out, list sign-off, low stock) lands on one "Today" screen for the person who can approve it.
- Reports come from real shifts, not Monday exports.

**Status (must stay honest):** Brigly is a working product preview. The demo runs fully in the browser with a fictional restaurant ("The Copper Room") and six months of sample history. There is no sign-up, backend, billing or payment processing yet; payroll is estimates, not processing. Copy must not imply live payments, payroll filing or integrations that don't exist. Phrase capability as what the product does, and be clear once, plainly (not buried in the FAQ), that it's in early access/preview.

## 2. What's wrong with the current page (fix all of these)

1. **The hero doesn't say what Brigly is.** "Your team. Every shift. Everything connected." could be Slack, Deputy or a staffing agency. The word *restaurant* is absent from the headline. A visitor must know within 5 seconds: *it's software, it's for restaurants/bars, it replaces the pile of apps, and why that's better.*
2. **12 features at equal weight = "all over the place".** The scroll showcase walks through 12 numbered tools in an arbitrary order (Today, Alerts, Checklists, Stock, POS, Menu, Reservations, Happenings, Roster, Manage, Training, Reports). Nothing is prioritised and calling them "Twelve tools" contradicts the "one system, nothing bolted on" message.
3. **The real differentiator is buried.** "One roster / One menu / One Today" and "the roster, the lists, the stock and the till finally agree" are the strongest ideas on the page, but sit in sections 2 and 4 in abstract language. Show it as a concrete story instead.
4. **Inconsistent and internal naming.** "Happenings" vs "Specials", "Roster" vs "Shifts" vs "Schedules", "Manage" (meaningless to a visitor), "Alerts & messages" missing from the hero list. The meta description is a keyword dump.
5. **Mixed dialect.** "Roster", "till", "crew" (UK/AU) alongside "86", "labor" (US). Pick the market from section 0 and apply it everywhere.
6. **The funnel goes nowhere.** Every CTA (5+ of them) is "Open the demo". There's no way to raise a hand, so interested owners leave with nothing captured. `thanks.html` literally says "Registration is not open yet."
7. **No pain, no proof, no "who it's for".** The audience (independent restaurants, bars, groups) appears only in the footer. There's no "what it replaces", no founder/credibility, no pricing/availability, and no objection handling (switching POS, hardware, offline, data, cost).
8. **Visuals are cold and heavy.** Every visual is a live app iframe (two in the hero, ~12 in the showcase, more in Teams), loading a large app bundle — slow on mobile and visually repetitive. Nine good restaurant photos in `assets/images/` are almost unused (only one in the closing section). The hospitality warmth is missing.
9. **Best line is hidden in the footer:** "Calm operations for modern hospitality." Consider it for positioning.

## 3. New page structure (build in this order)

Keep it to ~8 sections. Each section has one job.

1. **Hero — what it is + who it's for + why it's better.**
   - H1 names the category and outcome in plain words. Write 5 options, pick the best, keep the others in an HTML comment. Directions to explore: "Run your whole restaurant from one app." / "One app for the schedule, the lists, the stock and the till." / "Calm shifts. One system for the whole house."
   - Subhead (≤ 30 words): what it replaces + the one-record benefit + audience.
   - Primary CTA: the section-0 goal. Secondary CTA: "Try the live demo — no sign-up".
   - One trust line: honest status + audience (e.g. "Early access · Built for independent restaurants & bars · Works on any phone").
   - Visual: a static, high-quality screenshot/poster of Today (desktop + phone). Load the live iframe only on click/hover ("Make it live ▸").
2. **Pain → "What Brigly replaces."** A strip showing the current stack — clipboards, the staff group chat, the scheduling app, the stock spreadsheet, separate POS, training binder — collapsing into Brigly. Short, visual, specific.
3. **The "aha": one action, everywhere.** Animate a single real scenario: *the kitchen 86s the sea bass →* stock updates → menu marks it off → POS stops selling it → servers see it in the briefing → the manager sees it on Today. This is the hero of the page; make it the most designed section. Second, smaller example: *a swap request* flowing crew → manager approval → schedule → labor cost.
4. **A shift, start to finish (replaces the 12-step showcase).** Group features into 4 chapters that mirror restaurant life, 2–4 features each, with one sentence each:
   - *Plan the week* — Schedule, Training, Team & pay
   - *Before service* — Today briefing, Opening checklists, Specials & events, Reservations
   - *During service* — POS, Menu & allergens, Stock & 86s, Alerts & team chat
   - *After service* — Closing checklists, Daily close, Reports
   Use tabs or a 4-step scroll; each chapter gets one screenshot and a "See it in the demo →" deep link (keep existing `demo.html?...` URLs).
5. **Managers run it. Crew live in it.** Keep this line. Two columns, 3 bullets each, outcome-led. Add an *Owners* line: the numbers are ready without a spreadsheet.
6. **Proof / credibility.** Use only what section 0 gives you. If none: a short founder note ("Why we're building Brigly") + "Built with restaurant teams — apply to be a pilot venue" + the live-demo stat (six months of real-shaped sample data, every screen on this page is the actual app).
7. **FAQ — objection handling.** Rewrite to answer, in this order: What does it cost / when can I use it? · Do I have to replace my POS? · What hardware do I need? · Does it work on the staff's own phones? · What about allergens (keep current answer)? · Is my data safe / where is it stored (be honest about preview status)? · How do manager and crew views fit together?
8. **Closing CTA.** Restate the promise in one line, primary CTA + demo CTA, with the dining-room photo.

Sticky mobile CTA: show the primary goal, not just the demo.

## 4. Copy rules

- Lead with outcomes, follow with features. Every headline should pass "so what?" for a busy GM.
- Use restaurant language the target market uses (86, covers, FOH/BOH, pre-shift, close-out) — but never internal product names a visitor can't decode.
- Final naming, used identically on page, nav, footer and meta: Today · Schedule (or Roster, per market) · Checklists · Stock & 86s · Menu & allergens · POS · Reservations · Specials & events · Team & pay · Training · Reports · Team chat.
- Headlines ≤ 8 words. Body sentences ≤ 20 words. No "seamless", "revolutionary", "all-in-one solution", "empower".
- One clear CTA verb per button; button text says what happens ("Join early access", "Try the demo — no sign-up").
- Write a new `<title>` (≤ 60 chars, includes "restaurant") and meta/OG description (≤ 155 chars, a sentence, not a list).

## 5. Design direction

- Keep the brand: Plus Jakarta Sans, the orange CTA, dark/light themes, existing logo.
- Bring warmth: use the photos in `assets/images/` (kitchen-service, bar-preparation, table-welcome, week-together, seasonal-menu) to set the scene per chapter; pair photo + product screenshot.
- One clear visual hierarchy per section: one headline, one visual, one action. Remove decorative repetition of device frames.
- The "one action, everywhere" section should feel like the signature moment — e.g. a central record with lines pulsing out to Stock, Menu, POS, Briefing, Today.
- Respect `prefers-reduced-motion`; animations are enhancements, content must read without them.
- Mobile first: check everything at 375px; no horizontal scroll; tap targets ≥ 44px.

## 6. Conversion & technical requirements

- Implement the primary CTA form/link from section 0 (if a waitlist: email + venue name + role + number of venues; Netlify form is fine since the site deploys on Netlify — see `netlify.toml`). Update `thanks.html` to a real confirmation that matches.
- Add UTM-safe, descriptive `data-cta` attributes on every CTA (e.g. `data-cta="hero-primary"`) so clicks can be measured later.
- Performance: no live iframes above the fold on load; lazy-load the rest on interaction or when scrolled into view, max one at a time. Target LCP < 2.5s on mobile. Serve screenshots as WebP with width/height set.
- Keep accessibility already present (skip link, aria labels, heading order). One H1.
- Run `npm run check` and `npm run build` when done; both must pass.

## 7. Deliverables

1. Updated `index.html`, `assets/css/site.css`, `assets/js/site.js`, `thanks.html`.
2. A short `COPY_DECK.md` listing every headline, subhead, CTA and FAQ answer in page order, plus the 5 hero headline options and why you picked one.
3. A summary of what changed and any claim you softened for honesty.

## 8. Self-check before finishing

- [ ] A stranger reading only the hero can say: what it is, who it's for, why it beats their current setup.
- [ ] The word restaurant (or bar/hospitality) is in the H1 or subhead.
- [ ] No more than 4 feature groups are presented; no "12 tools" framing.
- [ ] The 86 story is shown concretely, not described abstractly.
- [ ] Every CTA leads somewhere that captures intent or shows the demo; primary CTA appears in hero, mid-page and closing.
- [ ] Naming and spelling are consistent everywhere (page, nav, footer, meta).
- [ ] No invented testimonials, numbers, logos or integrations; preview status stated plainly once.
- [ ] Mobile at 375px looks intentional; no iframe loads above the fold before interaction.
- [ ] `npm run check` and `npm run build` pass.
