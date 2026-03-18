<script>
  export let data;
  export let form;

  let q = '';
  let selectedGymId = '';

  function disciplinesForGym(gym) {
    if (Array.isArray(gym.disciplines) && gym.disciplines.length) {
      return gym.disciplines.filter(Boolean);
    }
    if (typeof gym.discipline === 'string' && gym.discipline.trim()) {
      return gym.discipline.split('|').map((d) => d.trim()).filter(Boolean);
    }
    return ['Fitness'];
  }

  function openEditModal(id) {
    selectedGymId = id;
  }

  function closeEditModal() {
    selectedGymId = '';
  }

  $: query = q.trim().toLowerCase();
  $: filtered = data.gyms.filter((gym) => {
    if (!query) return true;
    return [gym.name, disciplinesForGym(gym).join(' | '), gym.address_display, gym.city]
      .join(' | ')
      .toLowerCase()
      .includes(query);
  });
  $: selectedGym = data.gyms.find((gym) => gym.id === selectedGymId) || null;
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Gestione schede palestre</h1>
        <p class="mt-2 text-sm text-slate-600">Da questa pagina puoi creare, modificare o eliminare ogni scheda palestra.</p>
      </div>
      <div class="flex gap-2">
        <a href="/admin" class="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Home admin</a>
        <a href="/" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Pagina utente</a>
      </div>
    </div>

    {#if data.deleted}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Scheda palestra eliminata con successo.
      </p>
    {/if}

    {#if data.created}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Nuova scheda palestra creata con successo.
      </p>
    {/if}

    {#if data.updated}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Scheda palestra aggiornata con successo.
      </p>
    {/if}

    {#if form?.createError}
      <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {form.createError}
      </p>
    {/if}

    {#if form?.error}
      <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {form.error}
      </p>
    {/if}

    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={q}
        placeholder="Cerca palestra, disciplina, citta"
      />
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Risultati: <strong>{filtered.length}</strong> su {data.gyms.length}
      </div>
    </div>
  </section>

  <section class="mt-5 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Nuova scheda</p>
        <h2 class="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Aggiungi palestra</h2>
        <p class="mt-2 text-sm text-slate-600">I dati verranno salvati nel CSV insieme alle altre schede.</p>
      </div>
    </div>

    <form method="POST" action="?/create" enctype="multipart/form-data" class="mt-5 grid gap-3">
      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Nome palestra</span>
        <input name="name" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Discipline (separate da |)</span>
        <input name="discipline" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Es: Boxe | Kickboxe" />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Indirizzo</span>
        <input name="address" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Citta/Localita</span>
        <input name="city" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Telefono</span>
        <input name="phone" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Orari di apertura</span>
        <textarea name="hours_info" rows="4" class="rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Sito web</span>
        <input name="website" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Foto copertina</span>
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Breve presentazione</span>
        <textarea
          name="description"
          rows="5"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Descrivi in breve ambiente, servizi, focus della palestra e tipo di pubblico."
        ></textarea>
      </label>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Latitudine</span>
          <input name="latitude" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Longitudine</span>
          <input name="longitude" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>

      <button type="submit" class="mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
        Crea scheda
      </button>
    </form>
  </section>

  <section class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#if filtered.length === 0}
      <div class="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Nessuna palestra trovata.
      </div>
    {:else}
      {#each filtered as gym}
        <article class="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <button
            type="button"
            class="absolute inset-0 rounded-2xl"
            aria-label={`Apri modifica per ${gym.name}`}
            on:click={() => openEditModal(gym.id)}
          ></button>

          <div class="relative z-10">
            <h2 class="text-base font-bold text-slate-900">{gym.name}</h2>
            <p class="mt-1 text-sm text-slate-600">{disciplinesForGym(gym).join(' | ')}</p>
            <p class="mt-1 text-sm text-slate-700">{gym.address_display || 'Indirizzo non disponibile'}</p>
          </div>

          <div class="relative z-10 mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
              on:click={() => openEditModal(gym.id)}
            >
              Modifica in modale
            </button>

            <a
              class="inline-flex rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
              href={gym.publicHref}
              target="_blank"
              rel="noreferrer"
            >
              Apri scheda pubblica
            </a>

            <form method="POST" action="?/delete" on:submit={(e) => {
              if (!confirm(`Eliminare definitivamente la palestra \"${gym.name}\"?`)) {
                e.preventDefault();
              }
            }}>
              <input type="hidden" name="id" value={gym.id} />
              <button
                type="submit"
                class="inline-flex rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-800"
              >
                Elimina palestra
              </button>
            </form>
          </div>
        </article>
      {/each}
    {/if}
  </section>

  {#if selectedGym}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-5 shadow-2xl sm:p-7">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Modifica scheda</p>
            <h2 class="mt-1 text-2xl font-bold text-slate-900">{selectedGym.name}</h2>
            <p class="mt-2 text-sm text-slate-600">Aggiorna contenuti della pagina dettaglio senza uscire dall'elenco.</p>
          </div>
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            on:click={closeEditModal}
          >
            Chiudi
          </button>
        </div>

        <form method="POST" action="?/update" enctype="multipart/form-data" class="mt-5 grid gap-3">
          <input type="hidden" name="id" value={selectedGym.id} />

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Nome palestra</span>
            <input name="name" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.name} required />
          </label>

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Discipline (separate da |)</span>
            <input
              name="discipline"
              class="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={disciplinesForGym(selectedGym).join(' | ')}
            />
          </label>

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Indirizzo</span>
            <input name="address" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.address} required />
          </label>

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Citta/Localita</span>
            <input name="city" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.city} />
          </label>

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Telefono</span>
            <input name="phone" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.phone} />
          </label>

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Orari di apertura</span>
            <textarea name="hours_info" rows="4" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">{selectedGym.hours_info}</textarea>
          </label>

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Sito web</span>
            <input name="website" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.website} />
          </label>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">Latitudine</span>
              <input name="latitude" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.latitude} />
            </label>
            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">Longitudine</span>
              <input name="longitude" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.longitude} />
            </label>
          </div>

          <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">Foto copertina</span>
              <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" name="replace_image" value="1" />
              Sostituisci immagine attuale
            </label>
          </div>

          {#if selectedGym.image_url}
            <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <img src={selectedGym.image_url} alt={`Anteprima ${selectedGym.name}`} class="h-48 w-full object-cover" />
            </div>
          {/if}

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Breve presentazione</span>
            <textarea name="description" rows="6" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">{selectedGym.description}</textarea>
          </label>

          <div class="flex flex-wrap gap-2 pt-2">
            <button type="submit" class="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              Salva modifiche
            </button>
            <a href={selectedGym.publicHref} target="_blank" rel="noreferrer" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              Apri scheda pubblica
            </a>
            <button type="button" class="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300" on:click={closeEditModal}>
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</main>
