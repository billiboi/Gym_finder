<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import {
    imageForGym,
    placeholderImageForDiscipline,
    primaryDisciplineForGym,
    resolveAvailableStockImage,
    selectRandomStockImage,
    stockImageForDiscipline
  } from '$lib/gym-detail';
  import { firstAliasNotice } from '$lib/discipline-alias-ui';

  export let data;
  export let form;

  let q = '';
  let appliedServerQ = '';
  let qualityFilter = 'all';
  let newDisciplineInput = '';

  function disciplinesForGym(gym) {
    if (Array.isArray(gym.disciplines) && gym.disciplines.length) {
      return gym.disciplines.filter(Boolean);
    }
    if (typeof gym.discipline === 'string' && gym.discipline.trim()) {
      return gym.discipline.split('|').map((d) => d.trim()).filter(Boolean);
    }
    return ['Fitness'];
  }

  function closeNewModal() {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('new');
    goto(`${nextUrl.pathname}${nextUrl.search}`, { replaceState: true, noScroll: true, keepFocus: true });
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
  $: if ((data.q || '') !== appliedServerQ) {
    q = data.q || '';
    appliedServerQ = data.q || '';
  }
  $: showNewModal = $page.url.searchParams.get('new') === '1';
  $: newPreview = previewAssetsForDiscipline(newDisciplineInput);
  $: newAliasNotice = firstAliasNotice(newDisciplineInput, data.aliasSuggestions);
  $: paginationStart = data.gyms.length ? Number(data.offset || 0) + 1 : 0;
  $: paginationEnd = Number(data.offset || 0) + data.gyms.length;
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <datalist id="discipline-canonical-options">
    {#each data.disciplineOptions || [] as option}
      <option value={option}>{option}</option>
    {/each}
    {#each data.aliasSuggestions || [] as suggestion}
      <option value={suggestion.alias}>{suggestion.alias} -> {suggestion.discipline_name}</option>
    {/each}
  </datalist>

  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Gestione schede palestre</h1>
        <p class="mt-2 text-sm text-slate-600">Da questa pagina puoi creare, archiviare e ripristinare ogni scheda palestra. Per modificare una scheda, apri "Modifica".</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/admin/schede?new=1" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Nuova scheda</a>
        <form method="POST" action="/admin/export/gyms.csv">
          <button type="submit" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Esporta CSV backup</button>
        </form>
        <a href="/admin/candidati/importa-csv" class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">Import CSV sicuro</a>
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
        Modifiche admin bloccate: questo pannello deve scrivere su Supabase, ma la chiave server non è disponibile nell'ambiente corrente. Verifica SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY su Vercel.
      </p>
    {:else}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-900">
        Database collegato: le modifiche admin vengono salvate sulla tabella {data.storeStatus?.table || 'gyms'} di Supabase.
      </p>
    {/if}

    <form method="GET" action="/admin/schede" class="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_minmax(160px,auto)]">
      <input type="hidden" name="limit" value={data.limit || 50} />
      <input type="hidden" name="offset" value="0" />
      <input type="hidden" name="archived" value={data.archivedMode || 'active'} />
      <input
        name="q"
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
        Risultati pagina: <strong>{filtered.length}</strong> su {data.gyms.length}
      </div>
      <div class="flex flex-wrap gap-2 sm:col-span-3">
        <button type="submit" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Cerca
        </button>
        <a
          href={`/admin/schede?limit=${data.limit || 50}&offset=0&archived=${data.archivedMode || 'active'}`}
          class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Reset
        </a>
      </div>
    </form>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <span>
        Vista: <strong>{data.archivedMode || 'active'}</strong>
        {#if data.total != null}
          · <strong>{paginationStart}–{paginationEnd}</strong> di <strong>{data.total}</strong>
        {/if}
      </span>
      <div class="flex flex-wrap gap-2">
        {#if Number(data.offset || 0) > 0}
          <a
            class="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
            href={`/admin/schede?limit=${data.limit || 50}&offset=${Math.max(0, Number(data.offset || 0) - Number(data.limit || 50))}&archived=${data.archivedMode || 'active'}${data.q ? `&q=${encodeURIComponent(data.q)}` : ''}`}
          >
            Precedenti
          </a>
        {/if}
        {#if data.hasMore}
          <a
            class="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800"
            href={`/admin/schede?limit=${data.limit || 50}&offset=${Number(data.offset || 0) + Number(data.limit || 50)}&archived=${data.archivedMode || 'active'}${data.q ? `&q=${encodeURIComponent(data.q)}` : ''}`}
          >
            Successivi
          </a>
        {/if}
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

  <section class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#if filtered.length === 0}
      <div class="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Nessuna palestra trovata.
      </div>
    {:else}
      {#each filtered as gym}
        <article class="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <a
            class="absolute inset-0 rounded-2xl"
            aria-label={`Apri modifica per ${gym.name}`}
            href={`/admin/gyms/${gym.id}`}
          ></a>

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
            <a
              class="inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
              href={`/admin/gyms/${gym.id}`}
            >
              Modifica
            </a>

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

  {#if showNewModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/70 bg-white shadow-2xl sc-admin-modal">
        <div class="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-7">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Nuova scheda</p>
            <h2 class="mt-1 text-2xl font-bold text-slate-900">Crea palestra</h2>
            <p class="mt-2 text-sm text-slate-600">Inserisci una nuova palestra senza lasciare l'elenco.</p>
          </div>
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            on:click={closeNewModal}
          >
            Chiudi
          </button>
        </div>

        <form method="POST" action="?/create" enctype="multipart/form-data" class="grid gap-4 px-4 py-4 sm:px-7 sm:py-6">
          <section class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Dati principali</h3>
            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">Nome palestra</span>
              <input name="name" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
            </label>

            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">Discipline (separate da |)</span>
              <input
                name="discipline"
                list="discipline-canonical-options"
                class="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Es: Boxe | Kickboxing"
                bind:value={newDisciplineInput}
                required
              />
              {#if newAliasNotice}
                <span class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Alias rilevato: “{newAliasNotice.input}” verrà salvato come “{newAliasNotice.canonical}”.
                </span>
              {/if}
            </label>

            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">Indirizzo</span>
              <input name="address" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
            </label>

            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">Città/Località</span>
              <input name="city" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
            </label>
          </section>

          <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Contatti</h3>
            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">Telefono</span>
              <input name="phone" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>

            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">Sito web</span>
              <input name="website" type="url" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="https://..." />
            </label>
          </section>

          <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Orari</h3>
            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">Orari di apertura</span>
              <textarea name="hours_info" rows="4" class="rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
            </label>
          </section>

          <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Foto e descrizione</h3>
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

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="grid gap-1">
                <span class="text-sm font-semibold text-slate-700">URL immagine copertina</span>
                <input name="image_url" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="https://..." />
              </label>
              <label class="grid gap-1">
                <span class="text-sm font-semibold text-slate-700">Foto copertina</span>
                <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>

            <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <img
                src={newPreview.src}
                alt={`Anteprima fallback ${newPreview.discipline}`}
                class="h-44 w-full object-cover"
                on:error={(event) => handlePreviewError(event, newPreview)}
              />
              <div class="grid gap-1 border-t border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-600">
                <p><strong class="text-slate-900">Anteprima fallback:</strong> {newPreview.discipline}</p>
                <p>
                  {#if newPreview.stockResolved}
                    {newPreview.stockResolved.length} foto stock trovate. Selezione corrente: <code>{newPreview.stockSelected}</code>
                  {:else}
                    Nessuna foto stock disponibile per <code>{newPreview.stockBase}</code>: verrà usata la cover del brand.
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
          </section>

          <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Stato scheda</h3>
            <label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="verified" value="1" />
              Scheda verificata
            </label>
            <label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="premium" value="1" />
              Scheda premium
            </label>
          </section>

          <div class="sticky bottom-0 -mx-4 mt-2 flex flex-wrap gap-2 border-t border-slate-200 bg-white/95 px-4 pt-4 backdrop-blur-sm sm:-mx-7 sm:px-7">
            <button type="submit" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              Crea scheda
            </button>
            <button type="button" class="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300" on:click={closeNewModal}>
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</main>
