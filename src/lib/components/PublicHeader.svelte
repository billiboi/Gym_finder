<script>
  import { page } from '$app/stores';
  import BrandMark from '$lib/components/BrandMark.svelte';

  $: path = $page.url.pathname;
  $: isHome = path === '/';
  $: showReturnToList = !isHome;
  $: returnHref = path.startsWith('/palestre/') ? '/#elenco-palestre' : '/';
  $: listHref = isHome ? '#home-search' : returnHref;
  function navClass() {
    return 'sc-header-link sc-ui-pill px-3.5 py-2 text-sm';
  }
</script>

<header class="sticky top-0 z-50">
  <div class="mx-auto w-full max-w-7xl px-4 pt-2 sm:px-6 sm:pt-3 lg:px-8">
    <div class="rounded-[1.2rem] border border-white/70 bg-white/85 px-4 py-2 shadow-lg backdrop-blur-md sc-panel sc-header sm:px-5">
    <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div class="sc-header-top flex items-center justify-between gap-3">
      <a href="/" class="inline-flex min-w-0 max-w-full items-center gap-3">
        <BrandMark />
      </a>
      </div>

      <nav class={`sc-header-nav flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible md:justify-end ${showReturnToList ? 'sc-header-nav--with-return' : ''}`} aria-label="Navigazione pubblica">
        {#if showReturnToList}
          <a href={listHref} class={`sc-header-link sc-header-return sc-ui-pill sc-ui-pill--primary px-3.5 py-2 text-sm ${isHome ? 'sc-header-return--home' : ''}`}>
            Torna all'elenco
          </a>
        {/if}
        {#if isHome}
          <a href="/" class={`${navClass()} sc-header-home-link`}>
            Home
          </a>
        {/if}
        <a href="/zone" class={navClass()}>
          Zone
        </a>
        <a href="/discipline" class={navClass()}>
          Discipline
        </a>
        <a href="/guide" class={navClass()}>
          Guide
        </a>
        <a href="/chi-siamo" class={navClass()}>
          Chi siamo
        </a>
        <a href="/per-le-palestre" class={`sc-header-link sc-header-business-link sc-ui-pill sc-ui-pill--primary px-3.5 py-2 text-sm ${showReturnToList ? 'sc-header-business-link--secondary' : ''}`}>
          Per le palestre
        </a>
      </nav>
    </div>
  </div>
  </div>
</header>
