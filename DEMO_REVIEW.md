# Demo review — 2026-10-30

Implemented the issues found in the responsive, visual and workflow review of `demo.html`.

## Changes

- Restored fixed positioning and stacking for the mobile dock, dialogs and toast notifications. The chalkboard skin had inadvertently overridden all three.
- Removed page overflow at 320px. Corrected Stock filters, Menu setup, POS Orders, My file, Training duels and arena captions instead of hiding overflowing content globally. Floor plans and long tab strips retain intentional local scrolling.
- Defaulted tablets to the compact sidebar, retaining explicit saved menu preferences. Added accessible destination labels and hover titles to the compact navigation.
- Reflowed the small-phone header so the selected date and service have their own row. Fixed the shift picker, compact workspace menu, narrow reservation inputs and dialog close targets.
- Restored the shift hero as the first mobile Today card. Improved the Training progress card so the level, XP and streak remain readable.
- Added short chalk underline and task-completion animations. Motion respects the reduced-motion preference and headings do not replay their animation on ordinary state refreshes.
- Preserved keyboard focus after checklist completion and provided stable checkbox names. Completion and undo remain available without expanding completed lists automatically.
- Corrected forgotten-clock-out presentation: stale entries show a correction request instead of hundreds of supposedly worked hours. Managers can fix the original entry; crew see who to ask. Active punches no longer label a different selected shift as on the clock. Upcoming clock candidates sort by date and time.
- Kept browser-storage failure messages visible after a toast expires.
- Prevented clicks on dialog padding from accidentally dismissing the editor.
- Added mobile accessible names to New check and Add stock item. Simplified the role-channel heading in chat.
- Bumped demo asset versions and rebuilt `dist`.

## Verification

- `npm run check`: full suite passed, including scheduling, checklists, chat, purchasing, reports, management, payroll, training, reservations, menu and POS domain tests.
- Added payroll regression coverage for missed punches and clock/selected-shift isolation.
- Corrected an outdated Menu test to exercise crew counts on the existing 86 tab and verify that the count form opens.
- Re-ran payroll tests and static/syntax validation after the final related edits.
- `npm run build` and `git diff --check`: passed.
- Initial manager sweep: 11 destinations at 320, 375, 390, 760, 768, 1024, 1440 and 1920px.
- Final screen sweep: 88 manager/crew combinations at 320, 390, 768 and 1440px, with no document overflow or empty views.
- Final feature-tab sweep: 78 combinations across Stock, Menu, POS, Manage, Training and Reports at 320 and 1024px, with no document overflow or empty views. No browser console errors in that run.
- Reviewed both light and dark themes. Browser interactions verified checklist completion/undo, next-task focus, reservation creation with table assignment, mobile POS open/add/send/simulated-payment, chat layout, quick actions and shift/menu dialogs.

Raw final layout measurements and desktop/mobile screenshots are in `../demo-review/`.

## Scope

Browser checks used the in-app Chromium browser with controlled viewport sizes and isolated localhost demo storage. They do not certify every real device, Safari/Firefox behavior, hardware integrations or every possible combination of persisted data. The existing application remains a local demo; payments and external restaurant integrations are simulated.
