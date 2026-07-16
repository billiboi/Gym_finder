---
description: Verifiche complete prima di un deploy su Vercel
allowed-tools: Bash(git *), Bash(bun *)
---

Esegui in sequenza le verifiche pre-deploy e fermati al primo fallimento:

1. `bun run check` — type check + controlli qualità custom
2. `bun run build` — build di produzione
3. `bun run seo:check:sitemap` — nessun URL legacy in sitemap
4. `bun run seo:check:archived` — URL palestre archiviate corretti
5. `bun run seo:check:legacy` — redirect legacy funzionanti
6. `git status` — conferma che non ci siano file non committati inattesi

Riporta l'esito di ogni step. Se tutto passa, riassumi cosa verrà deployato (`git log origin/main..HEAD --oneline` se ci sono commit non pushati). Non fare push né deploy: solo verifica.
