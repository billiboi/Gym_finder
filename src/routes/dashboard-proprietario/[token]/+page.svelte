<script>
  export let data;
  export let form;

  $: claim = data.claim;
  $: values = form?.values || claim?.requested_updates || {};
</script>

<svelte:head>
  <title>Dashboard proprietario | Palestre in Zona</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="mx-auto min-h-screen w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 sc-page">
  <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <p class="text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">Dashboard proprietario</p>
    {#if !claim}
      <h1 class="mt-2 text-3xl font-bold text-slate-900">Accesso non valido</h1>
      <p class="mt-3 text-sm leading-7 text-slate-600">
        {data.error || 'Il link non è valido oppure la richiesta non è più disponibile.'}
      </p>
    {:else if !data.canUseDashboard}
      <h1 class="mt-2 text-3xl font-bold text-slate-900">Accesso in attesa di verifica</h1>
      <p class="mt-3 text-sm leading-7 text-slate-600">
        La dashboard si attiva solo dopo verifica email e approval admin. Stato attuale: <strong>{claim.status}</strong>.
      </p>
    {:else}
      <h1 class="mt-2 text-3xl font-bold text-slate-900">Gestisci {claim.gym_name}</h1>
      <p class="mt-3 text-sm leading-7 text-slate-600">
        Invia aggiornamenti su orari, contatti, immagini e richiesta di verifica. Le modifiche entrano in revisione: non vengono pubblicate direttamente.
      </p>
    {/if}
  </section>

  {#if form?.success}
    <section class="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-900">
      Aggiornamenti inviati. Un admin li controllerà prima di applicarli alla scheda pubblica.
    </section>
  {:else if form?.error}
    <section class="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">
      {form.error}
    </section>
  {/if}

  {#if data.canUseDashboard}
    <form method="POST" action="?/submitUpdates" class="mt-5 grid gap-5 rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg sm:p-7">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-2">
          <span class="text-sm font-semibold text-slate-700">Telefono</span>
          <input name="telefono" value={values.telefono || ''} class="rounded-xl px-3 py-2.5 text-sm outline-none ring-slate-900 focus:ring-2 sc-input sc-filter-field" />
        </label>
        <label class="grid gap-2">
          <span class="text-sm font-semibold text-slate-700">Email</span>
          <input name="email" type="email" value={values.email || ''} class="rounded-xl px-3 py-2.5 text-sm outline-none ring-slate-900 focus:ring-2 sc-input sc-filter-field" />
        </label>
      </div>

      <label class="grid gap-2">
        <span class="text-sm font-semibold text-slate-700">Sito ufficiale</span>
        <input name="sito" type="url" value={values.sito || ''} class="rounded-xl px-3 py-2.5 text-sm outline-none ring-slate-900 focus:ring-2 sc-input sc-filter-field" />
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-semibold text-slate-700">Orari aggiornati</span>
        <textarea name="orari" rows="5" class="rounded-2xl px-3 py-3 text-sm leading-7 outline-none ring-slate-900 focus:ring-2 sc-input sc-filter-field">{values.orari || ''}</textarea>
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-semibold text-slate-700">Descrizione proposta</span>
        <textarea name="descrizione" rows="5" class="rounded-2xl px-3 py-3 text-sm leading-7 outline-none ring-slate-900 focus:ring-2 sc-input sc-filter-field">{values.descrizione || ''}</textarea>
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-semibold text-slate-700">Immagini ufficiali</span>
        <textarea
          name="image_uploads"
          rows="4"
          placeholder="Inserisci un URL immagine per riga. Le immagini vengono controllate prima della pubblicazione."
          class="rounded-2xl px-3 py-3 text-sm leading-7 outline-none ring-slate-900 focus:ring-2 sc-input sc-filter-field"
        >{Array.isArray(values.image_uploads) ? values.image_uploads.join('\n') : ''}</textarea>
      </label>

      <label class="inline-flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
        <input name="verifica_richiesta" type="checkbox" class="mt-1" checked={Boolean(values.verifica_richiesta)} />
        <span>Richiedo verifica della scheda dopo il controllo dei dati.</span>
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-semibold text-slate-700">Note per l’admin</span>
        <textarea name="note" rows="4" class="rounded-2xl px-3 py-3 text-sm leading-7 outline-none ring-slate-900 focus:ring-2 sc-input sc-filter-field">{values.note || ''}</textarea>
      </label>

      <button type="submit" class="w-fit px-5 py-3 text-sm font-bold text-white sc-button">
        Invia aggiornamenti in revisione
      </button>
    </form>
  {/if}
</main>
