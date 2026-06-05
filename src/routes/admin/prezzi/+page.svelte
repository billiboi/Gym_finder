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
  let editorialDecisions = {};

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
  $: previewRows = discoveryRows.length ? discoveryRows : candidateRows.filter((row) => row.editorial_preview?.descrizione_breve).slice(0, 50);
  $: previewUsesOfficialSource = discoveryRows.length > 0;
  $: if (form?.previewReport && tab !== 'discovery') tab = 'discovery';

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

  function sectionEntries(sections) {
    return Object.entries(sections || {}).filter(([, section]) => section?.text);
  }

  function factEntries(facts) {
    return Object.entries(facts || {}).filter(([key, items]) => key !== 'warnings' && Array.isArray(items) && items.length);
  }

  function factLabel(key) {
    return (
      {
        phones_found: 'Telefoni',
        emails_found: 'Email',
        addresses_found: 'Indirizzi',
        disciplines_found: 'Discipline',
        schedules_found: 'Orari',
        prices_found: 'Prezzi',
        people_found: 'Persone',
        organization_history: 'Storia organizzazione',
        source_highlights: 'Evidenze fonte',
        contacts: 'Contatti',
        addresses: 'Indirizzi',
        courses: 'Corsi e discipline',
        schedules: 'Orari',
        prices: 'Prezzi',
        about: 'Chi siamo',
        social_links: 'Social',
        images: 'Immagini',
        schema_org: 'Schema.org'
      }[key] || key
    );
  }

  function sectionLabel(key) {
    return (
      {
        chi_siamo: 'Chi siamo',
        storia: 'Storia',
        corsi: 'Corsi',
        discipline: 'Discipline',
        orari: 'Orari',
        prezzi: 'Prezzi',
        contatti: 'Contatti',
        indirizzo: 'Indirizzo',
        staff: 'Staff',
        eventi: 'Eventi',
        note: 'Note',
        tel: 'Telefono link',
        mailto: 'Email link',
        testo: 'Testo pagina',
        table: 'Tabella',
        corsi_discipline: 'Corsi/discipline',
        iframe_google_maps: 'Google Maps',
        open_graph: 'Open Graph',
        schema_org: 'Schema.org',
        social_link: 'Social',
        immagine: 'Immagine'
      }[key] || key
    );
  }

  function reconciliationRows(row) {
    return row.reconciliation?.rows || [];
  }

  function editorialPreview(row) {
    return row.editorial_preview || {};
  }

  function levelClass(level) {
    if (level === 'A') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    if (level === 'B') return 'border-amber-200 bg-amber-50 text-amber-900';
    return 'border-slate-200 bg-slate-100 text-slate-800';
  }

  function reviewBadge(preview, row) {
    if (row.reconciliation?.conflicts?.length) return 'conflitti: non pubblicare';
    if (preview.needs_review) return 'richiede controllo manuale';
    if (preview.livello === 'A') return 'pronto per revisione';
    if (preview.livello === 'B') return 'buono, controllare dettagli';
    return 'fallback sicuro';
  }

  function setEditorialDecision(row, decision) {
    editorialDecisions = { ...editorialDecisions, [row.id || row.slug || row.nome]: decision };
  }

  function previewPayload(row) {
    return JSON.stringify({
      id: row.id,
      slug: row.slug,
      nome: row.nome,
      website: row.website,
      source_url: row.source_url,
      reconciliation: {
        conflicts: row.reconciliation?.conflicts || []
      },
      editorial_preview: editorialPreview(row)
    });
  }

  async function copyText(value) {
    const text = String(value || '').trim();
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
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
        <p class="mt-2 text-3xl font-bold text-slate-900">{activePreviewReport.summary.selected || previewRows.length}</p>
        <p class="mt-1 text-sm text-slate-600">{activePreviewReport.summary.extracted || (previewUsesOfficialSource ? 0 : 'fallback sicuri')}</p>
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

    {#if form?.editorialPublished}
      <div class="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
        <p class="font-bold">{form.editorialPublished.message}</p>
        <p class="mt-1">{form.editorialPublished.nome} aggiornata in produzione.</p>
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
      <div class="mt-4 grid gap-3">
        {#if !previewUsesOfficialSource && previewRows.length}
          <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p class="font-bold">Preview editoriali fallback</p>
            <p class="mt-1">Queste anteprime usano solo i dati gia presenti in scheda. Premi “Genera preview” per ottenere riconciliazione, fonte ufficiale, fatti estratti e proposta editoriale completa.</p>
          </div>
        {/if}
        {#each previewRows as row}
          <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="font-bold text-slate-900">{row.nome}</h2>
                  <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700">score {row.score || 0}</span>
                </div>
                <p class="mt-1 text-sm text-slate-600">{row.citta} · {row.disciplina}</p>
                {#if row.source_url}
                  <a href={row.source_url} target="_blank" rel="noreferrer" class="mt-2 inline-flex break-all text-sm font-semibold text-blue-700 hover:text-blue-900">{row.source_url}</a>
                {:else if row.preview_mode === 'solo_dati_scheda'}
                  <p class="mt-2 text-sm font-semibold text-amber-800">Preview fallback: fonte ufficiale non ancora analizzata in questa pagina.</p>
                {:else}
                  <p class="mt-2 text-sm text-slate-500">Nessun contenuto utile estratto dal sito.</p>
                {/if}
                {#if editorialPreview(row).descrizione_breve || row.proposed_price_info || row.proposed_editorial_evidence || row.proposed_courses_info || row.proposed_hours_info}
                  <div class="mt-3 grid gap-2">
                    {#if editorialPreview(row).descrizione_breve}
                      <div class="rounded-2xl border border-emerald-200 bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">
                        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p class="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Anteprima editoriale proposta</p>
                            <h3 class="mt-1 text-lg font-bold text-slate-950">{row.nome}</h3>
                          </div>
                          <div class="flex flex-wrap gap-2">
                            <span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${levelClass(editorialPreview(row).livello)}`}>
                              Livello {editorialPreview(row).livello || 'C'}: {editorialPreview(row).livello_label || 'fallback sicuro'}
                            </span>
                            <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                              quality score {editorialPreview(row).quality_score || 0}
                            </span>
                            <span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${row.reconciliation?.conflicts?.length || editorialPreview(row).needs_review ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                              {reviewBadge(editorialPreview(row), row)}
                            </span>
                          </div>
                        </div>

                        <div class="mt-4 grid gap-3 lg:grid-cols-2">
                          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p class="font-bold text-slate-950">Descrizione breve proposta</p>
                            <p class="mt-2">{editorialPreview(row).descrizione_breve}</p>
                          </div>
                          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p class="font-bold text-slate-950">Descrizione lunga proposta</p>
                            <p class="mt-2">{editorialPreview(row).descrizione_lunga}</p>
                          </div>
                        </div>

                        {#if editorialPreview(row).faq?.length}
                          <div class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p class="font-bold text-slate-950">FAQ proposte</p>
                            <div class="mt-2 grid gap-2">
                              {#each editorialPreview(row).faq as faq}
                                <div>
                                  <p class="font-semibold text-slate-900">{faq.question}</p>
                                  <p class="text-slate-700">{faq.answer}</p>
                                </div>
                              {/each}
                            </div>
                          </div>
                        {/if}

                        <div class="mt-3 grid gap-3 lg:grid-cols-2">
                          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p class="font-bold text-slate-950">Dati usati</p>
                            {#if editorialPreview(row).used_facts?.length}
                              <ul class="mt-2 space-y-1">
                                {#each editorialPreview(row).used_facts as fact}
                                  <li><strong>{fact.label}:</strong> {fact.value} <span class="text-xs text-slate-500">({fact.status}, {fact.confidence})</span></li>
                                {/each}
                              </ul>
                            {:else}
                              <p class="mt-2 text-slate-600">Nessun dato sicuro disponibile.</p>
                            {/if}
                          </div>
                          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p class="font-bold text-slate-950">Dati esclusi</p>
                            {#if editorialPreview(row).excluded_facts?.length}
                              <ul class="mt-2 space-y-1">
                                {#each editorialPreview(row).excluded_facts as fact}
                                  <li><strong>{fact.label}:</strong> {fact.value || 'non trovato'} <span class="text-xs text-slate-500">({fact.status}, {fact.confidence})</span></li>
                                {/each}
                              </ul>
                            {:else}
                              <p class="mt-2 text-slate-600">Nessun dato escluso.</p>
                            {/if}
                          </div>
                        </div>

                        {#if editorialPreview(row).warnings?.length}
                          <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                            <p class="font-bold">Warning</p>
                            <ul class="mt-1 space-y-1">
                              {#each editorialPreview(row).warnings as warning}
                                <li>{warning}</li>
                              {/each}
                            </ul>
                          </div>
                        {/if}

                        <div class="mt-4 flex flex-wrap gap-2">
                          {#if row.reconciliation?.conflicts?.length}
                            <p class="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">
                              Conflitti rilevati: pubblicazione diretta bloccata.
                            </p>
                          {:else}
                            <form method="POST" action="?/approveEditorial">
                              <input type="hidden" name="gym_id" value={row.id || row.slug} />
                              <input type="hidden" name="approval_type" value="breve" />
                              <input type="hidden" name="preview_payload" value={previewPayload(row)} />
                              <button type="submit" class="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-900">Approva descrizione breve</button>
                            </form>
                            <form method="POST" action="?/approveEditorial">
                              <input type="hidden" name="gym_id" value={row.id || row.slug} />
                              <input type="hidden" name="approval_type" value="lunga" />
                              <input type="hidden" name="preview_payload" value={previewPayload(row)} />
                              <button type="submit" class="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-900">Approva descrizione lunga</button>
                            </form>
                            <form method="POST" action="?/approveEditorial">
                              <input type="hidden" name="gym_id" value={row.id || row.slug} />
                              <input type="hidden" name="approval_type" value="tutto" />
                              <input type="hidden" name="preview_payload" value={previewPayload(row)} />
                              <button type="submit" class="rounded-lg bg-teal-800 px-3 py-2 text-sm font-bold text-white hover:bg-teal-900">Approva tutto e pubblica</button>
                            </form>
                          {/if}
                          <button type="button" class="rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50" on:click={() => copyText(`${editorialPreview(row).descrizione_breve}\n\n${editorialPreview(row).descrizione_lunga}`)}>Copia testo</button>
                          <button type="button" class="rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50" on:click={() => setEditorialDecision(row, 'modifica_manuale')}>Modifica manualmente</button>
                          <button type="button" class="rounded-lg bg-white px-3 py-2 text-sm font-bold text-rose-800 ring-1 ring-rose-200 hover:bg-rose-50" on:click={() => setEditorialDecision(row, 'rifiuta')}>Rifiuta preview</button>
                          <button type="button" class="rounded-lg bg-white px-3 py-2 text-sm font-bold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-50" on:click={() => setEditorialDecision(row, 'da_revisionare')}>Segna da revisionare</button>
                        </div>
                        {#if editorialDecisions[row.id || row.slug || row.nome]}
                          <p class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                            Stato locale preview: {editorialDecisions[row.id || row.slug || row.nome]}. Nessuna pubblicazione automatica.
                          </p>
                        {/if}
                      </div>
                    {/if}
                    {#if row.pages_scraped?.length || row.confidence_score}
                      <div class="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
                        <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p class="font-bold">Pagine analizzate</p>
                            {#if row.pages_scraped?.length}
                              <ul class="mt-1 space-y-1">
                                {#each row.pages_scraped as page}
                                  <li class="break-words">
                                    <a href={page.url} target="_blank" rel="noreferrer" class="font-semibold text-blue-800 hover:text-blue-950">{page.title || page.url}</a>
                                    {#if page.fetched_at}
                                      <span class="text-xs text-blue-700"> · {formatDate(page.fetched_at)}</span>
                                    {/if}
                                  </li>
                                {/each}
                              </ul>
                            {:else}
                              <p class="mt-1">Nessuna pagina ufficiale analizzata.</p>
                            {/if}
                          </div>
                          <span class="inline-flex w-fit rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-800">
                            Confidenza estrazione {row.confidence_score || 0}/100
                          </span>
                        </div>
                      </div>
                    {/if}
                    {#if row.raw_official_text}
                      <details class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800">
                        <summary class="cursor-pointer font-bold text-slate-900">Testo grezzo</summary>
                        <p class="mt-2 whitespace-pre-wrap break-words">{row.raw_official_text}</p>
                      </details>
                    {/if}
                    {#if row.clean_official_text}
                      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
                        <p class="font-bold text-emerald-950">Testo pulito</p>
                        <p class="mt-2 whitespace-pre-wrap break-words">{row.clean_official_text}</p>
                      </div>
                    {/if}
                    {#if sectionEntries(row.extracted_sections).length}
                      <div class="rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800">
                        <p class="font-bold text-slate-950">Sezioni rilevate</p>
                        <div class="mt-2 grid gap-2">
                          {#each sectionEntries(row.extracted_sections) as [key, section]}
                            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div class="flex flex-wrap items-center justify-between gap-2">
                                <p class="font-bold text-slate-900">{sectionLabel(key)}</p>
                                <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-600">{section.confidence}</span>
                              </div>
                              <p class="mt-1 whitespace-pre-wrap break-words">{section.text}</p>
                              {#if section.warnings?.length}
                                <p class="mt-2 text-xs font-semibold text-amber-800">{section.warnings.join(' · ')}</p>
                              {/if}
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    {#if factEntries(row.extracted_facts).length}
                      <div class="rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800">
                        <p class="font-bold text-slate-950">Fatti estratti</p>
                        <div class="mt-2 grid gap-2">
                          {#each factEntries(row.extracted_facts) as [key, items]}
                            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <p class="font-bold text-slate-900">{factLabel(key)}</p>
                              <ul class="mt-1 space-y-1">
                                {#each items as item}
                                  <li class="break-words">
                                    {item.value}
                                    <span class="text-xs font-semibold text-slate-500">({sectionLabel(item.source_section)}, {item.confidence})</span>
                                    {#if item.source_url}
                                      <a href={item.source_url} target="_blank" rel="noreferrer" class="ml-1 text-xs font-semibold text-blue-700 hover:text-blue-900">fonte</a>
                                    {/if}
                                    {#if item.warning}
                                      <span class="text-xs font-semibold text-amber-800"> {item.warning}</span>
                                    {/if}
                                  </li>
                                {/each}
                              </ul>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    {#if row.extraction_warnings?.length}
                      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                        <p class="font-bold">Avvisi</p>
                        <ul class="mt-1 space-y-1">
                          {#each row.extraction_warnings as warning}
                            <li>{warning}</li>
                          {/each}
                        </ul>
                      </div>
                    {/if}
                    {#if reconciliationRows(row).length}
                      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm text-slate-800">
                        <div class="border-b border-slate-200 bg-slate-50 px-3 py-2">
                          <p class="font-bold text-slate-950">Confronto scheda / fonte ufficiale</p>
                          <p class="mt-1 text-xs font-semibold text-slate-600">
                            Confidenza generale: {row.reconciliation.overall_confidence || 'low'}
                            {#if row.reconciliation.needs_review}
                              · review manuale richiesta
                            {/if}
                          </p>
                        </div>
                        <div class="overflow-x-auto">
                          <table class="min-w-full divide-y divide-slate-200">
                            <thead class="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                              <tr>
                                <th class="px-3 py-2">Campo</th>
                                <th class="px-3 py-2">Valore scheda</th>
                                <th class="px-3 py-2">Valore fonte ufficiale</th>
                                <th class="px-3 py-2">Esito</th>
                                <th class="px-3 py-2">Azione suggerita</th>
                                <th class="px-3 py-2">Confidenza</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                              {#each reconciliationRows(row) as item}
                                <tr>
                                  <td class="px-3 py-2 font-bold text-slate-900">{item.field_label || item.field}</td>
                                  <td class="max-w-[16rem] px-3 py-2 align-top">{item.app_value || 'vuoto'}</td>
                                  <td class="max-w-[18rem] px-3 py-2 align-top">{item.official_value || 'non trovato'}</td>
                                  <td class="px-3 py-2 align-top">{item.status_label || item.status}</td>
                                  <td class="px-3 py-2 align-top">{item.suggested_action_label || item.suggested_action}</td>
                                  <td class="px-3 py-2 align-top">{item.confidence}</td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    {/if}
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
                {#if row.preview_mode === 'solo_dati_scheda'}
                  <p class="mt-2 font-semibold text-amber-800">Solo dati scheda</p>
                {/if}
              </div>
            </div>
          </article>
        {:else}
          <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Nessuna preview disponibile. Usa il pulsante “Genera preview” per analizzare i siti ufficiali direttamente da questa pagina.
          </div>
        {/each}
      </div>
    {/if}
  </section>
</main>
