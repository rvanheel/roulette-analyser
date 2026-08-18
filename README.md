# Roulette Analyser

Vue 3 + TypeScript PWA voor het analyseren van een Europese roulette-reeks op basis van fysieke wielsectoren en overgangspatronen.

## Model

Het Europese wiel wordt in vier aaneengesloten sectoren verdeeld, met `0` centraal in Q1:

- Q1: `12 35 3 26 0 32 15 19 4`
- Q2: `21 2 25 17 34 6 27 13 36`
- Q3: `11 30 8 23 10 5 24 16 33`
- Q4: `1 20 14 31 9 22 18 29 7 28`

Voor de laatste sector wordt gekeken welke sectoren historisch direct daarna voorkwamen. Alle spins tellen even zwaar. Vervolgens worden fysieke clusters van vijf aaneengesloten pockets gescoord en wordt het beste cluster getoond als twee buren links + centrum + twee buren rechts.

> Dit project detecteert patronen in ingevoerde historische data. Roulette-spins zijn bij een eerlijk wiel onafhankelijke gebeurtenissen; de analyse biedt geen gegarandeerd voorspellend voordeel.

## Ontwikkelen

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

De PWA gebruikt `vite-plugin-pwa` met automatische service-worker updates en slaat de ingevoerde reeks lokaal op in de browser.
