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
    if (normalized === 'pending') return 'bg-amber-100 text-amber-800';
    if (normalized === 'in_review') return 'bg-blue-100 text-blue-800';
    if (normalized === 'approved') return 'bg-emerald-100 text-emerald-800';
    if (normalized === 'rejected') return 'bg-red-100 text-red-800';
    if (normalized === 'resolved') return 'bg-slate-900 text-white';
    return 'bg-slate-100 text-slate-700';
  }

  function statusLabel(status) {
    const normalized = String(status || 'pending').toLowerCase();
    if (normalized === 'pending') return 'da valutare';
    if (normalized === 'in_review') return 'in revisione';
    if (normalized === 'approved') return 'approvata';
    if (normalized === 'rejected') return 'rifiutata';
    if (normalized === 'resolved') return 'risolta';
    return normalized;
  }

  $: query = q.trim().toLowerCase();
  $: requestStats = {
    pending: data.requests.filter((request) => (request.status || 'pending') === 'pending').length,
    in_review: data.requests.filter((request) => request.status === 'in_review').length,
    approved: data.requests.filter((request) => request.status === 'approved').length,
    rejected: data.requests.filter((request) => request.status === 'rejected').length,
    resolved: data.requests.filter((request) => request.status === 'resolved').length,
    open: data.requests.filter((request) => ['pending', 'in_review'].includes(request.status || 'pending')).length
  };
  $: filtered = data.requests.filter((request) => {
    const normalizedStatus = request.status || 'pending';
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'open' && ['pending', 'in_review'].includes(normalizedStatus)) ||
      normalizedStatus === statusFilter;

    if (!matchesStatus) return false;
    if (!query) return true;

    return [
      request.gym_name,
      request.reason,
      request.requester_name,
      request.requester_email,
      request.requester_phone,
      request.requested_updates?.sito,
      request.requested_updates?.image_url,
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
        <option value="pending">Da valutare</option>
        <option value="in_review">In revisione</option>
        <option value="approved">Approvate</option>
        <option value="rejected">Rifiutate</option>
        <option value="resolved">Risolte</option>
        <option value="all">Tutte</option>
      </select>
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Richieste: <strong>{filtered.length}</strong> su {data.requests.length}
      </div>
    </div>

    <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <button type="button" class={`rounded-2xl border px-3 py-3 text-left text-sm transition ${statusFilter === 'open' ? 'border-slate-400 bg-slate-900 text-white' : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'}`} on:click={() => (statusFilter = 'open')}>
        <span class="block text-xl font-bold">{requestStats.open}</span>
        <span class="font-semibold">aperte</span>
      </button>
      <button type="button" class={`rounded-2xl border px-3 py-3 text-left text-sm transition ${statusFilter === 'pending' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'}`} on:click={() => (statusFilter = 'pending')}>
        <span class="block text-xl font-bold">{requestStats.pending}</span>
        <span class="font-semibold">da valutare</span>
      </button>
      <button type="button" class={`rounded-2xl border px-3 py-3 text-left text-sm transition ${statusFilter === 'in_review' ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'}`} on:click={() => (statusFilter = 'in_review')}>
        <span class="block text-xl font-bold">{requestStats.in_review}</span>
        <span class="font-semibold">in revisione</span>
      </button>
      <button type="button" class={`rounded-2xl border px-3 py-3 text-left text-sm transition ${statusFilter === 'approved' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'}`} on:click={() => (statusFilter = 'approved')}>
        <span class="block text-xl font-bold">{requestStats.approved}</span>
        <span class="font-semibold">approvate</span>
      </button>
      <button type="button" class={`rounded-2xl border px-3 py-3 text-left text-sm transition ${statusFilter === 'rejected' ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'}`} on:click={() => (statusFilter = 'rejected')}>
        <span class="block text-xl font-bold">{requestStats.rejected}</span>
        <span class="font-semibold">rifiutate</span>
      </button>
      <button type="button" class={`rounded-2xl border px-3 py-3 text-left text-sm transition ${statusFilter === 'resolved' ? 'border-slate-400 bg-slate-100 text-slate-950' : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50'}`} on:click={() => (statusFilter = 'resolved')}>
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
                {statusLabel(request.status)}
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-600">{request.reason}</p>
            </div>
            <form method="POST" action="?/updateStatus" class="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={request.id} />
              <select name="status" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2">
                <option value="pending" selected={(request.status || 'pending') === 'pending'}>Da valutare</option>
                <option value="in_review" selected={request.status === 'in_review'}>In revisione</option>
                <option value="approved" selected={request.status === 'approved'}>Approva</option>
                <option value="rejected" selected={request.status === 'rejected'}>Rifiuta</option>
                <option value="resolved" selected={request.status === 'resolved'}>Risolta</option>
              </select>
              <input name="admin_notes" placeholder="Note admin" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
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
              <p class="mt-1"><strong>ID scheda collegata:</strong> {request.gym_id || '-'}</p>
              <p class="mt-1"><strong>Email verificata:</strong> {request.email_verified_at ? 'sì' : 'no'}</p>
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

          {#if request.requested_updates?.sito || request.requested_updates?.image_url || request.image_uploads?.length}
            <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Dati ufficiali inviati</p>
              <p class="mt-2 break-all"><strong>Sito ufficiale:</strong> {request.requested_updates?.sito || '-'}</p>
              <p class="mt-1 break-all"><strong>URL immagine:</strong> {request.requested_updates?.image_url || request.image_uploads?.[0] || '-'}</p>
            </div>
          {/if}

          {#if request.status === 'approved' && request.owner_token}
            <div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
              <p class="font-bold">Dashboard proprietario</p>
              <a class="mt-1 inline-flex font-semibold underline-offset-2 hover:underline" href={`/dashboard-proprietario/${request.owner_token}`} target="_blank" rel="noreferrer">
                Apri dashboard approvata
              </a>
            </div>
          {/if}

          {#if request.requested_updates && Object.keys(request.requested_updates).length}
            <div class="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Aggiornamenti proposti</p>
              <pre class="mt-2 overflow-auto whitespace-pre-wrap text-xs leading-6 text-blue-950">{JSON.stringify(request.requested_updates, null, 2)}</pre>
            </div>
          {/if}
        </article>
      {/each}
    {/if}
  </section>
</main>
