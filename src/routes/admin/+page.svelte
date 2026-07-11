<script>
  export let data;

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(date);
  }
</script>

<main class="mx-auto min-h-screen w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Dashboard</h1>
        <p class="mt-2 text-sm text-slate-600">Un numero per area, e cosa guardare oggi.</p>
      </div>
      <a href="/" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Torna alla pagina utente</a>
    </div>
  </section>

  <section class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <a href="/admin/schede" class="rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Catalogo</p>
      <p class="mt-2 text-3xl font-bold text-slate-900">{data.stats.activeGyms ?? '-'}</p>
      <p class="mt-1 text-sm text-slate-600">Schede attive</p>
    </a>
    <a href="/admin/candidati" class="rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Acquisizione</p>
      <p class="mt-2 text-3xl font-bold text-slate-900">{data.stats.candidatesPending}</p>
      <p class="mt-1 text-sm text-slate-600">Candidati da revisionare</p>
    </a>
    <a href="/admin/richieste" class="rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Richieste</p>
      <p class="mt-2 text-3xl font-bold text-slate-900">{data.stats.requestsOpen}</p>
      <p class="mt-1 text-sm text-slate-600">Richieste aperte</p>
    </a>
    <a href="/admin/qualita" class="rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Qualità</p>
      <p class="mt-2 text-3xl font-bold text-slate-900">{data.stats.qualityIssues ?? '-'}</p>
      <p class="mt-1 text-sm text-slate-600">Schede con problemi di base</p>
    </a>
  </section>

  {#if data.candidatesError || data.requestsError}
    <section class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
      {#if data.candidatesError}<p>Candidati: {data.candidatesError}</p>{/if}
      {#if data.requestsError}<p>Richieste: {data.requestsError}</p>{/if}
    </section>
  {/if}

  <section class="mt-5 grid gap-4 lg:grid-cols-3">
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Ultimi candidati arrivati</p>
      {#if data.recentCandidates.length === 0}
        <p class="mt-3 text-sm text-slate-500">Nessun candidato in coda.</p>
      {:else}
        <ul class="mt-3 grid gap-2">
          {#each data.recentCandidates as candidate}
            <li class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              <span class="font-semibold text-slate-900">{candidate.nome}</span>
              <span class="text-slate-600"> · {candidate.citta || '-'}</span>
            </li>
          {/each}
        </ul>
      {/if}
      <a href="/admin/candidati" class="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900">Vai ad Acquisizione →</a>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Richieste aperte più vecchie</p>
      {#if data.oldestOpenRequests.length === 0}
        <p class="mt-3 text-sm text-slate-500">Nessuna richiesta aperta.</p>
      {:else}
        <ul class="mt-3 grid gap-2">
          {#each data.oldestOpenRequests as request}
            <li class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              <span class="font-semibold text-slate-900">{request.gym_name}</span>
              <span class="text-slate-600"> · dal {formatDate(request.created_at)}</span>
            </li>
          {/each}
        </ul>
      {/if}
      <a href="/admin/richieste" class="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900">Vai a Richieste →</a>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Gruppi di duplicati più grandi</p>
      {#if data.duplicateGroups.length === 0}
        <p class="mt-3 text-sm text-slate-500">Nessun duplicato rilevato.</p>
      {:else}
        <ul class="mt-3 grid gap-2">
          {#each data.duplicateGroups as group}
            <li class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              <span class="font-semibold text-slate-900">{group.label}</span>
              <span class="text-slate-600"> · {group.count} schede: {group.names.join(', ')}</span>
            </li>
          {/each}
        </ul>
      {/if}
      <a href="/admin/qualita" class="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900">Vai a Qualità →</a>
    </div>
  </section>
</main>
