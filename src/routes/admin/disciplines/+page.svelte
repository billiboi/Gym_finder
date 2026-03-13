<script>
  export let data;
  export let form;

  let q = '';

  $: query = q.trim().toLowerCase();
  $: filtered = data.disciplines.filter((item) =>
    !query ? true : item.toLowerCase().includes(query)
  );
</script>

<main class="mx-auto min-h-screen w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Gestione discipline</h1>
        <p class="mt-2 text-sm text-slate-600">Aggiungi o rimuovi discipline visibili nei filtri utente.</p>
      </div>
      <div class="flex gap-2">
        <a href="/admin" class="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Home admin</a>
        <a href="/admin/schede" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Gestione schede</a>
      </div>
    </div>

    {#if data.created}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Disciplina aggiunta con successo.
      </p>
    {/if}

    {#if data.deleted}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Disciplina rimossa con successo.
      </p>
    {/if}

    {#if form?.createError}
      <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {@html form.createError}
      </p>
    {/if}

    {#if form?.error}
      <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {form.error}
      </p>
    {/if}

    <form method="POST" action="?/create" class="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        name="name"
        placeholder="Nuova disciplina (es. Sambo)"
        required
      />
      <button type="submit" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
        Aggiungi
      </button>
    </form>

    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={q}
        placeholder="Cerca disciplina"
      />
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Totale: <strong>{filtered.length}</strong> su {data.disciplines.length}
      </div>
    </div>
  </section>

  <section class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#if filtered.length === 0}
      <div class="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Nessuna disciplina trovata.
      </div>
    {:else}
      {#each filtered as discipline}
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-base font-bold text-slate-900">{discipline}</h2>
          <form
            class="mt-3"
            method="POST"
            action="?/delete"
            on:submit={(e) => {
              if (!confirm(`Rimuovere la disciplina \"${discipline}\"?`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="name" value={discipline} />
            <button
              type="submit"
              class="inline-flex rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-800"
            >
              Rimuovi disciplina
            </button>
          </form>
        </article>
      {/each}
    {/if}
  </section>
</main>
