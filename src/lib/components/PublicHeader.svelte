<script>
  export let path = '/';

  const isHome = path === '/';
  const isDetail = path.startsWith('/palestre/');
  const isZone = path.startsWith('/zone/');
  const isDiscipline = path.startsWith('/discipline/');
</script>

<header class="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
  <div class="rounded-[1.75rem] border border-white/70 bg-white/85 px-4 py-4 shadow-lg backdrop-blur-sm sc-panel sc-header sm:px-5">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0 flex-1">
          <a href="/" class="inline-flex max-w-full items-start">
            <span class="min-w-0">
              <span class="block text-[11px] font-bold uppercase tracking-[0.28em] text-amber-700 sm:text-xs">Palestre in Zona</span>
              <span class="mt-1 block text-sm leading-5 text-slate-600 sm:text-[15px]">Allenati ovunque, trova la palestra giusta vicino a te.</span>
            </span>
          </a>
        </div>

        <div class="min-w-0 md:max-w-xs md:text-right">
          <p class="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 sm:text-xs">
            {#if isHome}
              Ricerca geografica
            {:else if isDetail}
              Scheda completa
            {:else if isZone}
              Focus locale
            {:else if isDiscipline}
              Focus disciplina
            {:else}
              Esplora le palestre
            {/if}
          </p>
          <p class="mt-1 text-sm leading-5 text-slate-600">
            {#if isHome}
              Filtra per disciplina, posizione e distanza in pochi tocchi.
            {:else if isDetail}
              Approfondisci contatti, orari e informazioni della palestra.
            {:else if isZone}
              Una selezione locale per scoprire piu rapidamente le palestre della zona.
            {:else if isDiscipline}
              Una raccolta dedicata a una singola disciplina, utile anche per ricerche piu mirate.
            {:else}
              Navigazione coerente su tutte le pagine pubbliche.
            {/if}
          </p>
        </div>
      </div>

      <nav class="flex flex-wrap items-center gap-2 pt-1">
        <a href="/" class="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Home
        </a>
        <a href="/zone/varese" class="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Zone
        </a>
        <a href="/discipline/boxe" class="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Discipline
        </a>
        {#if !isHome}
          <a href="/" class="rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sc-button">
            Torna all'elenco
          </a>
        {/if}
      </nav>
    </div>
  </div>
</header>
