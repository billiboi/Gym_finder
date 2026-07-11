<script>
  import { page } from '$app/stores';

  $: pathname = $page.url.pathname;
  $: tabs = [
    { label: 'Panoramica', href: '/admin/qualita', active: pathname === '/admin/qualita' },
    { label: 'Riclassifica', href: '/admin/qualita/riclassifica', active: pathname === '/admin/qualita/riclassifica' },
    { label: 'Descrizioni', href: '/admin/qualita/descrizioni', active: pathname === '/admin/qualita/descrizioni' },
    { label: 'Contenuti', href: '/admin/qualita/contenuti', active: pathname === '/admin/qualita/contenuti' }
  ];
</script>

<div class="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
  <nav class="flex flex-wrap gap-2" aria-label="Sotto-navigazione Qualità">
    {#each tabs as tab}
      <a
        href={tab.href}
        class="sc-ui-pill px-3.5 py-2 text-sm"
        class:sc-ui-pill--primary={tab.active}
        aria-current={tab.active ? 'page' : undefined}
      >
        {tab.label}
      </a>
    {/each}
  </nav>
</div>

<slot />
