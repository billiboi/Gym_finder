Inserisci qui le foto stock locali riutilizzabili per disciplina.

Priorita fallback immagini:
1. `image_url` della palestra, se presente
2. foto stock locale in `static/images/stock`
3. cover SVG brandizzata in `static/images/placeholders`

Basename supportati:
- `boxe`
- `kickboxe`
- `muay-thai`
- `mma`
- `grappling`
- `judo`
- `karate`
- `kung-fu`
- `fitness`
- `wellness`
- `nuoto`
- `functional`
- `difesa-personale`

Note:
- usa immagini orizzontali, idealmente 1600x900 o simili
- puoi aggiungere fino a 3 varianti per disciplina:
  - `boxe.webp`
  - `boxe-2.webp`
  - `boxe-3.webp`
- formati supportati in ordine di tentativo automatico:
  - `.webp`
  - `.jpg`
  - `.jpeg`
  - `.png`
- esempi validi:
  - `boxe.webp`
  - `boxe-2.jpg`
  - `boxe-3.png`
  - `fitness.jpg`
  - `mma.png`
- usa solo immagini con licenza valida per riutilizzo commerciale/editoriale
- vedi anche `manifest.json` per l'elenco completo delle discipline e dei basename previsti
- vedi `sources.json` per una lista pronta di sorgenti royalty-free da cui selezionare immagini rappresentative
- per iniziare con le categorie piu visibili, usa `priority-five.json`
