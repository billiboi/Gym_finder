export const TRUST_BADGES = [
  {
    title: 'Catalogo ordinato',
    text: 'Ordiniamo le schede per zona, disciplina, contatti e orari.'
  },
  {
    title: 'Aggiornamenti verificati',
    text: 'Le richieste dei proprietari passano da email e controllo manuale prima della pubblicazione.'
  },
  {
    title: 'Fonti distinguibili',
    text: 'Separiamo i dati da fonti ufficiali dalle informazioni ancora da confermare.'
  },
  {
    title: 'Niente scorciatoie sui dati',
    text: 'Le modifiche al catalogo non vengono pubblicate automaticamente da form o import.'
  }
];

export const BRAND_PROOF_ITEMS = [
  { key: 'catalog_total', value: '542', label: 'schede attive' },
  { key: 'discipline_total', value: '23', label: 'discipline pubbliche canoniche' },
  { key: 'zone_total', value: '80+', label: 'zone disponibili' },
  { key: 'curated_pages', value: '20+', label: 'pagine curate' }
];

export const PUBLIC_CATALOG_NUMBERS = {
  activeGyms: 542,
  disciplines: 23,
  zonesLabel: '80+',
  curatedPagesLabel: '20+'
};

export const VERIFICATION_STEPS = [
  {
    title: '1. Ricezione richiesta',
    text: 'La palestra o un utente segnala una correzione con nome struttura, link scheda e dettaglio del dato.'
  },
  {
    title: '2. Verifica del referente',
    text: 'Per le richieste proprietario chiediamo un contatto email verificabile e un ruolo chiaro nella struttura.'
  },
  {
    title: '3. Controllo dati',
    text: 'Indirizzo, orari, sito, telefono e discipline vengono confrontati con fonti pubbliche o ufficiali quando disponibili.'
  },
  {
    title: '4. Pubblicazione controllata',
    text: 'Le modifiche passano da review admin. Nessun invio dal form cambia subito una scheda pubblica.'
  }
];
