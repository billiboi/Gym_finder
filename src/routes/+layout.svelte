<script>
  import '../app.css';
  import { page } from '$app/stores';
  import PublicHeader from '$lib/components/PublicHeader.svelte';
  import PublicFooter from '$lib/components/PublicFooter.svelte';
  import { SITE_CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl, jsonLdScript } from '$lib/site';

  $: pathname = $page.url.pathname;
  $: canonical = absoluteUrl(pathname);
  $: isAdminRoute = pathname.startsWith('/admin');
  $: organizationStructuredDataScript = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    email: SITE_CONTACT_EMAIL,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SITE_CONTACT_EMAIL,
      availableLanguage: ['it', 'en']
    }
  });
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
  {@html organizationStructuredDataScript}
</svelte:head>

{#if !isAdminRoute}
  <a href="#main-content" class="sc-skip-link">Salta al contenuto</a>
  <PublicHeader />
{/if}

<div id="main-content" tabindex="-1">
  <slot />
</div>

{#if !isAdminRoute}
  <PublicFooter />
{/if}
