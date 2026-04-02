<script>
  export let path = '/';

  const isHome = path === '/';
</script>

<header class="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
  <div class="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/70 bg-white/85 px-4 py-4 shadow-lg backdrop-blur-sm sc-panel sc-header">
    <div class="min-w-0">
      <a href="/" class="inline-flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black tracking-[0.18em] text-white">
          PG
        </span>
        <span class="min-w-0">
          <span class="block text-xs font-bold uppercase tracking-[0.28em] text-amber-700">Pocket Gym</span>
          <span class="block truncate text-sm text-slate-600">Palestre vicine quando sei in viaggio o in una nuova citta.</span>
        </span>
      </a>
    </div>

    <nav class="flex flex-wrap items-center gap-2">
      <a href="/" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
        Home
      </a>
      {#if !isHome}
        <a href="/" class="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sc-button">
          Torna all'elenco
        </a>
      {/if}
    </nav>
  </div>
</header>
