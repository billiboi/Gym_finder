<script>
  import { page } from '$app/stores';
  import { SITE_NAME, absoluteUrl } from '$lib/site';

  $: status = $page.status || 500;
  $: message = $page.error?.message || 'Si è verificato un errore';
  $: requestedPath = $page.url?.pathname || '/';
  $: isNotFound = status === 404;
  $: title = isNotFound ? 'Pagina non trovata' : 'Qualcosa non ha funzionato';
  $: description = isNotFound
    ? 'La scheda o la pagina che stai cercando non è più disponibile oppure l’indirizzo non è corretto.'
    : 'La pagina non è disponibile in questo momento. Puoi tornare alla ricerca e riprovare.';
</script>

<svelte:head>
  <title>{title} | {SITE_NAME}</title>
  <meta name="robots" content="noindex,follow" />
  <link rel="canonical" href={absoluteUrl(requestedPath)} />
</svelte:head>

<main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
  <section class="sc-panel sc-error-shell rounded-3xl p-5 sm:p-8 lg:p-10">
    <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)] lg:items-center">
      <div class="min-w-0">
        <p class="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-emerald-800">{status}</p>
        <h1 class="mt-3 max-w-3xl text-3xl font-bold leading-tight text-slate-900 sm:text-5xl">{title}</h1>
        <p class="mt-4 max-w-2xl text-base leading-8 text-slate-600">{description}</p>

        {#if message && message !== title}
          <p class="mt-3 max-w-2xl text-sm font-semibold text-slate-500">{message}</p>
        {/if}

        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href="/" class="inline-flex min-h-[2.9rem] items-center justify-center rounded-xl px-5 text-sm font-bold text-white sc-button">
            Torna alla ricerca
          </a>
          <a href="/zone" class="sc-secondary-cta sc-secondary-cta--zone">
            Sfoglia zone
          </a>
          <a href="/discipline" class="sc-secondary-cta sc-secondary-cta--discipline">
            Sfoglia discipline
          </a>
        </div>
      </div>

      <aside class="rounded-2xl border border-white/70 bg-white/72 p-4 shadow-sm">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Indirizzo richiesto</p>
        <p class="mt-2 break-words text-sm font-bold text-slate-900">{requestedPath}</p>
        <div class="mt-4 grid gap-2 text-sm text-slate-600">
          <p>Prova a cercare la palestra dalla home.</p>
          <p>Se la scheda è stata rimossa, puoi consultare zone e discipline aggiornate.</p>
        </div>
      </aside>
    </div>
  </section>
</main>
