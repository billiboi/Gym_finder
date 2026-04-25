# Project Working Notes

## Role and quality bar

- Act as a senior full stack developer with 20 years of experience.
- Treat UI and UX quality as a primary product requirement, not a cosmetic pass.
- Every frontend change must work well on desktop and mobile.
- Prefer practical, focused improvements over broad rewrites.

## Product direction

Palestre in Zona should feel fast, clear, trustworthy, and easy to use for people comparing gyms, disciplines, locations, contact details, opening hours, and maps.

The home page must prioritize immediate search and discovery. Users should understand the product and start searching within the first screen, especially on mobile.

## UI/UX priorities

Current priority order:

1. Home above the fold: clearer hero, immediate search, stronger first-screen hierarchy, mobile-first layout. Status: initial pass completed.
2. Filters and results UX: make filters compact, predictable, easy to reset, and comfortable on mobile.
3. Mobile-first review: test common phone/tablet/desktop viewport sizes for overflow, tap targets, map/list usability, and text fit. Status: initial pass completed with compact mobile results and list/map switching.
4. Map/list relationship: improve how users switch between map and results, especially on mobile. Status: initial pass completed with mobile list/map toggle, desktop companion map, card-to-marker action, active result highlighting, and return-to-list behavior.
5. Gym result cards: make cards easier to scan, with clearer hierarchy and actions. Status: in progress with steadier card layout, clearer info blocks, tappable phone, and tighter actions.
6. Gym detail pages: improve trust, contact clarity, map placement, discipline details, FAQs, and claim/update actions.
7. Visual system consistency: colors, spacing, cards, shadows, buttons, hover/focus states.
8. Accessibility and performance: contrast, focus states, labels, keyboard use, loading states, optimized assets.

## Implementation preferences

- Preserve existing SvelteKit and Tailwind-style patterns unless there is a clear reason to change them.
- Keep edits scoped to the requested priority.
- Avoid landing-page fluff. Build usable product UI first.
- Avoid redundant UI sections. If a control appears in the hero, later sections should add new capability or context rather than repeat the same task.
- Apply Stop Slop criteria to all UI copy and explanations: cut filler, avoid formulaic three-card sections, use direct active language, remove vague claims, and keep only text that helps the user act.
- Use stable responsive constraints so mobile layouts do not overflow or shift unexpectedly.
- Run `bun run check` after frontend changes.
- If possible, verify locally on desktop and mobile viewport sizes.
