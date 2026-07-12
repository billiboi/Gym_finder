<script>
  import { disciplinePreviewForGym, gymHref, imageForGym, isPremiumGym, isVerifiedGym } from '$lib/gym-detail';
  import { weeklyHoursRows } from '$lib/hours';

  export let gym;
  export let index = 0;
  export let kicker = '';
  export let preferredDiscipline = '';

  function currentDayIndex() {
    const shortWeekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: 'Europe/Rome'
    })
      .format(new Date())
      .toLowerCase();

    return { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }[shortWeekday] ?? null;
  }

  function publicHoursLabel(value) {
    const label = String(value || '').trim();
    if (!label || label === 'Orari da verificare' || label === 'Orari n/d') return 'Orari da confermare';
    const today = currentDayIndex();
    const todayRow = Number.isInteger(today) ? weeklyHoursRows(label).find((row) => row.dayIndex === today) : null;
    if (todayRow?.label) return `Oggi: ${todayRow.label.replace(/-/g, '–')}`;
    return label.includes('|') ? 'Orari disponibili nella scheda' : label;
  }

  function hasContactSignal(gymValue) {
    return Boolean(String(gymValue.phone || '').trim() || String(gymValue.website || '').trim());
  }

  function imageMetaForGym(gymValue) {
    const image = imageForGym(gymValue);
    return typeof image === 'string' ? { src: image, candidates: [image], fallback: image } : image;
  }

  function handleImageError(event, image) {
    const img = event.currentTarget;
    if (!img || !image) return;

    const nextIndex = Number(img.dataset.imageIndex || '0') + 1;
    if (nextIndex < image.candidates.length) {
      img.dataset.imageIndex = String(nextIndex);
      img.src = image.candidates[nextIndex];
      return;
    }

    if (image.fallback && img.dataset.fallbackApplied !== '1') {
      img.dataset.fallbackApplied = '1';
      img.src = image.fallback;
    }
  }

  $: image = imageMetaForGym(gym);
  $: disciplinePreview = disciplinePreviewForGym(gym, 3, preferredDiscipline);
  $: verified = isVerifiedGym(gym);
  $: premium = isPremiumGym(gym);
</script>

<article class="group overflow-hidden rounded-2xl transition sc-card sc-gym-card" style={`animation-delay:${index * 20}ms`}>
  <div class="relative h-44 overflow-hidden">
    <img
      src={image.src}
      alt={`Immagine ${gym.name}`}
      class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      loading={index < 3 ? 'eager' : 'lazy'}
      fetchpriority={index === 0 ? 'high' : undefined}
      decoding="async"
      width="360"
      height="176"
      sizes="(min-width: 1280px) 31vw, (min-width: 640px) 48vw, 100vw"
      on:error={(event) => handleImageError(event, image)}
    />
    <span class="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white sc-badge sc-badge--accent">
      {disciplinePreview.primary}
    </span>
  </div>
  <div class="space-y-3 p-3 sm:p-4">
    <div class="space-y-1 rounded-2xl sc-gym-card-head p-3">
      <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">{kicker}</p>
      <h3 class="text-lg font-bold leading-tight text-slate-900">{gym.name}</h3>
      <div class="mt-3 flex flex-wrap gap-2 sc-discipline-list">
        <span class="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] sc-discipline-chip sc-discipline-chip--primary">
          {disciplinePreview.primary}
        </span>
        {#if disciplinePreview.secondary.length || disciplinePreview.remaining}
          {#each disciplinePreview.secondary as label}
            <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold sc-discipline-chip">{label}</span>
          {/each}
          {#if disciplinePreview.remaining}
            <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold sc-discipline-chip sc-discipline-chip--muted">+{disciplinePreview.remaining} altre</span>
          {/if}
        {/if}
        {#if verified}
          <span class="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] sc-badge sc-badge--success">Verificata</span>
        {/if}
        {#if premium}
          <span class="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] sc-badge sc-badge--accent">Premium</span>
        {/if}
      </div>
    </div>

    <slot {disciplinePreview} />

    <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Indirizzo:</strong> {[gym.address, gym.city].filter(Boolean).join(', ') || 'Indirizzo non disponibile'}</p>
    <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Orari:</strong> {publicHoursLabel(gym.hours_info)}</p>
    <div class="flex flex-wrap gap-2 text-xs font-bold sc-card-signal-list">
      <span class={`rounded-full px-2.5 py-1 ${hasContactSignal(gym) ? 'sc-card-signal--ok' : 'sc-card-signal--muted'}`}>
        {hasContactSignal(gym) ? 'Contatti disponibili' : 'Contatti da verificare'}
      </span>
      <span class={`rounded-full px-2.5 py-1 ${gym.latitude && gym.longitude ? 'sc-card-signal--ok' : 'sc-card-signal--muted'}`}>
        {gym.latitude && gym.longitude ? 'Indicazioni disponibili' : 'Indicazioni da verificare'}
      </span>
    </div>
    <div class="rounded-2xl sc-gym-card-cta p-3">
      <a href={gymHref(gym)} class="inline-flex items-center rounded-xl px-3 py-2 text-sm font-bold transition sc-button sc-button--primary">
        Apri scheda
      </a>
    </div>
  </div>
</article>
