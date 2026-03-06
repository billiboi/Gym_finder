# Gym Finder - Pagina Utente

Interfaccia utente per trovare palestre vicine con priorita' alla distanza dalla posizione corrente.

## Funzionalita'
- visualizzazione di tutte le palestre in schede
- filtro per tipologia (disciplina)
- filtro per stato aperta/chiusa (in tempo reale)
- filtro per distanza (raggio in km)
- ordinamento automatico per vicinanza quando la posizione utente e' disponibile

## Dataset demo
- 20 palestre esempio in `data/gyms.json`
- ogni palestra include coordinate geografiche e orari settimanali

## API
- `GET /api/gyms`
  - query params opzionali:
    - `q`
    - `discipline`
    - `open_state=all|open|closed`
    - `lat`, `lng`
    - `radius_km`
- `GET /api/disciplines`

## Avvio
```bash
bun install
bun run dev
```
