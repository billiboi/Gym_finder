# Diff staging vs produzione — public.gyms

Generato: 2026-07-10T12:25:53.347Z

Sola lettura. Nessuna scrittura eseguita su nessuno dei due database.

## Conteggi

| | Staging (`wftdlkbtfqlnpegcwnpj`) | Produzione (`opcdyoypuhuoflzwzdrl`) |
|---|---:|---:|
| Totale | 686 | 683 |
| Attive | 537 | 537 |
| Archiviate | 149 | 146 |

Record in comune (stesso id): 683
Solo in staging: 3
Solo in produzione: 0

## Archiviate su staging (fase P4, oggi) ma ancora attive in produzione

0 record. Queste sono le pulizie P4 fatte su staging che NON hanno ancora effetto sul sito live.


## Archiviate autonomamente in produzione ma ancora attive su staging

0 record. Pulizia indipendente di produzione (metà maggio) mai replicata su staging.


## Record presenti solo in staging (non esistono in produzione)

3 record.

| id | nome | stato staging |
|---|---|---|
| gym-5852d918-c6a5-47d6-a63e-8ac995ef87de | Codex Preview Admin Test 20260507104945 | archiviata |
| import-test-20260507105751 | Codex Import Test 20260507105751 | archiviata |
| test-direct-35cda3482b864359b941accf69d809fa | Direct Supabase Test | archiviata |

## Record presenti solo in produzione (non esistono in staging)

0 record.


## Divergenze nei campi enrichment (solo record attivi in entrambi)

228 record con differenze in price_info, description, o data_verified_at.

| id | nome | campo | staging | produzione |
|---|---|---|---|---|
| csv-103 | Centro 0lite Fitness | description | Centro 0lite Fitness è una struttura sportiva a Malnate collegata a Fitness. Le  | Centro 0lite Fitness è una palestra a Malnate con attività legate a Fitness e al |
| csv-108 | Centro Arti Marziali SCT | description | Centro Arti Marziali SCT è una struttura sportiva a Cadrezzate con Osmate, in Vi | Centro Arti Marziali SCT è una palestra a Cadrezzate con Osmate con attività leg |
| csv-11 | A.S.D. Black Tiger | description | A.S.D. Black Tiger è una struttura sportiva a Cassano Magnago collegata a Fitnes | A.S.D. Black Tiger è una palestra a Cassano Magnago con attività legate a Boxe e |
| csv-110 | Centro Educazione Fisica Mario Corrias Ass. Sport.Dilettant | description | Centro Educazione Fisica Mario Corrias Ass. Sport.Dilettant è una struttura spor | Centro Educazione Fisica Mario Corrias Ass. Sport.Dilettant è una palestra a Sar |
| csv-112 | Centro Fitness Lido Locarno | description | Centro Fitness Lido Locarno è una struttura sportiva a Locarno, in Via Gioacchin | Centro Fitness Lido Locarno è una palestra a Locarno con attività legate a Cross |
| csv-114 | Centro I.a.c.m.a. | price_info |  | Lezione gruppo: CHF 25.00 under 18 / CHF 35.00 over 18. Pacchetto 10 lezioni: CH |
| csv-114 | Centro I.a.c.m.a. | description | Centro I.a.c.m.a. è una struttura sportiva a Porza collegata a Fitness. Le infor | Centro I.a.c.m.a. è una palestra a Porza con attività legate a Kung Fu e altre d |
| csv-118 | Centro Pilates, Specializzato metodo Pilates | description | La scheda di Centro Pilates, Specializzato metodo Pilates raccoglie i dati dispo | Centro Pilates, Specializzato metodo Pilates è una struttura sportiva a Locarno  |
| csv-12 | A.S.D. Eagles | description | A.S.D. Eagles è una struttura sportiva a Caronno Varesino collegata a Fitness. L | A.S.D. Eagles è una struttura sportiva a Caronno Varesino, in Via Armando Diaz,  |
| csv-121 | Centro Studi Karate Busto Arsizio | price_info |  | Quota associativa 2025/2026: 20 EUR. I prezzi dei singoli corsi non risultano pu |
| csv-121 | Centro Studi Karate Busto Arsizio | description | Per chi cerca Karate a Busto Arsizio, Centro Studi Karate Busto Arsizio offre un | Centro Studi Karate Busto Arsizio è una realtà sportiva a Busto Arsizio dedicata |
| csv-122 | Centro taekwondo Baier | description | Per chi cerca Taekwondo a Gallarate, Centro taekwondo Baier offre una scheda ded | Centro taekwondo Baier è una realtà sportiva a Gallarate dedicata a Taekwondo. L |
| csv-123 | Centro Yoga Ashoka | description | Centro Yoga Ashoka è presente nel catalogo per Yoga a Mendrisio in Corso Bello 9 | Centro Yoga Ashoka è una struttura sportiva a Mendrisio collegata a Yoga. Le inf |
| csv-125 | Centro Yoga Padma | price_info |  | Corso annuale 2025-26: 1 ciclo CHF 325.-, 2 ciclo CHF 250.-, 3 ciclo CHF 225.-.  |
| csv-136 | Club Arti Marziali Caslano | description | Club Arti Marziali Caslano è presente nel catalogo per Fitness a Caslano in Via  | Club Arti Marziali Caslano è una realtà sportiva a Caslano dedicata a Karate. La |
| csv-137 | Club Move SA Palestra | price_info |  | Open: 3 mesi CHF 765.-, 6 mesi CHF 1'148.-, 12 mesi CHF 1'980.-. Mattina: 6 mesi |
| csv-137 | Club Move SA Palestra | description |  | Club Move SA Palestra è una palestra a Lugano con attività legate a EMS Training |
| csv-140 | Club Yoga della risata Saronno #ridiconme | price_info |  | Club yoga della risata: il sito spiega che il formato club viene solitamente off |
| csv-141 | Combat Soul Assoc. Sportiva Dilettant. | description | Combat Soul Assoc. Sportiva Dilettant. è una struttura sportiva a Busto Arsizio  | Combat Soul Assoc. Sportiva Dilettant. è una palestra a Busto Arsizio con attivi |
| csv-143 | Concept9 ASD | description | Concept9 ASD è una struttura sportiva a Busto Arsizio collegata a Fitness. Le in | Concept9 ASD è una palestra a Busto Arsizio con attività legate a Bodybuilding e |
| csv-149 | CRAB's Fitness Boutique | description | La scheda di CRAB's Fitness Boutique raccoglie i dati disponibili per una strutt | CRAB's Fitness Boutique è una palestra a Saronno con attività legate a Calisthen |
| csv-154 | CrossFit Black Dahlia | description |  | CrossFit Black Dahlia è una struttura sportiva a Chiasso collegata a CrossFit. L |
| csv-156 | CrossFit il Tempio | price_info |  | Store ufficiale: 1 Ticket Classe 15,45 EUR; 1 Ticket Open Gym 10,30 EUR; annuale |
| csv-157 | CrossFit Locarno | price_info |  | 1 anno CHF 1300.-; 6 mesi CHF 750.-; 3 mesi CHF 450.-; 10 entrate CHF 230.-; ent |
| csv-158 | CrossFit Lugano | price_info |  | Drop-in CHF 25 per 1 ingresso; CHF 20 per minori di 18 anni. Personal training:  |
| csv-159 | CrossFit Saronno | description | CrossFit Saronno ha una scheda dedicata a Saronno in Viale Lombardia, 19 con rif | CrossFit Saronno è una struttura sportiva a Saronno, in Viale Lombardia, 19, con |
| csv-16 | A.S.D. M-Cube Smart Fitness | description | A.S.D. M-Cube Smart Fitness è una struttura sportiva a Gallarate, in Via Praderi | A.S.D. M-Cube Smart Fitness è una palestra a Gallarate con attività legate a Cro |
| csv-162 | CrossFit Venegono Inferiore | description | La scheda di CrossFit Venegono Inferiore raccoglie i dati disponibili per una st | CrossFit Venegono Inferiore è una struttura sportiva a Venegono Inferiore, in Vi |
| csv-165 | Curling Club Chiasso | description |  | Curling Club Chiasso è una struttura sportiva a Chiasso collegata a Curling. Le  |
| csv-167 | Curti Training Room | description | Curti Training Room è indicata a Varese in Via Giulio Bizzozero, 7 per attività  | Curti Training Room è una struttura sportiva a Varese, in Via Giulio Bizzozero,  |
| csv-168 | Daniele Pinco - Personal Fitness Trainer - Coach | description | Daniele Pinco - Personal Fitness Trainer - Coach è una struttura sportiva a Vare | Daniele Pinco - Personal Fitness Trainer - Coach è una palestra a Varese con att |
| csv-169 | Davide Rosignoli personal trainer formefitness varese | description | Davide Rosignoli personal trainer formefitness varese è una struttura sportiva a | Davide Rosignoli personal trainer formefitness varese è una palestra a Varese co |
| csv-173 | DeaYoga | description |  | DeaYoga è una struttura sportiva a Chiasso collegata a Yoga. Le informazioni dis |
| csv-176 | Dharma Yoga | price_info |  | Corsi gruppo: trimestrale 10 lezioni CHF 300; annuale CHF 800; semestrale CHF 60 |
| csv-176 | Dharma Yoga | description |  | Dharma Yoga è una struttura sportiva a Chiasso collegata a Yoga. Le informazioni |
| csv-178 | Dinamico Sport Dimension di Daniele Bernasconi | description | Dinamico Sport Dimension di Daniele Bernasconi è una struttura sportiva a Mendri | Dinamico Sport Dimension di Daniele Bernasconi è una palestra a Mendrisio con at |
| csv-18 | A.S.D. Valceresio A. Audax | description | La scheda di A.S.D. Valceresio A. Audax raccoglie i dati disponibili per una str | A.S.D. Valceresio A. Audax è una struttura sportiva a Arcisate collegata a Calci |
| csv-185 | Dragon's Club | description | Dragon's Club è una struttura sportiva a Bedano collegata a Fitness. Le informaz | Dragon's Club è una palestra a Bedano con attività legate a Aikido e altre disci |
| csv-188 | Electra Fitness Ems Bellinzona | description | Electra Fitness Ems Bellinzona è una struttura sportiva a Bellinzona, in Via Cod | Electra Fitness Ems Bellinzona è una palestra a Bellinzona con attività legate a |
| csv-190 | Elements Fitness Club | description | La scheda di Elements Fitness Club raccoglie i dati disponibili per una struttur | Elements Fitness Club è una palestra a Lavertezzo con attività legate a Fitness  |
| csv-191 | ELETTROFITNESS Saronno | description | ELETTROFITNESS Saronno è una struttura sportiva a Saronno, in Via Molino, 2, con | ELETTROFITNESS Saronno è una palestra a Saronno con attività legate a EMS Traini |
| csv-192 | Emotion - Fitness and Wellness | description | Emotion - Fitness and Wellness è una struttura sportiva a Germignaga, in Via Ale | Emotion - Fitness and Wellness è una palestra a Germignaga con attività legate a |
| csv-194 | Endless Will - Margherita Montes | description | Endless Will - Margherita Montes è una struttura sportiva a Gallarate collegata  | Endless Will - Margherita Montes è una realtà sportiva a Gallarate dedicata a Br |
| csv-196 | Eolo Sport City | description | Eolo Sport City è una struttura sportiva a Busto Arsizio, in Corso Sempione, 194 | Eolo Sport City è una palestra a Busto Arsizio con attività legate a Calcetto e  |
| csv-197 | EqualArmor | description | EqualArmor è una struttura sportiva a Lugano, in Viale dei Faggi 9, con attività | EqualArmor è una palestra a Lugano con attività legate a Boxe e altre discipline |
| csv-199 | essenzialmente yoga | price_info |  | Portale ufficiale Gymdesk: free trial gratuito; single attendance CHF 40.00/gior |
| csv-199 | essenzialmente yoga | description | essenzialmente yoga è presente nel catalogo per Yoga a Saronno in Via Dante Alig | essenzialmente yoga è una struttura sportiva a Saronno collegata a Yoga. Le info |
| csv-20 | Sport Caronno Pertusella | description | La scheda di Sport Caronno Pertusella raccoglie i dati disponibili per una strut | Sport Caronno Pertusella è una struttura sportiva a Caronno Pertusella collegata |
| csv-203 | EXPERIENCE - Personal Training Service di Daniele Cimino | description | EXPERIENCE - Personal Training Service di Daniele Cimino è una struttura sportiv | EXPERIENCE - Personal Training Service di Daniele Cimino è una palestra a Mendri |
| csv-205 | FIGHT ACADEMY | description |  | FIGHT ACADEMY è una palestra a Morazzone con attività legate a Arnis e altre dis |
| csv-208 | First Studio Personal trainer | description |  | First Studio Personal trainer / palestra è una struttura sportiva a Locarno, in  |
| csv-21 | AA Special Training | description | AA Special Training è la sede di Pregassona collegata a Fitness. Questa scheda è | AA Special Training è la sede di Pregassona collegata a Boxe. Questa scheda è de |
| csv-218 | Fit And Go Busto Arsizio | description | Fit And Go Busto Arsizio è una struttura sportiva a Busto Arsizio, in Viale Stel | Fit And Go Busto Arsizio è una palestra a Busto Arsizio con attività legate a Cr |
| csv-22 | AA Special Training | description | AA Special Training è la sede di Lugano collegata a Fitness. Questa scheda è ded | AA Special Training è la sede di Lugano collegata a Boxe. Questa scheda è dedica |
| csv-228 | FitActive Varese | description |  | FitActive Varese è una struttura sportiva a Varese, in Viale Belforte, 5 H, con  |
| csv-229 | FitActive Varese Saffi | price_info |  | Abbonamento online annuale: 19,90 EUR/mese + 79,00 EUR quota iscrizione vitalizi |
| csv-23 | Accademia della scherma "A. Felli" | description | La scheda di Accademia della scherma "A. Felli" raccoglie i dati disponibili per | Accademia della scherma "A. Felli" è una struttura sportiva a Busto Arsizio coll |
| csv-230 | Fitness by Mariano Villena - The Garage of Body Building | price_info |  | Abbonamento online annuale: 19,90 EUR/mese + 79,00 EUR quota iscrizione vitalizi |
| csv-231 | Fitness Hub Lugano | price_info |  | Abbonamento online annuale: 19,90 EUR/mese + 79,00 EUR quota iscrizione vitalizi |
| csv-242 | Ganesha's Home yoga & meditazione | price_info |  | Tariffa pubblicata su scheda Superprof: EUR 39 all'ora, con prima lezione offert |
| csv-242 | Ganesha's Home yoga & meditazione | description |  | Ganesha's Home yoga & meditazione è una struttura sportiva a Chiasso, in Via G.  |
| csv-246 | G-I'm Club - Gli specialisti del dimagrimento sostenibile | price_info |  | Basic: 3 mesi CHF 390, 6 mesi CHF 710, annuale CHF 1290. Gold: 3 mesi CHF 490, 6 |
| csv-25 | A-CLUB | description | A-CLUB è una struttura sportiva a Savosa, in Via centro Sportivo 5, con attività | A-CLUB è una palestra a Savosa con attività legate a Acquafitness e altre discip |
| csv-254 | GoAcademy | price_info |  | Padel Academy: lezione singola 60 min 90.- fino alle 18:00 e 110.- dalle 18:00;  |
| csv-254 | GoAcademy | description | GoAcademy ha una scheda dedicata a Agno in Al termine di, Via Ponte Vecchio con  | GoAcademy è una struttura sportiva a Agno, in Al termine di, Via Ponte Vecchio,  |
| csv-255 | Golden Gloves Gym By Ruby Belge | price_info |  | Adulti: 1 mese CHF 110-230 secondo numero entrate; 3 mesi CHF 310-520; 6 mesi CH |
| csv-255 | Golden Gloves Gym By Ruby Belge | description | Golden Gloves Gym By Ruby Belge è una struttura sportiva a Lugano collegata a Fi | Golden Gloves Gym By Ruby Belge è una palestra a Lugano con attività legate a Bo |
| csv-256 | Golden Gym Snc | description | La scheda di Golden Gym Snc raccoglie i dati disponibili per una struttura colle | Golden Gym Snc è una struttura sportiva a Busto Arsizio collegata a Fitness. Le  |
| csv-258 | Gravity Art Studio | description |  | Gravity Art Studio è una struttura sportiva a Chiasso, in Via degli Albrici 7, c |
| csv-26 | Acorpolibero | description | La scheda di Acorpolibero raccoglie i dati disponibili per una struttura collega | Acorpolibero è una struttura sportiva a Bellinzona collegata a Pilates. Le infor |
| csv-260 | Gruppo Sportivo Robur 1919 ASD Saronno | description | Gruppo Sportivo Robur 1919 ASD Saronno è una struttura sportiva a Saronno, in Vi | Gruppo Sportivo Robur 1919 ASD Saronno è una struttura sportiva a Saronno, in Vi |
| csv-265 | Gym's - Spirito Sportivo S.S.D. a r.l. | description | Gym's - Spirito Sportivo S.S.D. a r.l. è indicata a Gallarate in Viale Lombardia | Gym's - Spirito Sportivo S.S.D. a r.l. è una struttura sportiva a Gallarate, in  |
| csv-266 | GymTonic SA | price_info |  | Offerta home: 4 mesi al prezzo di 3 a CHF 390.-. Include accesso palestra, piano |
| csv-269 | Hair&Yoga Groove | description | La scheda di Hair&Yoga Groove raccoglie i dati disponibili per una struttura col | Hair&Yoga Groove è una struttura sportiva a Locarno collegata a Yoga. Le informa |
| csv-270 | Hammer Gym Studios - Lugano | description | Hammer Gym Studios - Lugano è presente nel catalogo per Fitness a Lugano in Via  | Hammer Gym Studios - Lugano è una struttura sportiva a Lugano collegata a Fitnes |
| csv-272 | HERITAGE PILATES STUDIO | price_info |  | Valutazione da CHF 50. Individuale: singola CHF 105; 5 lezioni CHF 510; 10 lezio |
| csv-276 | Hung Sing Kung Fu - Tai Chi & Choy Li Fut | description | Hung Sing Kung Fu - Tai Chi & Choy Li Fut è una struttura sportiva a Gallarate,  | Hung Sing Kung Fu - Tai Chi & Choy Li Fut è una palestra a Gallarate con attivit |
| csv-288 | Il Centro Metodo Pilates | description | Il Centro Metodo Pilates è presente nel catalogo per Pilates a Varese in Piazza  | Il Centro Metodo Pilates è una struttura sportiva a Varese collegata a Pilates.  |
| csv-292 | Il Tempio Delle Arti Marziali, Bellinzona | description | Il Tempio Delle Arti Marziali, Bellinzona è una struttura sportiva a Bellinzona, | Il Tempio Delle Arti Marziali, Bellinzona è una palestra a Bellinzona con attivi |
| csv-3 | 1to1 Fitness | description | 1to1 Fitness è la sede di Busto Arsizio collegata a Fitness. Questa scheda è ded | 1to1 Fitness e' una palestra a Busto Arsizio con attivita legate a Fitness. E' u |
| csv-306 | Judo Waza | price_info |  | Stagione 2025-2026: GiocaJudo 1 ciclo CHF 225; 2 ciclo CHF 150 per chi ha gia' s |
| csv-307 | krperformen Locarno | price_info |  | Stagione 2025-2026: GiocaJudo 1 ciclo CHF 225; 2 ciclo CHF 150 per chi ha gia' s |
| csv-309 | Kangatraining Lugano | description | La scheda di Kangatraining Lugano raccoglie i dati disponibili per una struttura | Kangatraining Lugano è una struttura sportiva a Lugano collegata a Fitness. Le i |
| csv-310 | Karate Club Bellinzona | price_info |  | Quote sociali annuali pubblicate: adulti CHF 500; studenti / apprendisti CHF 250 |
| csv-314 | KENZAN Dojo | price_info |  | Mini corso di Kendo di 4 lezioni: EUR 40 secondo la pagina ufficiale informazion |
| csv-314 | KENZAN Dojo | description | La scheda di KENZAN Dojo raccoglie i dati disponibili per una struttura collegat | KENZAN Dojo è una palestra a Gallarate con attività legate a Iaido e altre disci |
| csv-315 | Kenzan Kyudo - Ren Shin Kan Kyudojo | description | Kenzan Kyudo - Ren Shin Kan Kyudojo è una struttura sportiva a Casorate Sempione | Kenzan Kyudo - Ren Shin Kan Kyudojo è una struttura sportiva a Casorate Sempione |
| csv-316 | Kickboxing Andrea | description | Kickboxing Andrea è la sede di Varese collegata a Kickboxing. Questa scheda è de | Kickboxing Andrea è la sede di Varese collegata a Boxe. Questa scheda è dedicata |
| csv-317 | Kickboxing Andrea | description | Kickboxing Andrea è la sede di Pazzallo collegata a Kickboxing. Questa scheda è  | Kickboxing Andrea è la sede di Pazzallo collegata a Boxe. Questa scheda è dedica |
| csv-318 | Kinder Yoga Varese | description | Kinder Yoga Varese è presente nel catalogo per Yoga a Varese in c/o Naturyoga, V | Kinder Yoga Varese è una struttura sportiva a Varese collegata a Yoga. Le inform |
| csv-327 | Kung Fu Choy Li Fut & Tai Chi | description | La scheda di Kung Fu Choy Li Fut & Tai Chi segnala attività legate a Tai Chi a B | Kung Fu Choy Li Fut & Tai Chi è una palestra a Busto Arsizio con attività legate |
| csv-330 | La Grotta di sale | description | La Grotta di sale è presente nel catalogo per Fitness a Luino in Via del Porto,  | La Grotta di sale è una struttura sportiva a Luino collegata a Fitness. Le infor |
| csv-348 | Life Changer Just Training | description |  | Life Changer Just Training è una struttura sportiva a Chiasso, in Via Vincenzo d |
| csv-349 | Life Club | price_info |  | Tariffa giornaliera pubblicata: centro balneare adulti CHF 13, ragazzi 3-15 anni |
| csv-349 | Life Club | description |  | Life Club è una struttura sportiva a Chiasso collegata a Fitness. Le informazion |
| csv-352 | LIFEvillage | price_info |  | Abbonamento indicato in home: a partire da EUR 59/mese. |
| csv-354 | Lo Studio di Tita | description | La scheda di Lo Studio di Tita raccoglie i dati disponibili per una struttura co | Lo Studio di Tita è una struttura sportiva a Mendrisio collegata a Pilates. Le i |
| csv-356 | Luce Pilates Studio | description | Luce Pilates Studio è presente nel catalogo per Pilates a Gallarate in Via Giova | Luce Pilates Studio è una struttura sportiva a Gallarate collegata a Pilates. Le |
| csv-360 | MABA Cycling center | description | La scheda di MABA Cycling center raccoglie i dati disponibili per una struttura  | MABA Cycling center è una struttura sportiva a Gallarate, in Viale Lombardia, 49 |
| csv-362 | MADDYFIT | description |  | MADDYFIT è una struttura sportiva a Chiasso, in Corso S. Gottardo 46/h, con atti |
| csv-364 | Mangrove Academy | description | Per chi cerca Brazilian Jiu Jitsu a Lugano, Mangrove Academy offre una scheda de | Mangrove Academy è una realtà sportiva a Lugano dedicata a Brazilian Jiu Jitsu.  |
| csv-369 | Maura Pilates | price_info |  | Pilates Mat Class e Over 55: prova CHF 15, singola CHF 24, 5 lezioni CHF 115, 10 |
| csv-37 | Ad Oriente,Yoga, Aikido & Benessere | description |  | Ad Oriente,Yoga, Aikido & Benessere è una palestra a Cardano al Campo con attivi |
| csv-371 | Mendrisiotto Nuoto (NUM) | description | La scheda di Mendrisiotto Nuoto (NUM) raccoglie i dati disponibili per una strut | Mendrisiotto Nuoto (NUM) è una struttura sportiva a Mendrisio collegata a Nuoto. |
| csv-372 | Mexican Boxing Club | description | Per chi cerca Boxe a Vernate, Mexican Boxing Club offre una scheda dedicata con  | Mexican Boxing Club è una realtà sportiva a Vernate dedicata a Boxe. La scheda r |
| csv-374 | Millennium Wellness Gallarate | description | Millennium Wellness Gallarate è una struttura sportiva a Gallarate, in Via Madon | Millennium Wellness Gallarate è una struttura sportiva a Gallarate collegata a F |
| csv-375 | Mind Your Body - Sara D'Agostino Speziali | price_info |  | Lezioni in persona Casa Corvo: prova CHF 10, singola CHF 28, 5 lezioni CHF 130 o |
| csv-379 | Mom Boxing Club | price_info |  | New Member Trial CHF 50 valido 3 mesi per 5 classi; Monthly Unlimited CHF 100/me |
| csv-380 | Momo Factory Gym Sagl | price_info |  | Abbonamento sala pesi a partire da CHF 59. Coaching: Silver CHF 40, Gold CHF 70, |
| csv-381 | Mono Yoga | description | La scheda di Mono Yoga raccoglie i dati disponibili per una struttura collegata  | Mono Yoga è una struttura sportiva a Mendrisio collegata a Yoga. Le informazioni |
| csv-384 | Movimenti S.S.D. | price_info |  | Infynity & Longevity EUR 85/mese; Start Fitness EUR 240/6 settimane; Power & Gro |
| csv-386 | Mrs.Sporty Saronno - Palestra per Sole Donne | description |  | Mrs.Sporty Saronno - Palestra per Sole Donne è una struttura sportiva a Saronno, |
| csv-39 | Alessio Merelli - Personal Fitness Trainer - Coach | description | Alessio Merelli - Personal Fitness Trainer - Coach è presente nel catalogo per F | Alessio Merelli - Personal Fitness Trainer - Coach è una palestra a Varese con a |
| csv-392 | Natur Yoga | description | A Varese, Natur Yoga è associata a Yoga e all'indirizzo Viale Padre G. B. Aguggi | Natur Yoga è una struttura sportiva a Varese collegata a Yoga. Le informazioni d |
| csv-395 | New Body Extreme | description | La scheda di New Body Extreme raccoglie i dati disponibili per una struttura col | New Body Extreme è una struttura sportiva a Luino collegata a Fitness. Le inform |
| csv-396 | New Centro Fitness - Power Gym | price_info |  | Abbonamento uomo 13 mesi CHF 690; abbonamento donna 13 mesi CHF 590. La home ind |
| csv-396 | New Centro Fitness - Power Gym | description | New Centro Fitness - Power Gym è una struttura sportiva a Sementina, in Via ai S | New Centro Fitness - Power Gym è una struttura sportiva a Sementina collegata a  |
| csv-4 | 1to1 Fitness | description |  | 1to1 Fitness e' una palestra a Gallarate con attivita legate a Fitness. E' un ri |
| csv-40 | AliZStudio di Vera Viligiardi - Fitness with Vera | description | AliZStudio di Vera Viligiardi - Fitness with Vera è una struttura sportiva a Men | AliZStudio di Vera Viligiardi - Fitness with Vera è una palestra a Mendrisio con |
| csv-404 | NonStop Gym Mendrisio | price_info |  | Abbonamento NonStop Gym indicato a partire da CHF 49/mese. |
| csv-405 | novantuno Studio - Pilates & BAZ | description | novantuno Studio - Pilates & BAZ è presente nel catalogo per Pilates a Vacallo i | novantuno Studio - Pilates & BAZ è una struttura sportiva a Vacallo collegata a  |
| csv-406 | Numen Club | price_info |  | Abbonamento NonStop Gym indicato a partire da CHF 49/mese. |
| csv-417 | OM YOGA CENTER | price_info |  | Formula GOGYM pubblicata: 5 sessioni EUR 60. Pagina 'soddisfatti o rimborsati' G |
| csv-418 | Omnia Gym Artistica Varese | price_info |  | Formula GOGYM pubblicata: 5 sessioni EUR 60. Pagina 'soddisfatti o rimborsati' G |
| csv-424 | Palabisterzo | description | La scheda di Palabisterzo raccoglie i dati disponibili per una struttura collega | Palabisterzo è una struttura sportiva a Busto Arsizio collegata a Fitness. Le in |
| csv-430 | Palestra - Aikido Kangei | description |  | Palestra - Aikido Kangei è una realtà sportiva a Viganello dedicata a Aikido. La |
| csv-431 | Palestra "Accademia Arti Orientali ASD" | description |  | Palestra "Accademia Arti Orientali ASD" è una struttura sportiva a Saronno, in V |
| csv-432 | Palestra "Nuova Olimpia Boxe" | description |  | Palestra "Nuova Olimpia Boxe" è una realtà sportiva a Gallarate dedicata a Boxe. |
| csv-435 | Palestra Body Up | description |  | Palestra Body Up è una struttura sportiva a Tradate, in Via Bruno Passerini, 16, |
| csv-436 | Palestra centro scolastico Rancate | description |  | Palestra centro scolastico Rancate è una struttura sportiva a Rancate, in Via Mo |
| csv-437 | Palestra COCOON | description |  | Palestra COCOON è una struttura sportiva a Varese collegata a Fitness. Le inform |
| csv-442 | Palestra Federale, SFG Bellinzona | description |  | Palestra Federale, SFG Bellinzona è una struttura sportiva a Bellinzona collegat |
| csv-443 | Palestra Fuji-Yama | description |  | Palestra Fuji-Yama è una struttura sportiva a Gallarate, in Via Mottarone, 3, co |
| csv-444 | Palestra KO-SEN | description |  | Palestra KO-SEN è una struttura sportiva a Saronno, in Via Bergamo, 6, con attiv |
| csv-445 | Palestra McFIT Busto Arsizio | description |  | Palestra McFIT Busto Arsizio è una struttura sportiva a Busto Arsizio, in Via Bu |
| csv-446 | Palestra New Life Di Paronzini Pierluigi | description |  | Palestra New Life Di Paronzini Pierluigi è una struttura sportiva a Luino colleg |
| csv-448 | palestra Peschiera | description |  | palestra Peschiera è una struttura sportiva a Locarno, in Via Alla Peschiera 660 |
| csv-449 | Palestra Time Out Club | description |  | Palestra Time Out Club è una struttura sportiva a Cardano Al Campo, in Via Gugli |
| csv-45 | ANDREA FONTANELLA | description | La scheda di ANDREA FONTANELLA raccoglie i dati disponibili per una struttura co | ANDREA FONTANELLA è una palestra a Casciago con attività legate a Fitness e altr |
| csv-450 | Palestra Wellnessgym - Ranzato | description |  | Palestra Wellnessgym - Ranzato è una struttura sportiva a Tradate, in Via Monte  |
| csv-451 | Palestra XXV Aprile | description |  | Palestra XXV Aprile è una struttura sportiva a Varese collegata a Fitness. Le in |
| csv-46 | Angelo Training Lab - Personal Studio | description | Angelo Training Lab - Personal Studio è presente nel catalogo per Fitness a Vare | Angelo Training Lab - Personal Studio è una palestra a Varese con attività legat |
| csv-463 | Performance Studio | price_info |  | Personal training: lezione singola CHF 50-100; pacchetti CHF 720-2700; annuale C |
| csv-464 | Personal Fitness Trainer Raffaele Pagano | description | Personal Fitness Trainer Raffaele Pagano è una struttura sportiva a Varese colle | Personal Fitness Trainer Raffaele Pagano è una palestra a Varese con attività le |
| csv-465 | Personal fitness trainer, Lugano. | description | Personal fitness trainer, Lugano. è una struttura sportiva a Lugano collegata a  | Personal fitness trainer, Lugano. è una palestra a Lugano con attività legate a  |
| csv-466 | Personal Trainer Milano - Reverbia Studio Missori | description | Personal Trainer Milano - Reverbia Studio Missori è una struttura sportiva a Mil | Personal Trainer Milano - Reverbia Studio Missori è una palestra a Milano con at |
| csv-47 | Anytime Fitness Saronno | description | Anytime Fitness Saronno è una struttura sportiva a Saronno, in Via Valletta, 2,  | Anytime Fitness Saronno è una palestra a Saronno con attività legate a Fitness e |
| csv-470 | PiiMove Studio Reformer | price_info |  | Formula iniziale pubblicata: 2 settimane a CHF 50. |
| csv-479 | Piscina Acquatic Club Ticino | description | Piscina Acquatic Club Ticino è presente nel catalogo per Nuoto a Lugano in Via F | Piscina Acquatic Club Ticino è una struttura sportiva a Lugano collegata a Nuoto |
| csv-48 | AR Fitness | description | AR Fitness è una struttura sportiva a Lavertezzo collegata a Fitness. Le informa | AR Fitness è una palestra a Lavertezzo con attività legate a Cross Training e al |
| csv-481 | Piscina comunale Fausto Fabiano | price_info |  | Esempi corsi adulti pubblicati: Aquafit Sementina 11 lezioni CHF 319; Aquafit Bi |
| csv-481 | Piscina comunale Fausto Fabiano | description | La scheda di Piscina comunale Fausto Fabiano raccoglie i dati disponibili per un | Piscina comunale Fausto Fabiano è una struttura sportiva a Varese collegata a Nu |
| csv-482 | Piscina comunale Mendrisio | price_info |  | Lido estivo Busto Garolfo: lunedi'-venerdi' intero EUR 10, ridotto 3-12 anni EUR |
| csv-485 | Piscina di Saronno - Saronno Servizi SSD | price_info |  | Entrata singola Piscina coperta Lugano: adulti CHF 11; ragazzi fino a 20 anni, s |
| csv-488 | Planet Wellness Village Lugano | price_info |  | Ingresso singolo palestra a partire da CHF 25. Settimana di prova: 7 giorni a CH |
| csv-49 | AR Studio Personal | description | AR Studio Personal è una struttura sportiva a Lugano, in C/O Fisioterapia Artemi | AR Studio Personal è una palestra a Lugano con attività legate a Fitness e altre |
| csv-491 | Primadonna Studio Fitness solo per lei | price_info |  | Prezzi ufficiali pubblicati: singola seduta CHF 18; 3 mesi senza impegno CHF 298 |
| csv-493 | Ptforfit Personal Training | description | Ptforfit Personal Training è una struttura sportiva a Lugano collegata a Fitness | Ptforfit Personal Training è una palestra a Lugano con attività legate a Fitness |
| csv-5 | 20' Training Lab Busto Arsizio | description | 20' Training Lab Busto Arsizio è una struttura sportiva a Busto Arsizio, in Via  | 20' Training Lab Busto Arsizio è una palestra a Busto Arsizio con attività legat |
| csv-50 | Area 51 Wellness Club | description | Area 51 Wellness Club è una struttura sportiva a Saronno, in Via G. B. Busnelli, | Area 51 Wellness Club è una palestra a Saronno con attività legate a Cycling e a |
| csv-502 | RB Training Sport Chiasso | description |  | RB Training Sport Chiasso è una struttura sportiva a Chiasso, in Via Campagna 4, |
| csv-506 | Real Busto ASD | price_info |  | Iscrizione EUR 50. Contributi allenamento comunicati in base a disciplina e live |
| csv-506 | Real Busto ASD | description | Real Busto ASD è presente nel catalogo per Fitness a Busto Arsizio in Via T. Rod | Real Busto ASD è una struttura sportiva a Busto Arsizio collegata a Fitness. Le  |
| csv-509 | Ri_Forma Fitness Club | description | La scheda di Ri_Forma Fitness Club raccoglie i dati disponibili per una struttur | Ri_Forma Fitness Club è una struttura sportiva a Lugano collegata a Fitness. Le  |
| csv-510 | Riky Gaetti Personal Fitness Services | description | Riky Gaetti Personal Fitness Services è una struttura sportiva a Lugano collegat | Riky Gaetti Personal Fitness Services è una palestra a Lugano con attività legat |
| csv-517 | Rust&Glory Gym Busto Arsizio | description | La scheda di Rust&Glory Gym Busto Arsizio raccoglie i dati disponibili per una s | Rust&Glory Gym Busto Arsizio è una struttura sportiva a Busto Arsizio collegata  |
| csv-518 | S.S.D. Castellanza Pesi | description | La scheda di S.S.D. Castellanza Pesi raccoglie i dati disponibili per una strutt | S.S.D. Castellanza Pesi è una struttura sportiva a Castellanza collegata a Bodyb |
| csv-519 | Sala Flow \| Yoga e Pilates Reformer Varese | description | Sala Flow \| Yoga e Pilates Reformer Varese è una struttura sportiva a Varese, in | Sala Flow \| Yoga e Pilates Reformer Varese è una palestra a Varese con attività  |
| csv-52 | AS Riarena | description | AS Riarena è una struttura sportiva a Locarno collegata a Fitness. Le informazio | AS Riarena è una struttura sportiva a Locarno collegata a Calcio. Le informazion |
| csv-520 | Sandra Camesi Personal Training | description | Sandra Camesi Personal Training è una struttura sportiva a Locarno, in Via alla  | Sandra Camesi Personal Training è una palestra a Locarno con attività legate a F |
| csv-524 | Schiavone Team Lab | description | Schiavone Team Lab ha una scheda dedicata a Varese in Viale Ippodromo, 9 con rif | Schiavone Team Lab è una struttura sportiva a Varese, in Viale Ippodromo, 9, con |
| csv-528 | SevenBlocks | description |  | SevenBlocks è la sede di Chiasso collegata a Fitness. Questa scheda è dedicata a |
| csv-53 | Ascofit Fitness Losone | price_info |  | 12 mesi da CHF 490.- senza service o CHF 590.- con service; 6 mesi da CHF 390.-; |
| csv-53 | Ascofit Fitness Losone | description |  | Ascofit Fitness Losone è una palestra a Losone con attività legate a Fitness e a |
| csv-536 | Sistemha - Palestra di potenziamento fisico e riabilitazione | description |  | Sistemha - Palestra di potenziamento fisico e riabilitazione è una struttura spo |
| csv-54 | ASD BODY EXTREME LUINO La Palestra dal 1992 | description |  | ASD BODY EXTREME LUINO La Palestra dal 1992 è una palestra a Luino con attività  |
| csv-542 | Societ Federale di Ginnastica Chiasso | description |  | Societ Federale di Ginnastica Chiasso è una struttura sportiva a Chiasso collega |
| csv-543 | Societa'Ginnastica Pro Patria Bustese Sportiva | price_info |  | Canottaggio frequenza annuale: Agonisti soci EUR 350, non soci EUR 500; Pre agon |
| csv-549 | Spazio 360 | price_info |  | Lezione prova di gruppo CHF 5; lezione singola gruppo CHF 15; 5 lezioni CHF 75;  |
| csv-549 | Spazio 360 | description |  | Spazio 360 è una struttura sportiva a Chiasso collegata a Fitness. Le informazio |
| csv-55 | ASD Judo Bu-sen Tradate | description | ASD Judo Bu-sen Tradate compare nella categoria Judo a Tradate in ingresso da, P | ASD Judo Bu-sen Tradate è una realtà sportiva a Tradate dedicata a Judo. La sche |
| csv-552 | Spazio Esycha - Anna Arturi | description | La scheda di Spazio Esycha - Anna Arturi raccoglie i dati disponibili per una st | Spazio Esycha - Anna Arturi è una struttura sportiva a Varese collegata a Yoga.  |
| csv-56 | ASD KOKORO DAI | description | ASD KOKORO DAI è una struttura sportiva a Cairate, in Via Luigi Cadorna, 1, con  | ASD KOKORO DAI è una palestra a Cairate con attività legate a Boxe e altre disci |
| csv-560 | Sportinmente ASD | description | La scheda di Sportinmente ASD raccoglie i dati disponibili per una struttura col | Sportinmente ASD è una struttura sportiva a Tradate, in Via Oslavia, con attivit |
| csv-566 | ST Studio Personal Training | description | ST Studio Personal Training ha una scheda dedicata a Varese in Via Giulio Cesare | ST Studio Personal Training è una palestra a Varese con attività legate a Fitnes |
| csv-567 | Stability Pilates | price_info |  | Prezzi ufficiali: privata CHF 80 singola, 5 lezioni CHF 375, 10 lezioni CHF 700. |
| csv-569 | Stronger 1994 Personal Training | price_info |  | Prezzi ufficiali: coaching gratuito iniziale. Individuale: 1 sessione CHF 150; 5 |
| csv-569 | Stronger 1994 Personal Training | description | Stronger 1994 Personal Training ha una scheda dedicata a Lugano in Via Giacomo e | Stronger 1994 Personal Training è una palestra a Lugano con attività legate a Fi |
| csv-57 | ASD RAGGI D'ORIENTE | description | ASD RAGGI D'ORIENTE è una struttura sportiva a Busto Arsizio, in Via F. Confalon | ASD RAGGI D'ORIENTE è una palestra a Busto Arsizio con attività legate a Danza D |
| csv-570 | Studio Bee Pilates e Yoga | description |  | Studio Bee Pilates e Yoga è una palestra a Busto Arsizio con attività legate a P |
| csv-575 | Studio Dr. Massimo Sartorello - Chinesiologo clinico - Personal Trainer a Saronno | description | Studio Dr. Massimo Sartorello - Chinesiologo clinico - Personal Trainer a Saronn | Studio Dr. Massimo Sartorello - Chinesiologo clinico - Personal Trainer a Saronn |
| csv-579 | Studio I.N. personal training Lugano | description |  | Studio I.N. personal training Lugano è una palestra a Lugano con attività legate |
| csv-58 | Asd. United Sports Ceresio | description | Asd. United Sports Ceresio è una struttura sportiva a Porlezza, in Via per osten | Asd. United Sports Ceresio è una palestra a Porlezza con attività legate a Difes |
| csv-583 | Studio Mudita - Massaggio Avanzato, Yoga e Terapie Olistiche a Locarno Ascona | description |  | Studio Mudita - Massaggio Avanzato, Yoga e Terapie Olistiche a Locarno Ascona è  |
| csv-584 | Studio Personal Trainer | description | A Besozzo, Studio Personal Trainer è associata a Fitness e all'indirizzo Via Lui | Studio Personal Trainer è una palestra a Besozzo con attività legate a Fitness e |
| csv-593 | Swimming School MobyDick Parco Maraini | description | Swimming School MobyDick Parco Maraini è una struttura sportiva a Lugano collega |  |
| csv-594 | SWKA - Wing Chun Kung Fu | description | La scheda di SWKA - Wing Chun Kung Fu segnala attività legate a Wing Chun a Luga | SWKA - Wing Chun Kung Fu è una palestra a Lugano con attività legate a Kung Fu e |
| csv-6 | 20' Training Lab Gallarate | description | 20' Training Lab Gallarate è una struttura sportiva a Gallarate, in Vle Vittorio | 20' Training Lab Gallarate è una palestra a Gallarate con attività legate a EMS  |
| csv-60 | Atelier11 | description | La scheda di Atelier11 raccoglie i dati disponibili per una struttura collegata  | Atelier11 è una struttura sportiva a Busto Arsizio collegata a Pilates. Le infor |
| csv-602 | Taketomikai - Arti marziali Mendrisio | description | Taketomikai - Arti marziali Mendrisio è una struttura sportiva a Mendrisio, in V | Taketomikai - Arti marziali Mendrisio è una palestra a Mendrisio con attività le |
| csv-604 | TC Lugano 1903 | description | TC Lugano 1903 è una struttura sportiva a Lugano collegata a Fitness. Le informa | TC Lugano 1903 è una struttura sportiva a Lugano collegata a Tennis. Le informaz |
| csv-605 | TC Villa Luganese | description | La scheda di TC Villa Luganese raccoglie i dati disponibili per una struttura co | TC Villa Luganese è una struttura sportiva a Lugano collegata a Tennis. Le infor |
| csv-61 | Athletic Form \| Palestra \| Hyrox Center Chiasso | description |  | Athletic Form \| Palestra \| Hyrox Center Chiasso è una palestra a Chiasso con att |
| csv-611 | The Fight club gym | description | The Fight club gym è una struttura sportiva a Buguggiate, in Via Giovanni XXIII, | The Fight club gym è una palestra a Buguggiate con attività legate a Boxe e altr |
| csv-613 | Thunder Top Team ASD | description | Thunder Top Team ASD è una struttura sportiva a Gallarate collegata a Fitness. L | Thunder Top Team ASD è una palestra a Gallarate con attività legate a Boxe e alt |
| csv-618 | Tre Castelli Fitness Center SA | price_info |  | Prova fitness ufficiale CHF 10. Gli altri abbonamenti non risultano leggibili co |
| csv-620 | Twinbody Varese | price_info |  | Prezzi ufficiali Twinbody: prova 20 EUR; abbonamenti a partire da 80 EUR/mese; p |
| csv-623 | UNDERGROUND professione sport | description | UNDERGROUND professione sport è una struttura sportiva a Busto Arsizio, in Corso | UNDERGROUND professione sport è una palestra a Busto Arsizio con attività legate |
| csv-624 | Union Fitness Chiasso | description |  | Union Fitness Chiasso è una struttura sportiva a Chiasso, in Corso S. Gottardo 1 |
| csv-63 | AtX Training Lab | description | AtX Training Lab ha una scheda dedicata a Varese in Viale Luigi Borri, 311 con r | AtX Training Lab è una struttura sportiva a Varese, in Viale Luigi Borri, 311, c |
| csv-631 | Urban Fitness Varese | description | Urban Fitness Varese è una struttura sportiva a Varese, in Via Ammiraglio France | Urban Fitness Varese è una struttura sportiva a Varese collegata a Fitness. Le i |
| csv-632 | US Bosto Varese | description | US Bosto Varese è una struttura sportiva a Varese collegata a Fitness. Le inform | US Bosto Varese è una struttura sportiva a Varese collegata a Calcio. Le informa |
| csv-638 | Veronica Orlando - Yoga e Massoterapia | description | La scheda di Veronica Orlando - Yoga e Massoterapia raccoglie i dati disponibili | Veronica Orlando - Yoga e Massoterapia è una struttura sportiva a Gallarate coll |
| csv-642 | Virtus.fit | description | Virtus.fit è presente nel catalogo per Fitness a Busto Arsizio in Via Monte Grap | Virtus.fit è una struttura sportiva a Busto Arsizio, in Via Monte Grappa, 10, co |
| csv-643 | Wa Rei Ryu Switzerland - Dojo Ketsui | description | Wa Rei Ryu Switzerland - Dojo Ketsui è una struttura sportiva a Lugano collegata | Wa Rei Ryu Switzerland - Dojo Ketsui è una struttura sportiva a Lugano collegata |
| csv-648 | Wilson SUP Center | description | A Locarno, Wilson SUP Center è associata a Fitness e all'indirizzo Via Gioacchin | Wilson SUP Center è una struttura sportiva a Locarno collegata a Sap. Le informa |
| csv-649 | Wing Chun Xu Xi o | price_info |  | Tariffe ufficiali Kwoon Lugano: K2 10-12 anni, privata CHF 130 con Sifu o CHF 80 |
| csv-649 | Wing Chun Xu Xi o | description |  | Wing Chun Xu Xi o è una palestra a Lugano con attività legate a Kung Fu e altre  |
| csv-653 | YOGA con ALGA Saronno | description | La scheda di YOGA con ALGA Saronno raccoglie i dati disponibili per una struttur | YOGA con ALGA Saronno è una struttura sportiva a Saronno collegata a Yoga. Le in |
| csv-656 | Yoga Dinamico e Natural Wellness | price_info |  | Prezzi ufficiali pubblicati: Yoga schiena sana CHF 30 a lezione; Restorative Yog |
| csv-657 | Yoga Gallarate - Karma Chakra | description | Yoga Gallarate - Karma Chakra è una struttura sportiva a Gallarate, in V. Giusep | Yoga Gallarate - Karma Chakra è una struttura sportiva a Gallarate collegata a Y |
| csv-660 | Yoga Loft Cureglia-Ticino | price_info |  | Prezzi ufficiali: 60 ore CHF 595; 40 ore CHF 495; 20 ore CHF 285; 10 ore CHF 165 |
| csv-663 | Yoga Pilates Garden | description | La scheda di Yoga Pilates Garden segnala attività legate a Pilates a Tradate, in | Yoga Pilates Garden è una palestra a Tradate con attività legate a Pilates e alt |
| csv-664 | Yoga Pilates Lab | description | Yoga Pilates Lab raccoglie a Tradate in Via Gaetano Donizetti, 7 informazioni su | Yoga Pilates Lab è una palestra a Tradate con attività legate a Pilates e altre  |
| csv-666 | Yoga Space | description | La scheda di Yoga Space raccoglie i dati disponibili per una struttura collegata | Yoga Space è una struttura sportiva a Lugano collegata a Yoga. Le informazioni d |
| csv-670 | Yoga Tree Milano | description | La scheda di Yoga Tree Milano raccoglie i dati disponibili per una struttura col | Yoga Tree Milano è una struttura sportiva a Milano collegata a Yoga. Le informaz |
| csv-673 | YOGA_WITHSABRINA | description | YOGA_WITHSABRINA raccoglie a Saronno in Via Maestri del Lavoro, 2 informazioni s | YOGA_WITHSABRINA è una palestra a Saronno con attività legate a MMA e altre disc |
| csv-674 | yogachiasso | description |  | yogachiasso è una struttura sportiva a Chiasso, in Via Argentina 4, con attività |
| csv-681 | YUAN | description | YUAN è una struttura sportiva a Gallarate collegata a Fitness. Le informazioni d | YUAN è una struttura sportiva a Gallarate collegata a Tai Chi. Le informazioni d |
| csv-7 | 20' Training Lab Saronno | description | 20' Training Lab Saronno è una struttura sportiva a Saronno, in Via C. B. Cavour | 20' Training Lab Saronno è una palestra a Saronno con attività legate a EMS Trai |
| csv-71 | B-arena | price_info |  | Padel interno da CHF 60.-/1h; padel esterno doppio da CHF 54.-/h; padel esterno  |
| csv-71 | B-arena | description | B-arena è una struttura sportiva a Sementina, in Via al Ticino 44, con attività  | B-arena è una palestra a Sementina con attività legate a Badminton e altre disci |
| csv-72 | BASE \| Personal Training | description | La scheda di BASE \| Personal Training raccoglie i dati disponibili per una strut | BASE \| Personal Training è una palestra a Tradate con attività legate a Fitness  |
| csv-74 | Belady Fitness Club Lugano | description | Belady Fitness Club Lugano è una struttura sportiva a Lugano, in Via Serafino Ba | Belady Fitness Club Lugano è una palestra a Lugano con attività legate a Fitness |
| csv-75 | Bellinzona Sport | description | Bellinzona Sport è una struttura sportiva a Bellinzona collegata a Fitness. Le i | Bellinzona Sport è una palestra a Bellinzona con attività legate a Atletica e al |
| csv-79 | Bienfitstudio | description | Bienfitstudio è una struttura sportiva a Lugano, in Via Antonio Vanoni 7, con at | Bienfitstudio è una palestra a Lugano con attività legate a Fitness e altre disc |
| csv-8 | 20' Training Lab Varese | description | 20' Training Lab Varese è una struttura sportiva a Varese, in Viale Luigi Borri, | 20' Training Lab Varese è una palestra a Varese con attività legate a EMS Traini |
| csv-80 | BIOFIT CLUB Lugano | description | BIOFIT CLUB Lugano è una struttura sportiva a Lugano, in Via Giacomo e Filippo C | BIOFIT CLUB Lugano è una palestra a Lugano con attività legate a EMS Training e  |
| csv-81 | Blooming moves | description | Blooming moves è presente nel catalogo per Pilates a Locarno in Via Vallemaggia  | Blooming moves è una struttura sportiva a Locarno collegata a Pilates. Le inform |
| csv-82 | BODHI Reformer | price_info |  | Pacchetto nuovi allievi: 10 lezioni a 295 CHF secondo la pagina ufficiale BODHI  |
| csv-84 | Body Mind Arti Marziali & Fitness Academy | description | La scheda di Body Mind Arti Marziali & Fitness Academy raccoglie i dati disponib | Body Mind Arti Marziali & Fitness Academy è una palestra a Gavirate con attività |
| csv-86 | Body Work Lugano - EMS e Vacu Gym | description | Body Work Lugano - EMS e Vacu Gym è una struttura sportiva a Lugano collegata a  | Body Work Lugano - EMS e Vacu Gym e' una palestra a Lugano. Sono indicati sede e |
| csv-87 | BodyClub Fitness | description | BodyClub Fitness è una struttura sportiva a Muralto, in Via S. Gottardo 1, con a | BodyClub Fitness è una palestra a Muralto con attività legate a CrossFit e altre |
| csv-88 | BodyClub Personal Training | description | BodyClub Personal Training è una struttura sportiva a Muralto, in Via G. Mariani | BodyClub Personal Training è una palestra a Muralto con attività legate a EMS Tr |
| csv-94 | Brasa Team Italy | description | Brasa Team Italy è una struttura sportiva a Varese, in Via Cesare Correnti, 2, c | Brasa Team Italy è una palestra a Varese con attività legate a Grappling e altre |
| csv-96 | Budo Club Vedeggio | price_info |  | Quote annuali pubblicate: adulti CHF 230; bambini, studenti, giovani e apprendis |

