<script>
  import { enhance } from '$app/forms';

  export let data;
  export let form;

  let q = '';
  let suspiciousOnly = false;
  let verifiedFilter = 'all';
  let viewMode = 'compact';
  let density = 'compact';
  let selectedIds = [];
  let savingKey = '';
  let savedKey = '';
  let clientError = '';

  function isInteractiveTarget(target) {
    return Boolean(target?.closest?.('a, button, input, select, textarea, label'));
  }

  function toggleSelection(id) {
    selectedIds = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
  }

  function handleRowClick(event, id) {
    if (isInteractiveTarget(event.target)) return;
    toggleSelection(id);
  }

  function handleRowKeydown(event, id) {
    if (isInteractiveTarget(event.target)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleSelection(id);
  }

  function toggleSelectAllVisible() {
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    selectedIds = allVisibleSelected
      ? selectedIds.filter((id) => !visibleIds.includes(id))
      : [...new Set([...selectedIds, ...visibleIds])];
  }

  function selectAllFiltered() {
    selectedIds = filtered.map((gym) => gym.id);
  }

  function clearSelection() {
    selectedIds = [];
  }

  function submitBulkAction(event, message) {
    clientError = '';

    if (!selectedIds.length) {
      clientError = 'Seleziona almeno una scheda.';
      event.preventDefault();
      return;
    }

    if (message && !confirm(message)) {
      event.preventDefault();
    }
  }

  function enhancedSubmit(key) {
    return () => {
      savingKey = key;
      savedKey = '';
      clientError = '';

      return async ({ update, result }) => {
        await update();
        savingKey = '';

        if (result.type === 'success' || result.type === 'redirect') {
          savedKey = key;
        }
      };
    };
  }

  $: query = q.trim().toLowerCase();
  $: filtered = data.gyms.filter((gym) => {
    if (suspiciousOnly && gym.suspiciousScore === 0) return false;
    if (verifiedFilter === 'verified' && !gym.verified) return false;
    if (verifiedFilter === 'unverified' && gym.verified) return false;
    if (!query) return true;

    return [gym.name, gym.disciplineText, gym.address, gym.city, gym.website]
      .join(' | ')
      .toLowerCase()
      .includes(query);
  });
  $: visibleIds = filtered.map((gym) => gym.id);
  $: selectedIds = selectedIds.filter((id) => data.gyms.some((gym) => gym.id === id));
  $: selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  $: allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  $: rowPadding = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3';
  $: inputClass =
    density === 'compact'
      ? 'min-h-[2.15rem] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none ring-slate-900 transition focus:ring-2'
      : 'min-h-[2.6rem] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2';
</script>

<main class="mx-auto min-h-screen w-full max-w-[96rem] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Riclassificazione discipline</h1>
        <p class="mt-2 max-w-3xl text-sm text-slate-600">
          Correggi velocemente discipline sospette o troppo generiche. La vista compatta permette selezioni e salvataggi rapidi.
        </p>
      </div>
      <div class="flex gap-2">
        <a href="/admin" class="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Home admin</a>
        <a href="/admin/schede" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Gestione schede</a>
      </div>
    </div>

    {#if data.saved || savedKey}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Salvato correttamente.
      </p>
    {/if}

    {#if data.archived}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Scheda archiviata con successo. Il record non &egrave; stato cancellato.
      </p>
    {/if}

    {#if form?.error || clientError}
      <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {form?.error || clientError}
      </p>
    {/if}

    {#if savingKey}
      <p class="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
        Salvataggio in corso...
      </p>
    {/if}

    {#if !data.persistentWrites}
      <p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-800">
        Modifiche admin bloccate: questo pannello deve scrivere su Supabase. Verifica SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nell'ambiente corrente.
      </p>
    {/if}

    <div class="mt-5 grid gap-3 xl:grid-cols-[1.5fr_auto_auto_auto_auto]">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={q}
        placeholder="Cerca per palestra, citt&agrave;, disciplina o indirizzo"
      />

      <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <input type="checkbox" bind:checked={suspiciousOnly} />
        Solo casi sospetti
      </label>

      <select
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-slate-900 transition focus:ring-2"
        bind:value={verifiedFilter}
        aria-label="Filtra per stato verifica"
      >
        <option value="all">Tutte</option>
        <option value="unverified">Non verificate</option>
        <option value="verified">Verificate</option>
      </select>

      <div class="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button type="button" class={`rounded-lg px-3 py-1.5 text-sm font-bold ${viewMode === 'compact' ? 'bg-slate-900 text-white' : 'text-slate-700'}`} on:click={() => (viewMode = 'compact')}>
          Vista compatta
        </button>
        <button type="button" class={`rounded-lg px-3 py-1.5 text-sm font-bold ${viewMode === 'detailed' ? 'bg-slate-900 text-white' : 'text-slate-700'}`} on:click={() => (viewMode = 'detailed')}>
          Vista dettagliata
        </button>
      </div>

      <select
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-slate-900 transition focus:ring-2"
        bind:value={density}
        aria-label="Densit&agrave; righe"
      >
        <option value="compact">Densit&agrave; compatta</option>
        <option value="normal">Densit&agrave; normale</option>
      </select>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-700">
      <span class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        Risultati: <strong>{filtered.length}</strong>
      </span>
      <span class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        Selezionati: <strong>{selectedIds.length}</strong>
      </span>
      <button type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold hover:bg-slate-50" on:click={toggleSelectAllVisible}>
        {allVisibleSelected ? 'Deseleziona visibili' : 'Seleziona visibili'}
      </button>
      <button type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold hover:bg-slate-50" on:click={selectAllFiltered}>
        Seleziona tutti i risultati filtrati
      </button>
      <button type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold hover:bg-slate-50" on:click={clearSelection}>
        Deseleziona tutto
      </button>
    </div>
  </section>

  <section class="sticky top-16 z-30 mt-4 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-lg backdrop-blur-md">
    <form
      method="POST"
      action="?/bulkUpdate"
      class="flex flex-wrap items-center gap-2"
      on:submit={(event) => submitBulkAction(event)}
      use:enhance={enhancedSubmit('bulk')}
    >
      <input type="hidden" name="ids" value={JSON.stringify(selectedIds)} />
      <span class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">
        {selectedIds.length} selezionate
      </span>
      <input
        name="bulk_disciplines"
        class="min-h-[2.4rem] min-w-[230px] rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-slate-900 transition focus:ring-2"
        placeholder="Disciplina per selezionate"
      />
      <button type="submit" name="operation" value="apply-discipline" class="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={!data.persistentWrites || selectedIds.length === 0}>
        Applica disciplina
      </button>
      <button type="submit" name="operation" value="verify" class="rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50" disabled={!data.persistentWrites || selectedIds.length === 0}>
        Verifica selezionate
      </button>
      <button type="submit" name="operation" value="unverify" class="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50" disabled={!data.persistentWrites || selectedIds.length === 0}>
        Rimuovi verifica
      </button>
      <button
        type="submit"
        name="operation"
        value="archive"
        class="rounded-xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
        disabled={!data.persistentWrites || selectedIds.length === 0}
        on:click={(event) => submitBulkAction(event, `Archiviare ${selectedIds.length} schede selezionate? Potrai ripristinarle da Gestione schede.`)}
      >
        Archivia selezionate
      </button>
    </form>
  </section>

  <section class="mt-4">
    {#if filtered.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Nessuna palestra trovata con i filtri attuali.
      </div>
    {:else if viewMode === 'compact'}
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="grid grid-cols-[42px_minmax(210px,1.45fr)_minmax(90px,0.55fr)_minmax(170px,1fr)_minmax(145px,0.8fr)_minmax(210px,1fr)_120px_270px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          <span>Sel.</span>
          <span>Nome</span>
          <span>Citt&agrave;</span>
          <span>Indirizzo</span>
          <span>Attuale</span>
          <span>Nuova disciplina</span>
          <span>Stato</span>
          <span>Azioni</span>
        </div>

        {#each filtered as gym}
          <div
            class={`grid cursor-pointer grid-cols-[42px_minmax(210px,1.45fr)_minmax(90px,0.55fr)_minmax(170px,1fr)_minmax(145px,0.8fr)_minmax(210px,1fr)_120px_270px] items-center gap-2 border-b border-slate-100 ${rowPadding} text-sm transition hover:bg-emerald-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900 ${selectedIds.includes(gym.id) ? 'bg-emerald-50/70' : 'bg-white'}`}
            role="button"
            tabindex="0"
            aria-label={`Seleziona ${gym.name}`}
            on:click={(event) => handleRowClick(event, gym.id)}
            on:keydown={(event) => handleRowKeydown(event, gym.id)}
          >
            <label class="flex items-center justify-center" aria-label={`Seleziona ${gym.name}`}>
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300"
                checked={selectedIds.includes(gym.id)}
                on:change={() => toggleSelection(gym.id)}
              />
            </label>

            <div class="min-w-0">
              <p class="truncate font-bold text-slate-950">{gym.name}</p>
              {#if gym.suspiciousScore > 0}
                <p class="text-xs font-semibold text-amber-700">Caso sospetto</p>
              {/if}
            </div>

            <p class="truncate text-slate-700">{gym.city || '-'}</p>
            <p class="truncate text-slate-600" title={gym.shortAddress || gym.address}>{gym.shortAddress || '-'}</p>
            <p class="truncate font-semibold text-slate-800" title={gym.disciplineText}>{gym.disciplineText}</p>

            <form method="POST" action="?/save" class="flex min-w-0 gap-1" use:enhance={enhancedSubmit(`save-${gym.id}`)}>
              <input type="hidden" name="id" value={gym.id} />
              <input type="hidden" name="current_disciplines" value={gym.disciplineText} />
              <input type="hidden" name="verified" value={gym.verified ? '1' : '0'} />
              <label class="sr-only" for={`compact-disciplines-${gym.id}`}>Nuova disciplina per {gym.name}</label>
              <input id={`compact-disciplines-${gym.id}`} name="disciplines" value={gym.disciplineText} class={`${inputClass} min-w-0 flex-1`} />
              <button type="submit" class="rounded-lg bg-emerald-700 px-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={!data.persistentWrites || savingKey === `save-${gym.id}`}>
                {savingKey === `save-${gym.id}` ? '...' : 'Salva'}
              </button>
            </form>

            <div>
              {#if gym.verified}
                <span class="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800">Verificata</span>
              {:else}
                <span class="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">Da verificare</span>
              {/if}
            </div>

            <div class="flex flex-wrap items-center gap-1">
              <form method="POST" action="?/toggleVerified" use:enhance={enhancedSubmit(`verify-${gym.id}`)}>
                <input type="hidden" name="id" value={gym.id} />
                <button type="submit" class={`rounded-lg px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50 ${gym.verified ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-700 hover:bg-sky-800'}`} disabled={!data.persistentWrites || savingKey === `verify-${gym.id}`}>
                  {gym.verified ? 'No ver.' : 'Verifica'}
                </button>
              </form>
              {#if gym.website}
                <a href={gym.website} target="_blank" rel="noreferrer" class="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200">
                  Sito
                </a>
              {/if}
              <form
                method="POST"
                action="?/delete"
                on:submit={(event) => {
                  if (!confirm(`Archiviare la scheda "${gym.name}"? Il record non verr&agrave; cancellato.`)) {
                    event.preventDefault();
                  }
                }}
                use:enhance={enhancedSubmit(`archive-${gym.id}`)}
              >
                <input type="hidden" name="id" value={gym.id} />
                <button type="submit" class="rounded-lg bg-rose-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50" disabled={!data.persistentWrites || savingKey === `archive-${gym.id}`}>
                  Archivia
                </button>
              </form>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid gap-3">
        {#each filtered as gym}
          <div
            class={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:bg-emerald-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 ${selectedIds.includes(gym.id) ? 'ring-2 ring-emerald-400' : ''}`}
            role="button"
            tabindex="0"
            aria-label={`Seleziona ${gym.name}`}
            on:click={(event) => handleRowClick(event, gym.id)}
            on:keydown={(event) => handleRowKeydown(event, gym.id)}
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <label class="inline-flex items-center" aria-label={`Seleziona ${gym.name}`}>
                    <input type="checkbox" class="h-4 w-4 rounded border-slate-300" checked={selectedIds.includes(gym.id)} on:change={() => toggleSelection(gym.id)} />
                  </label>
                  <h2 class="text-base font-bold text-slate-900">{gym.name}</h2>
                  {#if gym.verified}
                    <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">Verificata</span>
                  {:else}
                    <span class="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800">Da verificare</span>
                  {/if}
                  {#if gym.suspiciousScore > 0}
                    <span class="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800">Caso sospetto</span>
                  {/if}
                </div>
                <p class="mt-1 text-sm text-slate-600">{gym.address || 'Indirizzo non disponibile'}</p>
                <p class="mt-2 text-sm text-slate-700"><strong>Attuale:</strong> {gym.disciplineText}</p>
              </div>

              <div class="grid w-full gap-2 sm:w-auto sm:min-w-[420px]">
                <form method="POST" action="?/save" class="grid gap-2" use:enhance={enhancedSubmit(`save-${gym.id}`)}>
                  <input type="hidden" name="id" value={gym.id} />
                  <input type="hidden" name="current_disciplines" value={gym.disciplineText} />
                  <input type="hidden" name="verified" value={gym.verified ? '1' : '0'} />
                  <label class="grid gap-1">
                    <span class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Nuova disciplina</span>
                    <input name="disciplines" value={gym.disciplineText} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2" placeholder="Es: Judo | Jujitsu Brasiliano" />
                  </label>

                  <div class="flex flex-wrap gap-2">
                    <button type="submit" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={!data.persistentWrites || savingKey === `save-${gym.id}`}>
                      {savingKey === `save-${gym.id}` ? 'Salvataggio...' : 'Salva / conferma'}
                    </button>
                    {#if gym.website}
                      <a href={gym.website} target="_blank" rel="noreferrer" class="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300">Apri sito</a>
                    {/if}
                  </div>
                </form>

                <div class="flex flex-wrap gap-2">
                  <form method="POST" action="?/toggleVerified" use:enhance={enhancedSubmit(`verify-${gym.id}`)}>
                    <input type="hidden" name="id" value={gym.id} />
                    <button type="submit" class={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${gym.verified ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-700 hover:bg-sky-800'}`} disabled={!data.persistentWrites || savingKey === `verify-${gym.id}`}>
                      {gym.verified ? 'Rimuovi verifica' : 'Segna verificata'}
                    </button>
                  </form>

                  <form
                    method="POST"
                    action="?/delete"
                    on:submit={(event) => {
                      if (!confirm(`Archiviare la scheda "${gym.name}"? Il record non verr&agrave; cancellato.`)) {
                        event.preventDefault();
                      }
                    }}
                    use:enhance={enhancedSubmit(`archive-${gym.id}`)}
                  >
                    <input type="hidden" name="id" value={gym.id} />
                    <button type="submit" class="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50" disabled={!data.persistentWrites || savingKey === `archive-${gym.id}`}>
                      Archivia scheda
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</main>
