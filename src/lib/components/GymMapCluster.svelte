<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { disciplineListForGym, formatAddressForDisplay, gymHref } from '$lib/gym-detail';
  import { ensureLeaflet, createClusterIcon, escapeHtml } from '$lib/leaflet-map';

  export let gyms = [];
  export let heightClass = 'h-[18rem] sm:h-[24rem]';
  export let label = 'Mappa interattiva delle palestre';

  let sectionEl;
  let mapContainer;
  let mapInstance;
  let started = false;
  let observer;

  $: mappableGyms = gyms.filter(
    (gym) => Number.isFinite(Number(gym?.latitude)) && Number.isFinite(Number(gym?.longitude))
  );

  function popupHtml(gym) {
    const name = escapeHtml(String(gym.name || '').trim());
    const discipline = escapeHtml(disciplineListForGym(gym).join(' | '));
    const address = escapeHtml(formatAddressForDisplay(gym));
    const phone = escapeHtml(String(gym.phone || '').trim() || 'Non disponibile');
    const href = escapeHtml(gymHref(gym));

    return `<div class="sc-map-popup">
        <div class="sc-map-popup-title">${name}</div>
        <div class="sc-map-popup-row">
          <span class="sc-map-popup-label">Disciplina</span>
          <span class="sc-map-popup-value">${discipline}</span>
        </div>
        <div class="sc-map-popup-row">
          <span class="sc-map-popup-label">Indirizzo</span>
          <span class="sc-map-popup-value">${address}</span>
        </div>
        <div class="sc-map-popup-footer">
          <span class="sc-map-popup-contact">${phone}</span>
          <a href="${href}" class="sc-map-popup-link">Scheda completa</a>
        </div>
      </div>`;
  }

  async function startMap() {
    if (started || !mapContainer) return;
    started = true;

    await ensureLeaflet();
    if (!window.L) return;

    mapInstance = window.L.map(mapContainer);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    const markersLayer = window.L.markerClusterGroup
      ? window.L.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          maxClusterRadius: 42,
          iconCreateFunction: createClusterIcon
        })
      : window.L.layerGroup();
    markersLayer.addTo(mapInstance);

    const bounds = [];
    for (const gym of mappableGyms) {
      const lat = Number(gym.latitude);
      const lng = Number(gym.longitude);
      window.L.marker([lat, lng], { title: String(gym.name || '').trim() })
        .bindPopup(popupHtml(gym), {
          autoPan: true,
          className: 'sc-map-popup-shell',
          keepInView: true,
          maxWidth: 320
        })
        .addTo(markersLayer);
      bounds.push([lat, lng]);
    }

    applyView(bounds);

    // Leaflet measures the container once at creation time. Since this map is
    // lazy-mounted (IntersectionObserver) the surrounding layout can still be
    // settling at that exact moment, leaving Leaflet with a stale/zero size
    // that breaks zoom and pan even though tiles render. Re-check shortly after.
    await tick();
    requestAnimationFrame(() => {
      mapInstance?.invalidateSize();
      applyView(bounds);
    });
    setTimeout(() => {
      mapInstance?.invalidateSize();
      applyView(bounds);
    }, 250);
  }

  function applyView(bounds) {
    if (!mapInstance) return;
    if (bounds.length === 1) {
      mapInstance.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      mapInstance.fitBounds(bounds, { padding: [24, 24] });
    } else {
      mapInstance.setView([45.8206, 8.825], 9);
    }
  }

  onMount(() => {
    if (!mappableGyms.length || !sectionEl) return;

    if (typeof IntersectionObserver === 'undefined') {
      void startMap();
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void startMap();
          observer?.disconnect();
          observer = null;
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sectionEl);
  });

  onDestroy(() => {
    observer?.disconnect();
    mapInstance?.remove();
  });
</script>

{#if mappableGyms.length}
  <div
    bind:this={sectionEl}
    class={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white sc-zone-map ${heightClass}`}
  >
    <div bind:this={mapContainer} class="h-full w-full" aria-label={label}></div>
  </div>
{:else}
  <div class="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-sm font-semibold text-slate-600">
    Le coordinate delle palestre in questa zona sono ancora in verifica.
  </div>
{/if}

<style>
  .sc-zone-map {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.38),
      var(--shadow-md);
  }
</style>
