<script>
  import { page } from '$app/stores';
  import { SITE_CONTACT_EMAIL, SITE_NAME, absoluteUrl } from '$lib/site';

  const pageUrl = absoluteUrl('/rivendica-scheda');
  const title = `Rivendica una scheda | ${SITE_NAME}`;
  const description =
    'Richiedi l aggiornamento o la rivendicazione di una scheda palestra in modo guidato e con i riferimenti gia pronti.';

  $: gymName = $page.url.searchParams.get('gym') || '';
  $: gymUrl = $page.url.searchParams.get('url') || '';
  $: claimReason = $page.url.searchParams.get('reason') || 'Aggiornamento dati';
  $: emailSubject = gymName
    ? `Richiesta scheda - ${gymName}`
    : 'Richiesta rivendicazione scheda';
  $: emailBody = [
    'Ciao,',
    '',
    'vorrei richiedere un aggiornamento o la rivendicazione di una scheda su Palestre in Zona.',
    '',
    `Nome palestra: ${gymName || '[inserisci nome palestra]'}`,
    `Link scheda: ${gymUrl || '[inserisci link scheda]'}`,
    `Motivo richiesta: ${claimReason}`,
    '',
    'Dettagli da aggiornare o verificare:',
    '-',
    '',
    'Riferimento del richiedente:',
    '- Nome e ruolo:',
    '- Recapito diretto:',
    '',
    'Grazie.'
  ].join('\n');
  $: mailtoHref = `mailto:${SITE_CONTACT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={pageUrl} />
</svelte:head>

<div class="min-h-screen w-full sc-page">
  <main class="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-panel sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Rivendica una scheda</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Un percorso semplice per aggiornare la scheda della tua palestra</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        Se gestisci una struttura presente nel catalogo, qui trovi un modello gia pronto per chiederne l aggiornamento o la rivendicazione in modo chiaro e rapido.
      </p>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Scheda selezionata</p>
          <p class="mt-2 text-lg font-bold text-slate-900">{gymName || 'Nessuna scheda precompilata'}</p>
          <p class="mt-3 text-sm leading-7 text-slate-600 break-all">
            {gymUrl || 'Se arrivi da una scheda pubblica, il link verra inserito automaticamente.'}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Motivo richiesta</p>
          <p class="mt-2 text-lg font-bold text-slate-900">{claimReason}</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">
            Puoi usare questa pagina sia per correzioni semplici sia per richiedere una gestione piu diretta della scheda.
          </p>
        </div>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Come procedere</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Tre passaggi chiari</h2>
      </div>

      <div class="mt-5 grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">1. Controlla i dati</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">
            Verifica che nome palestra e link scheda siano corretti. Se mancano, puoi aggiungerli manualmente nel testo email.
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">2. Spiega la richiesta</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">
            Specifica cosa vuoi aggiornare: discipline, indirizzo, orari, telefono, sito, descrizione oppure rivendicazione della scheda.
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">3. Invia</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">
            Usa il bottone qui sotto: aprira una email gia pronta, cosi non devi partire da zero ogni volta.
          </p>
        </div>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Bozza email</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Messaggio precompilato</h2>
      </div>

      <div class="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Oggetto</p>
        <p class="mt-2 text-base font-bold text-slate-900">{emailSubject}</p>
      </div>

      <div class="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Corpo del messaggio</p>
        <pre class="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{emailBody}</pre>
      </div>

      <div class="mt-5 flex flex-wrap gap-3">
        <a href={mailtoHref} class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
          Apri email precompilata
        </a>
        <a href="/per-le-palestre" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
          Torna alla pagina per le palestre
        </a>
      </div>
    </section>
  </main>
</div>
