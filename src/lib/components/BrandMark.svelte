<script>
  export let compact = false;
</script>

<span class="inline-flex min-w-0 items-center">
  {#if compact}
    <img
      src="/brand/logo-icon.svg"
      alt="PalestreInZona"
      width="44"
      height="44"
      loading="eager"
      decoding="async"
      class="sc-brand-logo sc-brand-logo--icon"
    />
  {:else}
    <img
      src="/brand/logo-horizontal.svg"
      alt="PalestreInZona"
      width="236"
      height="52"
      loading="eager"
      decoding="async"
      class="sc-brand-logo sc-brand-logo--horizontal"
    />
  {/if}
</span>
