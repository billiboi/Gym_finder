<script>
  import { SITE_CONTACT_EMAIL, SITE_NAME, absoluteUrl } from '$lib/site';

  export let data;
  export let form;

  const pageUrl = absoluteUrl('/rivendica-scheda');
  const title = `Rivendica una scheda | ${SITE_NAME}`;
  const description =
    'Richiedi l aggiornamento o la rivendicazione di una scheda palestra in modo guidato e con un form interno pensato per il progetto.';

  $: currentValues = {
    gym_name: form?.values?.gym_name ?? data.prefill.gym ?? '',
    gym_url: form?.values?.gym_url ?? data.prefill.url ?? '',
    reason: form?.values?.reason ?? data.prefill.reason ?? 'Aggiornamento dati',
    requester_name: form?.values?.requester_name ?? '',
    requester_role: form?.values?.requester_role ?? '',
    requester_email: form?.values?.requester_email ?? '',
    requester_phone: form?.values?.requester_phone ?? '',
    message: form?.values?.message ?? ''
  };
  $: emailSubject = currentValues.gym_name
    ? `Richiesta scheda - ${currentValues.gym_name}`
    : 'Richiesta rivendicazione scheda';
  $: emailBody = [
    'Ciao,',
    '',
    'vorrei richiedere un aggiornamento o la rivendicazione di una scheda su Palestre in Zona.',
    '',
    `Nome palestra: ${currentValues.gym_name || '[inserisci nome palestra]'}`,
    `Link scheda: ${currentValues.gym_url || '[inserisci link scheda]'}`,
    `Motivo richiesta: ${currentValues.reason}`,
    `Richiedente: ${currentValues.requester_name || '[nome]'}`,
    `Ruolo: ${currentValues.requester_role || '[ruolo]'}`,
    `Email: ${currentValues.requester_email || '[email]'}`,
    `Telefono: ${currentValues.requester_phone || '[telefono]'}`,
    '',
    'Dettagli richiesta:',
    currentValues.message || '[descrivi qui la richiesta]',
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
        Se gestisci una struttura presente nel catalogo, qui trovi un form guidato pensato per richiedere correzioni, integrazioni o la rivendicazione della scheda pubblica.
      </p>
    </section>

    {#if form?.success}
      <section class="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Richiesta inviata</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Perfetto, abbiamo registrato la richiesta</h2>
        <p class="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
          ID richiesta: <strong>{form.requestId}</strong>. Tieni questo riferimento se vorrai riscriverci sulla stessa segnalazione.
        </p>
      </section>
    {:else if form?.error}
      <section class="mt-5 rounded-3xl border border-red-200 bg-red-50/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-red-700">Invio non riuscito</p>
        <p class="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{form.error}</p>
      </section>
    {/if}

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Scheda selezionata</p>
          <p class="mt-2 text-lg font-bold text-slate-900">{currentValues.gym_name || 'Nessuna scheda precompilata'}</p>
          <p class="mt-3 break-all text-sm leading-7 text-slate-600">
            {currentValues.gym_url || 'Se arrivi da una scheda pubblica, il link viene inserito automaticamente.'}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Percorso attivo</p>
          <p class="mt-2 text-lg font-bold text-slate-900">{data.persistentClaimFlow ? 'Richiesta interna' : 'Fallback via email'}</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">
            {#if data.persistentClaimFlow}
              La richiesta puo essere salvata direttamente dal sito.
            {:else}
              In questo ambiente il salvataggio diretto non e disponibile, ma puoi comunque usare la mail precompilata.
            {/if}
          </p>
        </div>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Invia richiesta</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Compila il form</h2>
      </div>

      <form method="POST" action="?/submit" class="mt-5 grid gap-4">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Nome palestra</span>
            <input name="gym_name" value={currentValues.gym_name} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Link scheda</span>
            <input name="gym_url" value={currentValues.gym_url} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Nome e cognome</span>
            <input name="requester_name" value={currentValues.requester_name} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Ruolo</span>
            <input name="requester_role" value={currentValues.requester_role} placeholder="Titolare, coach, staff..." class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Email</span>
            <input name="requester_email" type="email" value={currentValues.requester_email} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Telefono</span>
            <input name="requester_phone" value={currentValues.requester_phone} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
        </div>

        <label class="grid gap-2">
          <span class="text-sm font-semibold text-slate-700">Tipo di richiesta</span>
          <select name="reason" class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2">
            {#each ['Aggiornamento dati', 'Correzione scheda', 'Rivendicazione scheda', 'Collaborazione commerciale'] as option}
              <option value={option} selected={currentValues.reason === option}>{option}</option>
            {/each}
          </select>
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-semibold text-slate-700">Descrivi la richiesta</span>
          <textarea name="message" rows="7" class="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-7 text-slate-900 outline-none ring-slate-900 transition focus:ring-2">{currentValues.message}</textarea>
        </label>

        <div class="flex flex-wrap gap-3">
          <button type="submit" class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
            Invia richiesta
          </button>
          <a href={mailtoHref} class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
            Apri email precompilata
          </a>
        </div>
      </form>
    </section>
  </main>
</div>
