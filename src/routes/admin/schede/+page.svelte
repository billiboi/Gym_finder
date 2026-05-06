<script>
  import {
    imageForGym,
    placeholderImageForDiscipline,
    primaryDisciplineForGym,
    resolveAvailableStockImage,
    selectRandomStockImage,
    stockImageForDiscipline
  } from '$lib/gym-detail';

  export let data;
  export let form;

  let q = '';
  let selectedGymId = '';
  let createDisciplineInput = '';
  let qualityFilter = 'all';
  let modalDirty = false;

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
    modalDirty = false;
  }

  function closeEditModal() {
    if (modalDirty && !confirm('Ci sono modifiche non salvate. Chiudere la modale?')) return;
    selectedGymId = '';
    modalDirty = false;
  }

  function activeGyms(gyms) {
    return gyms.filter((gym) => !gym.archived);
  }

  function matchesQualityFilter(gym, filter) {
    if (filter === 'archived') return gym.archived;
    if (gym.archived) return false;
    if (filter === 'no-phone') return gym.problems?.noPhone;
    if (filter === 'no-website') return gym.problems?.noWebsite;
    if (filter === 'hours-to-verify') return gym.problems?.hoursToVerify;
    if (filter === 'generic-discipline') return gym.problems?.genericDiscipline;
    if (filter === 'low-quality') return Number(gym.data_quality_score || 0) < 60;
    if (filter === 'verified') return gym.verified;
    if (filter === 'premium') return gym.premium;
    return true;
  }

  function filterButtonClass(filter) {
    return `rounded-2xl border px-3 py-3 text-left text-sm transition ${
      qualityFilter === filter
        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
        : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'
    }`;
  }

  function previewAssetsForDiscipline(disciplineText) {
    const discipline = primaryDisciplineForGym({ discipline: disciplineText });
    const image = imageForGym({ discipline: disciplineText });
    const imageMeta =
      typeof image === 'string' ? { src: image, candidates: [image], fallback: image } : image;
    return {
      discipline,
      stockBase: stockImageForDiscipline(discipline),
      stockResolved: resolveAvailableStockImage(discipline),
      stockSelected: selectRandomStockImage(discipline, disciplineText || discipline),
      src: imageMeta.src,
      candidates: imageMeta.candidates,
      fallback: imageMeta.fallback || placeholderImageForDiscipline(discipline)
    };
  }

  function handlePreviewError(event, preview) {
    const img = event.currentTarget;
    if (!img || !preview) return;

    const nextIndex = Number(img.dataset.imageIndex || '0') + 1;
    if (nextIndex < preview.candidates.length) {
      img.dataset.imageIndex = String(nextIndex);
      img.src = preview.candidates[nextIndex];
      return;
    }

    if (preview.fallback && img.dataset.fallbackApplied !== '1') {
      img.dataset.fallbackApplied = '1';
      img.src = preview.fallback;
    }
  }

  $: query = q.trim().toLowerCase();
  $: visibleBaseGyms = activeGyms(data.gyms);
  $: qualityStats = {
    all: visibleBaseGyms.length,
    noPhone: visibleBaseGyms.filter((gym) => gym.problems?.noPhone).length,
    noWebsite: visibleBaseGyms.filter((gym) => gym.problems?.noWebsite).length,
    hoursToVerify: visibleBaseGyms.filter((gym) => gym.problems?.hoursToVerify).length,
    genericDiscipline: visibleBaseGyms.filter((gym) => gym.problems?.genericDiscipline).length,
    lowQuality: visibleBaseGyms.filter((gym) => Number(gym.data_quality_score || 0) < 60).length,
    verified: visibleBaseGyms.filter((gym) => gym.verified).length,
    premium: visibleBaseGyms.filter((gym) => gym.premium).length,
    archived: data.gyms.filter((gym) => gym.archived).length
  };
  $: filtered = data.gyms.filter((gym) => {
    const matchesQuery = !query || [gym.name, disciplinesForGym(gym).join(' | '), gym.address_display, gym.city]
      .join(' | ')
      .toLowerCase()
      .includes(query);

    if (!matchesQuery) return false;
    return matchesQualityFilter(gym, qualityFilter);
  });
  $: selectedGym = data.gyms.find((gym) => gym.id === selectedGymId) || null;
  $: createPreview = previewAssetsForDiscipline(createDisciplineInput);
  $: selectedPreview = selectedGym
    ? previewAssetsForDiscipline(disciplinesForGym(selectedGym).join(' | '))
    : null;
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Gestione schede palestre</h1>
        <p class="mt-2 text-sm text-slate-600">Da questa pagina puoi creare, modificare, archiviare e ripristinare ogni scheda palestra.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/admin/export/gyms.csv" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Esporta CSV backup</a>
        <a href="/admin/import" class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">Import CSV sicuro</a>
        <a href="/admin" class="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Home admin</a>
        <a href="/" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Pagina utente</a>
      </div>
    </div>

    {#if data.archived}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Scheda palestra archiviata con successo. Il record non è stato cancellato.
      </p>
    {/if}

    {#if data.restored}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Scheda palestra ripristinata con successo.
      </p>
    {/if}

    {#if data.duplicated}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Scheda duplicata con successo. Controlla i dati prima di pubblicarla.
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

    {#if !data.persistentWrites}
      <p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-800">
        Nel deploy pubblico le modifiche admin non sono persistenti. Per creare, modificare o archiviare schede in modo stabile usa l'ambiente locale o configura Supabase.
      </p>
    {/if}

    <div class="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_minmax(160px,auto)]">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={q}
        placeholder="Cerca palestra, disciplina, città"
      />
      <select
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={qualityFilter}
        aria-label="Filtro qualità dati"
      >
        <option value="all">Tutte attive</option>
        <option value="no-phone">Senza telefono</option>
        <option value="no-website">Senza sito</option>
        <option value="hours-to-verify">Orari da verificare</option>
        <option value="generic-discipline">Disciplina generica</option>
        <option value="low-quality">Qualità bassa</option>
        <option value="verified">Verificate</option>
        <option value="premium">Premium</option>
        <option value="archived">Archiviate</option>
      </select>
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Risultati: <strong>{filtered.length}</strong> su {data.gyms.length}
      </div>
    </div>

    <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <button type="button" class={filterButtonClass('all')} on:click={() => (qualityFilter = 'all')}>
        <span class="block text-xl font-bold">{qualityStats.all}</span>
        <span class="font-semibold">tutte attive</span>
      </button>
      <button type="button" class={filterButtonClass('no-phone')} on:click={() => (qualityFilter = 'no-phone')}>
        <span class="block text-xl font-bold">{qualityStats.noPhone}</span>
        <span class="font-semibold">senza telefono</span>
      </button>
      <button type="button" class={filterButtonClass('no-website')} on:click={() => (qualityFilter = 'no-website')}>
        <span class="block text-xl font-bold">{qualityStats.noWebsite}</span>
        <span class="font-semibold">senza sito</span>
      </button>
      <button type="button" class={filterButtonClass('hours-to-verify')} on:click={() => (qualityFilter = 'hours-to-verify')}>
        <span class="block text-xl font-bold">{qualityStats.hoursToVerify}</span>
        <span class="font-semibold">orari da verificare</span>
      </button>
      <button type="button" class={filterButtonClass('generic-discipline')} on:click={() => (qualityFilter = 'generic-discipline')}>
        <span class="block text-xl font-bold">{qualityStats.genericDiscipline}</span>
        <span class="font-semibold">disciplina generica</span>
      </button>
      <button type="button" class={filterButtonClass('low-quality')} on:click={() => (qualityFilter = 'low-quality')}>
        <span class="block text-xl font-bold">{qualityStats.lowQuality}</span>
        <span class="font-semibold">qualità bassa</span>
      </button>
      <button type="button" class={filterButtonClass('verified')} on:click={() => (qualityFilter = 'verified')}>
        <span class="block text-xl font-bold">{qualityStats.verified}</span>
        <span class="font-semibold">verificate</span>
      </button>
      <button type="button" class={filterButtonClass('premium')} on:click={() => (qualityFilter = 'premium')}>
        <span class="block text-xl font-bold">{qualityStats.premium}</span>
        <span class="font-semibold">premium</span>
      </button>
      <button type="button" class={filterButtonClass('archived')} on:click={() => (qualityFilter = 'archived')}>
        <span class="block text-xl font-bold">{qualityStats.archived}</span>
        <span class="font-semibold">archiviate</span>
      </button>
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
        <input
          name="discipline"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Es: Boxe | Kickboxe"
          bind:value={createDisciplineInput}
          required
        />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Indirizzo</span>
        <input name="address" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Città/Località</span>
        <input name="city" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
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
        <input name="website" type="url" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="https://..." />
      </label>

        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Foto copertina</span>
          <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <span class="text-xs text-slate-500">Se non carichi un'immagine, la scheda userà la foto stock della disciplina oppure la cover del brand.</span>
        </label>

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <img
          src={createPreview.src}
          alt={`Anteprima fallback ${createPreview.discipline}`}
          class="h-44 w-full object-cover"
          on:error={(event) => handlePreviewError(event, createPreview)}
        />
        <div class="grid gap-1 border-t border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-600">
          <p><strong class="text-slate-900">Anteprima fallback:</strong> {createPreview.discipline}</p>
          <p>
            {#if createPreview.stockResolved}
              {createPreview.stockResolved.length} foto stock trovate. Rotazione attiva, selezione corrente: <code>{createPreview.stockSelected}</code>
            {:else}
              Nessuna foto stock disponibile per <code>{createPreview.stockBase}</code>: verrà usata la cover del brand.
            {/if}
          </p>
        </div>
      </div>

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
            <p class="mt-1 text-sm font-semibold text-slate-700">{gym.primaryDiscipline}</p>
            <p class="mt-1 text-sm text-slate-700">{gym.address_display || 'Indirizzo non disponibile'}</p>
            <div class="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              {#if gym.problems?.noPhone}
                <span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">telefono mancante</span>
              {/if}
              {#if gym.problems?.noWebsite}
                <span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">sito mancante</span>
              {/if}
              {#if gym.problems?.hoursToVerify}
                <span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">orari da verificare</span>
              {/if}
              {#if gym.problems?.genericDiscipline}
                <span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">disciplina da verificare</span>
              {/if}
              {#if gym.verified}
                <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">verificata</span>
              {/if}
              {#if gym.premium}
                <span class="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">premium</span>
              {/if}
              {#if gym.archived}
                <span class="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">archiviata</span>
              {/if}
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">qualità {gym.data_quality_score}/100</span>
            </div>
          </div>

          <div class="relative z-10 mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
              on:click={() => openEditModal(gym.id)}
            >
              Modifica
            </button>

            <a
              class="inline-flex rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
              href={gym.publicHref}
              target="_blank"
              rel="noreferrer"
            >
              Apri scheda pubblica
            </a>

            <form method="POST" action="?/duplicate">
              <input type="hidden" name="id" value={gym.id} />
              <button
                type="submit"
                class="inline-flex rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-300"
                disabled={!data.persistentWrites}
              >
                Duplica
              </button>
            </form>

            {#if gym.archived}
              <form method="POST" action="?/restore">
                <input type="hidden" name="id" value={gym.id} />
                <button
                  type="submit"
                  class="inline-flex rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
                  disabled={!data.persistentWrites}
                >
                  Ripristina
                </button>
              </form>
            {:else}
              <form method="POST" action="?/delete" on:submit={(e) => {
                if (!confirm(`Archiviare la scheda "${gym.name}"? Potrai ripristinarla dal filtro Archiviate.`)) {
                  e.preventDefault();
                }
              }}>
                <input type="hidden" name="id" value={gym.id} />
                <button
                  type="submit"
                  class="inline-flex rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-800"
                  disabled={!data.persistentWrites}
                >
                  Archivia scheda
                </button>
              </form>
            {/if}
          </div>
        </article>
      {/each}
    {/if}
  </section>

  {#if selectedGym}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/70 bg-white shadow-2xl sc-admin-modal">
        <div class="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-7">
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

        <form method="POST" action="?/update" enctype="multipart/form-data" class="grid gap-4 px-4 py-4 sm:px-7 sm:py-6" on:input={() => (modalDirty = true)}>
          <input type="hidden" name="id" value={selectedGym.id} />

          <section class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Dati principali</h3>
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
              required
            />
          </label>

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Indirizzo</span>
            <input name="address" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.address} required />
          </label>

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Città/Località</span>
            <input name="city" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.city} required />
          </label>
          </section>

          <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Contatti</h3>
          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Telefono</span>
            <input name="phone" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.phone} />
          </label>

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Sito web</span>
            <input name="website" type="url" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={selectedGym.website} placeholder="https://..." />
          </label>
          </section>

          <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Orari</h3>
          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Orari di apertura</span>
            <textarea name="hours_info" rows="4" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">{selectedGym.hours_info}</textarea>
          </label>
          </section>

          <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">SEO / descrizione</h3>
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
                <span class="text-xs text-slate-500">Se vuoto, resta l'immagine attuale; in assenza di foto verrà usata quella stock della disciplina.</span>
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
          {:else if selectedPreview}
            <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <img
                src={selectedPreview.src}
                alt={`Anteprima fallback ${selectedPreview.discipline}`}
                class="h-48 w-full object-cover"
                on:error={(event) => handlePreviewError(event, selectedPreview)}
              />
              <div class="grid gap-1 border-t border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-600">
                <p><strong class="text-slate-900">Fallback attivo:</strong> {selectedPreview.discipline}</p>
                <p>
                  {#if selectedPreview.stockResolved}
                    Rotazione attiva su {selectedPreview.stockResolved.length} immagini. Selezione corrente: <code>{selectedPreview.stockSelected}</code>.
                  {:else}
                    Questa scheda non ha una foto caricata e non esiste ancora una foto stock per <code>{selectedPreview.stockBase}</code>: verrà usata la cover del brand.
                  {/if}
                </p>
              </div>
            </div>
          {/if}

          <label class="grid gap-1">
            <span class="text-sm font-semibold text-slate-700">Breve presentazione</span>
            <textarea name="description" rows="6" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">{selectedGym.description}</textarea>
          </label>
          </section>

          <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Stato scheda</h3>
            <label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="verified" value="1" checked={selectedGym.verified} />
              Scheda verificata
            </label>
            <div class="flex flex-wrap gap-2 text-xs font-bold">
              {#if selectedGym.premium}
                <span class="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">premium</span>
              {/if}
              {#if selectedGym.archived}
                <span class="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">archiviata</span>
              {/if}
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">priorità {selectedGym.priority_score}</span>
            </div>
          </section>

          <div class="sticky bottom-0 -mx-4 mt-2 flex flex-wrap gap-2 border-t border-slate-200 bg-white/95 px-4 pt-4 backdrop-blur-sm sm:-mx-7 sm:px-7">
            <button type="submit" class="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              Salva modifiche
            </button>
            <button type="submit" name="next_action" value="open_public" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              Salva e apri scheda pubblica
            </button>
            <button type="submit" name="verified" value="1" class="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800">
              Salva e segna verificata
            </button>
            <button type="button" class="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300" on:click={closeEditModal}>
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</main>

