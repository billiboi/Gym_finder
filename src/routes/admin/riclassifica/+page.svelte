<script>
  export let data;
  export let form;

  let q = '';
  let suspiciousOnly = true;

  $: query = q.trim().toLowerCase();
  $: filtered = data.gyms.filter((gym) => {
    if (suspiciousOnly && gym.suspiciousScore === 0) return false;
    if (!query) return true;

    return [gym.name, gym.disciplineText, gym.address, gym.website]
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
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Riclassificazione discipline</h1>
        <p class="mt-2 max-w-3xl text-sm text-slate-600">
          Qui correggi velocemente le schede con disciplina sospetta o troppo generica, senza aprire ogni palestra una per una.
        </p>
      </div>
      <div class="flex gap-2">
        <a href="/admin" class="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Home admin</a>
        <a href="/admin/schede" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Gestione schede</a>
      </div>
    </div>

    {#if data.saved}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Discipline aggiornate con successo.
      </p>
    {/if}

    {#if form?.error}
      <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {form.error}
      </p>
    {/if}

    {#if !data.persistentWrites}
      <p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-800">
        Nel deploy pubblico le modifiche non sono persistenti. Usa l'ambiente locale oppure collega un database.
      </p>
    {/if}

    <div class="mt-5 grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={q}
        placeholder="Cerca per palestra, disciplina o indirizzo"
      />

      <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <input type="checkbox" bind:checked={suspiciousOnly} />
        Mostra solo casi sospetti
      </label>

      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Risultati: <strong>{filtered.length}</strong>
      </div>
    </div>
  </section>

  <section class="mt-5 grid gap-3">
    {#if filtered.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Nessuna palestra trovata con i filtri attuali.
      </div>
    {:else}
      {#each filtered as gym}
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-base font-bold text-slate-900">{gym.name}</h2>
                {#if gym.suspiciousScore > 0}
                  <span class="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800">
                    Da verificare
                  </span>
                {/if}
              </div>
              <p class="mt-1 text-sm text-slate-600">{gym.address || 'Indirizzo non disponibile'}</p>
              <p class="mt-2 text-sm text-slate-700">
                <strong>Attuale:</strong> {gym.disciplineText}
              </p>
            </div>

            <form method="POST" action="?/save" class="grid w-full gap-2 sm:w-auto sm:min-w-[380px]">
              <input type="hidden" name="id" value={gym.id} />
              <label class="grid gap-1">
                <span class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Nuova disciplina
                </span>
                <input
                  name="disciplines"
                  value={gym.disciplineText}
                  class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Es: Judo | JiuJitsu Brasiliano"
                />
              </label>

              <div class="flex flex-wrap gap-2">
                <button
                  type="submit"
                  class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                  disabled={!data.persistentWrites}
                >
                  Salva
                </button>
                {#if gym.website}
                  <a
                    href={gym.website}
                    target="_blank"
                    rel="noreferrer"
                    class="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    Apri sito
                  </a>
                {/if}
              </div>
            </form>
          </div>
        </article>
      {/each}
    {/if}
  </section>
</main>
