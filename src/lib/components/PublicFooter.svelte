<script>
  import { trackEvent } from '$lib/tracking';
</script>

<footer class="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
  <div class="rounded-3xl border border-white/70 bg-white/80 px-4 py-4 shadow-lg backdrop-blur-sm sc-panel">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div class="max-w-2xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-800">Palestre in Zona</p>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Cerca palestre e discipline vicine. Apri schede con contatti, orari e dati da verificare quando mancano conferme.
        </p>
      </div>

      <nav class="flex flex-wrap gap-2 text-sm" aria-label="Link utili">
        <a href="/guide" class="sc-ui-pill px-3 py-2">Guide</a>
        <a href="/discipline" class="sc-ui-pill px-3 py-2">Discipline</a>
        <a href="/chi-siamo" class="sc-ui-pill px-3 py-2">Chi siamo</a>
        <a href="/verifica-schede" class="sc-ui-pill px-3 py-2">Verifica schede</a>
        <a href="/contatti" class="sc-ui-pill px-3 py-2">Contatti</a>
        <a href="/per-le-palestre" class="sc-ui-pill px-3 py-2" on:click={() => trackEvent('partner_cta_click', { posizione: 'footer', cta: 'per_le_palestre' })}>Per le palestre</a>
        <a href="/privacy" class="sc-ui-pill px-3 py-2">Privacy</a>
      </nav>
    </div>
  </div>
</footer>
