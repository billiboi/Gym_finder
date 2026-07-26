<script>
  export let data;
  export let form;

  const CONFIDENCE_STYLES = {
    high: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    medium: 'border-amber-200 bg-amber-50 text-amber-800',
    low: 'border-slate-200 bg-slate-50 text-slate-700'
  };

  const CONFIDENCE_LABELS = { high: 'Alta', medium: 'Media', low: 'Bassa' };

  const SOURCE_LABELS = {
    official_site: 'Sito ufficiale',
    google_business: 'Scheda Google',
    social: 'Social ufficiale',
    article: 'Directory'
  };

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('it-IT');
  }

  $: rows = data.rows || [];
  $: counts = data.counts || {};
</script>

<main class="mx-auto min-h-screen w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Qualità</p>
    <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Fatti da rivedere</h1>
    <p class="mt-2 text-sm leading-6 text-slate-600">
      Dati trovati sul web dall'agente di enrichment, con la fonte da cui arrivano. Solo quelli ad alta
      confidenza entrano in catalogo da soli: qui decidi sugli altri. Approvare scrive il valore nella scheda.
    </p>

    {#if data.available}
      <p class="mt-3 text-sm text-slate-600">
        <strong>{counts.fillsEmpty || 0}</strong> su campi vuoti
        {#if counts.alreadyFilled}
          · {counts.alreadyFilled} riconferme di dati già presenti
        {/if}
      </p>

      {#if counts.byField && Object.keys(counts.byField).length}
        <ul class="mt-3 flex flex-wrap gap-2">
          {#each Object.entries(counts.byField) as [field, total]}
            <li class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {field}: {total}
            </li>
          {/each}
        </ul>
      {/if}

      <p class="mt-4 text-sm">
        {#if data.includeFilled}
          <a href="/admin/qualita/fatti" class="font-semibold text-slate-900 underline">Mostra solo i campi vuoti</a>
        {:else}
          <a href="/admin/qualita/fatti?tutti=1" class="font-semibold text-slate-900 underline">Mostra anche le riconferme</a>
        {/if}
      </p>
    {/if}
  </section>

  {#if form?.success}
    <p class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
      {form.success}
    </p>
  {/if}
  {#if form?.error}
    <p class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
      {form.error}
    </p>
  {/if}

  {#if !data.available}
    <section class="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-6">
      <h2 class="text-lg font-bold text-amber-900">Coda non disponibile</h2>
      <p class="mt-2 text-sm leading-6 text-amber-900">{data.reason || data.error}</p>
      {#if data.needsMigration}
        <p class="mt-3 text-sm leading-6 text-amber-900">
          Applica <code class="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">supabase/migrations/20260726_001_gym_facts_review_state.sql</code>
          e ricarica la pagina.
        </p>
      {/if}
    </section>
  {:else}
    <section class="mt-5 space-y-3">
      {#each rows as row (row.id)}
        <article class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg backdrop-blur-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <a href={`/admin/gyms/${row.gymId}`} class="text-base font-bold text-slate-900 hover:text-blue-800">
                {row.gymName}
              </a>
              <p class="mt-0.5 text-sm text-slate-600">
                {row.gymCity || 'Città da verificare'} · {row.gymId}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {row.fieldLabel}
              </span>
              <span class={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${CONFIDENCE_STYLES[row.confidence] || CONFIDENCE_STYLES.low}`}>
                {CONFIDENCE_LABELS[row.confidence] || row.confidence}
              </span>
            </div>
          </div>

          <dl class="mt-4 space-y-2 text-sm">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <dt class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Valore trovato</dt>
              <dd class="mt-1 break-words font-semibold text-slate-900">{row.value}</dd>
            </div>
            {#if !row.fillsEmptyField}
              <div class="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                <dt class="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Già in catalogo</dt>
                <dd class="mt-1 break-words text-amber-900">{row.currentValue}</dd>
              </div>
            {/if}
          </dl>

          <p class="mt-3 text-sm text-slate-600">
            Fonte:
            {#if row.sourceUrl}
              <a href={row.sourceUrl} target="_blank" rel="noreferrer" class="font-semibold text-slate-900 underline">
                {row.sourceHost || row.sourceUrl}
              </a>
            {:else}
              nessuna
            {/if}
            · {SOURCE_LABELS[row.sourceType] || row.sourceType}
            {#if formatDate(row.extractedAt)}
              · trovato il {formatDate(row.extractedAt)}
            {/if}
          </p>

          {#if row.blockReason && row.blockReason !== 'campo_gia_valorizzato'}
            <p class="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              Non promuovibile: {row.blockReason.replace(/_/g, ' ')}
            </p>
          {/if}

          <div class="mt-4 flex flex-wrap gap-2">
            <form method="POST" action="?/approva" class="contents">
              <input type="hidden" name="id" value={row.id} />
              {#if !row.fillsEmptyField}
                <input type="hidden" name="allow_overwrite" value="1" />
              {/if}
              <button
                type="submit"
                class="min-h-[2.75rem] rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={Boolean(row.blockReason) && row.blockReason !== 'campo_gia_valorizzato'}
              >
                {row.fillsEmptyField ? 'Approva e scrivi' : 'Sostituisci il valore attuale'}
              </button>
            </form>
            <form method="POST" action="?/rifiuta" class="contents">
              <input type="hidden" name="id" value={row.id} />
              <button
                type="submit"
                class="min-h-[2.75rem] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                Rifiuta
              </button>
            </form>
          </div>
        </article>
      {:else}
        <div class="rounded-3xl border border-white/80 bg-white/85 p-8 text-center text-slate-500 shadow-lg backdrop-blur-sm">
          Nessun fatto da rivedere al momento.
        </div>
      {/each}
    </section>
  {/if}
</main>
