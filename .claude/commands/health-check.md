---
description: Stato di salute del progetto dopo un periodo di inattività
allowed-tools: Bash(git *), Bash(bun *)
---

Esegui un health check completo del progetto e riporta un riepilogo sintetico:

1. `git status` e `git log --oneline -15` — modifiche non committate e ultimi lavori
2. `git fetch && git status` — divergenze dal remoto
3. `bun install` — dipendenze allineate al lockfile
4. `bun run check` — svelte-check + controlli custom (stock, copy, mojibake, dati)
5. `bun run build` — la build passa?

Per ogni step riporta OK/FALLITO. Se qualcosa fallisce, elenca gli errori raggruppati per causa probabile e proponi un piano di fix in ordine di priorità, ma NON applicare fix senza conferma. Non toccare dati Supabase né script sync/apply.
