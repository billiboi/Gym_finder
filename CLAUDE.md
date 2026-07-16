# CLAUDE.md

Palestre in Zona (palestreinzona.it) — directory pubblica mobile-first di palestre e discipline sportive in Italia.

@AGENTS.md

## Stack

SvelteKit 2 + Svelte 5 (runes), Tailwind CSS 4, Vite 7, runtime **Bun** (non npm/node), Supabase (Postgres), deploy su Vercel (`@sveltejs/adapter-vercel`). JavaScript con `jsconfig.json`, non TypeScript (i `.ts` esistono solo in `scripts/`).

## Comandi

```bash
bun install          # dipendenze
bun run dev          # dev server
bun run check        # OBBLIGATORIO dopo ogni modifica frontend: custom checks + svelte-check
bun run build        # build produzione
bun run preview      # preview build
```

`bun run check` include anche controlli custom: asset stock, copy slop, mojibake, qualità dati. Gli altri script in `package.json` (enrichment:*, prices:*, descriptions:*, seo:*, sync:*) toccano dati Supabase: non eseguirli senza richiesta esplicita dell'utente.

## Architettura

- `src/routes/+page.svelte` — pagina di ricerca/discovery pubblica
- `src/routes/palestre/[slug]/` — dettaglio palestra
- `src/routes/zone/`, `src/routes/discipline/`, `src/routes/guide/` — landing SEO
- `src/routes/admin/` — area admin (auth in `src/lib/server/admin-auth.js`)
- `src/routes/api/` — endpoint JSON (`gyms`, `disciplines`, `ping`)
- `src/routes/sitemap.xml/`, `robots.txt/` — SEO server endpoints
- `src/lib/server/` — accesso dati: `gym-store.js` (Supabase), `static-gyms.js` (fallback locale), `claim-request-store.js`, `admin-audit-store.js`
- `src/lib/` — logica condivisa: normalizzazione gym, tassonomia discipline, SEO meta, orari, sanitizzazione dati pubblici
- `supabase/migrations/` — migrazioni versionate
- `scripts/` — import/export/verifica/enrichment (vedi `scripts/README.md`)
- `data/` — dataset locali e backup (fallback, NON fonte di verità)
- `docs/OPERATIONS.md` — checklist operazioni produzione

## Dati e sicurezza (critico)

La tabella Supabase `public.gyms` è la fonte di verità, revisionata manualmente. Regole complete in AGENTS.md (importato sopra). In sintesi: mai sovrascriverla da file locali, mai DELETE+INSERT di massa, sempre export + conteggio righe + conferma esplicita prima di modifiche dati. Se un task UI rivela un problema dati: fermarsi e segnalare.

`SUPABASE_SERVICE_ROLE_KEY` è server-only. I file `.env*` non vanno mai letti, loggati o committati.

## Ambiente

Sviluppo su Windows. Node portatile in `.tools/` (ignorarlo: non è parte dell'app). Env files usati dagli script: `.env.staging.local`, `.env.vercel.production.check`, `.env.vercel.local`.

## Lingua

UI, copy e contenuti sono in italiano. Applicare i criteri "Stop Slop" di AGENTS.md a tutto il copy.
