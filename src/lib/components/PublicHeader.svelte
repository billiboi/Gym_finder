<script>
  export let path = '/';

  const isHome = path === '/';
  const isDetail = path.startsWith('/palestre/');
  const isZone = path.startsWith('/zone/');
  const isDiscipline = path.startsWith('/discipline/');

  const sectionLabel = isHome
    ? 'Ricerca geografica'
    : isDetail
      ? 'Scheda completa'
      : isZone
        ? 'Focus locale'
        : isDiscipline
          ? 'Focus disciplina'
          : 'Esplora le palestre';

  const sectionCopy = isHome
    ? 'Filtra per disciplina, posizione e distanza in pochi tocchi.'
    : isDetail
      ? 'Approfondisci contatti, orari e informazioni della palestra.'
      : isZone
        ? 'Una selezione locale per scoprire più rapidamente le palestre della zona.'
        : isDiscipline
          ? 'Una raccolta dedicata a una singola disciplina, utile anche per ricerche più mirate.'
          : 'Navigazione coerente su tutte le pagine pubbliche.';
</script>

<header class="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
  <div class="rounded-[1.75rem] border border-white/70 bg-white/85 px-4 py-4 shadow-lg backdrop-blur-sm sc-panel sc-header sm:px-5">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0 flex-1">
          <a href="/" class="inline-flex max-w-full items-start">
            <span class="min-w-0">
              <span class="block text-[10px] font-bold uppercase tracking-[0.28em] text-amber-700 sm:text-xs">Palestre in Zona</span>
              <span class="mt-1 block text-[1.05rem] font-semibold leading-6 text-slate-900 sm:text-[1.1rem]">
                Trova la palestra giusta vicino a te.
              </span>
              <span class="mt-1 block text-[13px] leading-5 text-slate-600 sm:text-sm">
                Allenati ovunque, con una ricerca rapida e ordinata.
              </span>
            </span>
          </a>
        </div>

        <div class="min-w-0 md:max-w-xs md:text-right">
          <div class="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-800 md:ml-auto sm:text-xs">
            {sectionLabel}
          </div>
          <p class="mt-2 hidden text-sm leading-5 text-slate-600 md:block">
            {sectionCopy}
          </p>
        </div>
      </div>

      <nav class="sc-header-nav flex gap-2 overflow-x-auto pt-1 sm:flex-wrap sm:overflow-visible" aria-label="Navigazione pubblica">
        <a href="/" class="sc-header-link rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Home
        </a>
        <a href="/zone" class="sc-header-link rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Zone
        </a>
        <a href="/discipline" class="sc-header-link rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Discipline
        </a>
        {#if !isHome}
          <a href="/" class="sc-header-link rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sc-button">
            Torna all'elenco
          </a>
        {/if}
      </nav>
    </div>
  </div>
</header>

