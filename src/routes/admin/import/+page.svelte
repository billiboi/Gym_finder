<script>
  export let form;

  const requiredFields = ['nome', 'discipline', 'citta'];
  const optionalFields = [
    'id',
    'slug',
    'indirizzo',
    'provincia',
    'regione',
    'telefono',
    'email',
    'sito',
    'descrizione',
    'orari',
    'lat',
    'lng',
    'is_premium',
    'is_verified',
    'priority_score'
  ];
  const mappingFields = [...requiredFields, ...optionalFields];

  let headers = [];
  let rows = [];
  let mapping = {};
  let fileName = '';
  let csvText = '';
  let confirmedPreview = false;
  let importMode = 'fill-empty';

  function parseCsv(text) {
    const output = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if ((char === ',' || char === ';') && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(cell);
        if (row.some((value) => value.trim())) output.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    row.push(cell);
    if (row.some((value) => value.trim())) output.push(row);
    return output;
  }

  function guessMapping(field) {
    const aliases = {
      nome: ['nome', 'name', 'palestra'],
      slug: ['slug'],
      discipline: ['discipline', 'disciplina'],
      indirizzo: ['indirizzo', 'address'],
      citta: ['citta', 'città', 'city', 'localita', 'località'],
      provincia: ['provincia', 'province'],
      regione: ['regione', 'region'],
      telefono: ['telefono', 'phone'],
      email: ['email'],
      orari: ['orari', 'hours_info'],
      sito: ['sito', 'website'],
      descrizione: ['descrizione', 'description'],
      lat: ['lat', 'latitude'],
      lng: ['lng', 'longitude'],
      is_premium: ['is_premium', 'premium'],
      is_verified: ['is_verified', 'verified'],
      priority_score: ['priority_score']
    };
    const candidates = aliases[field] || [field];
    return headers.find((header) => candidates.includes(header.toLowerCase().trim())) || '';
  }

  async function handleUpload(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    fileName = file.name;
    confirmedPreview = false;
    csvText = await file.text();
    const parsed = parseCsv(csvText);
    headers = parsed[0] || [];
    rows = parsed.slice(1).map((values, index) => ({
      index: index + 2,
      values
    }));
    mapping = Object.fromEntries(mappingFields.map((field) => [field, guessMapping(field)]));
  }

  function cell(row, field) {
    const header = mapping[field];
    const index = headers.indexOf(header);
    return index >= 0 ? String(row.values[index] ?? '').trim() : '';
  }

  function duplicateKey(row) {
    const id = cell(row, 'id');
    if (id) return `id:${id}`;
    return [cell(row, 'nome'), cell(row, 'citta'), cell(row, 'indirizzo')]
      .join('|')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  $: missingRequired = requiredFields.filter((field) => !mapping[field]);
  $: mappedRows = rows.map((row) => ({
    row,
    missing: requiredFields.filter((field) => !cell(row, field)),
    duplicateKey: duplicateKey(row)
  }));
  $: duplicateKeys = mappedRows
    .map((item) => item.duplicateKey)
    .filter((key, index, list) => key && list.indexOf(key) !== index);
  $: invalidRows = mappedRows.filter((item) => item.missing.length > 0 || duplicateKeys.includes(item.duplicateKey));
  $: previewRows = mappedRows.slice(0, 10);
  $: mappingJson = JSON.stringify(mapping);
  $: serverCsvText = form?.csvText || csvText;
  $: serverMappingJson = form?.mappingJson || mappingJson;
</script>

<main class="mx-auto min-h-screen w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Import CSV sicuro</h1>
        <p class="mt-2 max-w-3xl text-sm text-slate-600">
          Carica un CSV, controlla intestazioni, mapping, anteprima e duplicati. Nessun dato viene scritto prima del dry-run e della conferma finale.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/admin/schede" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Gestione schede</a>
        <a href="/admin/export/gyms.csv" class="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Esporta backup prima</a>
      </div>
    </div>

    <label class="mt-6 grid gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
      <span class="text-sm font-bold text-slate-800">1. Upload CSV</span>
      <input type="file" accept=".csv,text/csv" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" on:change={handleUpload} />
      {#if fileName}
        <span class="text-sm text-slate-600">File selezionato: <strong>{fileName}</strong></span>
      {/if}
    </label>

    {#if headers.length}
      <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 class="text-lg font-bold text-slate-900">2. Mapping colonne</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each mappingFields as field}
            <label class="grid gap-1">
              <span class="text-sm font-semibold text-slate-700">{field}{requiredFields.includes(field) ? ' *' : ''}</span>
              <select bind:value={mapping[field]} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">Non importare</option>
                {#each headers as header}
                  <option value={header}>{header}</option>
                {/each}
              </select>
            </label>
          {/each}
        </div>
      </section>

      <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 class="text-lg font-bold text-slate-900">3. Validazione</h2>
        <div class="mt-3 grid gap-2 text-sm">
          {#if missingRequired.length}
            <p class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700">
              Mapping incompleto: collega {missingRequired.join(', ')}.
            </p>
          {:else if invalidRows.length}
            <p class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800">
              Trovate {invalidRows.length} righe da correggere prima della conferma finale.
            </p>
          {:else}
            <p class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
              Anteprima valida: {rows.length} righe pronte per revisione finale.
            </p>
          {/if}
        </div>
      </section>

      <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 class="text-lg font-bold text-slate-900">4. Strategia import</h2>
        <div class="mt-4 grid gap-3 md:grid-cols-3">
          <label class="rounded-2xl border border-slate-200 p-4 text-sm">
            <input type="radio" bind:group={importMode} value="fill-empty" />
            <span class="ml-2 font-bold text-slate-900">Compila solo campi vuoti</span>
            <span class="mt-2 block text-slate-600">Scelta consigliata: protegge i dati già revisionati a mano.</span>
          </label>
          <label class="rounded-2xl border border-slate-200 p-4 text-sm">
            <input type="radio" bind:group={importMode} value="create-only" />
            <span class="ml-2 font-bold text-slate-900">Solo nuove schede</span>
            <span class="mt-2 block text-slate-600">I duplicati esistenti vengono saltati.</span>
          </label>
          <label class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <input type="radio" bind:group={importMode} value="overwrite-mapped" />
            <span class="ml-2 font-bold text-amber-950">Sovrascrivi campi mappati</span>
            <span class="mt-2 block text-amber-800">Da usare solo su CSV già controllati.</span>
          </label>
        </div>
      </section>

      <section class="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="border-b border-slate-200 px-5 py-4">
          <h2 class="text-lg font-bold text-slate-900">5. Anteprima prime 10 righe</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th class="px-4 py-3">Riga</th>
                <th class="px-4 py-3">Nome</th>
                <th class="px-4 py-3">Città</th>
                <th class="px-4 py-3">Discipline</th>
                <th class="px-4 py-3">Stato</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each previewRows as item}
                <tr>
                  <td class="px-4 py-3 font-semibold text-slate-700">{item.row.index}</td>
                  <td class="px-4 py-3">{cell(item.row, 'nome') || '-'}</td>
                  <td class="px-4 py-3">{cell(item.row, 'citta') || '-'}</td>
                  <td class="px-4 py-3">{cell(item.row, 'discipline') || '-'}</td>
                  <td class="px-4 py-3">
                    {#if item.missing.length}
                      <span class="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">manca {item.missing.join(', ')}</span>
                    {:else if duplicateKeys.includes(item.duplicateKey)}
                      <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">duplicato nel CSV</span>
                    {:else}
                      <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">ok</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 class="text-lg font-bold text-slate-900">6. Dry-run server-side</h2>
        <label class="mt-3 inline-flex items-start gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" bind:checked={confirmedPreview} />
          Ho controllato anteprima, mapping, errori e duplicati.
        </label>
        <form method="POST" action="?/dryRun" class="mt-4 grid gap-3">
          <input type="hidden" name="csv_text" value={csvText} />
          <input type="hidden" name="mapping_json" value={mappingJson} />
          <input type="hidden" name="mode" value={importMode} />
          <button
            type="submit"
            class="w-fit rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!confirmedPreview || missingRequired.length > 0 || invalidRows.length > 0}
          >
            Esegui controllo import
          </button>
        </form>
      </section>
    {/if}

    {#if form?.error}
      <section class="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        <h2 class="text-lg font-bold text-red-950">Import bloccato</h2>
        <p class="mt-2 font-semibold">{form.error}</p>
        {#if form.validationErrors?.length}
          <ul class="mt-3 grid gap-1">
            {#each form.validationErrors as item}
              <li>Riga {item.line}: {item.message}</li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}

    {#if form?.dryRun}
      <section class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 class="text-lg font-bold text-emerald-950">Dry-run completato</h2>
        <div class="mt-3 grid gap-3 text-sm text-emerald-900 sm:grid-cols-2 lg:grid-cols-4">
          <p class="rounded-xl bg-white/75 px-3 py-2"><strong>Prima:</strong> {form.report.beforeCount}</p>
          <p class="rounded-xl bg-white/75 px-3 py-2"><strong>Dopo:</strong> {form.report.afterCount}</p>
          <p class="rounded-xl bg-white/75 px-3 py-2"><strong>Nuove:</strong> {form.report.createCount}</p>
          <p class="rounded-xl bg-white/75 px-3 py-2"><strong>Aggiornate:</strong> {form.report.updateCount}</p>
        </div>
        <p class="mt-3 text-sm text-emerald-900">
          Saltate: <strong>{form.report.skipCount}</strong>. Modalità: <strong>{form.mode}</strong>.
        </p>

        <form method="POST" action="?/confirmImport" class="mt-4 grid gap-3 rounded-2xl border border-emerald-200 bg-white p-4">
          <input type="hidden" name="csv_text" value={serverCsvText} />
          <input type="hidden" name="mapping_json" value={serverMappingJson} />
          <input type="hidden" name="mode" value={form.mode} />
          <input type="hidden" name="confirmation_token" value={form.confirmationToken} />
          <label class="inline-flex items-start gap-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" required />
            Confermo import dopo dry-run. Verrà creato un backup automatico prima della scrittura.
          </label>
          <label class="grid gap-1 text-sm font-semibold text-slate-800">
            Scrivi IMPORTA per confermare
            <input name="confirm_text" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" autocomplete="off" required />
          </label>
          <button type="submit" class="w-fit rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Conferma import
          </button>
        </form>
      </section>
    {/if}

    {#if form?.imported}
      <section class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 class="text-lg font-bold text-emerald-950">Import completato</h2>
        <p class="mt-2 text-sm text-emerald-900">
          Record prima: <strong>{form.report.beforeCount}</strong>. Record dopo: <strong>{form.report.afterCount}</strong>.
          Nuove: <strong>{form.report.createCount}</strong>. Aggiornate: <strong>{form.report.updateCount}</strong>. Saltate: <strong>{form.report.skipCount}</strong>.
        </p>
        <p class="mt-3 text-xs font-semibold text-emerald-900">
          Backup creato: {form.backup?.jsonPath} e {form.backup?.csvPath}
        </p>
      </section>
    {/if}
  </section>
</main>
