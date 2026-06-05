<script>
  export let data;

  let status = 'riparabili';
  let query = '';
  let selectedId = '';

  $: rows = data.preview.rows || [];
  $: filteredRows = rows.filter((row) => {
    const matchesStatus =
      status === 'tutte' ||
      (status === 'riparabili' && row.repair_status === 'descrizione_riparabile_in_review') ||
      (status === 'anagrafica' && row.repair_status === 'review_anagrafica_prima_della_descrizione');

    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      [row.nome, row.citta, row.indirizzo, row.disciplina_principale, row.id]
        .join(' ')
        .toLowerCase()
        .includes(q);

    return matchesStatus && matchesQuery;
  });

  $: selected = filteredRows.find((row) => row.id === selectedId) || filteredRows[0] || rows[0] || null;

  function formatDate(value) {
    if (!value) return 'Report non disponibile';
    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  function trimText(value, max = 180) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).trim()}…`;
  }

  function statusLabel(value) {
    if (value === 'review_anagrafica_prima_della_descrizione') return 'Review anagrafica';
    if (value === 'descrizione_riparabile_in_review') return 'Descrizione riparabile';
    return value || 'Da valutare';
  }

  function scoreTone(score) {
    if (score >= 80) return 'text-emerald-700';
    if (score >= 50) return 'text-amber-700';
    return 'text-rose-700';
  }
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Admin descrizioni</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Preview descrizioni sul sito</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Anteprima locale delle descrizioni proposte. Questa vista legge il report dry-run e non modifica database, staging o production.
        </p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p><strong>{data.preview.summary.preview_rows || rows.length}</strong> preview</p>
        <p class="break-all">{data.preview.filename || 'Nessun report locale'}</p>
      </div>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Riparabili</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.preview.summary.description_repairable_rows || 0}</p>
        <p class="mt-1 text-sm text-slate-600">Descrizione da review</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Anagrafica</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.preview.summary.registry_review_rows || 0}</p>
        <p class="mt-1 text-sm text-slate-600">Nome, città o indirizzo</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Needs review</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.preview.summary.needs_review_rows || 0}</p>
        <p class="mt-1 text-sm text-slate-600">Nessuna pubblicazione automatica</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Aggiornato</p>
        <p class="mt-2 text-base font-bold text-slate-900">{formatDate(data.preview.generatedAt)}</p>
        <p class="mt-1 text-sm text-slate-600">Report locale</p>
      </div>
    </div>
  </section>

  {#if !data.preview.hasReport}
    <section class="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white/85 p-8 text-center text-slate-600">
      Nessuna preview descrizioni disponibile.
    </section>
  {:else}
    <section class="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div class="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:p-5">
        <div class="flex flex-col gap-3">
          <input
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-800 transition focus:ring-2"
            bind:value={query}
            placeholder="Cerca nome, città, indirizzo"
          />

          <div class="flex flex-wrap gap-2">
            {#each [
              { id: 'riparabili', label: 'Riparabili' },
              { id: 'anagrafica', label: 'Anagrafica' },
              { id: 'tutte', label: 'Tutte' }
            ] as filter}
              <button
                type="button"
                class="rounded-xl border px-3 py-2 text-sm font-bold transition"
                class:border-emerald-900={status === filter.id}
                class:bg-emerald-900={status === filter.id}
                class:text-white={status === filter.id}
                class:border-slate-200={status !== filter.id}
                class:bg-white={status !== filter.id}
                class:text-slate-700={status !== filter.id}
                on:click={() => (status = filter.id)}
              >
                {filter.label}
              </button>
            {/each}
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
          <span>{filteredRows.length} schede</span>
          <span>Preview locale</span>
        </div>

        <div class="mt-3 grid max-h-[760px] gap-2 overflow-y-auto pr-1">
          {#each filteredRows as row}
            <button
              type="button"
              class="rounded-2xl border p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
              class:border-emerald-800={selected?.id === row.id}
              class:bg-emerald-50={selected?.id === row.id}
              class:border-slate-200={selected?.id !== row.id}
              class:bg-white={selected?.id !== row.id}
              on:click={() => (selectedId = row.id)}
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-bold text-slate-900">{row.nome}</p>
                  <p class="mt-1 text-xs text-slate-600">{row.citta || 'Città da verificare'} · {row.disciplina_principale}</p>
                </div>
                <span class={`text-sm font-bold ${scoreTone(row.quality_score_after)}`}>{row.quality_score_after}</span>
              </div>
              <p class="mt-2 text-xs leading-5 text-slate-600">{statusLabel(row.repair_status)}</p>
            </button>
          {:else}
            <div class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Nessuna scheda in questo filtro.
            </div>
          {/each}
        </div>
      </div>

      <div class="space-y-5">
        {#if selected}
          <section class="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:p-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Scheda selezionata</p>
                <h2 class="mt-1 text-2xl font-bold text-slate-900">{selected.nome}</h2>
                <p class="mt-1 text-sm text-slate-600">{selected.citta || 'Città da verificare'} · {selected.indirizzo || 'Indirizzo assente'}</p>
              </div>
              <a href={`/admin/gyms/${selected.id}`} class="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                Apri scheda admin
              </a>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Prima</p>
                <p class={`mt-1 text-2xl font-bold ${scoreTone(selected.quality_score_before)}`}>{selected.quality_score_before}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Dopo</p>
                <p class={`mt-1 text-2xl font-bold ${scoreTone(selected.quality_score_after)}`}>{selected.quality_score_after}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Stato</p>
                <p class="mt-1 text-sm font-bold text-slate-900">{statusLabel(selected.repair_status)}</p>
              </div>
            </div>
          </section>

          <section class="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:p-5">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Anteprima card homepage</p>
            <article class="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-lg font-bold text-slate-950">{selected.nome}</h3>
                  <p class="mt-1 text-sm text-slate-600">{selected.citta || 'Città da verificare'} · {selected.disciplina_principale}</p>
                </div>
                <span class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">Preview</span>
              </div>
              <p class="mt-3 text-sm leading-6 text-slate-700">{trimText(selected.descrizione_proposta, 180)}</p>
              <div class="mt-4 grid grid-cols-2 gap-2">
                <button type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900">Chiama</button>
                <button type="button" class="rounded-xl bg-emerald-900 px-3 py-2 text-sm font-bold text-white">Scheda completa</button>
              </div>
            </article>
          </section>

          <section class="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:p-5">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Anteprima scheda completa</p>
            <div class="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
              <h3 class="text-xl font-bold text-slate-950">{selected.nome}</h3>
              <p class="mt-2 text-sm leading-7 text-slate-700">{selected.descrizione_proposta}</p>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Descrizione attuale</p>
                <p class="mt-2 text-sm leading-6 text-slate-700">{selected.descrizione_attuale}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Motivo review</p>
                <p class="mt-2 text-sm leading-6 text-slate-700">{selected.motivo_generazione}</p>
                <p class="mt-2 text-sm leading-6 text-slate-700">{selected.azione_consigliata}</p>
              </div>
            </div>
          </section>
        {/if}
      </div>
    </section>
  {/if}
</main>
