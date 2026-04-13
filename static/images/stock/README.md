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
- `taekwondo`
- `aikido`
- `scherma`
- `kung-fu`
- `fitness`
- `wellness`
- `nuoto`
- `functional`
- `difesa-personale`

Eccezioni temporanee:
- `Yoga` usa solo `wellness.webp` e `wellness-3.webp`
- `Pilates` usa solo `wellness-2.webp`
- questo evita di mischiare immagini yoga/pilates nella stessa scheda finché non esistono set dedicati `yoga` e `pilates`
- `Difesa Personale` usa temporaneamente `difesapersonale.webp`, `difesapersonale-2.webp`, `difesapersonale-3.webp`
- questo mantiene compatibilità con i file già inseriti localmente, anche se il basename ideale resta `difesa-personale`

Note:
- usa immagini orizzontali, idealmente 1600x900 o simili
- puoi aggiungere fino a 3 varianti per disciplina:
- `boxe.webp`
- `boxe-2.webp`
- `boxe-3.webp`
- `taekwondo.webp`
- `aikido.webp`
- `scherma.webp`
- il progetto ora usa solo `.webp` per gli stock disciplinari
- esempi validi:
  - `boxe.webp`
  - `boxe-2.webp`
  - `boxe-3.webp`
  - `fitness.webp`
  - `mma.webp`
- usa solo immagini con licenza valida per riutilizzo commerciale/editoriale
- vedi anche `manifest.json` per l'elenco completo delle discipline e dei basename previsti
- vedi `sources.json` per una lista pronta di sorgenti royalty-free da cui selezionare immagini rappresentative
- per iniziare con le categorie piu visibili, usa `priority-five.json`
