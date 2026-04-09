<script>
  import '../app.css';
  import { page } from '$app/stores';
  import PublicHeader from '$lib/components/PublicHeader.svelte';
  import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '$lib/site';

  $: pathname = $page.url.pathname;
  $: canonical = absoluteUrl(pathname);
  $: isAdminRoute = pathname.startsWith('/admin');
</script>

<svelte:head>
  <title>{SITE_NAME}</title>
  <meta name="description" content={SITE_DESCRIPTION} />
  <meta name="theme-color" content="#1f5c4a" />
  <meta name="robots" content={isAdminRoute ? 'noindex, nofollow' : 'index, follow'} />
  <link rel="canonical" href={canonical} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content={SITE_NAME} />
  <meta property="og:description" content={SITE_DESCRIPTION} />
  <meta property="og:url" content={canonical} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={SITE_NAME} />
  <meta name="twitter:description" content={SITE_DESCRIPTION} />
</svelte:head>

{#if !isAdminRoute}
  <PublicHeader path={pathname} />
{/if}

<slot />
