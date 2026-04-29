# Gym enrichment workflow

Goal: turn official gym websites into reviewed, unique public content for every eligible gym card.

## Source priority

1. Existing `website` field when it points to the official club/site.
2. A more specific official club page discovered from that site.
3. Official social profile only when the website clearly links to it.
4. Trusted third-party source only when official sources are unavailable and the record is marked for manual review.

## Fields

The enrichment model is stored on `public.gyms`:

- `official_source_url`
- `editorial_summary`
- `editorial_highlights`
- `editorial_faq_items`
- `enrichment_status`
- `enrichment_notes`
- `enrichment_updated_at`

Related enrichment fields:

- `social_links`
- `price_info`
- `price_source_url`
- `price_updated_at`
- `data_verified_at`

## Review states

- `pending`: has not been processed.
- `drafted`: candidate content exists but needs review.
- `reviewed`: approved content exists.
- `published`: approved content is visible in production.
- `skipped`: official source is missing, broken, ambiguous, or unsuitable.

## Batch process

1. Generate a read-only report:

```bash
bun scripts/report-gym-content-enrichment.mjs --env-file=.env.vercel.production.check
```

2. Pick a small batch, ideally 10-25 gyms.
3. Visit official sources and draft:
   - one concise summary
   - 3-4 unique highlights
   - 3-4 FAQ items
   - price and social links only when explicitly visible
4. Save candidates outside production first.
5. Review manually.
6. Export Supabase before writing.
7. Write only approved fields.
8. Verify row count and sample pages.

## Quality bar

- Do not invent services, prices, schedules, or claims.
- Avoid generic SEO filler.
- Prefer concrete details: training formats, membership terms, facility type, opening model, target audience, official contact paths.
- Keep source URLs attached to reviewed content.
