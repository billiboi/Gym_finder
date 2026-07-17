<script>
  // 'dark' = navy badge + navy wordmark, for light backgrounds (header).
  // 'light' = white badge + white wordmark, for navy backgrounds (hero bands, footer).
  export let variant = 'dark';

  $: inverted = variant === 'light';
</script>

<span class="sc-logo" role="img" aria-label="Palestre in Zona">
  <span class={`sc-logo-badge ${inverted ? 'sc-logo-badge--inverted' : ''}`} aria-hidden="true">
    <span class="sc-logo-badge-p">P</span>
    <span class="sc-logo-badge-pin"></span>
  </span>
  <span class={`sc-logo-wordmark ${inverted ? 'sc-logo-wordmark--inverted' : ''}`} aria-hidden="true"
    >palestre<span class="sc-logo-wordmark-in">in</span>zona</span
  >
</span>
