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
5. Gym result cards: make cards easier to scan, with clearer hierarchy and actions. Status: in progress with steadier card layout, clearer scan row for status/distance/city, structured info blocks, full visible hours, tappable phone, tighter actions, less duplicate labeling, and stronger selected-card state.
6. Gym detail pages: improve trust, contact clarity, map placement, discipline details, FAQs, and claim/update actions. Status: initial pass completed with admin-authored FAQs reconnected to the public page, open/closed status pill and unverified-badge parity with home cards, a real-info website card, a larger full-width map next to the address, consistent discipline chip styling, and a mobile-reordered claim CTA.
7. Visual system consistency: colors, spacing, cards, shadows, buttons, hover/focus states. Status: initial pass completed — `.sc-button` now bakes in a consistent radius, off-brand Premium badge color and classless/redundant buttons fixed across zone/discipline/chi-siamo/rivendica-scheda/dashboard-proprietario, gym-card hover lift unified, and the 3 lead-gen forms now share the same input focus treatment as the home search fields.
8. Accessibility and performance: contrast, focus states, labels, keyboard use, loading states, optimized assets. Status: initial pass completed — fixed a real AA contrast failure, focus-visible on the rivendica-scheda reason cards, an invalid `aria-controls` reference and a label-in-name mismatch on the mobile menu button, gym-card heading levels, loading announcements on "Carica altre schede", and eager-loading for the first row of grid images. Two bigger, infrastructure-level asset issues (admin image uploads stored as base64 `data:` URIs on Vercel, no responsive image/CDN pipeline) were identified but deliberately left open — they need an explicit decision, not just a UI pass.

## Implementation preferences

- Preserve existing SvelteKit and Tailwind-style patterns unless there is a clear reason to change them.
- Keep edits scoped to the requested priority.
- UI work must never touch production data, Supabase tables, dataset files, import/export scripts, sync scripts, or admin data flows unless the user explicitly asks for a data change in that same request.
- Treat the manually reviewed Supabase gym catalog as production data and as the source of truth. Never overwrite it from local JSON/CSV files as part of UI, UX, SEO, accessibility, or performance work.
- Before any data-changing operation against Supabase or production-like data, create a local export first, verify the export record count, state the before/after counts, and get explicit confirmation for the exact destructive action.
- Never run a `DELETE` + bulk `INSERT` replacement on production data as a convenience path. If a full replacement is truly required, it needs a named local backup, a reviewed source file, a dry run, explicit confirmation, and a post-restore verification.
- Keep local backups of production data out of git, but do create them before touching data. Backup filenames must include the data source and timestamp.
- If the task is UI-only and a data issue appears, stop and report it instead of trying to "fix" data opportunistically.
- Avoid landing-page fluff. Build usable product UI first.
- Avoid redundant UI sections. If a control appears in the hero, later sections should add new capability or context rather than repeat the same task.
- Apply Stop Slop criteria to all UI copy and explanations: cut filler, avoid formulaic three-card sections, use direct active language, remove vague claims, and keep only text that helps the user act.
- Use stable responsive constraints so mobile layouts do not overflow or shift unexpectedly.
- Run `bun run check` after frontend changes.
- If possible, verify locally on desktop and mobile viewport sizes.
