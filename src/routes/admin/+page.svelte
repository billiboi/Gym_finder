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
        <a href="/admin/schede" class="mt-3 inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800">Apri gestione schede (modifica + elimina)</a>
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
