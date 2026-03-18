<script>
  import {
    buildGymPresentation,
    disciplineListForGym,
    fixGymText,
    formatAddressForDisplay,
    imageForGym
  } from '$lib/gym-detail';

  export let data;

  const { gym } = data;
  const disciplines = disciplineListForGym(gym);
  const presentation = buildGymPresentation(gym);
  const imageSrc = imageForGym(gym);
  const hoursInfo = fixGymText(gym?.hours_info) || 'Orari da verificare';
  const address = formatAddressForDisplay(gym);
  const phone = fixGymText(gym?.phone) || 'Non disponibile';
  const website = fixGymText(gym?.website);
</script>

<svelte:head>
  <title>{fixGymText(gym?.name)} | Gym Finder</title>
  <meta name="description" content={presentation} />
</svelte:head>

<div class="min-h-screen w-full sc-page">
  <header class="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
    <div class="rounded-3xl border border-white/70 bg-white/80 px-4 py-4 shadow-lg backdrop-blur-sm sc-panel">
      <a
        href="/"
        class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        Torna all'elenco
      </a>
    </div>
  </header>

  <main class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <section class="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-xl backdrop-blur-sm sc-panel">
      <div class="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="relative min-h-[280px] bg-slate-100">
          <img
            src={imageSrc}
            alt={`Foto di ${fixGymText(gym?.name)}`}
            class="h-full min-h-[280px] w-full object-cover"
          />
        </div>

        <div class="flex flex-col justify-between gap-5 p-5 sm:p-7">
          <div class="space-y-4">
            <div class="flex flex-wrap gap-2">
              {#each disciplines as discipline}
                <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white sc-badge sc-badge--accent">
                  {discipline}
                </span>
              {/each}
            </div>

            <div>
              <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Scheda palestra</p>
              <h1 class="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                {fixGymText(gym?.name)}
              </h1>
            </div>

            <p class="text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">{presentation}</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-meta">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Indirizzo</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">{address}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-meta">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Orari</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">{hoursInfo}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-meta">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Telefono</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">{phone}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-meta">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Sito web</p>
              {#if website}
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  class="mt-2 inline-flex text-sm font-semibold text-emerald-800 underline decoration-2 underline-offset-2 sc-detail-link"
                >
                  Visita il sito ufficiale
                </a>
              {:else}
                <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">Non disponibile</p>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Presentazione</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Allenati anche quando sei fuori zona</h2>
        <p class="mt-4 text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">
          {presentation}
        </p>
        <p class="mt-4 text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">
          In questa scheda trovi i dettagli essenziali per capire rapidamente se la palestra e adatta
          alle tue esigenze: discipline praticate, indirizzo, orari e contatti diretti.
        </p>
      </div>
    </section>
  </main>
</div>

