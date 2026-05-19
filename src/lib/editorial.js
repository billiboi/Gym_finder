import { SEO_DISCIPLINES } from '$lib/seo-disciplines';

export const EDITORIAL_TEMPLATES = [
  {
    id: 'choice-guide',
    name: 'Guida alla scelta',
    description: 'Template per ricerche informative prima di contattare una palestra.',
    sections: ['criteri', 'segnali da controllare', 'prossimo passo']
  },
  {
    id: 'discipline-cluster',
    name: 'Cluster disciplina',
    description: 'Template per collegare guide, discipline e pagine transazionali.',
    sections: ['contesto', 'confronto', 'link interni', 'faq']
  },
  {
    id: 'local-checklist',
    name: 'Checklist locale',
    description: 'Template per query locali con intenzione pratica.',
    sections: ['zona', 'logistica', 'contatti', 'orari']
  }
];

export const DISCIPLINE_CLUSTERS = [
  {
    slug: 'sport-da-combattimento',
    name: 'Sport da combattimento',
    description: 'Boxe, kickboxing, MMA e discipline da ring o tatami con forte componente tecnica.',
    disciplines: ['boxe', 'kickboxing', 'mma', 'karate', 'judo']
  },
  {
    slug: 'fitness-e-forza',
    name: 'Fitness e forza',
    description: 'Palestre generaliste, allenamento funzionale e percorsi per forza e condizionamento.',
    disciplines: ['fitness']
  },
  {
    slug: 'mobilita-e-benessere',
    name: 'Mobilità e benessere',
    description: 'Yoga, Pilates e attività orientate a postura, mobilità e continuità.',
    disciplines: ['pilates', 'yoga']
  },
  {
    slug: 'acqua-e-tecnica',
    name: 'Acqua e tecnica',
    description: 'Nuoto e attività tecniche dove logistica, orari e struttura contano molto.',
    disciplines: ['nuoto']
  }
];

export const EDITORIAL_GUIDES = [
  {
    slug: 'come-scegliere-palestra',
    template: 'choice-guide',
    cluster: 'fitness-e-forza',
    title: 'Come scegliere una palestra senza perdere tempo',
    description:
      'Una guida pratica per confrontare palestre partendo da distanza, orari, discipline, contatti e qualità delle schede.',
    updatedAt: '2026-05-10',
    readingMinutes: 5,
    disciplines: ['fitness', 'pilates', 'yoga'],
    locations: ['varese', 'lugano', 'gallarate'],
    intro:
      'La palestra giusta non è solo quella più vicina. Conta quanto è semplice arrivarci, se gli orari reggono nella tua settimana e se la struttura offre davvero ciò che cerchi.',
    sections: [
      {
        heading: 'Parti da logistica e continuità',
        body:
          'Distanza, parcheggio, mezzi pubblici e fasce orarie decidono spesso più del prezzo. Una palestra mediocre ma raggiungibile con costanza può funzionare meglio di una struttura perfetta che resta scomoda.'
      },
      {
        heading: 'Controlla discipline e livello',
        body:
          'Guarda se la scheda cita discipline specifiche, corsi guidati, sala attrezzi o attività complementari. Se cerchi un corso tecnico, apri anche la pagina della disciplina per confrontare alternative simili.'
      },
      {
        heading: 'Verifica prima di chiamare',
        body:
          'Indirizzo, orari, telefono, sito e mappa riducono i passaggi inutili. Quando mancano informazioni importanti, usa la scheda come punto di partenza e conferma direttamente con la struttura.'
      }
    ],
    faqs: [
      {
        question: 'Meglio scegliere la palestra più vicina o quella più completa?',
        answer:
          'Per allenarti con regolarità, la vicinanza pesa molto. Se cerchi una disciplina specifica, però, conviene confrontare anche strutture poco più lontane.'
      },
      {
        question: 'Quali informazioni controllare prima di contattare una palestra?',
        answer:
          'Controlla indirizzo, orari, discipline, telefono, sito ufficiale e posizione sulla mappa. Sono i dati che evitano la maggior parte dei contatti inutili.'
      }
    ]
  },
  {
    slug: 'boxe-kickboxe-mma-differenze',
    template: 'discipline-cluster',
    cluster: 'sport-da-combattimento',
    title: 'Boxe, kickboxe e MMA: differenze per scegliere il corso',
    description:
      'Panoramica chiara per orientarsi tra boxe, kickboxe e MMA e aprire le pagine disciplina più utili.',
    updatedAt: '2026-05-10',
    readingMinutes: 6,
    disciplines: ['boxe', 'kickboxing', 'mma'],
    locations: ['varese', 'lugano', 'busto-arsizio'],
    intro:
      'Le discipline da combattimento non sono intercambiabili. Cambiano tecniche, ritmo, obiettivi e tipo di palestra da cercare.',
    sections: [
      {
        heading: 'Boxe: lavoro di pugni, ritmo e fondamentali',
        body:
          'La boxe e diretta: footwork, difesa, combinazioni e condizionamento. E una buona scelta se vuoi una disciplina intensa ma con un perimetro tecnico chiaro.'
      },
      {
        heading: 'Kickboxe: pugni, calci e maggiore varieta',
        body:
          'La kickboxe aggiunge calci e gestione della distanza. Controlla sempre se il corso e orientato a fitness, tecnica o agonismo, perche l esperienza cambia parecchio.'
      },
      {
        heading: 'MMA: striking, lotta e grappling',
        body:
          'Le MMA richiedono una palestra con competenze miste. Cerca schede che citano anche grappling, wrestling, BJJ o classi separate per fondamentali.'
      }
    ],
    faqs: [
      {
        question: 'Meglio iniziare da boxe o MMA?',
        answer:
          'Se parti da zero, la boxe può essere più semplice da leggere. Le MMA sono ottime se vuoi un percorso completo e accetti una curva iniziale più ampia.'
      },
      {
        question: 'La kickboxe e adatta anche a chi cerca fitness?',
        answer:
          'Sì, molte palestre propongono corsi orientati al condizionamento. Conviene verificare livello, contatto previsto e struttura della lezione.'
      }
    ]
  },
  {
    slug: 'pilates-yoga-fitness-quale-scegliere',
    template: 'discipline-cluster',
    cluster: 'mobilita-e-benessere',
    title: 'Pilates, yoga o fitness: quale percorso ha più senso',
    description:
      'Guida comparativa per capire quando cercare Pilates, yoga o palestra fitness in base a obiettivi e abitudini.',
    updatedAt: '2026-05-10',
    readingMinutes: 5,
    disciplines: ['pilates', 'yoga', 'fitness'],
    locations: ['saronno', 'gallarate', 'varese'],
    intro:
      'Pilates, yoga e fitness rispondono a bisogni diversi. La scelta migliora quando parti da obiettivo, frequenza e tipo di guida che vuoi ricevere.',
    sections: [
      {
        heading: 'Pilates per controllo e postura',
        body:
          'Il Pilates funziona bene se vuoi lavoro guidato, controllo del movimento e attenzione alla postura. Controlla se la struttura offre corsi a piccoli gruppi o macchine dedicate.'
      },
      {
        heading: 'Yoga per mobilità e continuità',
        body:
          'Lo yoga può essere più fisico o più orientato a respirazione e mobilità. Leggi la scheda e cerca indicazioni sullo stile se hai esigenze precise.'
      },
      {
        heading: 'Fitness per varietà e autonomia',
        body:
          'Una palestra fitness è adatta se vuoi sala attrezzi, corsi diversi e maggiore flessibilità. In questo caso orari, affollamento e posizione pesano molto.'
      }
    ],
    faqs: [
      {
        question: 'Pilates e yoga sono alternative alla palestra?',
        answer:
          "Possono esserlo, ma dipende dall'obiettivo. Se cerchi forza massimale o sala attrezzi, una palestra fitness resta più adatta."
      },
      {
        question: 'Cosa guardare in una scheda Pilates o yoga?',
        answer:
          "Verifica indirizzo, orari, tipo di corso, contatti e discipline associate. Se hai esigenze fisiche specifiche, conferma sempre con l'insegnante."
      }
    ]
  },
  {
    slug: 'palestra-vicino-a-me-controlli',
    template: 'local-checklist',
    cluster: 'fitness-e-forza',
    title: 'Palestra vicino a me: controlli rapidi prima di scegliere',
    description:
      'Checklist locale per usare mappa, zone, discipline e schede palestra senza disperdere la ricerca.',
    updatedAt: '2026-05-10',
    readingMinutes: 4,
    disciplines: ['fitness', 'boxe', 'pilates'],
    locations: ['varese', 'lugano', 'saronno', 'gallarate'],
    intro:
      'Quando cerchi una palestra vicina, il rischio è aprire troppe schede senza un ordine. Una checklist breve rende il confronto più pulito.',
    sections: [
      {
        heading: 'Guarda prima area e tragitto',
        body:
          'La distanza reale non coincide sempre con i chilometri. Considera traffico, parcheggio, mezzi e percorso dopo lavoro o studio.'
      },
      {
        heading: 'Usa discipline e zone come filtri mentali',
        body:
          'Apri le pagine per zona quando vuoi orientarti localmente, oppure le pagine disciplina quando il corso è la priorità.'
      },
      {
        heading: 'Controlla i segnali minimi',
        body:
          'Una scheda utile dovrebbe darti almeno nome, indirizzo, città, disciplina, contatti o sito, orari e posizione mappa quando disponibili.'
      }
    ],
    faqs: [
      {
        question: 'Come ridurre il numero di palestre da confrontare?',
        answer:
          'Parti da zona e disciplina, poi scarta le schede senza orari o contatti utili se hai bisogno di decidere rapidamente.'
      },
      {
        question: 'La mappa basta per scegliere?',
        answer:
          'No. La mappa aiuta a capire la posizione, ma conviene aprire la scheda per controllare discipline, orari e contatti.'
      }
    ]
  }
];

const guidesBySlug = new Map(EDITORIAL_GUIDES.map((guide) => [guide.slug, guide]));
const disciplinesBySlug = new Map(SEO_DISCIPLINES.map((discipline) => [discipline.slug, discipline]));

export function getEditorialGuide(slug) {
  return guidesBySlug.get(slug) || null;
}

export function getEditorialTemplate(id) {
  return EDITORIAL_TEMPLATES.find((template) => template.id === id) || null;
}

export function getDisciplineCluster(slug) {
  return DISCIPLINE_CLUSTERS.find((cluster) => cluster.slug === slug) || null;
}

export function editorialGuideHref(guide) {
  return `/guide/${guide.slug}`;
}

export function disciplineMetaForGuide(guide) {
  return (guide?.disciplines || [])
    .map((slug) => disciplinesBySlug.get(slug))
    .filter(Boolean)
    .map((discipline) => ({
      slug: discipline.slug,
      name: discipline.name,
      href: `/discipline/${discipline.slug}`
    }));
}

export function relatedGuidesForDiscipline(slug, limit = 3) {
  return EDITORIAL_GUIDES.filter((guide) => guide.disciplines.includes(slug)).slice(0, limit);
}

export function relatedGuidesForGuide(guide, limit = 3) {
  const disciplineSet = new Set(guide?.disciplines || []);

  return EDITORIAL_GUIDES.filter((candidate) => {
    if (!guide || candidate.slug === guide.slug) return false;
    return candidate.cluster === guide.cluster || candidate.disciplines.some((slug) => disciplineSet.has(slug));
  }).slice(0, limit);
}

export function guidesByCluster() {
  return DISCIPLINE_CLUSTERS.map((cluster) => ({
    ...cluster,
    guides: EDITORIAL_GUIDES.filter((guide) => guide.cluster === cluster.slug)
  })).filter((cluster) => cluster.guides.length);
}
