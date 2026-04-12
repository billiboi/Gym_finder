<script>
  export let data;
  export let form;

  let q = '';

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
  $: filtered = data.requests.filter((request) => {
    if (!query) return true;
    return [
      request.gym_name,
      request.reason,
      request.requester_name,
      request.requester_email,
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

    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2"
        bind:value={q}
        placeholder="Cerca per palestra, email o motivo"
      />
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Richieste: <strong>{filtered.length}</strong> su {data.requests.length}
      </div>
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
              <h2 class="text-lg font-bold text-slate-900">{request.gym_name || 'Richiesta senza palestra'}</h2>
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
              <span class={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${badgeClass(request.status)}`}>
                {request.status || 'new'}
              </span>
            </form>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p><strong>Richiedente:</strong> {request.requester_name || '-'}</p>
              <p class="mt-1"><strong>Ruolo:</strong> {request.requester_role || '-'}</p>
              <p class="mt-1"><strong>Email:</strong> {request.requester_email || '-'}</p>
              <p class="mt-1"><strong>Telefono:</strong> {request.requester_phone || '-'}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p><strong>ID richiesta:</strong> {request.id}</p>
              <p class="mt-1"><strong>Creata il:</strong> {formatDate(request.created_at)}</p>
              <p class="mt-1 break-all"><strong>Link scheda:</strong> {request.gym_url || '-'}</p>
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
