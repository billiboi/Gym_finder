<svelte:head>
  <title>Identita | Palestre in Zona</title>
  <meta
    name="description"
    content="Palette, tono e linee guida visive di Palestre in Zona per mantenere il prodotto coerente e riconoscibile."
  />
</svelte:head>

<script>
  const colors = [
    { name: 'Forest', value: '#1f5c4a', usage: 'Azione primaria, link brand, dettagli header' },
    { name: 'Pine', value: '#2f6f5b', usage: 'Gradienti, bottoni, accenti principali' },
    { name: 'Cream', value: '#fbfaf5', usage: 'Card, superfici leggibili, overlay chiari' },
    { name: 'Sand', value: '#d6cfb0', usage: 'Highlight, dettagli logo, tocchi premium' },
    { name: 'Ink', value: '#1f2e28', usage: 'Testo principale e contrasti forti' }
  ];

  const principles = [
    {
      title: 'Vicino e utile',
      body: 'Palestre in Zona deve sembrare uno strumento pratico per chi cerca una palestra rapidamente, non una vetrina fredda.'
    },
    {
      title: 'Sportivo ma pulito',
      body: 'Il brand usa energia e movimento, ma senza scivolare in un look aggressivo o rumoroso.'
    },
    {
      title: 'Mobile-first davvero',
      body: 'Gerarchia visiva, CTA e leggibilità devono funzionare subito su schermi piccoli, anche in viaggio.'
    }
  ];

  const assets = [
    'Logo segnaposto + manubrio per unire prossimità e allenamento',
    'Cover disciplina come fallback elegante quando manca la foto palestra',
    'Palette verde bosco + crema + sabbia per un tono premium ma accessibile'
  ];
</script>

<main class="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm sc-panel sc-brand-hero sm:p-8">
    <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div class="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-lg">
        <div class="flex items-center gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Palestre in Zona</p>
            <h1 class="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">Sistema visivo del prodotto</h1>
          </div>
        </div>
      </div>

      <div>
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Brand page</p>
        <h2 class="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">Una guida rapida per tenere il sito coerente</h2>
        <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Questa pagina fissa gli elementi base del marchio: logo, palette, tono visivo e criteri di utilizzo per cover, card e header.
        </p>
      </div>
    </div>
  </section>

  <section class="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
    <div class="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm sc-panel">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Logo</p>
      <h2 class="mt-2 text-2xl font-bold text-slate-900">Marchio testuale principale</h2>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div class="rounded-[2rem] bg-[#1f5c4a] p-8 text-white">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-white/70">Wordmark</p>
          <p class="mt-4 text-3xl font-bold tracking-[-0.04em]">Palestre in Zona</p>
        </div>
        <div class="rounded-[2rem] border border-slate-200 bg-[#fbfaf5] p-8 text-slate-900">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Wordmark</p>
          <p class="mt-4 text-3xl font-bold tracking-[-0.04em]">Palestre in Zona</p>
        </div>
      </div>
      <ul class="mt-5 grid gap-2 text-sm leading-7 text-slate-600">
        {#each assets as asset}
          <li class="rounded-2xl border border-slate-200 bg-white/75 px-4 py-3">{asset}</li>
        {/each}
      </ul>
    </div>

    <div class="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm sc-panel">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Principi</p>
      <h2 class="mt-2 text-2xl font-bold text-slate-900">Come deve sentirsi</h2>
      <div class="mt-5 grid gap-3">
        {#each principles as principle}
          <article class="rounded-2xl border border-slate-200 bg-white/75 p-4">
            <h3 class="text-base font-bold text-slate-900">{principle.title}</h3>
            <p class="mt-2 text-sm leading-7 text-slate-600">{principle.body}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="mt-5 rounded-3xl border border-white/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm sc-panel">
    <p class="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Palette</p>
    <h2 class="mt-2 text-2xl font-bold text-slate-900">Colori guida</h2>
    <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {#each colors as color}
        <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div class="h-24" style={`background:${color.value}`}></div>
          <div class="space-y-2 px-4 py-4">
            <p class="text-base font-bold text-slate-900">{color.name}</p>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{color.value}</p>
            <p class="text-sm leading-6 text-slate-600">{color.usage}</p>
          </div>
        </article>
      {/each}
    </div>
  </section>
</main>
