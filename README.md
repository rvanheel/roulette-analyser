# Roulette Analyser

Vue 3 + TypeScript PWA voor het analyseren van Europese roulette-uitkomsten op de fysieke volgorde van het wiel.

## Modellen

De app vergelijkt drie modellen met dezelfde primaire uitkomst: vijf aaneengesloten fysieke pockets.

### Circular Bias — standaard

Zoekt een persistente fysieke hotspot op het wiel zonder vaste kwadrantgrenzen. Iedere historische uitkomst wordt met een kleine circulaire kernel verdeeld over de pocket zelf en directe buren. Daarna wordt de sterkste aaneengesloten vijf-pocketzone gekozen.

De getoonde kans is bewust geshrinkt richting de neutrale baseline van `5/37 = 13,51%` met een Dirichlet/Laplace-prior. Een kleine steekproef kan daardoor niet direct een extreem hoge modelkans produceren.

### Quadrant Markov — benchmark

Het oorspronkelijke model met vier vaste wielsectoren:

- Q1: `12 35 3 26 0 32 15 19 4`
- Q2: `21 2 25 17 34 6 27 13 36`
- Q3: `11 30 8 23 10 5 24 16 33`
- Q4: `1 20 14 31 9 22 18 29 7 28`

Het leert welke sector historisch op de huidige sector volgde en kiest daarna de sterkste vijf-pocketzone binnen die context.

### Relative Offset — experimenteel

Leert de fysieke afstand op het wiel tussen opeenvolgende uitkomsten. Het model is opgenomen als controle voor eventuele seriële wielstructuur, maar heeft inhoudelijk minder sterke onderbouwing wanneer alleen uitkomstnummers beschikbaar zijn.

## Model Lab en backtest

Alle modellen worden walk-forward getest: bij iedere historische voorspelling worden uitsluitend spins gebruikt die op dat moment al bekend waren. Toekomstige resultaten lekken dus niet terug in het model.

De app toont per model:

- 5-pocket hit-rate;
- `5/37 = 13,51%` random baseline;
- verschil in procentpunten;
- aantal hits en voorspellingen;
- racetrack-alternatief: Voisins, Tiers, Orphelins of Jeu Zéro.

Een hogere historische hit-rate is geen bewijs van een toekomstig voordeel. Op een eerlijk wiel zijn opeenvolgende spins onafhankelijk; een outcome-only model is vooral bruikbaar om te onderzoeken of één specifiek fysiek wiel een stabiele positionele afwijking vertoont.

## Ontwikkelen

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

De PWA gebruikt `vite-plugin-pwa`, automatische service-worker updates en lokale opslag van de ingevoerde reeks en modelkeuze.

## GitHub Pages

Elke push naar `main` wordt via GitHub Actions gebouwd en gepubliceerd naar GitHub Pages.
