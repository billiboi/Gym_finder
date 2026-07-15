<script>
  // 'dark' = navy/teal marks for light backgrounds (header). 'light' = white
  // wordmark + teal pin for navy backgrounds (hero bands, footer).
  export let variant = 'dark';

  $: pinFill = variant === 'light' ? '#0fa3a3' : '#0d2d44';
  $: dumbbellFill = variant === 'light' ? '#ffffff' : '#0fa3a3';
  $: textFill = variant === 'light' ? '#ffffff' : '#0d2d44';
  $: accentFill = variant === 'light' ? '#ffffff' : '#0fa3a3';

  // Pin silhouette with a circular hole punched near the top (evenodd),
  // shared between the desktop lockup and the mobile icon-only mark.
  const PIN_D =
    'M4,50 A22,22 0 1 1 48,50 C48,64 26,92 26,92 C26,92 4,64 4,50 Z ' +
    'M26,40 A10,10 0 1 0 26,60 A10,10 0 1 0 26,40 Z';
</script>

<span class="sc-logo" role="img" aria-label="Palestre in Zona">
  <svg
    class="sc-logo-svg sc-logo-svg--desktop"
    viewBox="0 0 400 100"
    aria-hidden="true"
    focusable="false"
  >
    <path fill-rule="evenodd" clip-rule="evenodd" d={PIN_D} fill={pinFill} />
    <g fill={dumbbellFill}>
      <rect x="8" y="47.8" width="36" height="4.4" rx="2.2" />
      <rect x="1" y="44" width="2.6" height="12" rx="1.3" />
      <rect x="5.2" y="41.5" width="3.2" height="17" rx="1.6" />
      <rect x="43.6" y="41.5" width="3.2" height="17" rx="1.6" />
      <rect x="48.4" y="44" width="2.6" height="12" rx="1.3" />
      <circle cx="26" cy="50" r="7" />
    </g>
    <text x="66" y="68" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="600" font-size="54" letter-spacing="-0.5" fill={textFill}
      >Palestre<tspan fill={accentFill}>In</tspan>Zona</text
    >
  </svg>

  <svg
    class="sc-logo-svg sc-logo-svg--mobile"
    viewBox="0 0 100 100"
    aria-hidden="true"
    focusable="false"
  >
    <g transform="translate(24,0)">
      <path fill-rule="evenodd" clip-rule="evenodd" d={PIN_D} fill={pinFill} />
      <g fill={dumbbellFill}>
        <rect x="8" y="47.8" width="36" height="4.4" rx="2.2" />
        <rect x="1" y="44" width="2.6" height="12" rx="1.3" />
        <rect x="5.2" y="41.5" width="3.2" height="17" rx="1.6" />
        <rect x="43.6" y="41.5" width="3.2" height="17" rx="1.6" />
        <rect x="48.4" y="44" width="2.6" height="12" rx="1.3" />
        <circle cx="26" cy="50" r="7" />
      </g>
    </g>
  </svg>
</span>
