# Discipline taxonomy report

Source analyzed: `data/supabase-gyms-export-2026-05-07T11-39-29-019Z.json`.

## Canonical taxonomy

Primary canonical labels now live in `src/lib/discipline-taxonomy.js` and are seeded by `supabase/migrations/20260515_001_discipline_taxonomy.sql`.

Core canonical labels:

- Fitness
- Personal Training
- Functional Training
- Cross Training
- CrossFit
- Bodybuilding
- Calisthenics
- Yoga
- Pilates
- Nuoto
- Boxe
- Kickboxing
- Muay Thai
- K1
- MMA
- Brazilian Jiu Jitsu
- Jujitsu
- Grappling
- Judo
- Karate
- Taekwondo
- Aikido
- Krav Maga
- Difesa Personale
- Arti Marziali
- Kung Fu
- Wing Chun
- Tai Chi
- Scherma
- Chanbara
- Iaido
- Ginnastica Artistica
- Ginnastica Ritmica
- Basket
- Calcio
- Padel
- Pattinaggio
- Golf
- Hockey
- Goshindo

## Alias mapping

Recommended merges:

- BJJ, Brazilian Jiujitsu, Brazilian Jujitsu, Jujitsu Brasiliano, Jiu Jitsu Brasiliano -> Brazilian Jiu Jitsu
- Kickboxe, Kick Boxing, Kick-boxing -> Kickboxing
- Personal Trainer, PT, Allenamento personale -> Personal Training
- Functional, Allenamento funzionale, Functional Fitness -> Functional Training
- Crosstraining, Cross-Training -> Cross Training
- Body Building -> Bodybuilding
- Self Defense, Autodifesa, Difesa Personae -> Difesa Personale
- Wrestling, Lotta, Submission Grappling -> Grappling
- Kungfu, Choy Lay Fut, Choy Lee Fut -> Kung Fu
- Win Chun, Win Chung, Ving Tsun -> Wing Chun
- Taiji, Taiji Quan, Tai Chi Chuan -> Tai Chi

Do not merge:

- CrossFit != Cross Training
- MMA != Krav Maga
- Yoga != Pilates
- Brazilian Jiu Jitsu != Jujitsu
- Muay Thai != Kickboxing
- K1 != Kickboxing

## Existing duplicate impact

Current export has these concrete duplicate/alias cases:

- Jujitsu Brasiliano -> Brazilian Jiu Jitsu: 4 records
- Kickboxe -> Kickboxing: 3 records
- Functional -> Functional Training: 1 record

Canonical counts after normalization:

- Fitness: 421
- Yoga: 89
- Pilates: 47
- Nuoto: 26
- Boxe: 18
- Judo: 15
- CrossFit: 14
- Karate: 14
- Kung Fu: 10
- Difesa Personale: 9
- MMA: 5
- Tai Chi: 5
- Brazilian Jiu Jitsu: 4
- Kickboxing: 3
- Aikido: 3
- Scherma: 3
- Taekwondo: 3
- Bodybuilding: 2
- Calisthenics: 2
- Wing Chun: 2
- Functional Training: 1
- Jujitsu: 1
- Pattinaggio: 1

## Suspicious and generic labels

Too generic:

- Fitness: 421 records. Keep as fallback, but prioritize admin review for names that imply a more specific discipline.
- Arti Marziali: use only when the exact martial art is not clear.
- Sport and Palestra: normalize to Fitness unless a better signal exists.

Low-count but valid:

- Functional Training
- Jujitsu
- Pattinaggio

These should stay canonical but should usually be `noindex` until they reach enough useful local inventory.

## SEO redirects

Redirect alias landings to canonical URLs:

- `/discipline/kickboxe` -> `/discipline/kickboxing`
- `/discipline/kick-boxing` -> `/discipline/kickboxing`
- `/discipline/bjj` -> `/discipline/brazilian-jiu-jitsu`
- `/discipline/brazilian-jiujitsu` -> `/discipline/brazilian-jiu-jitsu`
- `/discipline/brazilian-jujitsu` -> `/discipline/brazilian-jiu-jitsu`
- `/discipline/jujitsu-brasiliano` -> `/discipline/brazilian-jiu-jitsu`
- `/discipline/personal-trainer` -> `/discipline/personal-training`
- `/discipline/functional` -> `/discipline/functional-training`
- `/discipline/crosstraining` -> `/discipline/cross-training`

## Migration plan

1. Apply `supabase/migrations/20260515_001_discipline_taxonomy.sql` only on staging/preview first.
2. Verify `discipline_master` and `discipline_alias` row counts.
3. Use admin edit/import/riclassifica normally: alias input is normalized to canonical labels.
4. Keep original alias metadata in `gyms.discipline_aliases` and `weekly_hours._discipline_aliases`.
5. Run a dry audit comparing current `gyms.disciplines` to canonical output before any production migration.
6. Only after review, run a controlled PATCH migration on production-like data with backup and before/after counts.

## SEO risks

- Canonical label changes move landing demand from old slugs to new slugs; redirects must be active before public migration.
- Low-count canonical pages should stay `noindex,follow` until useful inventory exists.
- Do not collapse real disciplines for short-term count gains; incorrect merges are worse than thin pages.
