<script>
  import '../app.css';
  import { page } from '$app/stores';
  import PublicHeader from '$lib/components/PublicHeader.svelte';
  import PublicFooter from '$lib/components/PublicFooter.svelte';
  import { SITE_CONTACT_EMAIL, SITE_NAME, SITE_URL, absoluteUrl, jsonLdScript } from '$lib/site';

  const socialDescription = 'Trova palestre, corsi e centri sportivi nella tua zona.';
  const brandOgImage = '/brand/og-image.png';
  $: pathname = $page.url.pathname;
  $: isAdminRoute = pathname.startsWith('/admin');
  $: organizationStructuredDataScript = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/brand/logo-icon-512.png'),
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
  <meta name="theme-color" content="#0D2D44" />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content="PalestreInZona" />
  <meta property="og:description" content={socialDescription} />
  <meta property="og:image" content={brandOgImage} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="PalestreInZona" />
  <meta name="twitter:description" content={socialDescription} />
  <meta name="twitter:image" content={brandOgImage} />
  {#if isAdminRoute}
    <meta name="robots" content="noindex,nofollow" />
  {/if}
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
