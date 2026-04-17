<script>
  export let path = '/';

  const isHome = path === '/';
</script>

<header class="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8">
  <div class="rounded-[1.35rem] border border-white/70 bg-white/85 px-4 py-2.5 shadow-lg backdrop-blur-sm sc-panel sc-header sm:px-5">
    <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <a href="/" class="inline-flex max-w-full items-center gap-3">
        <span class="min-w-0">
          <span class="block text-[10px] font-bold uppercase tracking-[0.28em] text-amber-700 sm:text-xs">Palestre in Zona</span>
        </span>
      </a>

      <nav class="sc-header-nav flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible md:justify-end" aria-label="Navigazione pubblica">
        <a href="/" class="sc-header-link rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Home
        </a>
        <a href="/zone" class="sc-header-link rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Zone
        </a>
        <a href="/discipline" class="sc-header-link rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Discipline
        </a>
        {#if !isHome}
          <a href="/" class="sc-header-link rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sc-button">
            Torna all'elenco
          </a>
        {/if}
      </nav>
    </div>
  </div>
</header>
