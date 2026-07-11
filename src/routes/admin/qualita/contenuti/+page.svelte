<script>
  export let data;

  $: rows = data.rows || [];
</script>

<main class="mx-auto min-h-screen w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Qualità</p>
    <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Contenuti dal sito ufficiale</h1>
    <p class="mt-2 text-sm leading-6 text-slate-600">
      Schede con sito proprio e prezzo o descrizione mancanti. Apri una scheda per analizzare il sito ufficiale e accettare i valori proposti campo per campo.
    </p>
    <p class="mt-3 text-sm text-slate-600">
      <strong>{rows.length}</strong> schede da rivedere
      {#if data.hasReport}
        · report {data.filename}
      {:else}
        · calcolate dal database live
      {/if}
    </p>
  </section>

  <section class="mt-5 overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-lg backdrop-blur-sm">
    <div class="hidden border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:grid md:grid-cols-[0.5fr_1.4fr_1fr_auto]">
      <span>Score</span>
      <span>Scheda</span>
      <span>Sito</span>
      <span></span>
    </div>
    {#each rows as row}
      <article class="grid gap-2 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[0.5fr_1.4fr_1fr_auto] md:items-center">
        <span class="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-sm font-bold text-emerald-800">{row.priority_score}</span>
        <div>
          <p class="font-bold text-slate-900">{row.nome}</p>
          <p class="mt-1 text-sm text-slate-600">
            {row.citta || 'Città da verificare'}
            {#if row.needs_price} · senza prezzo{/if}
            {#if row.needs_description} · senza descrizione{/if}
          </p>
        </div>
        <div class="text-sm text-slate-700">
          {#if row.website}
            <a href={row.website} target="_blank" rel="noreferrer" class="font-semibold text-slate-900 hover:text-blue-800">{row.website_host || row.website}</a>
          {:else}
            Sito assente
          {/if}
        </div>
        <a href={`/admin/gyms/${row.id}`} class="inline-flex w-fit rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 md:justify-self-end">
          Apri scheda
        </a>
      </article>
    {:else}
      <div class="p-8 text-center text-slate-500">Nessuna scheda da rivedere al momento.</div>
    {/each}
  </section>
</main>
