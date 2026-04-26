<script>
  export let data;
  export let form;

  let q = '';
  let statusFilter = 'open';

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || '-';
    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function badgeClass(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'new') return 'bg-amber-100 text-amber-800';
    if (normalized === 'reviewed') return 'bg-blue-100 text-blue-800';
    if (normalized === 'resolved') return 'bg-emerald-100 text-emerald-800';
    return 'bg-slate-100 text-slate-700';
  }

  $: query = q.trim().toLowerCase();
  $: requestStats = {
    new: data.requests.filter((request) => (request.status || 'new') === 'new').length,
    reviewed: data.requests.filter((request) => request.status === 'reviewed').length,
    resolved: data.requests.filter((request) => request.status === 'resolved').length,
    open: data.requests.filter((request) => (request.status || 'new') !== 'resolved').length
  };
  $: filtered = data.requests.filter((request) => {
    const normalizedStatus = request.status || 'new';
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'open' && normalizedStatus !== 'resolved') ||
      normalizedStatus === statusFilter;

    if (!matchesStatus) return false;
    if (!query) return true;

    return [
      request.gym_name,
      request.reason,
      request.requester_name,
      request.requester_email,
      request.requester_phone,
      request.message
    ]
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
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Richieste palestre</h1>
        <p class="mt-2 text-sm text-slate-600">Qui trovi le richieste inviate tramite il flusso di rivendicazione e aggiornamento schede.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <a href="/admin" class="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">Home admin</a>
          <a href="/admin/schede" class="inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800">Gestione schede</a>
        </div>
      </div>
      <a href="/" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Torna alla pagina utente</a>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_minmax(160px,auto)]">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={q}
        placeholder="Cerca per palestra, email o motivo"
      />
      <select
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={statusFilter}
        aria-label="Filtro stato richiesta"
      >
        <option value="open">Aperte</option>
        <option value="new">Nuove</option>
        <option value="reviewed">In revisione</option>
        <option value="resolved">Risolte</option>
        <option value="all">Tutte</option>
      </select>
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Richieste: <strong>{filtered.length}</strong> su {data.requests.length}
      </div>
    </div>

    <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <button type="button" class={`rounded-2xl border px-3 py-3 text-left text-sm transition ${statusFilter === 'open' ? 'border-slate-400 bg-slate-900 text-white' : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'}`} on:click={() => (statusFilter = 'open')}>
        <span class="block text-xl font-bold">{requestStats.open}</span>
        <span class="font-semibold">aperte</span>
      </button>
      <button type="button" class={`rounded-2xl border px-3 py-3 text-left text-sm transition ${statusFilter === 'new' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'}`} on:click={() => (statusFilter = 'new')}>
        <span class="block text-xl font-bold">{requestStats.new}</span>
        <span class="font-semibold">nuove</span>
      </button>
      <button type="button" class={`rounded-2xl border px-3 py-3 text-left text-sm transition ${statusFilter === 'reviewed' ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'}`} on:click={() => (statusFilter = 'reviewed')}>
        <span class="block text-xl font-bold">{requestStats.reviewed}</span>
        <span class="font-semibold">in revisione</span>
      </button>
      <button type="button" class={`rounded-2xl border px-3 py-3 text-left text-sm transition ${statusFilter === 'resolved' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'}`} on:click={() => (statusFilter = 'resolved')}>
        <span class="block text-xl font-bold">{requestStats.resolved}</span>
        <span class="font-semibold">risolte</span>
      </button>
    </div>

    {#if form?.success}
      <p class="mt-4 text-sm font-semibold text-emerald-700">Stato richiesta aggiornato correttamente.</p>
    {:else if form?.error}
      <p class="mt-4 text-sm font-semibold text-red-700">{form.error}</p>
    {/if}
  </section>

  <section class="mt-5 grid gap-3">
    {#if filtered.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Nessuna richiesta trovata.
      </div>
    {:else}
      {#each filtered as request}
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg font-bold text-slate-900">{request.gym_name || 'Richiesta senza palestra'}</h2>
                <span class={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${badgeClass(request.status)}`}>
                  {request.status || 'new'}
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-600">{request.reason}</p>
            </div>
            <form method="POST" action="?/updateStatus" class="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={request.id} />
              <select name="status" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2">
                <option value="new" selected={request.status === 'new'}>new</option>
                <option value="reviewed" selected={request.status === 'reviewed'}>reviewed</option>
                <option value="resolved" selected={request.status === 'resolved'}>resolved</option>
              </select>
              <button type="submit" class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Salva stato
              </button>
            </form>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p><strong>Richiedente:</strong> {request.requester_name || '-'}</p>
              <p class="mt-1"><strong>Ruolo:</strong> {request.requester_role || '-'}</p>
              <p class="mt-1">
                <strong>Email:</strong>
                {#if request.requester_email}
                  <a class="font-semibold text-blue-700 underline-offset-2 hover:underline" href={`mailto:${request.requester_email}`}>{request.requester_email}</a>
                {:else}
                  -
                {/if}
              </p>
              <p class="mt-1">
                <strong>Telefono:</strong>
                {#if request.requester_phone}
                  <a class="font-semibold text-blue-700 underline-offset-2 hover:underline" href={`tel:${request.requester_phone}`}>{request.requester_phone}</a>
                {:else}
                  -
                {/if}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p><strong>ID richiesta:</strong> {request.id}</p>
              <p class="mt-1"><strong>Creata il:</strong> {formatDate(request.created_at)}</p>
              <p class="mt-1 break-all">
                <strong>Link scheda:</strong>
                {#if request.gym_url}
                  <a class="font-semibold text-blue-700 underline-offset-2 hover:underline" href={request.gym_url} target="_blank" rel="noreferrer">apri scheda</a>
                {:else}
                  -
                {/if}
              </p>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Messaggio</p>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{request.message || '-'}</p>
          </div>
        </article>
      {/each}
    {/if}
  </section>
</main>
