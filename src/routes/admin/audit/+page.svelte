<script>
  export let data;

  function formatDate(value) {
    if (!value) return 'Data non disponibile';
    try {
      return new Intl.DateTimeFormat('it-IT', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function changedFields(entry) {
    const beforeData = entry?.before_data || {};
    const afterData = entry?.after_data || {};
    const keys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
    return [...keys]
      .filter((key) => JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key]))
      .filter((key) => !['updated_at', 'data_quality_score'].includes(key))
      .slice(0, 8);
  }
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Audit log</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Ultime operazioni registrate sulle schede. Serve per capire cosa è cambiato, quando e su quale record.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/admin" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Dashboard admin</a>
        <a href="/admin/schede" class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">Gestione schede</a>
      </div>
    </div>
  </section>

  {#if data.error}
    <section class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-900">
      {data.error}
    </section>
  {/if}

  <section class="mt-5 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-lg">
    {#if data.entries.length === 0}
      <div class="p-8 text-center text-sm font-semibold text-slate-500">
        Nessuna operazione registrata.
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th class="px-4 py-3">Quando</th>
              <th class="px-4 py-3">Azione</th>
              <th class="px-4 py-3">Record</th>
              <th class="px-4 py-3">Campi cambiati</th>
              <th class="px-4 py-3">Attore</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each data.entries as entry}
              <tr class="align-top">
                <td class="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{formatDate(entry.created_at)}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">{entry.action}</span>
                </td>
                <td class="px-4 py-3 font-semibold text-slate-800">
                  <span>{entry.table_name}</span>
                  {#if entry.record_id}
                    <span class="block text-xs font-medium text-slate-500">{entry.record_id}</span>
                  {/if}
                </td>
                <td class="px-4 py-3 text-slate-600">
                  {#if changedFields(entry).length}
                    <div class="flex flex-wrap gap-1.5">
                      {#each changedFields(entry) as field}
                        <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{field}</span>
                      {/each}
                    </div>
                  {:else}
                    <span class="text-slate-400">Dettaglio non disponibile</span>
                  {/if}
                </td>
                <td class="px-4 py-3 text-slate-600">{entry.actor || '-'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</main>
