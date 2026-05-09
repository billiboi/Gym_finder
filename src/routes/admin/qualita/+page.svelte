<script>
  export let data;
  export let form;

  const filters = [
    { id: 'all', label: 'Tutte', countKey: 'all' },
    { id: 'noPhone', label: 'Senza telefono', countKey: 'noPhone' },
    { id: 'noWebsite', label: 'Senza sito', countKey: 'noWebsite' },
    { id: 'noHours', label: 'Senza orari', countKey: 'noHours' },
    { id: 'noCoordinates', label: 'Senza coordinate', countKey: 'noCoordinates' },
    { id: 'noDescription', label: 'Descrizione mancante', countKey: 'noDescription' },
    { id: 'genericDiscipline', label: 'Disciplina generica', countKey: 'genericDiscipline' },
    { id: 'duplicateSlug', label: 'Slug duplicato', countKey: 'duplicateSlug' },
    { id: 'unverified', label: 'Non verificata', countKey: 'unverified' }
  ];

  let activeFilter = 'all';
  let query = '';
  let selectedNormalizationIds = [];

  $: normalizedQuery = query.trim().toLowerCase();
  $: filteredGyms = data.gyms.filter((gym) => {
    const matchesFilter = activeFilter === 'all' || Boolean(gym.qualityFlags?.[activeFilter]);
    if (!matchesFilter) return false;
    if (!normalizedQuery) return true;

    return [gym.name, gym.city, gym.address, gym.discipline, gym.issueLabels.join(' ')]
      .join(' | ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
  $: selectedNormalizationValue = selectedNormalizationIds.join(',');

  function filterButtonClass(filterId) {
    const base =
      'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-900';
    return activeFilter === filterId
      ? `${base} border-emerald-700 bg-emerald-700 text-white shadow-md`
      : `${base} border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50`;
  }
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">Qualità schede</p>
        <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Dashboard qualità</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Trova schede incomplete, duplicati probabili e discipline da normalizzare. Le azioni richiedono conferma esplicita e archiviano i duplicati senza cancellarli.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <a href="/admin/schede" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Gestione schede</a>
        <a href="/admin/export/gyms.csv" class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">Esporta backup</a>
      </div>
    </div>

    {#if form?.error}
      <div class="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
        {form.error}
      </div>
    {/if}
    {#if data.merged}
      <div class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
        Merge completato: la scheda duplicata è stata archiviata, non eliminata.
      </div>
    {/if}
    {#if data.normalized}
      <div class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
        Discipline normalizzate sulle schede selezionate.
      </div>
    {/if}
    {#if !data.persistentWrites}
      <div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        Scrittura non disponibile in questo ambiente. Puoi consultare la dashboard, ma merge e normalizzazione sono disattivati.
      </div>
    {/if}

    <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Attive</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.stats.all}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Contatti</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.stats.noPhone + data.stats.noWebsite}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Da completare</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.stats.noDescription + data.stats.noHours}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Non verificate</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.stats.unverified}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Duplicati</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.stats.probableDuplicateGroups}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Discipline</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.stats.disciplineNormalization}</p>
      </div>
    </div>
  </section>

  <section class="mt-5 rounded-3xl border border-white/80 bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:p-5">
    <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {#each filters as filter}
          <button type="button" class={filterButtonClass(filter.id)} on:click={() => (activeFilter = filter.id)}>
            <span class="block text-xl font-bold">{data.stats[filter.countKey]}</span>
            <span class="mt-1 block">{filter.label}</span>
          </button>
        {/each}
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label for="quality-search" class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Cerca</label>
        <input
          id="quality-search"
          class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-900 transition focus:ring-2"
          bind:value={query}
          placeholder="Nome, città, problema"
        />
        <p class="mt-3 text-sm font-semibold text-slate-700">
          Risultati: {filteredGyms.length} su {data.stats.all}
        </p>
      </div>
    </div>
  </section>

  <section class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
    <div class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Duplicati probabili</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Merge sicuro</h2>
        </div>
        <p class="text-sm font-semibold text-slate-600">{data.duplicateGroups.length} gruppi mostrati</p>
      </div>

      {#if data.duplicateGroups.length === 0}
        <p class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
          Nessun duplicato probabile trovato.
        </p>
      {:else}
        <div class="mt-4 grid gap-4">
          {#each data.duplicateGroups as group}
            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-bold text-slate-900">{group.label}</h3>
                <span class="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">{group.gyms.length} schede</span>
              </div>

              <div class="mt-3 grid gap-2">
                {#each group.gyms as gym}
                  <div class="rounded-xl bg-white p-3 text-sm">
                    <p class="font-bold text-slate-900">{gym.name}</p>
                    <p class="text-slate-600">{gym.city || 'Città non indicata'} · {gym.address_display || 'Indirizzo non disponibile'}</p>
                  </div>
                {/each}
              </div>

              <form method="POST" action="?/mergeGyms" class="mt-4 grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="grid gap-1 text-sm font-semibold text-slate-800">
                    Scheda da tenere
                    <select name="keep_id" class="rounded-xl border border-slate-200 bg-white px-3 py-2" required disabled={!data.persistentWrites}>
                      {#each group.gyms as gym}
                        <option value={gym.id}>{gym.name} · {gym.city || 'senza città'}</option>
                      {/each}
                    </select>
                  </label>
                  <label class="grid gap-1 text-sm font-semibold text-slate-800">
                    Scheda da archiviare
                    <select name="archive_id" class="rounded-xl border border-slate-200 bg-white px-3 py-2" required disabled={!data.persistentWrites}>
                      {#each group.gyms as gym, index}
                        <option value={gym.id} selected={index === 1}>{gym.name} · {gym.city || 'senza città'}</option>
                      {/each}
                    </select>
                  </label>
                </div>
                <label class="grid gap-1 text-sm font-semibold text-slate-800">
                  Scrivi UNISCI per confermare
                  <input name="confirm_text" class="rounded-xl border border-slate-200 bg-white px-3 py-2" autocomplete="off" required disabled={!data.persistentWrites} />
                </label>
                <button
                  type="submit"
                  class="w-fit rounded-xl bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!data.persistentWrites}
                >
                  Unisci e archivia duplicato
                </button>
              </form>
            </article>
          {/each}
        </div>
      {/if}
    </div>

    <div class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Discipline</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Normalizzazione controllata</h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Seleziona solo le schede da uniformare. La modifica aggiorna discipline e disciplina principale, senza cancellare record.
        </p>
      </div>

      {#if data.disciplineNormalizationCandidates.length === 0}
        <p class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
          Nessuna disciplina da normalizzare.
        </p>
      {:else}
        <form method="POST" action="?/normalizeDisciplines" class="mt-4 grid gap-4">
          <input type="hidden" name="ids" value={selectedNormalizationValue} />
          <div class="max-h-[38rem] overflow-auto rounded-2xl border border-slate-200">
            {#each data.disciplineNormalizationCandidates as candidate}
              <label class="grid cursor-pointer gap-2 border-b border-slate-100 bg-white p-3 text-sm last:border-b-0 hover:bg-slate-50">
                <span class="flex items-start gap-2">
                  <input type="checkbox" bind:group={selectedNormalizationIds} value={candidate.id} class="mt-1" />
                  <span>
                    <strong class="block text-slate-900">{candidate.name}</strong>
                    <span class="text-slate-600">{candidate.city || 'Città non indicata'}</span>
                  </span>
                </span>
                <span class="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                  {candidate.current || 'Vuoto'} → <strong>{candidate.normalized}</strong>
                </span>
              </label>
            {/each}
          </div>

          <label class="grid gap-1 text-sm font-semibold text-slate-800">
            Scrivi NORMALIZZA per confermare
            <input name="confirm_text" class="rounded-xl border border-slate-200 bg-white px-3 py-2" autocomplete="off" required disabled={!data.persistentWrites || selectedNormalizationIds.length === 0} />
          </label>
          <button
            type="submit"
            class="w-fit rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!data.persistentWrites || selectedNormalizationIds.length === 0}
          >
            Normalizza selezionate
          </button>
        </form>
      {/if}
    </div>
  </section>

  <section class="mt-5 grid gap-3">
    {#if filteredGyms.length === 0}
      <div class="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-slate-600">
        Nessuna scheda trovata per questo filtro.
      </div>
    {:else}
      {#each filteredGyms as gym}
        <article class="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm sm:p-5">
          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl font-bold text-slate-900">{gym.name}</h2>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{gym.issueCount} problemi</span>
              </div>
              <p class="mt-1 text-sm text-slate-600">{gym.discipline || 'Disciplina non indicata'} · {gym.city || 'Città non indicata'}</p>
              <p class="mt-1 text-sm text-slate-700">{gym.address_display || 'Indirizzo non disponibile'}</p>

              <div class="mt-3 flex flex-wrap gap-2">
                {#each gym.issueLabels as issue}
                  <span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">{issue}</span>
                {/each}
              </div>
            </div>

            <div class="grid gap-2">
              <a href={`/admin/gyms/${gym.id}`} class="inline-flex min-h-[2.65rem] items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">
                Modifica scheda
              </a>
              <a href={gym.publicHref} target="_blank" rel="noreferrer" class="inline-flex min-h-[2.65rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-50">
                Apri pubblica
              </a>
            </div>
          </div>
        </article>
      {/each}
    {/if}
  </section>
</main>
