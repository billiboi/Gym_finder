<script>
  export let data;
  export let form;

  const decisionLabels = {
    review_target: 'Target da verificare',
    review_manuale: 'Review manuale',
    rimuovi_o_ricerca_fonte: 'Rimuovi o cerca fonte',
    review_pagina_prezzi: 'Pagina prezzi da verificare',
    nessuna_pagina_prezzi_trovata: 'Nessuna pagina trovata',
    review_prezzo_estratto: 'Prezzo estratto da rivedere',
    nessun_prezzo_estratto: 'Nessun prezzo estratto',
    review_contenuti_estratti: 'Contenuti estratti da rivedere',
    nessun_contenuto_estratto: 'Nessun contenuto estratto'
  };

  let tab = data.reviewReport.hasReport ? 'residui' : 'candidati';
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

  $: activePreviewReport = form?.previewReport || data.discoveryReport;
  $: discoveryRows = activePreviewReport.rows || [];

  function formatDate(value) {
    if (!value) return 'Calcolato dal database live';
    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  function labelDecision(value) {
    return decisionLabels[value] || value || 'Da valutare';
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
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Admin enrichment</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Review contenuti scheda</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Coda operativa per arricchire ogni scheda con informazioni specifiche dal sito ufficiale: editoriale, prezzi, abbonamenti, corsi, orari e contatti.
          Le preview sono generate in dry-run e questa pagina non modifica il database.
        </p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p><strong>{data.priceStats.activeGyms}</strong> schede attive</p>
        <p>{data.priceStats.withoutPrice} senza prezzo · {data.priceStats.withoutDescription} senza descrizione</p>
      </div>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Residui prezzo</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.reviewReport.summary.total || residualRows.length}</p>
        <p class="mt-1 break-all text-sm text-slate-600">{data.reviewReport.filename || 'Report locale assente'}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Candidati contenuto</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.enrichmentReport.summary.content_candidates || candidateRows.length}</p>
        <p class="mt-1 text-sm text-slate-600">{data.enrichmentReport.summary.high_priority || 0} ad alta priorità</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Preview</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{activePreviewReport.summary.selected || discoveryRows.length}</p>
        <p class="mt-1 text-sm text-slate-600">{activePreviewReport.summary.extracted || 0} schede con evidenze</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Aggiornato</p>
        <p class="mt-2 text-base font-bold text-slate-900">{formatDate(data.reviewReport.generatedAt)}</p>
        <p class="mt-1 text-sm text-slate-600">{data.reviewReport.hasReport ? 'Ultima coda residui disponibile' : 'Candidati calcolati live'}</p>
      </div>
    </div>
  </section>

  <section class="mt-5 rounded-3xl border border-white/80 bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:p-5">
    <form method="POST" action="?/generatePreview" class="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-bold text-slate-900">Genera preview automatica</p>
        <p class="text-sm text-slate-600">Fa scraping dei siti ufficiali e mostra qui le evidenze estratte. Nessuna modifica al database.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <label class="text-sm font-semibold text-slate-700" for="limit">Schede</label>
        <input
          id="limit"
          name="limit"
          type="number"
          min="1"
          max="40"
          value="20"
          class="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
        />
        <button type="submit" class="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-900">
          Genera preview
        </button>
      </div>
    </form>

    {#if form?.previewReport}
      <div class="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        Preview generata ora: {form.previewReport.summary.extracted} schede con evidenze su {form.previewReport.summary.selected}.
      </div>
    {/if}

    {#if form?.message}
      <div class="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
        {form.message}
      </div>
    {/if}

    {#if form?.error}
      <div class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
        {form.error}
      </div>
    {/if}

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
        Candidati
      </button>
      <button
        type="button"
        class:sc-ui-pill--primary={tab === 'discovery'}
        class="sc-ui-pill px-3.5 py-2 text-sm"
        on:click={() => (tab = 'discovery')}
      >
        Preview estratte
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
          <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            {data.reviewReport.hasReport ? 'Nessun residuo in questo filtro.' : 'Il report residui non è disponibile in deploy. Usa la sezione Candidati enrichment per lavorare sulle schede senza prezzo.'}
          </div>
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
        <p class="text-sm text-slate-600">
          {filteredCandidateRows.length} candidate mostrate
          {#if !data.enrichmentReport.hasReport}
            · calcolate dal database live
          {/if}
        </p>
      </div>

      <div class="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="hidden border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:grid md:grid-cols-[0.55fr_1.2fr_0.9fr_1fr]">
          <span>Score</span>
          <span>Scheda</span>
          <span>Sito ufficiale</span>
          <span>Prossimo passo</span>
        </div>
        {#each filteredCandidateRows as row}
          <article class="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 md:grid-cols-[0.55fr_1.2fr_0.9fr_1fr] md:items-start">
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
            <div class="text-sm leading-6 text-slate-700">
              <p>Genera preview automatiche con <code>bun run content:enrich:dry -- --limit=40</code>. Il crawler segue link interni reali e separa prezzi, corsi, orari, contatti ed evidenze editoriali.</p>
              {#if row.website}
                <a href={row.website} target="_blank" rel="noreferrer" class="mt-2 inline-flex rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">Apri sito</a>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}

    {#if tab === 'discovery'}
      <form method="POST" action="?/applySelected" class="mt-4 grid gap-3">
        {#if discoveryRows.length}
          <div class="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p>
                Seleziona solo righe coerenti. L’apply scrive solo sulla stessa scheda e non sovrascrive prezzo, orari o descrizioni già valorizzate/verificate.
              </p>
              <div class="flex flex-wrap items-center gap-2">
                <label class="text-sm font-bold" for="confirm_text">Conferma</label>
                <input
                  id="confirm_text"
                  name="confirm_text"
                  placeholder="APPLICA"
                  class="w-28 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                />
                <button type="submit" class="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-900">
                  Applica selezionati
                </button>
              </div>
            </div>
          </div>
        {/if}

        {#each discoveryRows as row}
          <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  {#if row.extracted_topics}
                    <label class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700">
                      <input type="checkbox" name="selected_rows" value={JSON.stringify(row)} class="h-4 w-4 accent-emerald-800" />
                      Applica
                    </label>
                  {/if}
                  <h2 class="font-bold text-slate-900">{row.nome}</h2>
                  <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700">score {row.score || 0}</span>
                </div>
                <p class="mt-1 text-sm text-slate-600">{row.citta} · {row.disciplina}</p>
                {#if row.source_url}
                  <a href={row.source_url} target="_blank" rel="noreferrer" class="mt-2 inline-flex break-all text-sm font-semibold text-blue-700 hover:text-blue-900">{row.source_url}</a>
                {:else}
                  <p class="mt-2 text-sm text-slate-500">Nessun contenuto utile estratto dal sito.</p>
                {/if}
                {#if row.proposed_price_info || row.proposed_editorial_evidence || row.proposed_courses_info || row.proposed_hours_info}
                  <div class="mt-3 grid gap-2">
                    {#if row.proposed_price_info}
                      <p class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800"><strong>Prezzi/abbonamenti:</strong> {row.proposed_price_info}</p>
                    {/if}
                    {#if row.proposed_courses_info}
                      <p class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800"><strong>Corsi/discipline:</strong> {row.proposed_courses_info}</p>
                    {/if}
                    {#if row.proposed_hours_info}
                      <p class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800"><strong>Orari:</strong> {row.proposed_hours_info}</p>
                    {/if}
                    {#if row.proposed_contact_info}
                      <p class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800"><strong>Contatti/sede:</strong> {row.proposed_contact_info}</p>
                    {/if}
                    {#if row.proposed_editorial_evidence}
                      <p class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800"><strong>Evidenza editoriale:</strong> {row.proposed_editorial_evidence}</p>
                    {/if}
                  </div>
                {:else if row.source_snippet}
                  <p class="mt-3 text-sm leading-6 text-slate-700">{row.source_snippet}</p>
                {/if}
              </div>
              <div class="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p class="font-bold text-slate-900">{labelDecision(row.decisione_consigliata)}</p>
                <p class="mt-1">Topic: {row.extracted_topics || 'assenti'}</p>
                <p>Importi: {row.extracted_amounts || 'assenti'}</p>
                <p>Rischio: {row.risk || 'review'}</p>
              </div>
            </div>
          </article>
        {:else}
          <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Nessuna preview automatica disponibile. Esegui <code>bun run content:enrich:dry -- --limit=40</code> per generare proposte da review.
          </div>
        {/each}
      </form>
    {/if}
  </section>
</main>
