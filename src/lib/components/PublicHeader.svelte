<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import BrandMark from '$lib/components/BrandMark.svelte';

  const MOBILE_HEADER_BREAKPOINT = 768;

  let isMobileHeader = false;
  let lastScrollY = 0;
  let headerHidden = false;

  $: path = $page.url.pathname;
  $: isHome = path === '/';
  $: showReturnToList = !isHome;
  $: returnHref = path.startsWith('/palestre/') ? '/#elenco-palestre' : '/';
  $: listHref = isHome ? '#home-search' : returnHref;
  function navClass() {
    return 'sc-header-link sc-ui-pill px-3.5 py-2 text-sm';
  }

  function syncHeaderMode() {
    if (typeof window === 'undefined') return;
    isMobileHeader = window.innerWidth < MOBILE_HEADER_BREAKPOINT;
    if (!isMobileHeader) {
      headerHidden = false;
    }
  }

  function handleScroll() {
    if (typeof window === 'undefined') return;
    const currentY = Math.max(window.scrollY, 0);
    const delta = currentY - lastScrollY;

    if (!isMobileHeader || currentY < 48) {
      headerHidden = false;
    } else if (delta > 8 && currentY > 120) {
      headerHidden = true;
    } else if (delta < -8) {
      headerHidden = false;
    }

    lastScrollY = currentY;
  }

  function showHeaderForNavigation() {
    headerHidden = false;
  }

  onMount(() => {
    syncHeaderMode();
    lastScrollY = Math.max(window.scrollY, 0);
  });
</script>

<svelte:window on:resize={syncHeaderMode} on:scroll={handleScroll} />

<header class={`sticky top-0 z-50 sc-site-header ${headerHidden ? 'sc-site-header--hidden' : ''}`}>
  <div class="mx-auto w-full max-w-7xl px-3 pt-1.5 sm:px-6 sm:pt-3 lg:px-8">
    <div class="rounded-[1.2rem] border border-white/70 bg-white/85 px-4 py-2 shadow-lg backdrop-blur-md sc-panel sc-header sm:px-5">
    <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div class="sc-header-top flex items-center justify-between gap-3">
      <a href="/" class="inline-flex min-w-0 max-w-full items-center gap-3">
        <BrandMark compact={isMobileHeader} />
      </a>
      </div>

      <nav class={`sc-header-nav flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible md:justify-end ${showReturnToList ? 'sc-header-nav--with-return' : ''}`} aria-label="Navigazione pubblica">
        {#if showReturnToList}
          <a href={listHref} on:click={showHeaderForNavigation} class={`sc-header-link sc-header-return sc-ui-pill sc-ui-pill--primary px-3.5 py-2 text-sm ${isHome ? 'sc-header-return--home' : ''}`}>
            Torna all'elenco
          </a>
        {/if}
        {#if isHome}
          <a href="/" on:click={showHeaderForNavigation} class={`${navClass()} sc-header-home-link`}>
            Home
          </a>
        {/if}
        <a href="/zone" on:click={showHeaderForNavigation} class={navClass()}>
          Zone
        </a>
        <a href="/discipline" on:click={showHeaderForNavigation} class={navClass()}>
          Discipline
        </a>
        <a href="/guide" on:click={showHeaderForNavigation} class={navClass()}>
          Guide
        </a>
        <a href="/chi-siamo" on:click={showHeaderForNavigation} class={navClass()}>
          Chi siamo
        </a>
        <a href="/per-le-palestre" on:click={showHeaderForNavigation} class={`sc-header-link sc-header-business-link sc-ui-pill sc-ui-pill--primary px-3.5 py-2 text-sm ${showReturnToList ? 'sc-header-business-link--secondary' : ''}`}>
          Per le palestre
        </a>
      </nav>
    </div>
  </div>
  </div>
</header>
