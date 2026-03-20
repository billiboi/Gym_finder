<script>
  export let data;
  export let form;

  let q = '';
  let suspiciousOnly = false;
  let selectedIds = [];

  function toggleSelection(id) {
    selectedIds = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
  }

  function toggleSelectAllVisible() {
    const visibleIds = filtered.map((gym) => gym.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    selectedIds = allVisibleSelected
      ? selectedIds.filter((id) => !visibleIds.includes(id))
      : [...new Set([...selectedIds, ...visibleIds])];
  }

  function submitBulkAction(event, message) {
    if (!selectedIds.length) {
      event.preventDefault();
      return;
    }

    if (message && !confirm(message)) {
      event.preventDefault();
    }
  }

  $: query = q.trim().toLowerCase();
  $: filtered = data.gyms.filter((gym) => {
    if (suspiciousOnly && gym.suspiciousScore === 0) return false;
    if (!query) return true;

    return [gym.name, gym.disciplineText, gym.address, gym.website]
      .join(' | ')
      .toLowerCase()
      .includes(query);
  });
  $: visibleIds = filtered.map((gym) => gym.id);
  $: selectedIds = selectedIds.filter((id) => data.gyms.some((gym) => gym.id === id));
  $: selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  $: allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
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
        Disciplina confermata o aggiornata con successo.
      </p>
    {/if}

    {#if data.deleted}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Record eliminato con successo.
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

    <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          on:click={toggleSelectAllVisible}
        >
          {allVisibleSelected ? 'Deseleziona visibili' : 'Seleziona visibili'}
        </button>
        <span class="text-sm font-semibold text-slate-700">
          Selezionati: {selectedIds.length}
        </span>
      </div>

      <form method="POST" action="?/bulkUpdate" class="flex flex-wrap gap-2" on:submit={(event) => submitBulkAction(event)}>
        <input type="hidden" name="ids" value={JSON.stringify(selectedIds)} />
        <button
          type="submit"
          name="operation"
          value="verify"
          class="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          disabled={!data.persistentWrites || selectedIds.length === 0}
        >
          Verifica selezionate
        </button>
        <button
          type="submit"
          name="operation"
          value="unverify"
          class="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          disabled={!data.persistentWrites || selectedIds.length === 0}
        >
          Rimuovi verifica
        </button>
        <button
          type="submit"
          name="operation"
          value="delete"
          class="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
          disabled={!data.persistentWrites || selectedIds.length === 0}
          on:click={(event) => submitBulkAction(event, `Eliminare definitivamente ${selectedIds.length} record selezionati?`)}
        >
          Elimina selezionate
        </button>
      </form>
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
                <label class="inline-flex items-center">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300"
                    checked={selectedIds.includes(gym.id)}
                    on:change={() => toggleSelection(gym.id)}
                  />
                </label>
                <h2 class="text-base font-bold text-slate-900">{gym.name}</h2>
                {#if gym.verified}
                  <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">
                    Verificata
                  </span>
                {/if}
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

            <div class="grid w-full gap-2 sm:w-auto sm:min-w-[420px]">
              <form method="POST" action="?/save" class="grid gap-2">
                <input type="hidden" name="id" value={gym.id} />
                <input type="hidden" name="current_disciplines" value={gym.disciplineText} />
                <input type="hidden" name="verified" value={gym.verified ? '1' : '0'} />
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
                    Salva / conferma
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

              <form method="POST" action="?/toggleVerified">
                <input type="hidden" name="id" value={gym.id} />
                <button
                  type="submit"
                  class={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${gym.verified ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-700 hover:bg-sky-800'}`}
                  disabled={!data.persistentWrites}
                >
                  {gym.verified ? 'Rimuovi verifica' : 'Segna verificata'}
                </button>
              </form>

              <form
                method="POST"
                action="?/delete"
                on:submit={(e) => {
                  if (!confirm(`Eliminare definitivamente il record \"${gym.name}\"?`)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={gym.id} />
                <button
                  type="submit"
                  class="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                  disabled={!data.persistentWrites}
                >
                  Elimina record
                </button>
              </form>
            </div>
          </div>
        </article>
      {/each}
    {/if}
  </section>
</main>
