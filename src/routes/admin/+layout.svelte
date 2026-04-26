<header class="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
  <div class="rounded-[1.75rem] border border-white/70 bg-white/85 px-4 py-4 shadow-lg backdrop-blur-sm sc-panel">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="min-w-0 flex-1">
        <a href="/" class="inline-flex max-w-full items-start">
          <span class="min-w-0">
            <span class="block text-[10px] font-bold uppercase tracking-[0.28em] text-amber-700 sm:text-xs">Palestre in Zona</span>
            <span class="mt-1 block text-[1.05rem] font-semibold leading-6 text-slate-900 sm:text-[1.1rem]">Area amministrativa</span>
            <span class="mt-1 block text-[13px] leading-5 text-slate-600 sm:text-sm">Da qui puoi gestire schede, richieste e riclassificazioni senza perdere il collegamento con il sito pubblico.</span>
          </span>
        </a>
      </div>

      <nav class="flex flex-wrap gap-2" aria-label="Navigazione admin">
        <a href="/" class="sc-ui-pill px-3.5 py-2 text-sm">Home pubblica</a>
        <a href="/admin" class="sc-ui-pill sc-ui-pill--primary px-3.5 py-2 text-sm">Dashboard admin</a>
        <form method="POST" action="/admin/logout">
          <button type="submit" class="sc-ui-pill sc-ui-pill--danger px-3.5 py-2 text-sm">
            Esci
          </button>
        </form>
      </nav>
    </div>
  </div>
</header>

<slot />

