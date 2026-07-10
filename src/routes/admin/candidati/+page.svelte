<script>
  export let data;
  export let form;

  let q = '';

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function statusBadgeClass(status) {
    const normalized = String(status || 'pending').toLowerCase();
    if (normalized === 'pending') return 'bg-amber-100 text-amber-800';
    if (normalized === 'approved') return 'bg-emerald-100 text-emerald-800';
    if (normalized === 'rejected') return 'bg-red-100 text-red-800';
    if (normalized === 'merged') return 'bg-blue-100 text-blue-800';
    return 'bg-slate-100 text-slate-700';
  }

  function statusLabel(status) {
    const normalized = String(status || 'pending').toLowerCase();
    if (normalized === 'pending') return 'da revisionare';
    if (normalized === 'approved') return 'approvato';
    if (normalized === 'rejected') return 'rifiutato';
    if (normalized === 'merged') return 'unito a scheda esistente';
    return normalized;
  }

  function flagBadgeClass(severity) {
    const normalized = String(severity || '').toLowerCase();
    if (normalized === 'critical') return 'bg-red-100 text-red-800';
    if (normalized === 'high') return 'bg-orange-100 text-orange-800';
    if (normalized === 'medium') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
  }

  function dedupPercent(score) {
    if (score === null || score === undefined) return '';
    return `${Math.round(Number(score) * 100)}%`;
  }

  $: query = q.trim().toLowerCase();
  $: filtered = data.candidates.filter((candidate) => {
    if (!query) return true;
    return [candidate.nome, candidate.citta, candidate.indirizzo, candidate.discipline, candidate.source]
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
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Candidati palestre</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Schede trovate dallo scraper (OpenStreetMap) in attesa di revisione. Nessuna scheda viene pubblicata su Palestre in Zona senza approvazione qui.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/admin" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Dashboard admin</a>
        <a href="/admin/schede" class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">Gestione schede</a>
      </div>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_minmax(160px,auto)]">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={q}
        placeholder="Cerca per nome, città o disciplina"
      />
      <select
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        value={data.statusFilter}
        on:change={(e) => (window.location.href = `/admin/candidati?status=${e.target.value}`)}
        aria-label="Filtro stato candidato"
      >
        <option value="pending">Da revisionare</option>
        <option value="approved">Approvati</option>
        <option value="rejected">Rifiutati</option>
        <option value="merged">Uniti a scheda esistente</option>
        <option value="all">Tutti</option>
      </select>
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Candidati: <strong>{filtered.length}</strong> su {data.candidates.length}
      </div>
    </div>

    {#if !data.candidatesStoreStatus.hasSupabase}
      <p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        Coda candidati non disponibile: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti in questo ambiente.
      </p>
    {:else if data.listError}
      <p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        {data.listError}
      </p>
    {/if}

    {#if data.approved}
      <p class="mt-4 text-sm font-semibold text-emerald-700">Candidato approvato e pubblicato su Palestre in Zona.</p>
    {:else if data.rejected}
      <p class="mt-4 text-sm font-semibold text-slate-700">Candidato rifiutato.</p>
    {:else if data.merged}
      <p class="mt-4 text-sm font-semibold text-blue-700">Candidato unito alla scheda esistente.</p>
    {:else if form?.error}
      <p class="mt-4 text-sm font-semibold text-red-700">{form.error}</p>
    {/if}
  </section>

  <section class="mt-5 grid gap-3">
    {#if filtered.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Nessun candidato trovato.
      </div>
    {:else}
      {#each filtered as candidate (candidate.id)}
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg font-bold text-slate-900">{candidate.nome || 'Candidato senza nome'}</h2>
                <span class={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${statusBadgeClass(candidate.status)}`}>
                  {statusLabel(candidate.status)}
                </span>
                <span class="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                  {candidate.source || 'fonte sconosciuta'}
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-600">
                {candidate.citta || 'Città sconosciuta'}{candidate.indirizzo ? ` · ${candidate.indirizzo}` : ''}
              </p>
              {#if candidate.disciplines?.length}
                <div class="mt-2 flex flex-wrap gap-1.5">
                  {#each candidate.disciplines as discipline}
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{discipline}</span>
                  {/each}
                </div>
              {/if}
            </div>
            {#if candidate.source_url}
              <a class="shrink-0 text-sm font-semibold text-blue-700 underline-offset-2 hover:underline" href={candidate.source_url} target="_blank" rel="noreferrer">
                Apri su OSM
              </a>
            {/if}
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p><strong>Telefono:</strong> {candidate.telefono || '-'}</p>
              <p class="mt-1"><strong>Email:</strong> {candidate.email || '-'}</p>
              <p class="mt-1 break-all"><strong>Sito:</strong> {candidate.sito || '-'}</p>
              <p class="mt-1"><strong>Orari:</strong> {candidate.orari || 'da verificare'}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p><strong>ID candidato:</strong> {candidate.id}</p>
              <p class="mt-1"><strong>Trovato il:</strong> {formatDate(candidate.scraped_at || candidate.created_at)}</p>
              {#if candidate.dedup_score !== null}
                <p class="mt-1">
                  <strong>Somiglianza con scheda esistente:</strong> {dedupPercent(candidate.dedup_score)}
                  {#if candidate.dedup_match_gym_id} (id: {candidate.dedup_match_gym_id}){/if}
                </p>
              {/if}
              {#if candidate.status !== 'pending'}
                <p class="mt-1"><strong>Revisionato il:</strong> {formatDate(candidate.reviewed_at)}</p>
                {#if candidate.published_gym_id}
                  <p class="mt-1"><strong>Scheda pubblicata:</strong> {candidate.published_gym_id}</p>
                {/if}
                {#if candidate.rejection_reason}
                  <p class="mt-1"><strong>Motivo rifiuto:</strong> {candidate.rejection_reason}</p>
                {/if}
              {/if}
            </div>
          </div>

          {#if candidate.validation_flags?.length}
            <div class="mt-3 flex flex-wrap gap-1.5">
              {#each candidate.validation_flags as flag}
                <span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${flagBadgeClass(flag.severity)}`} title={flag.reason || ''}>
                  {flag.type}
                </span>
              {/each}
            </div>
          {/if}

          {#if candidate.status === 'pending'}
            <details class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50">
              <summary class="cursor-pointer select-none px-3 py-2 text-sm font-bold text-emerald-900">Modifica e approva</summary>
              <form
                method="POST"
                action="?/approve"
                class="grid gap-2 border-t border-emerald-200 p-3 sm:grid-cols-2"
                on:submit={(e) => {
                  if (!confirm(`Pubblicare "${candidate.nome}" come nuova scheda su Palestre in Zona?`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={candidate.id} />
                <label class="text-xs font-semibold text-emerald-900">
                  Nome
                  <input name="nome" value={candidate.nome} class="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm" />
                </label>
                <label class="text-xs font-semibold text-emerald-900">
                  Città
                  <input name="citta" value={candidate.citta} class="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm" />
                </label>
                <label class="text-xs font-semibold text-emerald-900 sm:col-span-2">
                  Indirizzo
                  <input name="indirizzo" value={candidate.indirizzo} class="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm" />
                </label>
                <label class="text-xs font-semibold text-emerald-900 sm:col-span-2">
                  Discipline (separate da |)
                  <input name="discipline" value={candidate.disciplines?.join('|') || ''} class="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm" />
                </label>
                <label class="text-xs font-semibold text-emerald-900">
                  Telefono
                  <input name="telefono" value={candidate.telefono} class="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm" />
                </label>
                <label class="text-xs font-semibold text-emerald-900">
                  Sito
                  <input name="sito" value={candidate.sito} class="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm" />
                </label>
                <label class="text-xs font-semibold text-emerald-900">
                  Orari
                  <input name="orari" value={candidate.orari} class="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm" />
                </label>
                <label class="text-xs font-semibold text-emerald-900">
                  Latitudine / Longitudine
                  <span class="mt-1 flex gap-1.5">
                    <input name="latitude" value={candidate.latitude ?? ''} class="w-1/2 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm" />
                    <input name="longitude" value={candidate.longitude ?? ''} class="w-1/2 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm" />
                  </span>
                </label>
                <label class="text-xs font-semibold text-emerald-900 sm:col-span-2">
                  Descrizione
                  <textarea name="descrizione" rows="2" class="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm">{candidate.descrizione}</textarea>
                </label>
                <div class="sm:col-span-2">
                  <button type="submit" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">
                    Approva e pubblica
                  </button>
                </div>
              </form>
            </details>

            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <form
                method="POST"
                action="?/reject"
                class="rounded-xl border border-red-200 bg-red-50 p-3"
                on:submit={(e) => {
                  if (!confirm(`Rifiutare "${candidate.nome}"?`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={candidate.id} />
                <label class="block text-xs font-semibold text-red-900">
                  Rifiuta
                  <input name="rejection_reason" placeholder="Motivo (opzionale)" class="mt-1 w-full rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-sm" />
                </label>
                <button type="submit" class="mt-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800">
                  Rifiuta candidato
                </button>
              </form>

              <form
                method="POST"
                action="?/merge"
                class="rounded-xl border border-blue-200 bg-blue-50 p-3"
                on:submit={(e) => {
                  if (!confirm(`Unire "${candidate.nome}" alla scheda esistente indicata? Nessuna nuova scheda verrà creata.`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={candidate.id} />
                <label class="block text-xs font-semibold text-blue-900">
                  Unisci a scheda esistente (ID)
                  <input name="target_gym_id" value={candidate.dedup_match_gym_id || ''} placeholder="ID scheda già pubblicata" class="mt-1 w-full rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-sm" />
                </label>
                <button type="submit" class="mt-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
                  Unisci
                </button>
              </form>
            </div>
          {/if}
        </article>
      {/each}
    {/if}
  </section>
</main>
