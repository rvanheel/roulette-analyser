export type Sector = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export const WHEEL = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26] as const

export const SECTORS: Record<Sector, readonly number[]> = {
  Q1: [12,35,3,26,0,32,15,19,4],
  Q2: [21,2,25,17,34,6,27,13,36],
  Q3: [11,30,8,23,10,5,24,16,33],
  Q4: [1,20,14,31,9,22,18,29,7,28],
}

export const RANDOM_FIVE_HIT_RATE = 5 / 37 * 100

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

export const clusterAround = (center: number) => {
  const i = indexOf(center)
  return [-2,-1,0,1,2].map(d => WHEEL[(i + d + WHEEL.length) % WHEEL.length])
}

const confidence = (n: number) => n < 3 ? 'Zeer zwak' : n <= 5 ? 'Zwak' : n <= 10 ? 'Voorlopig' : n <= 20 ? 'Redelijk patroon' : 'Sterker patroon'

export interface SectorStat { sector: Sector; count: number; percentage: number }

export interface Prediction {
  currentNumber: number
  currentSector: Sector
  predictedSector: Sector
  sectorStats: SectorStat[]
  relevantTransitions: number
  confidence: string
  center: number
  numbers: number[]
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
}

export interface BacktestResult {
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
  rows: BacktestRow[]
}

export function analyse(history: number[]): Prediction | null {
  if (history.length < 2) return null
  const currentNumber = history.at(-1)!
  const currentSector = sectorOf(currentNumber)
  const successors: number[] = []

  for (let i = 0; i < history.length - 1; i++) {
    if (sectorOf(history[i]) === currentSector) successors.push(history[i + 1])
  }

  const counts: Record<Sector, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
  successors.forEach(n => counts[sectorOf(n)]++)
  const relevantTransitions = successors.length

  let predictedSector: Sector
  if (relevantTransitions) {
    predictedSector = (Object.entries(counts) as [Sector, number][]).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))[0][0]
  } else {
    const overall: Record<Sector, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
    history.forEach(n => overall[sectorOf(n)]++)
    predictedSector = (Object.entries(overall) as [Sector, number][]).sort((a,b) => b[1]-a[1])[0][0]
  }

  const sectorStats = (Object.entries(counts) as [Sector, number][])
    .map(([sector,count]) => ({ sector, count, percentage: relevantTransitions ? count / relevantTransitions * 100 : 0 }))
    .sort((a,b) => b.count-a.count || a.sector.localeCompare(b.sector))

  const source = successors.length ? successors : history.slice(0,-1)
  const target = source.filter(n => sectorOf(n) === predictedSector)
  const candidates = WHEEL.map(center => {
    const cluster = clusterAround(center)
    const targetHits = target.filter(n => cluster.includes(n)).length
    const allHits = source.filter(n => cluster.includes(n)).length
    const exact = target.filter(n => n === center).length
    const bonus = sectorOf(center) === predictedSector ? .25 : 0
    return { center, cluster, score: targetHits * 10 + allHits * 2 + exact + bonus, targetHits, allHits }
  }).sort((a,b) => b.score-a.score || b.targetHits-a.targetHits || b.allHits-a.allHits || indexOf(a.center)-indexOf(b.center))

  return {
    currentNumber,
    currentSector,
    predictedSector,
    sectorStats,
    relevantTransitions,
    confidence: confidence(relevantTransitions),
    center: candidates[0].center,
    numbers: candidates[0].cluster,
  }
}

export function backtest(history: number[], minimumTrainingSpins = 5): BacktestResult {
  const rows: BacktestRow[] = []

  for (let targetIndex = minimumTrainingSpins; targetIndex < history.length; targetIndex++) {
    const trainingHistory = history.slice(0, targetIndex)
    const prediction = analyse(trainingHistory)
    if (!prediction) continue

    const actual = history[targetIndex]
    const actualSector = sectorOf(actual)
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

  return {
    predictions,
    hits,
    misses: predictions - hits,
    sectorHits,
    hitRate,
    sectorHitRate,
    randomHitRate: RANDOM_FIVE_HIT_RATE,
    expectedRandomHits,
    percentagePointDelta,
    relativeLift,
    rows,
  }
}

export const rouletteColor = (n: number): 'green' | 'red' | 'black' => {
  if (n === 0) return 'green'
  return new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]).has(n) ? 'red' : 'black'
}
