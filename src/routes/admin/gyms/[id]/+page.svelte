<script>
  import { enhance } from '$app/forms';
  import { firstAliasNotice } from '$lib/discipline-alias-ui';

  export let data;
  export let form;

  let disciplineInput = data?.gym?.discipline_text || '';
  let disciplineInputInitializedFor = data?.gym?.id || '';
  let generatedDescription = data?.gym?.descrizione_generata || data?.gym?.descrizione_generata_preview || '';
  let editorialDescription = data?.gym?.descrizione_editoriale || '';
  let publicDescription = data?.gym?.descrizione_pubblica || data?.gym?.descrizione_pubblica_attuale || '';
  let descriptionSource = data?.gym?.descrizione_pubblica_source || data?.gym?.descrizione_source || 'esistente';
  let descriptionQualityScore = data?.gym?.descrizione_quality_score || data?.gym?.descrizione_quality_score_calculated || 0;
  let descriptionNeedsReview = Boolean(data?.gym?.descrizione_needs_review);

  let officialAnalysis = null;
  let analyzing = false;
  let acceptedFields = {};
  let ignoredFields = {};
  let editorialMessage = '';

  const CONTENT_FIELDS = ['telefono', 'orari', 'prezzi'];

  $: gym = data.gym;
  $: saved = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('saved') === '1';
  $: if (gym?.id && gym.id !== disciplineInputInitializedFor) {
    disciplineInput = gym.discipline_text || '';
    disciplineInputInitializedFor = gym.id;
  }
  $: aliasNotice = firstAliasNotice(disciplineInput, data.aliasSuggestions);
  $: contentRows = (officialAnalysis?.reconciliation?.rows || []).filter((row) => CONTENT_FIELDS.includes(row.field));

  function useGeneratedDescription() {
    editorialDescription = generatedDescription;
    publicDescription = generatedDescription;
    descriptionSource = 'generata_approvata_admin';
    descriptionNeedsReview = false;
  }

  function markDescriptionVerified() {
    publicDescription = editorialDescription || generatedDescription || publicDescription;
    descriptionSource = editorialDescription ? 'editoriale_verificata' : 'generata_verificata';
    descriptionNeedsReview = false;
  }

  function canAcceptRow(row) {
    return Boolean(row.official_value) && !['not_found', 'app_only'].includes(row.status);
  }

  function levelClass(level) {
    if (level === 'A') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    if (level === 'B') return 'border-amber-200 bg-amber-50 text-amber-900';
    return 'border-slate-200 bg-slate-100 text-slate-800';
  }

  function editorialPayload(analysis) {
    return JSON.stringify({
      conflicts: analysis?.reconciliation?.conflicts || [],
      editorial_preview: analysis?.editorial_preview || {},
      source_url: analysis?.source_url || ''
    });
  }

  function handleAnalyze() {
    analyzing = true;
    acceptedFields = {};
    ignoredFields = {};
    editorialMessage = '';
    return async ({ result, update }) => {
      analyzing = false;
      if (result.type === 'success' && result.data?.officialAnalysis) {
        officialAnalysis = result.data.officialAnalysis;
      } else {
        await update();
      }
    };
  }

  function handleAcceptField(field) {
    return async ({ result, update }) => {
      if (result.type === 'success' && result.data?.contentFieldAccepted) {
        acceptedFields = { ...acceptedFields, [field]: result.data.contentFieldAccepted.value };
      } else {
        await update();
      }
    };
  }

  function handleApproveEditorial() {
    return async ({ result, update }) => {
      if (result.type === 'success' && result.data?.editorialPublished) {
        editorialMessage = result.data.editorialPublished.message;
      } else {
        await update();
      }
    };
  }
</script>

<main class="mx-auto min-h-screen w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <datalist id="discipline-canonical-options">
    {#each data.disciplineOptions || [] as option}
      <option value={option}>{option}</option>
    {/each}
    {#each data.aliasSuggestions || [] as suggestion}
      <option value={suggestion.alias}>{suggestion.alias} -> {suggestion.discipline_name}</option>
    {/each}
  </datalist>

  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Modifica scheda palestra</h1>
      </div>
      <a href="/admin/schede" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Torna elenco</a>
    </div>

    {#if saved}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Modifiche salvate con successo.
      </p>
    {/if}

    {#if form?.error}
      <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {form.error}
      </p>
    {/if}

    <form method="POST" enctype="multipart/form-data" class="mt-5 grid gap-3">
      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Nome palestra</span>
        <input name="name" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.name} required />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Discipline (separate da |)</span>
        <input name="discipline" list="discipline-canonical-options" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" bind:value={disciplineInput} />
        {#if aliasNotice}
          <span class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Alias rilevato: “{aliasNotice.input}” verrà salvato come “{aliasNotice.canonical}”.
          </span>
        {/if}
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Indirizzo</span>
        <input name="address" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.address} required />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Citta/Localita</span>
        <input name="city" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.city} />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Telefono</span>
        <input name="phone" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.phone} />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Orari di apertura</span>
        <textarea name="hours_info" rows="4" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">{gym.hours_info}</textarea>
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Sito web</span>
        <input name="website" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.website} />
      </label>

      <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Foto copertina</span>
          <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <input type="checkbox" name="replace_image" value="1" />
          Sostituisci immagine attuale
        </label>
      </div>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">URL immagine copertina</span>
        <input name="image_url" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.image_url || ''} placeholder="https://..." />
      </label>

      {#if gym.image_url}
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <img src={gym.image_url} alt={`Anteprima ${gym.name}`} class="h-52 w-full object-cover" />
        </div>
      {/if}

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Breve presentazione</span>
        <textarea name="description" rows="5" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">{gym.description || ''}</textarea>
      </label>

      <section class="grid gap-3 rounded-2xl border border-emerald-900/10 bg-emerald-50/60 p-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Descrizione</p>
          <h2 class="mt-1 text-lg font-bold text-slate-900">Revisione descrizione pubblica</h2>
          <p class="mt-1 text-sm leading-6 text-slate-600">
            Le descrizioni generate non vanno live da sole: scegli tu se usarle come descrizione editoriale e salva la scheda.
          </p>
        </div>

        <div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div class="grid gap-2 sm:grid-cols-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Source</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">{descriptionSource}</p>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Quality score</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">{descriptionQualityScore}/100</p>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Stato</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">{descriptionNeedsReview ? 'Da revisionare' : 'Utilizzabile'}</p>
            </div>
          </div>
          <p class="text-sm leading-7 text-slate-700">{gym.descrizione_pubblica_attuale || 'Nessuna descrizione pubblica sicura disponibile.'}</p>
        </div>

        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Descrizione generata</span>
          <textarea name="descrizione_generata" rows="5" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" bind:value={generatedDescription}></textarea>
        </label>

        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Descrizione editoriale</span>
          <textarea name="descrizione_editoriale" rows="5" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" bind:value={editorialDescription}></textarea>
        </label>

        <input type="hidden" name="descrizione_pubblica" value={publicDescription} />
        <input type="hidden" name="descrizione_source" value={descriptionSource} />
        <input type="hidden" name="descrizione_quality_score" value={descriptionQualityScore} />
        <input type="hidden" name="descrizione_needs_review" value={descriptionNeedsReview ? '1' : '0'} />

        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900" on:click={useGeneratedDescription}>
            Usa descrizione generata
          </button>
          <button type="button" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" on:click={() => (descriptionSource = 'editoriale_in_modifica')}>
            Modifica descrizione editoriale
          </button>
          <button type="button" class="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50" on:click={markDescriptionVerified}>
            Segna descrizione verificata
          </button>
        </div>
      </section>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Latitudine</span>
          <input name="latitude" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.latitude ?? ''} />
        </label>
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Longitudine</span>
          <input name="longitude" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.longitude ?? ''} />
        </label>
      </div>

      <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Stato scheda</h2>
        <label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="verified" value="1" checked={gym.verified} />
          Scheda verificata
        </label>
        <label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="premium" value="1" checked={gym.premium} />
          Scheda premium
        </label>
        <div class="flex flex-wrap gap-2 text-xs font-bold">
          {#if gym.premium}
            <span class="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">premium</span>
          {/if}
          {#if gym.archived}
            <span class="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">archiviata</span>
          {/if}
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">priorità {gym.priority_score}</span>
        </div>
      </section>

      <div class="flex flex-wrap gap-2 pt-2">
        <button type="submit" class="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          Salva modifiche
        </button>
        <button type="submit" name="next_action" value="open_public" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          Salva e apri scheda pubblica
        </button>
      </div>
    </form>
  </section>

  <section class="mt-5 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Contenuti</p>
    <h2 class="mt-1 text-xl font-bold text-slate-900">Contenuti dal sito ufficiale</h2>
    <p class="mt-1 text-sm leading-6 text-slate-600">
      Confronta prezzo, orari e telefono in scheda con quanto trovato sul sito ufficiale. Ogni campo accettato qui viene salvato subito sulla scheda, senza aspettare "Salva modifiche" sopra.
    </p>

    {#if form?.contentFieldAccepted}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Campo aggiornato e salvato.
      </p>
    {/if}

    {#if editorialMessage}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        {editorialMessage}
      </p>
    {/if}

    {#if !gym.website}
      <p class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
        Nessun sito web in scheda: aggiungilo nel campo "Sito web" sopra e salva prima di poter analizzare.
      </p>
    {:else}
      <form method="POST" action="?/analyzeOfficialSite" class="mt-4" use:enhance={handleAnalyze}>
        <button type="submit" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" disabled={analyzing}>
          {analyzing ? 'Analisi in corso…' : officialAnalysis ? 'Analizza di nuovo' : 'Analizza sito ufficiale'}
        </button>
      </form>

      {#if officialAnalysis && !officialAnalysis.pagesFound}
        <p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          Nessuna pagina raggiungibile sul sito ufficiale.
        </p>
      {/if}

      {#if officialAnalysis?.pagesFound}
        <div class="mt-4 grid gap-3">
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div class="hidden border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:grid md:grid-cols-[0.8fr_1fr_1fr_auto]">
              <span>Campo</span>
              <span>Valore scheda</span>
              <span>Valore fonte ufficiale</span>
              <span>Azione</span>
            </div>
            {#each contentRows as row}
              <div class="grid gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0 md:grid-cols-[0.8fr_1fr_1fr_auto] md:items-center">
                <span class="font-semibold text-slate-900">{row.field_label}</span>
                <span class="text-sm text-slate-700">{row.app_value || 'vuoto'}</span>
                <span class="text-sm text-slate-700">{row.official_value || 'non trovato'}</span>
                <div>
                  {#if acceptedFields[row.field]}
                    <span class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">Accettato</span>
                  {:else if ignoredFields[row.field]}
                    <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">Ignorato</span>
                  {:else if canAcceptRow(row)}
                    <div class="flex flex-wrap gap-2">
                      <form method="POST" action="?/acceptContentField" use:enhance={handleAcceptField(row.field)}>
                        <input type="hidden" name="field" value={row.field} />
                        <input type="hidden" name="value" value={row.official_value} />
                        <input type="hidden" name="source_url" value={officialAnalysis.source_url || ''} />
                        <button type="submit" class="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-900">Accetta</button>
                      </form>
                      <button
                        type="button"
                        class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        on:click={() => (ignoredFields = { ...ignoredFields, [row.field]: true })}
                      >
                        Ignora
                      </button>
                    </div>
                  {:else}
                    <span class="text-xs text-slate-400">—</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>

          {#if officialAnalysis.editorial_preview?.descrizione_breve}
            <div class="rounded-2xl border border-emerald-200 bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Anteprima editoriale proposta (da sito ufficiale)</p>
                <span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${levelClass(officialAnalysis.editorial_preview.livello)}`}>
                  Livello {officialAnalysis.editorial_preview.livello || 'C'} · quality score {officialAnalysis.editorial_preview.quality_score || 0}
                </span>
              </div>

              <div class="mt-3 grid gap-3 lg:grid-cols-2">
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p class="font-bold text-slate-950">Descrizione breve proposta</p>
                  <p class="mt-2">{officialAnalysis.editorial_preview.descrizione_breve}</p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p class="font-bold text-slate-950">Descrizione lunga proposta</p>
                  <p class="mt-2">{officialAnalysis.editorial_preview.descrizione_lunga}</p>
                </div>
              </div>

              {#if officialAnalysis.reconciliation?.conflicts?.length}
                <p class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">
                  Conflitti rilevati tra scheda e fonte ufficiale: pubblicazione bloccata.
                </p>
              {:else}
                <div class="mt-3 flex flex-wrap gap-2">
                  <form method="POST" action="?/approveEditorial" use:enhance={handleApproveEditorial}>
                    <input type="hidden" name="approval_type" value="breve" />
                    <input type="hidden" name="editorial_payload" value={editorialPayload(officialAnalysis)} />
                    <button type="submit" class="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-900">Approva descrizione breve</button>
                  </form>
                  <form method="POST" action="?/approveEditorial" use:enhance={handleApproveEditorial}>
                    <input type="hidden" name="approval_type" value="lunga" />
                    <input type="hidden" name="editorial_payload" value={editorialPayload(officialAnalysis)} />
                    <button type="submit" class="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-900">Approva descrizione lunga</button>
                  </form>
                  <form method="POST" action="?/approveEditorial" use:enhance={handleApproveEditorial}>
                    <input type="hidden" name="approval_type" value="tutto" />
                    <input type="hidden" name="editorial_payload" value={editorialPayload(officialAnalysis)} />
                    <button type="submit" class="rounded-lg bg-teal-800 px-3 py-2 text-sm font-bold text-white hover:bg-teal-900">Approva tutto</button>
                  </form>
                </div>
              {/if}
            </div>
          {/if}

          {#if officialAnalysis.pages_scraped?.length}
            <details class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <summary class="cursor-pointer font-semibold text-slate-900">Pagine analizzate ({officialAnalysis.pages_scraped.length})</summary>
              <ul class="mt-2 space-y-1">
                {#each officialAnalysis.pages_scraped as page}
                  <li class="break-words">
                    <a href={page.url} target="_blank" rel="noreferrer" class="font-semibold text-blue-700 hover:text-blue-900">{page.title || page.url}</a>
                  </li>
                {/each}
              </ul>
            </details>
          {/if}

          {#if officialAnalysis.extraction_warnings?.length}
            <div class="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              <p class="font-bold">Avvisi</p>
              <ul class="mt-1 space-y-1">
                {#each officialAnalysis.extraction_warnings as warning}
                  <li>{warning}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </section>
</main>
