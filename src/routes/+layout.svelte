<script>
  import '../app.css';
  import { page } from '$app/stores';
  import PublicHeader from '$lib/components/PublicHeader.svelte';
</script>

<svelte:head>
  <title>Pocket Gym</title>
  <meta
    name="description"
    content="Pocket Gym ti aiuta a trovare palestre vicine con filtri per disciplina, posizione e distanza."
  />
  <meta name="theme-color" content="#1f5c4a" />
  <meta property="og:title" content="Pocket Gym" />
  <meta
    property="og:description"
    content="La directory per trovare palestre vicine, anche quando sei in viaggio o ti sei appena trasferito."
  />
</svelte:head>

{#if !$page.url.pathname.startsWith('/admin')}
  <PublicHeader path={$page.url.pathname} />
{/if}

<slot />
