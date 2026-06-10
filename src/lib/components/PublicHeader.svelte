<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import BrandMark from '$lib/components/BrandMark.svelte';
  import { trackEvent } from '$lib/tracking';

  const MOBILE_HEADER_BREAKPOINT = 768;

  let isMobileHeader = false;
  let lastScrollY = 0;
  let headerHidden = false;
  let mobileMenuOpen = false;

  $: path = $page.url.pathname;
  $: isHome = path === '/';
  $: showReturnToList = !isHome;
  $: returnHref = path.startsWith('/palestre/') ? '/#elenco-palestre' : '/';
  $: listHref = isHome ? '#home-search' : returnHref;
  $: if (path) mobileMenuOpen = false;

  const navItems = [
    { href: '/zone', label: 'Zone' },
    { href: '/discipline', label: 'Discipline' },
    { href: '/per-le-palestre', label: 'Per le palestre', event: true },
    { href: '/chi-siamo', label: 'Chi siamo' }
  ];

  function navClass() {
    return 'sc-header-link sc-header-nav-link px-2.5 py-2 text-sm';
  }

  function syncHeaderMode() {
    if (typeof window === 'undefined') return;
    isMobileHeader = window.innerWidth < MOBILE_HEADER_BREAKPOINT;
    if (!isMobileHeader) {
      headerHidden = false;
      mobileMenuOpen = false;
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
    mobileMenuOpen = false;
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
          <a href="/" class="inline-flex min-h-11 min-w-0 max-w-full items-center gap-3" aria-label="PalestreInZona home">
            <BrandMark compact={isMobileHeader} />
          </a>
          <button
            type="button"
            class="sc-header-menu-button inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-black md:hidden"
            aria-label={mobileMenuOpen ? 'Chiudi menu' : 'Apri menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="public-mobile-menu"
            on:click={() => (mobileMenuOpen = !mobileMenuOpen)}
          >
            {mobileMenuOpen ? 'X' : 'Menu'}
          </button>
        </div>

        <nav class={`sc-header-nav hidden gap-5 md:flex md:items-center md:justify-end ${showReturnToList ? 'sc-header-nav--with-return' : ''}`} aria-label="Navigazione pubblica">
          {#if showReturnToList}
            <a href={listHref} on:click={showHeaderForNavigation} class={`sc-header-link sc-header-return sc-button sc-button--secondary px-3.5 py-2 text-sm ${isHome ? 'sc-header-return--home' : ''}`}>
              Torna all'elenco
            </a>
          {/if}
          {#each navItems as item}
            <a
              href={item.href}
              on:click={() => {
                showHeaderForNavigation();
                if (item.event) trackEvent('partner_cta_click', { posizione: 'header', cta: 'per_le_palestre' });
              }}
              class={navClass()}
            >
              {item.label}
            </a>
          {/each}
          <a href="/rivendica-scheda" on:click={showHeaderForNavigation} class="sc-header-link sc-button sc-button--secondary px-3.5 py-2 text-sm">
            Verifica scheda
          </a>
        </nav>

        {#if mobileMenuOpen}
          <nav id="public-mobile-menu" class="sc-header-mobile-menu grid gap-1 border-t pt-2 md:hidden" aria-label="Menu mobile">
            <a href={listHref} on:click={showHeaderForNavigation} class="sc-header-mobile-link">Cerca</a>
            {#each navItems as item}
              <a
                href={item.href}
                on:click={() => {
                  showHeaderForNavigation();
                  if (item.event) trackEvent('partner_cta_click', { posizione: 'header_mobile', cta: 'per_le_palestre' });
                }}
                class="sc-header-mobile-link"
              >
                {item.label}
              </a>
            {/each}
            <a href="/rivendica-scheda" on:click={showHeaderForNavigation} class="sc-button sc-button--primary mt-1 w-full px-4 py-2.5 text-sm">
              Verifica scheda
            </a>
          </nav>
        {/if}
      </div>
    </div>
  </div>
</header>