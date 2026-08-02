/**
 * Draw Clever Architecture — the projects, once.
 *
 * The only place a project's name, location, category, gallery or cover lives.
 * src/lightbox.js reads it at runtime; the html-partials plugin in
 * vite.config.js reads it at build time to emit the home and portfolio grids.
 *
 * Before this file the same facts were typed into index.html, projects.html and
 * lightbox.js, and had already drifted: Florida House read "Architecture" on the
 * home page and "Architecture · Residential" on the portfolio.
 *
 * `home` and `portfolio` differ on purpose. The two grids use different cover
 * renders, different card spans and different `sizes`. A project with no `home`
 * entry does not appear on the home page.
 */
export const PROJECTS = {
  'casa-marbella': {
    title: 'Casa Marbella', location: 'Marbella, Spain', cat: 'Architecture · Residential',
    folder: 'Renders/Casa-Marbella', tags: 'architecture residential',
    portfolio: { cover: '04-scaled.jpg', cls: 'pc', sizes: '(max-width: 980px) 100vw, (max-width: 1470px) 47vw, 31vw',
                 aria: 'Casa Marbella, architecture and residential, Marbella, Spain. Open gallery',
                 lqip: 'UklGRrAAAABXRUJQVlA4IKQAAADQBACdASocAA8APu1iqU2ppaOiMAgBMB2JZQCsAd0ZA8QSelV5D5yo7qMF4HZWAAD+6kviuoNv0qzOlkiemh/P9fEMVspGaMv/RLu5Ush9HzVeqRU0jZ/QKpPF1H8a6NNTsb201DKG6CSobtIGCaltUxgTZZY5PwA8tErqeNjQxaV18Ui2KUmI8j2H4mmj/WKRi2N4rZPJ2xUINT1n8xHh5JAAAA==' },
    home: { cover: '07-scaled.jpg', cls: 'pc feature', group: 'main', sizes: '(max-width: 860px) 100vw, 53vw',
            aria: 'Casa Marbella, architecture and residential, Marbella, Spain. Open gallery',
            lqip: 'UklGRp4AAABXRUJQVlA4IJIAAADQBACdASocAA8APu1iqU2ppaQiMAgBMB2JQBOmUAnABRkK55KQAvg/hLmD6vDbAADKKE0Qs+RiVkOP15r7jql3caRZVOMRvomH9x3qASDkfg5zvmDDrXPc3eLtRUBUHlwswkR8JmK3TTq2RdW+8VL5Xq4Ejou+Jg69K7Q9lHeCQidY5vQyENOS0vpIuFaK7a4AAA==' },
    images: [
      '04-scaled.jpg', '01-scaled.jpg', '02-1-scaled.jpg', '05-scaled.jpg', '07-scaled.jpg', '09-scaled.jpg',
    ],
  },
  'penthouse-oradea': {
    title: 'Penthouse Oradea', location: 'Oradea, Romania', cat: 'Interior Design',
    folder: 'Renders/Penthouse-Oradea', tags: 'interior residential',
    portfolio: { cover: '21.jpg', cls: 'pc', sizes: '(max-width: 980px) 100vw, (max-width: 1470px) 47vw, 31vw',
                 aria: 'Penthouse Oradea, interior design, Oradea, Romania. Open gallery',
                 lqip: 'UklGRqIAAABXRUJQVlA4IJYAAAAQBACdASocAA8APu1kqk4ppaQiMAgBMB2JYwCsACIFpQmxZlGu+ueBwAD92N3RiqzqjimuqiardGhUXidB2GLO398KmZGEA5s7qOk+G2RznpgJYpIFS3Z8cI/k2pU6j6BvbFfXIsGP67ntZ7Lm1FKDpu0yEHhduMlI5uBkAFtSTfJlU+vJVwhu41uMCGXBJYwqSwcAAAA=' },
    home: { cover: '21.jpg', cls: 'pc half', group: 'main', sizes: '(max-width: 860px) 100vw, 38vw',
            aria: 'Penthouse Oradea, interior design, Oradea, Romania. Open gallery',
            lqip: 'UklGRqIAAABXRUJQVlA4IJYAAAAQBACdASocAA8APu1kqk4ppaQiMAgBMB2JYwCsACIFpQmxZlGu+ueBwAD92N3RiqzqjimuqiardGhUXidB2GLO398KmZGEA5s7qOk+G2RznpgJYpIFS3Z8cI/k2pU6j6BvbFfXIsGP67ntZ7Lm1FKDpu0yEHhduMlI5uBkAFtSTfJlU+vJVwhu41uMCGXBJYwqSwcAAAA=' },
    images: [
      '21.jpg', '20-2.jpg', '15-1.jpg', '10-2.jpg', '27.jpg', '28.jpg',
      '29.jpg', '30-1.jpg', '31-1.jpg', '33.jpg', '35-1.jpg', '36-2.jpg',
      '37.jpg', '38.jpg', '45.jpg', '46.jpg', '51.jpg', '57.jpg',
      '58.jpg', '60.jpg', '64.jpg', '65.jpg', '66.jpg', '68.jpg',
    ],
  },
  'florida-house': {
    // Was 'Architecture' on the home page and 'Architecture · Residential' on the
    // portfolio. Unified to the fuller label, which is what its tags already say.
    title: 'Florida House', location: 'Florida, USA', cat: 'Architecture · Residential',
    folder: 'Renders/Florida-House', tags: 'architecture residential',
    portfolio: { cover: '01.jpg', cls: 'pc', sizes: '(max-width: 980px) 100vw, (max-width: 1470px) 47vw, 31vw',
                 aria: 'Florida House, architecture and residential, Florida, USA. Open gallery',
                 lqip: 'UklGRrIAAABXRUJQVlA4IKYAAADQAwCdASocAA8APu1iqU2ppaQiMAgBMB2JQBOkGQAXC4a7dgxjzwAA/Wkuqx+9olu1x0YaQgjoKcrHO4gqwlfojyjoPfck9EOpyizNdokoAVS23xvi3mBxeBfxqvnJ/iUegI2pedB+1wBckegSDvQXHhf34/7a5PtSnQal0ovAaWJuaIVRQ62fHCH0wOU2PqZ6X1bGAaCl6d1Wl2SqPsqV7QMvZAAA' },
    home: { cover: '01.jpg', cls: 'pc half', group: 'main', sizes: '(max-width: 860px) 100vw, 38vw',
            aria: 'Florida House, architecture, Florida, USA. Open gallery',
            lqip: 'UklGRrIAAABXRUJQVlA4IKYAAADQAwCdASocAA8APu1iqU2ppaQiMAgBMB2JQBOkGQAXC4a7dgxjzwAA/Wkuqx+9olu1x0YaQgjoKcrHO4gqwlfojyjoPfck9EOpyizNdokoAVS23xvi3mBxeBfxqvnJ/iUegI2pedB+1wBckegSDvQXHhf34/7a5PtSnQal0ovAaWJuaIVRQ62fHCH0wOU2PqZ6X1bGAaCl6d1Wl2SqPsqV7QMvZAAA' },
    images: [
      '01.jpg', '02.jpg', '03.jpg', '04.jpg', '05-scaled.jpg', '06.jpg',
      '07.jpg',
    ],
  },
  'casa-corbeanca': {
    title: 'Villa Corbeanca', location: 'Corbeanca, Romania', cat: 'Architecture · Residential',
    folder: 'Renders/Casa-Corebeanca', tags: 'architecture residential',
    portfolio: { cover: '110.jpg', cls: 'pc', sizes: '(max-width: 980px) 100vw, (max-width: 1470px) 47vw, 31vw',
                 aria: 'Villa Corbeanca, architecture and residential, Corbeanca, Romania. Open gallery',
                 lqip: 'UklGRpYAAABXRUJQVlA4IIoAAAAwBACdASocAA8APu1iqk2ppaQiMAgBMB2JQBOj+ABi/LdCU6DgBuJm1wAA/FI69oieqd3oxJTVFDVbt0kTEhTgdHNc+kW0BeDNmSETSO32XzB5PN/AOfYeL0tCMgAXs3Qc+6jSV+NLeOrGw74dQ6K+gtS2nZ8ViaCxTX1WKb98ZPgA3cxURLiaAAA=' },
    home: { cover: '103.jpg', cls: 'pc', group: 'row', sizes: '(max-width: 860px) 100vw, 53vw',
            aria: 'Villa Corbeanca, architecture and residential, Corbeanca, Romania. Open gallery',
            lqip: 'UklGRoIAAABXRUJQVlA4IHYAAADwAwCdASocAA8APu1qrU8ppiQiMAgBMB2JQBOgBEQVh64vuvfBud+wAP3dVaoxyNdA85rlIamGE23/YFqIMKki1yna9BKG32NltAi1CLeDEGGbjm6Tri6bPqxRQlzOTjIM+xc/tY78NRiNHxap6gYquFwEtAAA' },
    images: [
      '103.jpg', '110.jpg', '112.jpg', '113-1.jpg', '120.jpg', '123.jpg',
      '128.jpg', '131.jpg', '133.jpg', '135.jpg',
    ],
  },
  'event-hall-baia-mare': {
    title: 'Grand Event Hall', location: 'Baia Mare, Romania', cat: 'Interior Design · Commercial',
    folder: 'Renders/Event-Hall-Baia-Mare', tags: 'interior commercial',
    portfolio: { cover: '02_2-Photo-scaled.jpg', cls: 'pc', sizes: '(max-width: 980px) 100vw, (max-width: 1470px) 47vw, 31vw',
                 aria: 'Grand Event Hall, interior design and commercial, Baia Mare, Romania. Open gallery',
                 lqip: 'UklGRnQAAABXRUJQVlA4IGgAAAAQBACdASocAA8APu1iqk2ppaQiMAgBMB2JZwDCgCIjHCHMJP2ZfLmkAAD+tZZKZihE+sSOIE+Hi1xw3Q2mWTmRpU7mDKu6pKz+f/nzrk4KZ3sVpqGLsjZrRvreYK6n3UziZuvhrR4gAA==' },
    images: [
      '01_1-Photo-scaled.jpg', '01_20-Foto-scaled.jpg', '02_19-Foto-scaled.jpg', '02_2-Photo-scaled.jpg', '03_11-Foto-scaled.jpg', '04_4-Photo-scaled.jpg',
    ],
  },
  'boutique-mosilor': {
    title: 'Boutique Moșilor', location: 'Bucharest, Romania', cat: 'Architecture · Residential',
    folder: 'Renders/Boutique-Mosilor', tags: 'architecture residential',
    portfolio: { cover: '03-scaled.jpg', cls: 'pc', sizes: '(max-width: 980px) 100vw, (max-width: 1470px) 47vw, 31vw',
                 aria: 'Boutique Moșilor, architecture and residential, Bucharest, Romania. Open gallery',
                 lqip: 'UklGRn4AAABXRUJQVlA4IHIAAABQBACdASocAA8APu1mqk2ppaQiMAgBMB2JYwC7ABuc3s73ax7ayqlFIUoAAP6pPWqEQo3xaPuKuWMvJO4/rVXJy3MCCjSVK2fDIxokRvC1qzkqjBiJl47fAnyRgX3P4MxClRaed/P3HMc8+oSh3qQAAAA=' },
    images: [
      '01-scaled.jpg', '02-scaled.jpg', '03-scaled.jpg', '04-scaled.jpg', '05-scaled.jpg', '06-scaled.jpg',
      '60_1-Photo-scaled.jpg', '60_4-Photo-scaled.jpg',
    ],
  },
  'apartment-in-oradea': {
    title: 'Apartment in Oradea', location: 'Oradea, Romania', cat: 'Interior Design',
    folder: 'Renders/Apartment-in-Oradea', tags: 'interior residential',
    portfolio: { cover: '03-6-scaled.jpg', cls: 'pc', sizes: '(max-width: 980px) 100vw, (max-width: 1470px) 47vw, 31vw',
                 aria: 'Apartment in Oradea, interior design, Oradea, Romania. Open gallery',
                 lqip: 'UklGRp4AAABXRUJQVlA4IJIAAAAQBACdASocAA8APu1kqU2ppaQiMAgBMB2JZwC7ACFf942jBMIjjGtXAAD+rsXZidLzaKqUoeaXTK56DBd4ICUYnb7P6NhwO+FRyNF+lONL7riTDUh1XGHugP+ZC7c2oMasuceF6WT4Ppit+VYLZaGcnzVnsazVeJPS1YoSvA98SpT60OIIh7U7S1/yidzTftgAAA==' },
    home: { cover: '01-6-scaled.jpg', cls: 'pc', group: 'row', sizes: '(max-width: 860px) 100vw, 38vw',
            aria: 'Apartment in Oradea, interior design, Oradea, Romania. Open gallery',
            lqip: 'UklGRoIAAABXRUJQVlA4IHYAAADwAwCdASocAA8APu1oqk6ppiQiMAgBMB2JZwDCgGMjDDDkwxcAuFgAAP77Mkw/aSn6y+Nc9WqCkrY8X17i6AbyQ++Dee8pAM9nMkTBFnfyDD6NlOHsV6BDJNX/NHlMoSKs6ue3yWbyCwl++xhRn/rK+T+oLAAA' },
    images: [
      '01-6-scaled.jpg', '01-7-scaled.jpg', '01-8-scaled.jpg', '02-10-scaled.jpg', '02-8-scaled.jpg', '02-9-scaled.jpg',
      '03-6-scaled.jpg', '03-7-scaled.jpg', '03-8-scaled.jpg', '04-4-scaled.jpg', '04-5-scaled.jpg', '05-5-scaled.jpg',
      '06-4-scaled.jpg', '06-5-scaled.jpg', '06-6-scaled.jpg',
    ],
  },
  'uav-library': {
    title: 'University Library', location: 'Arad, Romania', cat: 'Architecture · Cultural',
    folder: 'Renders/UAV-Library', tags: 'architecture commercial',
    portfolio: { cover: '74.jpg', cls: 'pc', sizes: '(max-width: 980px) 100vw, (max-width: 1470px) 47vw, 31vw',
                 aria: 'University Library, architecture and cultural, Arad, Romania. Open gallery',
                 lqip: 'UklGRowAAABXRUJQVlA4IIAAAAAQBACdASocAA8ALrV2u12jqampiYC0SygFR6IiPfpgy6hUErTIoq7IAAD+9XGNoIkyr1f0lNhniHkEneOwF/p7a2dLnv57nptUXSkLuApzcHx62fSBOaaL/k1xiUfGKyR4OUZ0bA+fXM7emFMsoX3dWYmX4aXNa518aODyt0agAA==' },
    images: [
      '71.jpg', '70-1.jpg', '74.jpg', '75.jpg', '76.jpg', '77.jpg',
      '80.jpg', '81.jpg',
    ],
  },
};

/** Per-image descriptions, written by looking at each render. */
export const ALT = {
  'Casa-Marbella/07-scaled.jpg':
    'A white villa of stacked glazed volumes above a mosaic-tiled infinity pool, with an open-air kitchen and a long dining counter on the stone terrace below.',
  'Casa-Marbella/04-scaled.jpg':
    'The villa at dusk, its glazed rooms glowing warm above a sunken terrace lounge gathered around a lit fire table, with water spilling down the pool wall behind.',
  'Casa-Marbella/01-scaled.jpg':
    'The villa seen head on from the beach, two floors of interiors open behind a glass wall above a mosaic-clad infinity pool whose water falls the full width of the terrace.',
  'Penthouse-Oradea/21.jpg':
    'A rooftop terrace under a pale timber pergola, where a curved stone bar and an outdoor kitchen stand against walls of clipped ivy, lit by slim glass pendants.',
  'Penthouse-Oradea/27.jpg':
    'A living room under a coffered ceiling and a crystal chandelier, where a buttoned cream sofa and a round marble table face a glazed wall onto the terrace, with the dining room and kitchen open beyond.',
  'Florida-House/01.jpg':
    'A two-storey house in white render and dark ribbed timber, reached across a lawn on a broad ribbon of pale stone pavers, with tall palms overhead and cars drawn up under a timber car port.',
  'Casa-Corebeanca/103.jpg':
    'A cream rendered villa under a clay pantile roof, its columned loggia opening onto a wide lawn, with a matching roofed pavilion sheltering the pool terrace beyond.',
  'Casa-Corebeanca/110.jpg':
    'The villa\'s garden front seen across a timber deck, where an arcaded loggia holds a sheltered lounge and round concrete daybeds face the lawn under a cantilevered parasol.',
  'Casa-Corebeanca/120.jpg':
    'Round concrete daybeds and tall glass lanterns on a timber deck beside a plunge pool, under a wide white parasol, with the tiled loggia and its flowering trees beyond.',
  'Apartment-in-Oradea/01-6-scaled.jpg':
    'An entrance hall in pale marble, where a dark bronze panelled door faces a floating stone console and a round olive velvet stool, under a cluster of slim brass pendants.',
  'Apartment-in-Oradea/03-6-scaled.jpg':
    'A living room in white wall panelling, where a long black ribbon fireplace runs below the screen and sage velvet seating faces a marble-clad kitchen wall beyond the dining table.',
  'Event-Hall-Baia-Mare/02_2-Photo-scaled.jpg':
    'An empty ballroom in white marble, its floor banded with black inlay between fluted columns, lit by crystal basket chandeliers hung from a coffered and cove-lit ceiling.',
  'Boutique-Mosilor/03-scaled.jpg':
    'A lit entrance court at night, where the building\'s name stands in gold on a book-matched marble wall above dark stone paving framed by clipped hedges.',
  'UAV-Library/74.jpg':
    'A library workroom lined floor to ceiling with archive binders, where two timber desks face a grey wall of recessed niches and a full-height case of bound volumes stands opposite.',
};
