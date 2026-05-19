<script>
  const workflow = [
    'Apri Search Console e filtra gli ultimi 28 giorni.',
    'Ordina le query per impression alte e CTR basso.',
    'Concentrati prima sulle posizioni medie tra 4 e 15.',
    'Controlla se la pagina target ha title, meta, H1 e intent coerenti.',
    'Aggiorna una famiglia di pagine alla volta e annota la data intervento.',
    'Ricontrolla CTR e posizione dopo 14-28 giorni.'
  ];

  const pageTypes = [
    {
      name: 'Homepage',
      pattern: 'Trova Palestre Vicino a Te | Fitness, Boxe, Yoga e Arti Marziali',
      check: 'Query generiche tipo palestra vicino a me, palestre, corsi fitness.'
    },
    {
      name: 'Disciplina',
      pattern: 'Palestre di {Disciplina} vicino a te | Orari, contatti e corsi',
      check: 'Query con disciplina esplicita: boxe, yoga, kickboxing, Brazilian Jiu Jitsu.'
    },
    {
      name: 'Zona',
      pattern: 'Palestre a {Citta} | Fitness, Boxe, Yoga, orari e contatti',
      check: 'Query locali con città o località.'
    },
    {
      name: 'Scheda palestra',
      pattern: '{Nome palestra} a {Citta} | {Disciplina}, orari e contatti',
      check: 'Query brand, nome palestra, palestra + citta.'
    }
  ];

  const opportunityFields = [
    'Query',
    'Pagina',
    'Impression',
    'CTR',
    'Posizione media',
    'Title attuale',
    'Nuovo title proposto',
    'Meta proposta',
    'Data modifica',
    'Esito dopo 14-28 giorni'
  ];
</script>

<svelte:head>
  <title>CTR SEO | Area admin</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="mx-auto min-h-screen w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">SEO operativo</p>
        <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Checklist CTR Search Console</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Questa pagina non mostra metriche automatiche: serve a guidare interventi manuali su query con molte impression, CTR basso e posizione 4-15.
        </p>
      </div>
      <a href="/admin" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Torna admin</a>
    </div>
  </section>

  <section class="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
    <div class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg backdrop-blur-sm">
      <h2 class="text-xl font-bold text-slate-900">Workflow consigliato</h2>
      <ol class="mt-4 space-y-3">
        {#each workflow as item, index}
          <li class="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white">{index + 1}</span>
            <span>{item}</span>
          </li>
        {/each}
      </ol>
    </div>

    <div class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg backdrop-blur-sm">
      <h2 class="text-xl font-bold text-slate-900">Campi del report manuale</h2>
      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        {#each opportunityFields as field}
          <div class="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{field}</div>
        {/each}
      </div>
      <p class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
        Non inserire stime inventate: compila solo dati letti da Search Console o note operative interne.
      </p>
    </div>
  </section>

  <section class="mt-5 rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg backdrop-blur-sm">
    <h2 class="text-xl font-bold text-slate-900">Pattern title/meta verificati</h2>
    <div class="mt-4 grid gap-3 lg:grid-cols-2">
      {#each pageTypes as item}
        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{item.name}</p>
          <h3 class="mt-2 text-base font-bold text-slate-900">{item.pattern}</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600">{item.check}</p>
        </article>
      {/each}
    </div>
  </section>
</main>
