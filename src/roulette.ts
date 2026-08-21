export type Sector = 'Q1' | 'Q2' | 'Q3' | 'Q4'
export type RacetrackBetName = 'Voisins du Zéro' | 'Tiers du Cylindre' | 'Orphelins' | 'Jeu Zéro'
export type ModelId = 'circular' | 'quadrant' | 'offset'

export const WHEEL = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26] as const

export const SECTORS: Record<Sector, readonly number[]> = {
  Q1: [12,35,3,26,0,32,15,19,4],
  Q2: [21,2,25,17,34,6,27,13,36],
  Q3: [11,30,8,23,10,5,24,16,33],
  Q4: [1,20,14,31,9,22,18,29,7,28],
}

export const MODEL_META: Record<ModelId, { name: string; shortName: string; description: string; recommended?: boolean }> = {
  circular: {
    name: 'Circular Bias',
    shortName: 'Circular',
    description: 'Zoekt een persistente fysieke hotspot op het echte wiel, zonder kunstmatige kwadrantgrenzen.',
    recommended: true,
  },
  quadrant: {
    name: 'Quadrant Markov',
    shortName: 'Kwadrant',
    description: 'Het oorspronkelijke model: leert welke vaste wielkwadranten historisch op elkaar volgen.',
  },
  offset: {
    name: 'Relative Offset',
    shortName: 'Offset',
    description: 'Experimenteel: leert terugkerende fysieke afstanden tussen opeenvolgende uitkomsten.',
  },
}

export const RACETRACK_BETS: Record<RacetrackBetName, { numbers: readonly number[]; chips: number; shortName: string }> = {
  'Voisins du Zéro': { numbers: [22,18,29,7,28,12,35,3,26,0,32,15,19,4,21,2,25], chips: 9, shortName: 'Voisins' },
  'Tiers du Cylindre': { numbers: [27,13,36,11,30,8,23,10,5,24,16,33], chips: 6, shortName: 'Tiers' },
  'Orphelins': { numbers: [1,20,14,31,9,17,34,6], chips: 5, shortName: 'Orphelins' },
  'Jeu Zéro': { numbers: [12,35,3,26,0,32,15], chips: 4, shortName: 'Zero' },
}

export const RANDOM_FIVE_HIT_RATE = 5 / 37 * 100
const KERNEL: Record<number, number> = { [-2]: .06, [-1]: .24, 0: .40, 1: .24, 2: .06 }
const entries = Object.entries(SECTORS) as [Sector, readonly number[]][]

export const sectorOf = (n: number): Sector => {
  const found = entries.find(([, values]) => values.includes(n))
  if (!found) throw new Error(`${n} is geen geldig Europees roulettenummer.`)
  return found[0]
}

export const parseNumbers = (input: string): number[] => {
  const values = (input.match(/\d+/g) ?? []).map(Number)
  const invalid = values.find(n => n < 0 || n > 36)
  if (invalid !== undefined) throw new Error(`${invalid} is geen geldig Europees roulettenummer.`)
  return values
}

const indexOf = (n: number) => WHEEL.indexOf(n as (typeof WHEEL)[number])
const wrap = (i: number) => (i + WHEEL.length) % WHEEL.length

export const clusterAround = (center: number) => {
  const i = indexOf(center)
  return [-2,-1,0,1,2].map(d => WHEEL[wrap(i + d)])
}

const evidenceLabel = (n: number) => n < 30 ? 'Proefdata' : n < 100 ? 'Zwak' : n < 300 ? 'Voorlopig' : 'Bruikbaar signaal'
const transitionConfidence = (n: number) => n < 3 ? 'Zeer zwak' : n <= 5 ? 'Zwak' : n <= 10 ? 'Voorlopig' : n <= 20 ? 'Redelijk patroon' : 'Sterker patroon'
const posteriorFiveRate = (hits: number, observations: number) => (hits + 5) / (observations + 37) * 100

export interface SectorStat { sector: Sector; count: number; percentage: number }
export interface RacetrackRecommendation {
  name: RacetrackBetName
  shortName: string
  numbers: readonly number[]
  chips: number
  overlap: number[]
  overlapCount: number
  overlapPercentage: number
  reason: string
}

export interface Prediction {
  modelId: ModelId
  modelName: string
  modelDescription: string
  currentNumber: number
  currentSector: Sector
  predictedSector: Sector
  sectorStats: SectorStat[]
  relevantTransitions: number
  confidence: string
  sampleSize: number
  estimatedProbability: number
  baselineProbability: number
  probabilityDelta: number
  center: number
  numbers: number[]
  alternative: RacetrackRecommendation
}

export interface BacktestRow {
  index: number
  actual: number
  actualSector: Sector
  predictedSector: Sector
  center: number
  numbers: number[]
  hit: boolean
  sectorHit: boolean
  relevantTransitions: number
  racetrackName: RacetrackBetName
  racetrackShortName: string
  racetrackNumbers: readonly number[]
  racetrackHit: boolean
  racetrackBaseline: number
}

export interface RacetrackBacktestStat {
  name: RacetrackBetName
  shortName: string
  predictions: number
  hits: number
  hitRate: number
  baseline: number
  delta: number
  relativeLift: number
}

export interface BacktestResult {
  modelId: ModelId
  modelName: string
  predictions: number
  hits: number
  misses: number
  sectorHits: number
  hitRate: number
  sectorHitRate: number
  randomHitRate: number
  expectedRandomHits: number
  percentagePointDelta: number
  relativeLift: number
  racetrackHits: number
  racetrackHitRate: number
  racetrackExpectedHits: number
  racetrackExpectedRate: number
  racetrackDelta: number
  racetrackRelativeLift: number
  racetrackStats: RacetrackBacktestStat[]
  rows: BacktestRow[]
}

export interface ModelComparison {
  modelId: ModelId
  name: string
  shortName: string
  description: string
  recommended: boolean
  predictions: number
  hits: number
  hitRate: number
  baseline: number
  delta: number
  relativeLift: number
}

function quadrantContext(history: number[]) {
  const currentSector = sectorOf(history.at(-1)!)
  const successors: number[] = []
  for (let i = 0; i < history.length - 1; i++) {
    if (sectorOf(history[i]) === currentSector) successors.push(history[i + 1])
  }
  const counts: Record<Sector, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
  successors.forEach(n => counts[sectorOf(n)]++)
  const relevantTransitions = successors.length
  const sectorStats = (Object.entries(counts) as [Sector, number][])
    .map(([sector,count]) => ({ sector, count, percentage: relevantTransitions ? count / relevantTransitions * 100 : 0 }))
    .sort((a,b) => b.count-a.count || a.sector.localeCompare(b.sector))
  return { currentSector, successors, counts, relevantTransitions, sectorStats }
}

function recommendRacetrackBet(cluster: number[], center: number): RacetrackRecommendation {
  const zero = RACETRACK_BETS['Jeu Zéro']
  const zeroOverlap = cluster.filter(n => zero.numbers.includes(n))
  if (zeroOverlap.length >= 3 && zero.numbers.includes(center)) {
    return {
      name: 'Jeu Zéro', shortName: zero.shortName, numbers: zero.numbers, chips: zero.chips,
      overlap: zeroOverlap, overlapCount: zeroOverlap.length,
      overlapPercentage: zeroOverlap.length / cluster.length * 100,
      reason: `${zeroOverlap.length} van de 5 voorspelde pockets liggen in het compacte gebied rond 0.`,
    }
  }
  const names: RacetrackBetName[] = ['Voisins du Zéro', 'Tiers du Cylindre', 'Orphelins']
  const ranked = names.map(name => {
    const bet = RACETRACK_BETS[name]
    const overlap = cluster.filter(n => bet.numbers.includes(n))
    const centerBonus = bet.numbers.includes(center) ? .25 : 0
    const selectivityBonus = 1 / bet.numbers.length
    return { name, bet, overlap, score: overlap.length + centerBonus + selectivityBonus }
  }).sort((a,b) => b.score-a.score)
  const best = ranked[0]
  return {
    name: best.name,
    shortName: best.bet.shortName,
    numbers: best.bet.numbers,
    chips: best.bet.chips,
    overlap: best.overlap,
    overlapCount: best.overlap.length,
    overlapPercentage: best.overlap.length / cluster.length * 100,
    reason: `${best.overlap.length} van de 5 voorspelde pockets vallen binnen ${best.bet.shortName}.`,
  }
}

function makePrediction(history: number[], modelId: ModelId, center: number, numbers: number[], estimatedProbability: number, confidence: string, sampleSize: number, predictedSector?: Sector): Prediction {
  const context = quadrantContext(history)
  const meta = MODEL_META[modelId]
  return {
    modelId,
    modelName: meta.name,
    modelDescription: meta.description,
    currentNumber: history.at(-1)!,
    currentSector: context.currentSector,
    predictedSector: predictedSector ?? sectorOf(center),
    sectorStats: context.sectorStats,
    relevantTransitions: context.relevantTransitions,
    confidence,
    sampleSize,
    estimatedProbability,
    baselineProbability: RANDOM_FIVE_HIT_RATE,
    probabilityDelta: estimatedProbability - RANDOM_FIVE_HIT_RATE,
    center,
    numbers,
    alternative: recommendRacetrackBet(numbers, center),
  }
}

function circularPrediction(history: number[]): Prediction {
  const density = Array(WHEEL.length).fill(0) as number[]
  history.forEach(number => {
    const i = indexOf(number)
    Object.entries(KERNEL).forEach(([offset, weight]) => {
      density[wrap(i + Number(offset))] += weight
    })
  })
  const ranked = WHEEL.map(center => {
    const zone = clusterAround(center)
    const score = zone.reduce((sum, n) => sum + density[indexOf(n)], 0)
    const hits = history.filter(n => zone.includes(n)).length
    return { center, zone, score, hits }
  }).sort((a,b) => b.score-a.score || b.hits-a.hits || indexOf(a.center)-indexOf(b.center))
  const best = ranked[0]
  const estimated = posteriorFiveRate(best.hits, history.length)
  return makePrediction(history, 'circular', best.center, best.zone, estimated, evidenceLabel(history.length), history.length)
}

function quadrantPrediction(history: number[]): Prediction {
  const context = quadrantContext(history)
  let predictedSector: Sector
  if (context.relevantTransitions) {
    predictedSector = (Object.entries(context.counts) as [Sector, number][])
      .sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))[0][0]
  } else {
    const overall: Record<Sector, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
    history.forEach(n => overall[sectorOf(n)]++)
    predictedSector = (Object.entries(overall) as [Sector, number][]).sort((a,b) => b[1]-a[1])[0][0]
  }
  const source = context.successors.length ? context.successors : history.slice(0,-1)
  const target = source.filter(n => sectorOf(n) === predictedSector)
  const candidates = WHEEL.map(center => {
    const zone = clusterAround(center)
    const targetHits = target.filter(n => zone.includes(n)).length
    const allHits = source.filter(n => zone.includes(n)).length
    const exact = target.filter(n => n === center).length
    const bonus = sectorOf(center) === predictedSector ? .25 : 0
    return { center, zone, score: targetHits * 10 + allHits * 2 + exact + bonus, hits: targetHits }
  }).sort((a,b) => b.score-a.score || b.hits-a.hits || indexOf(a.center)-indexOf(b.center))
  const best = candidates[0]
  const estimated = posteriorFiveRate(best.hits, Math.max(target.length, 0))
  return makePrediction(history, 'quadrant', best.center, best.zone, estimated, transitionConfidence(context.relevantTransitions), context.relevantTransitions, predictedSector)
}

function offsetPrediction(history: number[]): Prediction {
  const offsets: number[] = []
  for (let i = 0; i < history.length - 1; i++) offsets.push(wrap(indexOf(history[i + 1]) - indexOf(history[i])))
  const density = Array(WHEEL.length).fill(0) as number[]
  offsets.forEach(offset => {
    Object.entries(KERNEL).forEach(([delta, weight]) => {
      density[wrap(offset + Number(delta))] += weight
    })
  })
  const currentIndex = indexOf(history.at(-1)!)
  const ranked = WHEEL.map((_, offsetCenter) => {
    const offsetWindow = [-2,-1,0,1,2].map(d => wrap(offsetCenter + d))
    const score = offsetWindow.reduce((sum, offset) => sum + density[offset], 0)
    const hits = offsets.filter(offset => offsetWindow.includes(offset)).length
    const center = WHEEL[wrap(currentIndex + offsetCenter)]
    const zone = offsetWindow.map(offset => WHEEL[wrap(currentIndex + offset)])
    return { center, zone, score, hits }
  }).sort((a,b) => b.score-a.score || b.hits-a.hits || indexOf(a.center)-indexOf(b.center))
  const best = ranked[0]
  const estimated = posteriorFiveRate(best.hits, offsets.length)
  return makePrediction(history, 'offset', best.center, best.zone, estimated, evidenceLabel(offsets.length), offsets.length)
}

export function analyse(history: number[], modelId: ModelId = 'circular'): Prediction | null {
  if (history.length < 2) return null
  if (modelId === 'quadrant') return quadrantPrediction(history)
  if (modelId === 'offset') return offsetPrediction(history)
  return circularPrediction(history)
}

export function backtest(history: number[], minimumTrainingSpins = 5, modelId: ModelId = 'circular'): BacktestResult {
  const rows: BacktestRow[] = []
  for (let targetIndex = minimumTrainingSpins; targetIndex < history.length; targetIndex++) {
    const trainingHistory = history.slice(0, targetIndex)
    const prediction = analyse(trainingHistory, modelId)
    if (!prediction) continue
    const actual = history[targetIndex]
    const actualSector = sectorOf(actual)
    const alt = prediction.alternative
    rows.push({
      index: targetIndex,
      actual,
      actualSector,
      predictedSector: prediction.predictedSector,
      center: prediction.center,
      numbers: prediction.numbers,
      hit: prediction.numbers.includes(actual),
      sectorHit: actualSector === prediction.predictedSector,
      relevantTransitions: prediction.relevantTransitions,
      racetrackName: alt.name,
      racetrackShortName: alt.shortName,
      racetrackNumbers: alt.numbers,
      racetrackHit: alt.numbers.includes(actual),
      racetrackBaseline: alt.numbers.length / 37 * 100,
    })
  }
  const predictions = rows.length
  const hits = rows.filter(row => row.hit).length
  const sectorHits = rows.filter(row => row.sectorHit).length
  const hitRate = predictions ? hits / predictions * 100 : 0
  const sectorHitRate = predictions ? sectorHits / predictions * 100 : 0
  const expectedRandomHits = predictions * 5 / 37
  const percentagePointDelta = hitRate - RANDOM_FIVE_HIT_RATE
  const relativeLift = RANDOM_FIVE_HIT_RATE ? hitRate / RANDOM_FIVE_HIT_RATE : 0
  const racetrackHits = rows.filter(row => row.racetrackHit).length
  const racetrackHitRate = predictions ? racetrackHits / predictions * 100 : 0
  const racetrackExpectedHits = rows.reduce((sum, row) => sum + row.racetrackNumbers.length / 37, 0)
  const racetrackExpectedRate = predictions ? racetrackExpectedHits / predictions * 100 : 0
  const racetrackDelta = racetrackHitRate - racetrackExpectedRate
  const racetrackRelativeLift = racetrackExpectedRate ? racetrackHitRate / racetrackExpectedRate : 0
  const names = Object.keys(RACETRACK_BETS) as RacetrackBetName[]
  const racetrackStats = names.map(name => {
    const subset = rows.filter(row => row.racetrackName === name)
    const bet = RACETRACK_BETS[name]
    const count = subset.length
    const betHits = subset.filter(row => row.racetrackHit).length
    const rate = count ? betHits / count * 100 : 0
    const baseline = bet.numbers.length / 37 * 100
    return { name, shortName: bet.shortName, predictions: count, hits: betHits, hitRate: rate, baseline, delta: rate-baseline, relativeLift: baseline ? rate/baseline : 0 }
  })
  return {
    modelId,
    modelName: MODEL_META[modelId].name,
    predictions,
    hits,
    misses: predictions-hits,
    sectorHits,
    hitRate,
    sectorHitRate,
    randomHitRate: RANDOM_FIVE_HIT_RATE,
    expectedRandomHits,
    percentagePointDelta,
    relativeLift,
    racetrackHits,
    racetrackHitRate,
    racetrackExpectedHits,
    racetrackExpectedRate,
    racetrackDelta,
    racetrackRelativeLift,
    racetrackStats,
    rows,
  }
}

export function compareModels(history: number[], minimumTrainingSpins = 5): ModelComparison[] {
  const modelIds: ModelId[] = ['circular', 'quadrant', 'offset']
  return modelIds.map(modelId => {
    const result = backtest(history, minimumTrainingSpins, modelId)
    const meta = MODEL_META[modelId]
    return {
      modelId,
      name: meta.name,
      shortName: meta.shortName,
      description: meta.description,
      recommended: !!meta.recommended,
      predictions: result.predictions,
      hits: result.hits,
      hitRate: result.hitRate,
      baseline: RANDOM_FIVE_HIT_RATE,
      delta: result.percentagePointDelta,
      relativeLift: result.relativeLift,
    }
  }).sort((a,b) => b.hitRate-a.hitRate)
}

export const rouletteColor = (n: number): 'green' | 'red' | 'black' => {
  if (n === 0) return 'green'
  return new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]).has(n) ? 'red' : 'black'
}
