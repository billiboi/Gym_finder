<script>
  export let data;

  let q = '';

  $: query = q.trim().toLowerCase();
  $: filtered = data.gyms.filter((gym) => {
    if (!query) return true;
    return [gym.name, gym.discipline, gym.address, gym.city]
      .join(' | ')
      .toLowerCase()
      .includes(query);
  });
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Gestione palestre</h1>
        <p class="mt-2 text-sm text-slate-600">Modifica i dati delle schede palestra una per una.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <a href="/admin/schede" class="inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800">Apri gestione schede</a>
          <a href="/admin/riclassifica" class="inline-flex rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">Riclassifica discipline</a>
          <a href="/admin/richieste" class="inline-flex rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800">Richieste palestre</a>
        </div>
      </div>
      <a href="/" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Torna alla pagina utente</a>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={q}
        placeholder="Cerca palestra, disciplina, città"
      />
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Risultati: <strong>{filtered.length}</strong> su {data.gyms.length}
      </div>
    </div>
  </section>

  <section class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <a href="/admin/richieste" class="rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Richieste aperte</p>
      <p class="mt-2 text-3xl font-bold text-slate-900">{data.requestStats.open}</p>
      <p class="mt-1 text-sm text-slate-600">{data.requestStats.new} nuove, {data.requestStats.reviewed} in revisione</p>
    </a>
    <a href="/admin/schede" class="rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Senza contatti</p>
      <p class="mt-2 text-3xl font-bold text-slate-900">{data.qualityStats.noContact}</p>
      <p class="mt-1 text-sm text-slate-600">Schede prive di telefono e sito.</p>
    </a>
    <a href="/admin/schede" class="rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Orari da verificare</p>
      <p class="mt-2 text-3xl font-bold text-slate-900">{data.qualityStats.hoursToVerify}</p>
      <p class="mt-1 text-sm text-slate-600">Priorita utile per fiducia e conversione.</p>
    </a>
    <a href="/admin/schede" class="rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Contatti parziali</p>
      <p class="mt-2 text-3xl font-bold text-slate-900">{data.qualityStats.noPhone + data.qualityStats.noWebsite}</p>
      <p class="mt-1 text-sm text-slate-600">{data.qualityStats.noPhone} senza telefono, {data.qualityStats.noWebsite} senza sito.</p>
    </a>
  </section>

  <section class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#if filtered.length === 0}
      <div class="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Nessuna palestra trovata.
      </div>
    {:else}
      {#each filtered as gym}
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-base font-bold text-slate-900">{gym.name}</h2>
          <p class="mt-1 text-sm text-slate-600">{gym.discipline}</p>
          <p class="mt-1 text-sm text-slate-700">{gym.address || 'Indirizzo non disponibile'}</p>
          <a
            class="mt-3 inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
            href={`/admin/gyms/${gym.id}`}
          >
            Modifica scheda
          </a>
        </article>
      {/each}
    {/if}
  </section>
</main>

