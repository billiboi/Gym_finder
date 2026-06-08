<script>
  import {
    imageForGym,
    placeholderImageForDiscipline,
    primaryDisciplineForGym,
    resolveAvailableStockImage,
    selectRandomStockImage,
    stockImageForDiscipline
  } from '$lib/gym-detail';
  import { firstAliasNotice } from '$lib/discipline-alias-ui';

  export let data;
  export let form;

  let disciplineInput = '';

  function previewAssetsForDiscipline(disciplineText) {
    const discipline = primaryDisciplineForGym({ discipline: disciplineText });
    const image = imageForGym({ discipline: disciplineText });
    const imageMeta =
      typeof image === 'string' ? { src: image, candidates: [image], fallback: image } : image;
    return {
      discipline,
      stockBase: stockImageForDiscipline(discipline),
      stockResolved: resolveAvailableStockImage(discipline),
      stockSelected: selectRandomStockImage(discipline, disciplineText || discipline),
      src: imageMeta.src,
      candidates: imageMeta.candidates,
      fallback: imageMeta.fallback || placeholderImageForDiscipline(discipline)
    };
  }

  function handlePreviewError(event, preview) {
    const img = event.currentTarget;
    if (!img || !preview) return;

    const nextIndex = Number(img.dataset.imageIndex || '0') + 1;
    if (nextIndex < preview.candidates.length) {
      img.dataset.imageIndex = String(nextIndex);
      img.src = preview.candidates[nextIndex];
      return;
    }

    if (preview.fallback && img.dataset.fallbackApplied !== '1') {
      img.dataset.fallbackApplied = '1';
      img.src = preview.fallback;
    }
  }

  $: preview = previewAssetsForDiscipline(disciplineInput);
  $: aliasNotice = firstAliasNotice(disciplineInput, data.aliasSuggestions);
</script>

<main class="mx-auto min-h-screen w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <datalist id="discipline-canonical-options">
    {#each data.disciplineOptions || [] as option}
      <option value={option}>{option}</option>
    {/each}
    {#each data.aliasSuggestions || [] as suggestion}
      <option value={suggestion.alias}>{suggestion.alias} -> {suggestion.discipline_name}</option>
    {/each}
  </datalist>

  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Nuova scheda palestra</h1>
        <p class="mt-2 text-sm text-slate-600">Inserisci una nuova palestra senza appesantire la lista di gestione schede.</p>
      </div>
      <a href="/admin/schede" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Torna alle schede</a>
    </div>

    {#if form?.createError}
      <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {form.createError}
      </p>
    {/if}

    {#if !data.persistentWrites}
      <p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-800">
        Creazione bloccata: questa area admin deve scrivere su Supabase, ma la chiave server non è disponibile nell'ambiente corrente.
      </p>
    {:else}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-900">
        Database collegato: la nuova scheda verrà salvata sulla tabella {data.storeStatus?.table || 'gyms'} di Supabase.
      </p>
    {/if}

    <form method="POST" action="?/create" enctype="multipart/form-data" class="mt-5 grid gap-3">
      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Nome palestra</span>
        <input name="name" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Discipline separate da |</span>
        <input
          name="discipline"
          list="discipline-canonical-options"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Es: Boxe | Kickboxing"
          bind:value={disciplineInput}
          required
        />
        {#if aliasNotice}
          <span class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Alias rilevato: "{aliasNotice.input}" verrà salvato come "{aliasNotice.canonical}".
          </span>
        {/if}
      </label>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Indirizzo</span>
          <input name="address" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
        </label>

        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Città/Località</span>
          <input name="city" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
        </label>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Telefono</span>
          <input name="phone" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>

        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Sito web</span>
          <input name="website" type="url" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="https://..." />
        </label>
      </div>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Orari di apertura</span>
        <textarea name="hours_info" rows="4" class="rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
      </label>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">URL immagine copertina</span>
          <input name="image_url" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="https://..." />
        </label>

        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Foto copertina</span>
          <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <img
          src={preview.src}
          alt={`Anteprima fallback ${preview.discipline}`}
          class="h-44 w-full object-cover"
          on:error={(event) => handlePreviewError(event, preview)}
        />
        <div class="grid gap-1 border-t border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-600">
          <p><strong class="text-slate-900">Anteprima fallback:</strong> {preview.discipline}</p>
          <p>
            {#if preview.stockResolved}
              {preview.stockResolved.length} foto stock trovate. Selezione corrente: <code>{preview.stockSelected}</code>
            {:else}
              Nessuna foto stock disponibile per <code>{preview.stockBase}</code>: verrà usata la cover del brand.
            {/if}
          </p>
        </div>
      </div>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Breve presentazione</span>
        <textarea
          name="description"
          rows="5"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Descrivi in breve ambiente, servizi, focus della palestra e tipo di pubblico."
        ></textarea>
      </label>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Latitudine</span>
          <input name="latitude" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Longitudine</span>
          <input name="longitude" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>

      <section class="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Stato scheda</h2>
        <label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="verified" value="1" />
          Scheda verificata
        </label>
        <label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="premium" value="1" />
          Scheda premium
        </label>
      </section>

      <div class="flex flex-wrap gap-2 pt-2">
        <button type="submit" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          Crea scheda
        </button>
        <a href="/admin/schede" class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">
          Annulla
        </a>
      </div>
    </form>
  </section>
</main>
