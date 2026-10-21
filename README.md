# Brigly Website & Interactive Workspace Preview

Static marketing website (`index.html`) and interconnected browser-local restaurant workspace demo (`demo.html`) for **Brigly** ("Calm operations for modern hospitality").

## BrandKit Alignment

All styling, typography, and copy follow `../BrandKit/`:
- **Color Palette**: Charcoal `#0F1412`, Brigly Orange `#FF6B3D` (always paired with `#0F1412` text for 6.6:1 contrast), Warm Ivory `#F6F4EF`, Sage Green `#8A9A7B`, Slate `#4A5562`, Warm Gray `#D9D4C9`.
- **Typography**: Locally served `Plus Jakarta Sans` (`assets/fonts/plus-jakarta-sans.ttf`, weights 400–800) with zero external font requests.
- **Guardrails**: Registration remains closed (`index.html` contains no `<form>` element), all sample restaurant data for *The Copper Room* stays in browser `localStorage`, and allergen/safety verification guardrails are preserved.

## Project Structure

- `index.html` — Marketing homepage featuring interactive scrollytelling (`#one-shift`), a live **Team Member ↔ Manager** homepage Core preview (`#core-workspace`), shift planning, connected directions, and Brigly Intelligence concepts.
- `demo.html` — Full 9-module interactive restaurant workspace (*The Copper Room*) with distinct setups, navigation priorities, and workflows for **Team Member (`Alex Morgan · Server & Bar`)** and **Manager (`Jamie Chen · General Manager`)**.
- `privacy.html`, `terms.html`, `thanks.html`, `404.html` — Preview legal and utility pages.
- `assets/css/site.css` — Unified stylesheet for `index.html` and legal pages.
- `assets/css/demo.css` — Unified desktop and native-like mobile stylesheet for `demo.html`.
- `assets/js/site.js` — Homepage interactivity, scroll progress, parallax, staggered reveals, and dual-role Core preview.
- `assets/js/demo.js` — Interconnected state machine and renderer for all 9 workspace modules (`dashboard`, `briefings`, `checklists`, `shifts`, `chat`, `knowledge`, `supply`, `academy`, `inbox`).

## Local Verification & Build

Requires Node 20+ (zero external `npm` dependencies):

```powershell
npm run check
npm test
npm run build
npm run preview
```
"# Brigly" 
