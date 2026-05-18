<script>
  export let data;
  export let form;

  const filters = [
    { id: 'all', label: 'Tutte', countKey: 'all' },
    { id: 'lowQuality', label: 'Qualita sotto 40', countKey: 'lowQuality' },
    { id: 'mediumQuality', label: 'Qualita 40-70', countKey: 'mediumQuality' },
    { id: 'highQuality', label: 'Qualita sopra 70', countKey: 'highQuality' },
    { id: 'noPhone', label: 'Senza telefono', countKey: 'noPhone' },
    { id: 'noWebsite', label: 'Senza sito', countKey: 'noWebsite' },
    { id: 'noDescription', label: 'Senza descrizione', countKey: 'noDescription' },
    { id: 'noHours', label: 'Senza orari', countKey: 'noHours' },
    { id: 'placeholderHours', label: 'Orari placeholder', countKey: 'placeholderHours' },
    { id: 'noCoordinates', label: 'Senza coordinate', countKey: 'noCoordinates' },
    { id: 'noImage', label: 'Senza copertina', countKey: 'noImage' },
    { id: 'genericDiscipline', label: 'Fitness generico', countKey: 'genericDiscipline' },
    { id: 'disciplineNeedsReview', label: 'Disciplina da verificare', countKey: 'disciplineNeedsReview' },
    { id: 'unverified', label: 'Non verificata', countKey: 'unverified' },
    { id: 'claimPending', label: 'Claim pending', countKey: 'claimPending' },
    { id: 'contaminatedData', label: 'Dati sospetti', countKey: 'contaminatedData' },
    { id: 'suspiciousCity', label: 'Citta sospetta', countKey: 'suspiciousCity' },
    { id: 'capAsCity', label: 'CAP come citta', countKey: 'capAsCity' },
    { id: 'duplicateSlug', label: 'Slug duplicato', countKey: 'duplicateSlug' }
  ];

  const sortOptions = [
    { id: 'quality-asc', label: 'Qualita piu bassa' },
    { id: 'quality-desc', label: 'Qualita piu alta' },
    { id: 'updated-desc', label: 'Aggiornate di recente' },
    { id: 'city-asc', label: 'Citta' },
    { id: 'discipline-asc', label: 'Disciplina' },
    { id: 'claim-first', label: 'Claim pending' },
    { id: 'issues-desc', label: 'Piu incomplete' }
  ];

  let activeFilter = 'lowQuality';
  let query = '';
  let sortMode = 'quality-asc';
  let selectedNormalizationIds = [];

  $: normalizedQuery = query.trim().toLowerCase();
  $: filteredGyms = data.gyms
    .filter((gym) => {
      const flags = gym.qualityFlags || {};
      if (activeFilter === 'lowQuality' && Number(gym.data_quality_score || 0) >= 40) return false;
      if (activeFilter === 'mediumQuality' && !(Number(gym.data_quality_score || 0) >= 40 && Number(gym.data_quality_score || 0) <= 70)) return false;
      if (activeFilter === 'highQuality' && Number(gym.data_quality_score || 0) <= 70) return false;
      if (!['all', 'lowQuality', 'mediumQuality', 'highQuality'].includes(activeFilter) && !flags[activeFilter]) return false;
      if (!normalizedQuery) return true;

      return [gym.name, gym.city, gym.address, gym.discipline, gym.issueLabels.join(' '), gym.claim?.requester]
        .join(' | ')
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((left, right) => {
      if (sortMode === 'quality-desc') return Number(right.data_quality_score || 0) - Number(left.data_quality_score || 0);
      if (sortMode === 'updated-desc') return String(right.updated_at || '').localeCompare(String(left.updated_at || ''));
      if (sortMode === 'city-asc') return String(left.city || '').localeCompare(String(right.city || ''), 'it');
      if (sortMode === 'discipline-asc') return String(left.discipline || '').localeCompare(String(right.discipline || ''), 'it');
      if (sortMode === 'claim-first') return Number(Boolean(right.qualityFlags?.claimPending)) - Number(Boolean(left.qualityFlags?.claimPending));
      if (sortMode === 'issues-desc') return Number(right.issueCount || 0) - Number(left.issueCount || 0);
      return Number(left.data_quality_score || 0) - Number(right.data_quality_score || 0);
    });
  $: selectedNormalizationValue = selectedNormalizationIds.join(',');

  function filterButtonClass(filterId) {
    const base =
      'rounded-2xl border px-3 py-2 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-900';
    return activeFilter === filterId
      ? `${base} border-emerald-800 bg-emerald-800 text-white shadow-md`
      : `${base} border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50`;
  }

  function scoreClass(score) {
    if (score < 40) return 'bg-red-600';
    if (score <= 70) return 'bg-amber-500';
    return 'bg-emerald-700';
  }

  function scoreBadgeClass(score) {
    if (score < 40) return 'bg-red-50 text-red-800 ring-red-200';
    if (score <= 70) return 'bg-amber-50 text-amber-900 ring-amber-200';
    return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  }
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">Qualita schede</p>
        <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Dashboard qualita</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Prioritizza schede deboli, claim aperti e dati incompleti. Le azioni di scrittura sono singole, confermate e usano soft-delete quando archiviano.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <a href="/admin/schede" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Gestione schede</a>
        <a href="/admin/richieste" class="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800">Claim</a>
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
        Merge completato: la scheda duplicata e stata archiviata, non eliminata.
      </div>
    {/if}
    {#if data.normalized}
      <div class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
        Discipline normalizzate sulle schede selezionate.
      </div>
    {/if}
    {#if data.verified}
      <div class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
        Scheda segnata come verificata.
      </div>
    {/if}
    {#if data.archived}
      <div class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
        Scheda archiviata con soft-delete.
      </div>
    {/if}
    {#if !data.persistentWrites}
      <div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        Scrittura non disponibile in questo ambiente. Puoi consultare la dashboard, ma le azioni di modifica sono disattivate.
      </div>
    {/if}

    <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Attive</p>
        <p class="mt-2 text-3xl font-black text-slate-900">{data.stats.all}</p>
      </div>
      <div class="rounded-2xl border border-red-200 bg-red-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Sotto 40</p>
        <p class="mt-2 text-3xl font-black text-red-900">{data.stats.lowQuality}</p>
      </div>
      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">40-70</p>
        <p class="mt-2 text-3xl font-black text-amber-950">{data.stats.mediumQuality}</p>
      </div>
      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Sopra 70</p>
        <p class="mt-2 text-3xl font-black text-emerald-900">{data.stats.highQuality}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Claim pending</p>
        <p class="mt-2 text-3xl font-black text-slate-900">{data.stats.claimPending}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Senza contatti</p>
        <p class="mt-2 text-3xl font-black text-slate-900">{data.stats.noPhone + data.stats.noWebsite}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Senza cover</p>
        <p class="mt-2 text-3xl font-black text-slate-900">{data.stats.noImage}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Dati sospetti</p>
        <p class="mt-2 text-3xl font-black text-slate-900">{data.stats.contaminatedData + data.stats.suspiciousCity}</p>
      </div>
    </div>
  </section>

  <section class="sticky top-24 z-20 mt-5 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-lg backdrop-blur-sm">
    <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px_280px] xl:items-end">
      <div class="max-h-48 overflow-auto pr-1">
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {#each filters as filter}
            <button type="button" class={filterButtonClass(filter.id)} on:click={() => (activeFilter = filter.id)}>
              <span class="block text-lg font-black">{data.stats[filter.countKey]}</span>
              <span class="mt-0.5 block">{filter.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <label class="grid gap-1 text-sm font-bold text-slate-700">
        Ordina
        <select bind:value={sortMode} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none ring-emerald-900 transition focus:ring-2">
          {#each sortOptions as option}
            <option value={option.id}>{option.label}</option>
          {/each}
        </select>
      </label>

      <label class="grid gap-1 text-sm font-bold text-slate-700">
        Cerca
        <input
          id="quality-search"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none ring-emerald-900 transition focus:ring-2"
          bind:value={query}
          placeholder="Nome, citta, problema"
        />
      </label>
    </div>
    <p class="mt-3 text-sm font-semibold text-slate-700">Risultati: {filteredGyms.length} su {data.stats.all}</p>
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
                    <p class="text-slate-600">{gym.city || 'Citta non indicata'} - {gym.address_display || 'Indirizzo non disponibile'}</p>
                  </div>
                {/each}
              </div>

              <form method="POST" action="?/mergeGyms" class="mt-4 grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="grid gap-1 text-sm font-semibold text-slate-800">
                    Scheda da tenere
                    <select name="keep_id" class="rounded-xl border border-slate-200 bg-white px-3 py-2" required disabled={!data.persistentWrites}>
                      {#each group.gyms as gym}
                        <option value={gym.id}>{gym.name} - {gym.city || 'senza citta'}</option>
                      {/each}
                    </select>
                  </label>
                  <label class="grid gap-1 text-sm font-semibold text-slate-800">
                    Scheda da archiviare
                    <select name="archive_id" class="rounded-xl border border-slate-200 bg-white px-3 py-2" required disabled={!data.persistentWrites}>
                      {#each group.gyms as gym, index}
                        <option value={gym.id} selected={index === 1}>{gym.name} - {gym.city || 'senza citta'}</option>
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
                    <span class="text-slate-600">{candidate.city || 'Citta non indicata'}</span>
                  </span>
                </span>
                <span class="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                  {candidate.current || 'Vuoto'} -> <strong>{candidate.normalized}</strong>
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
          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl font-bold text-slate-900">{gym.name}</h2>
                <span class={`rounded-full px-3 py-1 text-xs font-black ring-1 ${scoreBadgeClass(gym.data_quality_score)}`}>
                  qualita {gym.data_quality_score}/100
                </span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{gym.issueCount} problemi</span>
                {#if gym.claim}
                  <a href={gym.claim.href} class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900 hover:bg-blue-100">
                    Claim {gym.claim.status}
                  </a>
                {/if}
              </div>

              <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div class={`h-full ${scoreClass(gym.data_quality_score)}`} style={`width: ${Math.max(4, gym.data_quality_score)}%`}></div>
              </div>

              <p class="mt-3 text-sm text-slate-600">{gym.discipline || 'Disciplina non indicata'} - {gym.city || 'Citta non indicata'}</p>
              <p class="mt-1 text-sm text-slate-700">{gym.address_display || 'Indirizzo non disponibile'}</p>

              <div class="mt-3 flex flex-wrap gap-2">
                {#each gym.issueLabels as issue}
                  <span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">{issue}</span>
                {/each}
              </div>
            </div>

            <div class="grid gap-2">
              <a href={`/admin/gyms/${gym.id}`} class="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">
                Modifica scheda
              </a>
              <a href={gym.publicHref} target="_blank" rel="noreferrer" class="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-50">
                Apri pubblica
              </a>
              {#if gym.claim}
                <a href={gym.claim.href} class="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-900 hover:bg-blue-100">
                  Apri claim
                </a>
              {/if}
              <button
                type="button"
                class="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-50"
                on:click={() => navigator.clipboard?.writeText(gym.publicHref)}
              >
                Copia link pubblico
              </button>
              {#if gym.qualityFlags?.unverified}
                <form method="POST" action="?/verifyGym">
                  <input type="hidden" name="id" value={gym.id} />
                  <button
                    type="submit"
                    class="inline-flex min-h-[2.5rem] w-full items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={!data.persistentWrites}
                  >
                    Segna verificata
                  </button>
                </form>
              {/if}
              <details class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
                <summary class="cursor-pointer font-bold text-red-900">Archivia</summary>
                <form method="POST" action="?/archiveGym" class="mt-3 grid gap-2">
                  <input type="hidden" name="id" value={gym.id} />
                  <label class="grid gap-1 font-semibold text-red-950">
                    Scrivi ARCHIVIA
                    <input name="confirm_text" class="rounded-lg border border-red-200 bg-white px-3 py-2" autocomplete="off" disabled={!data.persistentWrites} />
                  </label>
                  <button type="submit" class="rounded-lg bg-red-700 px-3 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300" disabled={!data.persistentWrites}>
                    Archivia scheda
                  </button>
                </form>
              </details>
            </div>
          </div>
        </article>
      {/each}
    {/if}
  </section>
</main>
