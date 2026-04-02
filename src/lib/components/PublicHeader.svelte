<script>
  export let path = '/';

  const isHome = path === '/';
  const isDetail = path.startsWith('/palestre/');
</script>

<header class="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
  <div class="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/70 bg-white/85 px-4 py-4 shadow-lg backdrop-blur-sm sc-panel sc-header">
    <div class="min-w-0 flex-1">
      <a href="/" class="inline-flex items-center gap-3">
        <span class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl sc-brand-mark">
          <img src="/logo-pocket-gym.svg" alt="Pocket Gym" class="h-full w-full object-cover" />
        </span>
        <span class="min-w-0">
          <span class="block text-xs font-bold uppercase tracking-[0.28em] text-amber-700">Pocket Gym</span>
          <span class="block truncate text-sm text-slate-600">Allenati ovunque, trova la palestra giusta vicino a te.</span>
        </span>
      </a>
    </div>

    <div class="hidden min-w-[240px] flex-1 text-right lg:block">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
        {#if isHome}
          Ricerca geografica
        {:else if isDetail}
          Scheda completa
        {:else}
          Esplora le palestre
        {/if}
      </p>
      <p class="mt-1 text-sm text-slate-600">
        {#if isHome}
          Filtra per disciplina, posizione e distanza in pochi tocchi.
        {:else if isDetail}
          Approfondisci contatti, orari e informazioni della palestra.
        {:else}
          Navigazione coerente su tutte le pagine pubbliche.
        {/if}
      </p>
    </div>

    <nav class="flex flex-wrap items-center gap-2">
      <a href="/" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
        Home
      </a>
      <a href="/brand" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
        Brand
      </a>
      {#if !isHome}
        <a href="/" class="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sc-button">
          Torna all'elenco
        </a>
      {/if}
    </nav>
  </div>
</header>
