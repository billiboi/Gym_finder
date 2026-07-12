<script>
  import '../app.css';
  import { page } from '$app/stores';
  import PublicHeader from '$lib/components/PublicHeader.svelte';
  import PublicFooter from '$lib/components/PublicFooter.svelte';
  import { SITE_CONTACT_EMAIL, SITE_NAME, SITE_URL, jsonLdScript } from '$lib/site';

  $: pathname = $page.url.pathname;
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
  <meta name="theme-color" content="#0d2d44" />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta name="twitter:card" content="summary_large_image" />
  {#if isAdminRoute}
    <meta name="robots" content="noindex,nofollow" />
  {/if}
  {@html organizationStructuredDataScript}
	<link
  	rel="preload"
  	as="image"
  	href="/brand/logo-icon.png"
  	media="(max-width: 767px)"
	/>
	<link
 	 rel="preload"
	  as="image"
	  href="/brand/logo-horizontal.png"
 	 media="(min-width: 768px)"
	/>
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
