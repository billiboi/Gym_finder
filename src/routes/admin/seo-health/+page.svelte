<script>
  export let data;

  const filters = [
    { id: 'all', label: 'Tutto' },
    { id: 'issues', label: 'Solo problemi' },
    { id: 'aliases', label: 'Alias attivi' },
    { id: 'empty', label: 'Discipline senza schede' },
    { id: 'legacy', label: 'Discipline legacy' },
    { id: 'duplicates', label: 'Slug duplicati' },
    { id: 'redirects', label: 'Redirect configurati' },
    { id: 'canonical', label: 'Canonical' }
  ];

  let activeFilter = 'issues';
  let query = '';

  $: normalizedQuery = query.trim().toLowerCase();
  $: visibleDisciplines = data.disciplineRows.filter((row) => {
    if (activeFilter === 'empty' && row.count !== 0) return false;
    if (activeFilter === 'aliases' && row.aliases.length === 0) return false;
    if (activeFilter === 'issues' && row.count > 0 && row.aliases.length > 0) return false;
    if (!normalizedQuery) return true;
    return [row.name, row.slug, row.aliases.map((alias) => alias.alias).join(' ')]
      .join(' | ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
  $: visibleAliases = data.aliasRows.filter((row) => {
    if (!['all', 'aliases', 'redirects'].includes(activeFilter)) return false;
    if (!normalizedQuery) return true;
    return [row.alias, row.alias_slug, row.discipline_name, row.discipline_slug]
      .join(' | ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
  $: visibleLegacy = data.legacyDisciplineRows.filter((row) => {
    if (!['all', 'issues', 'legacy'].includes(activeFilter)) return false;
    if (!normalizedQuery) return true;
    return [row.raw, row.canonical, row.gym.name, row.gym.city].join(' | ').toLowerCase().includes(normalizedQuery);
  });
  $: visibleDuplicates = data.duplicateSlugs.filter((row) => {
    if (!['all', 'issues', 'duplicates'].includes(activeFilter)) return false;
    if (!normalizedQuery) return true;
    return [row.slug, row.gyms.map((gym) => gym.name).join(' ')].join(' | ').toLowerCase().includes(normalizedQuery);
  });
  $: visibleLegacySlugs = data.legacySlugRows.filter((row) => {
    if (!['all', 'redirects'].includes(activeFilter)) return false;
    if (!normalizedQuery) return true;
    return [row.legacySlug, row.canonicalSlug, row.gym.name, row.gym.city].join(' | ').toLowerCase().includes(normalizedQuery);
  });
  $: visibleCanonicalChecks = data.canonicalChecks.filter((row) => {
    if (!['all', 'canonical', 'issues'].includes(activeFilter)) return false;
    if (activeFilter === 'issues' && row.status === 'Configurato') return false;
    if (!normalizedQuery) return true;
    return [row.type, row.label, row.path, row.status].join(' | ').toLowerCase().includes(normalizedQuery);
  });

  function filterClass(filterId) {
    const base =
      'rounded-xl border px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-900';
    return activeFilter === filterId
      ? `${base} border-emerald-800 bg-emerald-800 text-white`
      : `${base} border-slate-200 bg-white text-slate-800 hover:bg-slate-50`;
  }

  function statusClass(ok) {
    return ok
      ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-800'
      : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-amber-900';
  }
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">SEO health</p>
        <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Controllo tecnico SEO</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Vista read-only per controllare canoniche, alias disciplina, vecchi slug scheda e duplicati dopo la normalizzazione.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <a href="/admin" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50">Home admin</a>
        <a href={data.sitemapUrl} target="_blank" rel="noreferrer" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">Sitemap</a>
        <a href={data.robotsUrl} target="_blank" rel="noreferrer" class="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50">Robots</a>
      </div>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Schede attive</p>
        <p class="mt-2 text-3xl font-black text-slate-950">{data.stats.activeGyms}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Canoniche</p>
        <p class="mt-2 text-3xl font-black text-slate-950">{data.stats.canonicalDisciplines}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Alias</p>
        <p class="mt-2 text-3xl font-black text-slate-950">{data.stats.aliases}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Senza schede</p>
        <p class="mt-2 text-3xl font-black text-slate-950">{data.stats.disciplineWithoutGyms}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Legacy</p>
        <p class="mt-2 text-3xl font-black text-slate-950">{data.stats.legacyDisciplines}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Duplicati</p>
        <p class="mt-2 text-3xl font-black text-slate-950">{data.stats.duplicateSlugs}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Vecchi slug</p>
        <p class="mt-2 text-3xl font-black text-slate-950">{data.stats.legacyGymSlugs}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Canonical KO</p>
        <p class="mt-2 text-3xl font-black text-slate-950">{data.stats.missingCanonical}</p>
      </div>
    </div>
  </section>

  <section class="sticky top-24 z-20 mt-5 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-lg backdrop-blur-sm">
    <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
      <div class="flex flex-wrap gap-2">
        {#each filters as filter}
          <button type="button" class={filterClass(filter.id)} on:click={() => (activeFilter = filter.id)}>
            {filter.label}
          </button>
        {/each}
      </div>
      <label class="grid gap-1 text-sm font-bold text-slate-700">
        Cerca
        <input
          bind:value={query}
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none ring-emerald-900 transition focus:ring-2"
          placeholder="Disciplina, alias, slug, palestra"
        />
      </label>
    </div>
  </section>

  {#if visibleCanonicalChecks.length}
    <section class="mt-5 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Canonical</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-950">Pagine e segnali canonici</h2>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{visibleCanonicalChecks.length} righe</span>
      </div>
      <div class="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th class="px-4 py-3">Tipo</th>
              <th class="px-4 py-3">Pagina</th>
              <th class="px-4 py-3">Canonical</th>
              <th class="px-4 py-3">Stato</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            {#each visibleCanonicalChecks as check}
              <tr>
                <td class="px-4 py-3 font-bold text-slate-800">{check.type}</td>
                <td class="px-4 py-3">
                  <a href={check.path} target="_blank" rel="noreferrer" class="font-bold text-emerald-800 hover:underline">{check.label}</a>
                  <p class="text-xs text-slate-500">{check.path}</p>
                </td>
                <td class="px-4 py-3">
                  <a href={check.canonical} target="_blank" rel="noreferrer" class="text-slate-700 hover:underline">{check.canonical}</a>
                </td>
                <td class="px-4 py-3"><span class={statusClass(check.status === 'Configurato')}>{check.status}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  {#if visibleDisciplines.length}
    <section class="mt-5 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Discipline</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-950">Canoniche e alias collegati</h2>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{visibleDisciplines.length} discipline</span>
      </div>
      <div class="mt-4 grid gap-3">
        {#each visibleDisciplines as row}
          <article class="rounded-2xl border border-slate-200 bg-white p-4">
            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-black text-slate-950">{row.name}</h3>
                  <span class={statusClass(row.count > 0)}>{row.count > 0 ? `${row.count} schede` : 'Senza schede'}</span>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-700">{row.indexableCount} indicizzabili</span>
                </div>
                <p class="mt-1 text-sm text-slate-600">{row.slug}</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  {#each row.aliases as alias}
                    <a href={alias.aliasUrl} target="_blank" rel="noreferrer" class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-white">
                      {alias.alias} -> {row.name}
                    </a>
                  {/each}
                  {#if row.aliases.length === 0}
                    <span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">Nessun alias configurato</span>
                  {/if}
                </div>
              </div>
              <div class="grid gap-2">
                <a href={`/discipline/${row.slug}`} target="_blank" rel="noreferrer" class="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">Apri pagina pubblica</a>
                <button type="button" class="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900" on:click={() => navigator.clipboard?.writeText(row.canonicalUrl)}>
                  Copia URL canonico
                </button>
              </div>
            </div>
            {#if row.examples.length}
              <div class="mt-3 flex flex-wrap gap-2">
                {#each row.examples as gym}
                  <a href={gym.adminUrl} class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 hover:bg-emerald-100">
                    {gym.name}{gym.city ? ` · ${gym.city}` : ''}
                  </a>
                {/each}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </section>
  {/if}

  {#if visibleAliases.length}
    <section class="mt-5 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Alias</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-950">Redirect alias disciplina</h2>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{visibleAliases.length} alias</span>
      </div>
      <div class="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th class="px-4 py-3">Alias</th>
              <th class="px-4 py-3">Canonico</th>
              <th class="px-4 py-3">URL alias</th>
              <th class="px-4 py-3">Stato</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            {#each visibleAliases as row}
              <tr>
                <td class="px-4 py-3 font-bold text-slate-900">{row.alias}</td>
                <td class="px-4 py-3">{row.discipline_name}</td>
                <td class="px-4 py-3"><a href={row.aliasUrl} target="_blank" rel="noreferrer" class="text-emerald-800 hover:underline">/{row.alias_slug}</a></td>
                <td class="px-4 py-3"><span class={statusClass(row.hasCanonical)}>{row.hasCanonical ? row.redirectStatus : 'Canonico mancante'}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  {#if visibleLegacy.length}
    <section class="mt-5 rounded-3xl border border-amber-200 bg-amber-50/90 p-5 shadow-lg">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-amber-900">Legacy</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-950">Schede con discipline legacy</h2>
        </div>
        <span class="rounded-full bg-white px-3 py-1 text-sm font-bold text-amber-900">{visibleLegacy.length} valori</span>
      </div>
      <div class="mt-4 grid gap-2">
        {#each visibleLegacy as row}
          <article class="grid gap-3 rounded-2xl border border-amber-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div>
              <h3 class="font-black text-slate-950">{row.gym.name}</h3>
              <p class="mt-1 text-sm text-slate-600">{row.raw} -> <strong>{row.canonical}</strong></p>
              <p class="mt-1 text-xs text-slate-500">{row.gym.city || 'Città non indicata'}</p>
            </div>
            <div class="grid gap-2">
              <a href={row.gym.adminUrl} class="inline-flex min-h-[2.4rem] items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">Apri in admin</a>
              <a href={row.aliasUrl} target="_blank" rel="noreferrer" class="inline-flex min-h-[2.4rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-50">Test alias</a>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}

  {#if visibleDuplicates.length}
    <section class="mt-5 rounded-3xl border border-red-200 bg-red-50/90 p-5 shadow-lg">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-red-900">Duplicati</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-950">Slug scheda duplicati</h2>
        </div>
        <span class="rounded-full bg-white px-3 py-1 text-sm font-bold text-red-900">{visibleDuplicates.length} gruppi</span>
      </div>
      <div class="mt-4 grid gap-3">
        {#each visibleDuplicates as row}
          <article class="rounded-2xl border border-red-200 bg-white p-4">
            <h3 class="font-black text-slate-950">{row.slug}</h3>
            <a href={row.url} target="_blank" rel="noreferrer" class="mt-1 block text-sm text-emerald-800 hover:underline">{row.url}</a>
            <div class="mt-3 flex flex-wrap gap-2">
              {#each row.gyms as gym}
                <a href={gym.adminUrl} class="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-900 hover:bg-red-100">{gym.name}{gym.city ? ` · ${gym.city}` : ''}</a>
              {/each}
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}

  {#if visibleLegacySlugs.length}
    <section class="mt-5 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Redirect schede</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-950">Vecchi slug ancora supportati</h2>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{visibleLegacySlugs.length} redirect</span>
      </div>
      <div class="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th class="px-4 py-3">Scheda</th>
              <th class="px-4 py-3">Vecchio URL</th>
              <th class="px-4 py-3">Nuovo URL</th>
              <th class="px-4 py-3">Stato</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            {#each visibleLegacySlugs as row}
              <tr>
                <td class="px-4 py-3"><a href={row.gym.adminUrl} class="font-bold text-slate-900 hover:underline">{row.gym.name}</a></td>
                <td class="px-4 py-3"><a href={row.legacyUrl} target="_blank" rel="noreferrer" class="text-emerald-800 hover:underline">{row.legacySlug}</a></td>
                <td class="px-4 py-3"><a href={row.canonicalUrl} target="_blank" rel="noreferrer" class="text-slate-700 hover:underline">{row.canonicalSlug}</a></td>
                <td class="px-4 py-3"><span class={statusClass(true)}>{row.redirectStatus}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  {#if !visibleDisciplines.length && !visibleAliases.length && !visibleLegacy.length && !visibleDuplicates.length && !visibleLegacySlugs.length && !visibleCanonicalChecks.length}
    <section class="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm font-semibold text-slate-600">
      Nessun risultato per i filtri selezionati.
    </section>
  {/if}
</main>
