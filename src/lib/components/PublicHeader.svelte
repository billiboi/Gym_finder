<script>
  import { page } from '$app/stores';

  $: path = $page.url.pathname;
  $: isHome = path === '/';
  function navClass() {
    return 'sc-header-link sc-ui-pill px-3.5 py-2 text-sm';
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
        <a href="/" class={navClass()}>
          Home
        </a>
        <a href="/zone" class={navClass()}>
          Zone
        </a>
        <a href="/discipline" class={navClass()}>
          Discipline
        </a>
        <a href="/per-le-palestre" class="sc-header-link sc-ui-pill sc-ui-pill--primary px-3.5 py-2 text-sm">
          Per le palestre
        </a>
        {#if !isHome}
          <a href="/" class="sc-header-link sc-ui-pill px-3.5 py-2 text-sm">
            Torna all'elenco
          </a>
        {/if}
      </nav>
    </div>
  </div>
  </div>
</header>
