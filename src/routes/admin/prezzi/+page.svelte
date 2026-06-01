<script>
  export let data;

  const decisionLabels = {
    review_target: 'Target da verificare',
    review_manuale: 'Review manuale',
    rimuovi_o_ricerca_fonte: 'Rimuovi o cerca fonte',
    review_pagina_prezzi: 'Pagina prezzi da verificare',
    nessuna_pagina_prezzi_trovata: 'Nessuna pagina trovata'
  };

  let tab = 'residui';
  let residualFilter = 'tutti';
  let candidateFilter = 'alta';

  $: residualRows = data.reviewReport.rows || [];
  $: filteredResidualRows = residualRows.filter((row) => {
    if (residualFilter === 'tutti') return true;
    return row.decisione_consigliata === residualFilter || row.action === residualFilter;
  });

  $: candidateRows = data.enrichmentReport.rows || [];
  $: filteredCandidateRows = candidateRows.filter((row) => {
    if (candidateFilter === 'tutti') return true;
    if (candidateFilter === 'alta') return Number(row.priority_score || 0) >= 80;
    if (candidateFilter === 'review') return Boolean(row.needs_review);
    return true;
  });

  $: discoveryRows = data.discoveryReport.rows || [];

  function formatDate(value) {
    if (!value) return 'Report non disponibile';
    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  function labelDecision(value) {
    return decisionLabels[value] || value || 'Da valutare';
  }

  function splitUrls(value) {
    return String(value || '')
      .split('|')
      .map((url) => url.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  function compactUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.pathname === '/' ? parsed.hostname : parsed.pathname;
    } catch {
      return url;
    }
  }

  function riskClass(risk) {
    if (risk === 'high') return 'border-rose-200 bg-rose-50 text-rose-800';
    if (risk === 'medium') return 'border-amber-200 bg-amber-50 text-amber-800';
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Admin prezzi</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Review prezzi</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Coda operativa per chiudere i residui prezzo e scegliere le prossime schede da arricchire con fonti ufficiali.
          Questa vista legge i report locali e non modifica il database.
        </p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p><strong>{data.priceStats.withPrice}</strong> schede con prezzo live</p>
        <p>{data.priceStats.withoutPrice} senza prezzo su {data.priceStats.activeGyms} attive</p>
      </div>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Residui</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.reviewReport.summary.total || residualRows.length}</p>
        <p class="mt-1 break-all text-sm text-slate-600">{data.reviewReport.filename || 'Nessun report generato'}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Candidati</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.enrichmentReport.summary.without_price_with_own_website || candidateRows.length}</p>
        <p class="mt-1 text-sm text-slate-600">{data.enrichmentReport.summary.high_priority || 0} ad alta priorità</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Discovery</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.discoveryReport.summary.selected || discoveryRows.length}</p>
        <p class="mt-1 text-sm text-slate-600">{data.discoveryReport.summary.found_price_page || 0} pagine prezzo trovate</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Aggiornato</p>
        <p class="mt-2 text-base font-bold text-slate-900">{formatDate(data.reviewReport.generatedAt)}</p>
        <p class="mt-1 text-sm text-slate-600">Ultima coda residui disponibile</p>
      </div>
    </div>
  </section>

  <section class="mt-5 rounded-3xl border border-white/80 bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:p-5">
    <div class="flex flex-wrap gap-2" aria-label="Sezioni review prezzi">
      <button
        type="button"
        class:sc-ui-pill--primary={tab === 'residui'}
        class="sc-ui-pill px-3.5 py-2 text-sm"
        on:click={() => (tab = 'residui')}
      >
        Residui
      </button>
      <button
        type="button"
        class:sc-ui-pill--primary={tab === 'candidati'}
        class="sc-ui-pill px-3.5 py-2 text-sm"
        on:click={() => (tab = 'candidati')}
      >
        Candidati enrichment
      </button>
      <button
        type="button"
        class:sc-ui-pill--primary={tab === 'discovery'}
        class="sc-ui-pill px-3.5 py-2 text-sm"
        on:click={() => (tab = 'discovery')}
      >
        Discovery fonti
      </button>
    </div>

    {#if tab === 'residui'}
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          {#each ['tutti', 'review_target', 'review_manuale', 'rimuovi_o_ricerca_fonte'] as filter}
            <button
              type="button"
              class="rounded-lg border px-3 py-1.5 text-sm font-semibold transition"
              class:border-slate-900={residualFilter === filter}
              class:bg-slate-900={residualFilter === filter}
              class:text-white={residualFilter === filter}
              class:border-slate-200={residualFilter !== filter}
              class:bg-white={residualFilter !== filter}
              class:text-slate-700={residualFilter !== filter}
              on:click={() => (residualFilter = filter)}
            >
              {filter === 'tutti' ? 'Tutti' : labelDecision(filter)}
            </button>
          {/each}
        </div>
        <p class="text-sm text-slate-600">{filteredResidualRows.length} casi</p>
      </div>

      <div class="mt-4 grid gap-3">
        {#each filteredResidualRows as row}
          <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="grid gap-4 lg:grid-cols-[1.15fr_1fr_0.8fr]">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-base font-bold text-slate-900">{row.source_nome}</h2>
                  <span class={`rounded-full border px-2 py-0.5 text-xs font-bold ${riskClass(row.risk)}`}>{row.risk || 'review'}</span>
                </div>
                <p class="mt-1 text-sm text-slate-600">{row.source_citta} · {row.source_indirizzo || 'indirizzo assente'}</p>
                <p class="mt-3 text-sm leading-6 text-slate-800">{row.price_info}</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <a href={`/admin/gyms/${row.source_id}`} class="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">Apri sorgente</a>
                  {#if row.price_source_url}
                    <a href={row.price_source_url} target="_blank" rel="noreferrer" class="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">Fonte prezzo</a>
                  {/if}
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Destinazione suggerita</p>
                {#if row.target_id}
                  <h3 class="mt-2 font-bold text-slate-900">{row.target_nome}</h3>
                  <p class="mt-1 text-sm text-slate-600">{row.target_citta} · {row.target_indirizzo || 'indirizzo assente'}</p>
                  <a href={`/admin/gyms/${row.target_id}`} class="mt-3 inline-flex rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">Apri target</a>
                {:else}
                  <p class="mt-2 text-sm text-slate-600">Nessun target abbastanza chiaro.</p>
                {/if}
              </div>

              <div>
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Decisione</p>
                <p class="mt-2 text-sm font-bold text-slate-900">{labelDecision(row.decisione_consigliata)}</p>
                <p class="mt-2 text-sm leading-6 text-slate-600">{row.motivo_decisione || row.motivo_preview}</p>
              </div>
            </div>
          </article>
        {:else}
          <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Nessun residuo in questo filtro.</div>
        {/each}
      </div>
    {/if}

    {#if tab === 'candidati'}
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          {#each ['alta', 'review', 'tutti'] as filter}
            <button
              type="button"
              class="rounded-lg border px-3 py-1.5 text-sm font-semibold transition"
              class:border-slate-900={candidateFilter === filter}
              class:bg-slate-900={candidateFilter === filter}
              class:text-white={candidateFilter === filter}
              class:border-slate-200={candidateFilter !== filter}
              class:bg-white={candidateFilter !== filter}
              class:text-slate-700={candidateFilter !== filter}
              on:click={() => (candidateFilter = filter)}
            >
              {filter === 'alta' ? 'Alta priorità' : filter === 'review' ? 'Da review' : 'Tutti'}
            </button>
          {/each}
        </div>
        <p class="text-sm text-slate-600">{filteredCandidateRows.length} candidate mostrate</p>
      </div>

      <div class="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="hidden border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:grid md:grid-cols-[0.55fr_1.2fr_0.9fr_1.4fr]">
          <span>Score</span>
          <span>Scheda</span>
          <span>Sito</span>
          <span>URL da controllare</span>
        </div>
        {#each filteredCandidateRows as row}
          <article class="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 md:grid-cols-[0.55fr_1.2fr_0.9fr_1.4fr] md:items-start">
            <div>
              <span class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-sm font-bold text-emerald-800">{row.priority_score}</span>
            </div>
            <div>
              <h2 class="font-bold text-slate-900">{row.nome}</h2>
              <p class="mt-1 text-sm text-slate-600">{row.citta} · {row.disciplina}</p>
              <a href={`/admin/gyms/${row.id}`} class="mt-2 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900">Apri scheda</a>
            </div>
            <div class="break-words text-sm text-slate-700">
              {#if row.website}
                <a href={row.website} target="_blank" rel="noreferrer" class="font-semibold text-slate-900 hover:text-blue-800">{row.website_host || row.website}</a>
              {:else}
                Sito assente
              {/if}
            </div>
            <div class="flex flex-wrap gap-2">
              {#each splitUrls(row.suggested_price_urls) as url}
                <a href={url} target="_blank" rel="noreferrer" class="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">{compactUrl(url)}</a>
              {/each}
            </div>
          </article>
        {/each}
      </div>
    {/if}

    {#if tab === 'discovery'}
      <div class="mt-4 grid gap-3">
        {#each discoveryRows as row}
          <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="font-bold text-slate-900">{row.nome}</h2>
                  <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700">score {row.score || 0}</span>
                </div>
                <p class="mt-1 text-sm text-slate-600">{row.citta} · {row.disciplina}</p>
                {#if row.candidate_url}
                  <a href={row.candidate_url} target="_blank" rel="noreferrer" class="mt-2 inline-flex break-all text-sm font-semibold text-blue-700 hover:text-blue-900">{row.candidate_url}</a>
                {:else}
                  <p class="mt-2 text-sm text-slate-500">Nessuna pagina prezzo trovata nel mini-crawl.</p>
                {/if}
                {#if row.snippet}
                  <p class="mt-3 text-sm leading-6 text-slate-700">{row.snippet}</p>
                {/if}
              </div>
              <div class="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p class="font-bold text-slate-900">{labelDecision(row.decisione_consigliata)}</p>
                <p class="mt-1">Importo: {row.has_amount ? 'presente' : 'assente'}</p>
                <p>Segnale prezzo: {row.has_price_signal ? 'sì' : 'no'}</p>
              </div>
            </div>
          </article>
        {:else}
          <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Nessun report discovery disponibile.</div>
        {/each}
      </div>
    {/if}
  </section>
</main>
