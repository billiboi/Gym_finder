<script>
  export let path = '/';

  const isHome = path === '/';

  function isActive(target) {
    if (target === '/') return path === '/';
    return path === target || path.startsWith(`${target}/`);
  }

  function navClass(target) {
    const active = isActive(target);
    return [
      'sc-header-link rounded-full px-3.5 py-2 text-sm font-semibold transition',
      active
        ? 'border border-emerald-700 bg-emerald-700 text-white shadow-sm'
        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
    ].join(' ');
  }
</script>

<header class="sticky top-0 z-50">
  <div class="mx-auto w-full max-w-7xl px-4 pt-2 sm:px-6 sm:pt-3 lg:px-8">
    <div class="rounded-[1.2rem] border border-white/70 bg-white/85 px-4 py-2 shadow-lg backdrop-blur-md sc-panel sc-header sm:px-5">
    <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <a href="/" class="inline-flex max-w-full items-center gap-3">
        <span class="min-w-0">
          <span class="block text-[10px] font-bold uppercase tracking-[0.28em] text-amber-700 sm:text-xs">Palestre in Zona</span>
        </span>
      </a>

      <nav class="sc-header-nav flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible md:justify-end" aria-label="Navigazione pubblica">
        <a href="/" class={navClass('/') } aria-current={isActive('/') ? 'page' : undefined}>
          Home
        </a>
        <a href="/zone" class={navClass('/zone')} aria-current={isActive('/zone') ? 'page' : undefined}>
          Zone
        </a>
        <a href="/discipline" class={navClass('/discipline')} aria-current={isActive('/discipline') ? 'page' : undefined}>
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
  </div>
</header>
