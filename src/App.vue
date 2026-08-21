<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MODEL_META, analyse, backtest, compareModels, parseNumbers, rouletteColor, sectorOf, type ModelId, type Sector } from './roulette'

const STORAGE_KEY = 'roulette-analyser-history-v1'
const MODEL_KEY = 'roulette-analyser-model-v1'
const defaultHistory = [13,29,30,1,18,3,16,32,22,13,28,8,9,34,28,1]
const stored = localStorage.getItem(STORAGE_KEY)
const storedModel = localStorage.getItem(MODEL_KEY) as ModelId | null
const history = ref<number[]>(stored ? JSON.parse(stored) : defaultHistory)
const selectedModel = ref<ModelId>(storedModel && MODEL_META[storedModel] ? storedModel : 'circular')
const bulkInput = ref(history.value.join('-'))
const nextNumber = ref('')
const error = ref('')
const prediction = computed(() => analyse(history.value, selectedModel.value))
const backtestResult = computed(() => backtest(history.value, 5, selectedModel.value))
const modelComparison = computed(() => compareModels(history.value, 5))
const recentBacktestRows = computed(() => backtestResult.value.rows.slice(-12).reverse())
const modelIds: ModelId[] = ['circular', 'quadrant', 'offset']

watch(history, value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })
watch(selectedModel, value => localStorage.setItem(MODEL_KEY, value))

const sectorClass = (sector: Sector) => `sector-${sector.toLowerCase()}`
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}`

function applyHistory() {
  try {
    const parsed = parseNumbers(bulkInput.value)
    if (parsed.length < 2) throw new Error('Voer minimaal twee historische nummers in.')
    history.value = parsed
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ongeldige invoer.'
  }
}

function addNumber() {
  try {
    const parsed = parseNumbers(nextNumber.value)
    if (parsed.length !== 1) throw new Error('Voer precies één nummer tussen 0 en 36 in.')
    history.value.push(parsed[0])
    bulkInput.value = history.value.join('-')
    nextNumber.value = ''
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ongeldige invoer.'
  }
}

function undo() {
  if (history.value.length <= 2) return
  history.value.pop()
  bulkInput.value = history.value.join('-')
}

function reset() {
  history.value = []
  bulkInput.value = ''
  nextNumber.value = ''
  error.value = ''
}
</script>

<template>
  <main class="shell">
    <header class="hero">
      <div>
        <p class="eyebrow">EUROPEES ROULETTEWIEL · 37 VAKKEN</p>
        <h1>Roulette Analyser</h1>
        <p class="sub">Vergelijk fysieke wielbias met het oorspronkelijke kwadrantmodel en een experimenteel offsetmodel.</p>
      </div>
      <div class="status-pill">{{ history.length }} spins</div>
    </header>

    <section class="model-switch-wrap card">
      <div class="card-title-row compact-row">
        <div><p class="label">Analysemodel</p><h2>Kies de methode</h2></div>
        <span class="muted">Circular is standaard</span>
      </div>
      <div class="model-switch">
        <button
          v-for="modelId in modelIds"
          :key="modelId"
          class="model-button"
          :class="{ active: selectedModel === modelId }"
          @click="selectedModel = modelId"
        >
          <span>{{ MODEL_META[modelId].shortName }}</span>
          <small>{{ modelId === 'circular' ? 'AANBEVOLEN' : modelId === 'offset' ? 'EXPERIMENTEEL' : 'ORIGINEEL' }}</small>
        </button>
      </div>
      <p class="model-description">{{ MODEL_META[selectedModel].description }}</p>
    </section>

    <section class="grid">
      <article class="card">
        <div class="card-title-row">
          <div><p class="label">Historische reeks</p><h2>Startdata</h2></div>
          <button class="ghost danger" @click="reset">Wis alles</button>
        </div>
        <textarea v-model="bulkInput" rows="4" placeholder="13-29-30-1-18-3..." />
        <p class="hint">Gebruik streepjes, komma's of spaties. Alleen 0 t/m 36.</p>
        <button class="primary full" @click="applyHistory">Analyseer reeks</button>
        <div class="divider" />
        <p class="label">Nieuwe spin</p>
        <form class="new-spin" @submit.prevent="addNumber">
          <input v-model="nextNumber" inputmode="numeric" maxlength="2" placeholder="0-36" />
          <button class="primary" type="submit">Toevoegen</button>
        </form>
        <button class="ghost full" :disabled="history.length <= 2" @click="undo">Laatste ongedaan maken</button>
        <p v-if="error" class="error">{{ error }}</p>
      </article>

      <article v-if="prediction" class="card prediction-card">
        <div class="prediction-heading">
          <div><p class="label">Volgende 5-zone</p><h2>{{ prediction.modelName }}</h2></div>
          <span class="model-badge">{{ prediction.confidence }}</span>
        </div>

        <div class="prediction-top">
          <div class="last-block">
            <span class="muted">Laatste</span>
            <strong class="last-number" :class="`num-${rouletteColor(prediction.currentNumber)}`">{{ prediction.currentNumber }}</strong>
            <span class="sector-badge" :class="sectorClass(prediction.currentSector)">{{ prediction.currentSector }}</span>
          </div>
          <div class="arrow">→</div>
          <div class="pred-sector"><span class="muted">Zone rond</span><strong>{{ prediction.center }}</strong></div>
        </div>

        <div class="numbers">
          <div v-for="number in prediction.numbers" :key="number" class="number-ball" :class="[`num-${rouletteColor(number)}`, { center: number === prediction.center }]">
            <span>{{ number }}</span><small v-if="number === prediction.center">centrum</small>
          </div>
        </div>

        <div class="probability-strip">
          <div>
            <span class="muted">Modelschatting*</span>
            <strong>{{ prediction.estimatedProbability.toFixed(1) }}%</strong>
          </div>
          <div>
            <span class="muted">Random baseline</span>
            <strong>{{ prediction.baselineProbability.toFixed(2) }}%</strong>
          </div>
          <div :class="prediction.probabilityDelta >= 0 ? 'positive-text' : 'negative-text'">
            <span class="muted">Verschil</span>
            <strong>{{ signed(prediction.probabilityDelta) }} pp</strong>
          </div>
        </div>
        <p class="estimate-note">*Bayesiaans geshrinkte schatting uit {{ prediction.sampleSize }} relevante observaties; geen gegarandeerde kans voor de volgende spin.</p>

        <div class="racetrack-alternative">
          <div class="alternative-head">
            <div><span class="muted">Alternatief op racetrack</span><strong>{{ prediction.alternative.name }}</strong></div>
            <span class="alt-chip-count">{{ prediction.alternative.chips }} fiches</span>
          </div>
          <p>{{ prediction.alternative.reason }}</p>
          <div class="alternative-numbers">
            <span v-for="n in prediction.alternative.numbers" :key="n" :class="[{ overlap: prediction.alternative.overlap.includes(n) }, `alt-${rouletteColor(n)}`]">{{ n }}</span>
          </div>
          <small>{{ prediction.alternative.overlapCount }}/5 overlap · {{ prediction.alternative.overlapPercentage.toFixed(0) }}%</small>
        </div>
      </article>
    </section>

    <section v-if="modelComparison.length" class="card model-lab">
      <div class="card-title-row">
        <div><p class="label">Model Lab</p><h2>Walk-forward vergelijking</h2></div>
        <span class="muted">zelfde 5/37 baseline · geen future leakage</span>
      </div>
      <div class="model-grid">
        <button
          v-for="model in modelComparison"
          :key="model.modelId"
          class="model-stat-card"
          :class="{ active: selectedModel === model.modelId }"
          @click="selectedModel = model.modelId"
        >
          <div class="model-stat-head">
            <strong>{{ model.shortName }}</strong>
            <span v-if="model.recommended">research-keuze</span>
          </div>
          <div class="model-rate">{{ model.hitRate.toFixed(1) }}%</div>
          <small>{{ model.hits }}/{{ model.predictions }} hits</small>
          <div class="bar"><i :style="{ width: `${Math.min(model.hitRate, 100)}%` }" /></div>
          <div class="model-delta" :class="model.delta >= 0 ? 'hit' : 'miss'">{{ signed(model.delta) }} pp vs 13,51%</div>
        </button>
      </div>
      <p class="disclaimer">De hoogste score op een korte eigen reeks is niet automatisch het beste model. Circular Bias is standaard omdat een persistente fysieke wielafwijking inhoudelijk plausibeler is dan seriële afhankelijkheid tussen onafhankelijke spins.</p>
    </section>

    <section v-if="prediction" class="card stats-card">
      <div class="card-title-row"><div><p class="label">Kwadrant benchmark</p><h2>Overgangen na {{ prediction.currentSector }}</h2></div><span class="muted">blijft zichtbaar als controle</span></div>
      <div class="sector-stats">
        <div v-for="stat in prediction.sectorStats" :key="stat.sector" class="sector-stat">
          <div class="stat-head"><span class="sector-badge" :class="sectorClass(stat.sector)">{{ stat.sector }}</span><strong>{{ stat.percentage.toFixed(1) }}%</strong></div>
          <div class="bar"><i :style="{ width: `${stat.percentage}%` }" /></div>
          <small>{{ stat.count }}× waargenomen</small>
        </div>
      </div>
    </section>

    <section v-if="backtestResult.predictions" class="card backtest-card">
      <div class="card-title-row">
        <div><p class="label">Actief model backtest</p><h2>{{ backtestResult.modelName }}</h2></div>
        <span class="muted">vanaf 5 trainingsspins</span>
      </div>

      <div class="backtest-kpis">
        <div class="kpi hero-kpi"><span class="muted">5-getallen hit-rate</span><strong>{{ backtestResult.hitRate.toFixed(1) }}%</strong><small>{{ backtestResult.hits }} / {{ backtestResult.predictions }}</small></div>
        <div class="kpi"><span class="muted">Random 5 baseline</span><strong>{{ backtestResult.randomHitRate.toFixed(2) }}%</strong><small>5 / 37</small></div>
        <div class="kpi" :class="backtestResult.percentagePointDelta >= 0 ? 'positive' : 'negative'"><span class="muted">Verschil</span><strong>{{ signed(backtestResult.percentagePointDelta) }} pp</strong><small>{{ backtestResult.relativeLift.toFixed(2) }}× baseline</small></div>
        <div class="kpi"><span class="muted">Zone-sector geraakt</span><strong>{{ backtestResult.sectorHitRate.toFixed(1) }}%</strong><small>{{ backtestResult.sectorHits }} van {{ backtestResult.predictions }}</small></div>
      </div>

      <div class="baseline-track">
        <div class="baseline-labels"><span>Random {{ backtestResult.randomHitRate.toFixed(2) }}%</span><span>{{ backtestResult.modelName }} {{ backtestResult.hitRate.toFixed(1) }}%</span></div>
        <div class="baseline-bar"><i class="random-mark" :style="{ left: `${Math.min(backtestResult.randomHitRate, 100)}%` }" /><b :style="{ width: `${Math.min(backtestResult.hitRate, 100)}%` }" /></div>
        <p class="hint">Bij {{ backtestResult.predictions }} voorspellingen verwacht willekeurig kiezen gemiddeld {{ backtestResult.expectedRandomHits.toFixed(1) }} hits.</p>
      </div>

      <div class="racetrack-backtest">
        <div class="card-title-row compact-row"><div><p class="label">Racetrack backtest</p><h2>Alternatief advies</h2></div><span class="muted">baseline per groep gewogen</span></div>
        <div class="backtest-kpis racetrack-kpis">
          <div class="kpi hero-kpi"><span class="muted">Racetrack hit-rate</span><strong>{{ backtestResult.racetrackHitRate.toFixed(1) }}%</strong><small>{{ backtestResult.racetrackHits }} / {{ backtestResult.predictions }}</small></div>
          <div class="kpi"><span class="muted">Gewogen baseline</span><strong>{{ backtestResult.racetrackExpectedRate.toFixed(1) }}%</strong><small>{{ backtestResult.racetrackExpectedHits.toFixed(1) }} verwacht</small></div>
          <div class="kpi" :class="backtestResult.racetrackDelta >= 0 ? 'positive' : 'negative'"><span class="muted">Verschil</span><strong>{{ signed(backtestResult.racetrackDelta) }} pp</strong><small>{{ backtestResult.racetrackRelativeLift.toFixed(2) }}× baseline</small></div>
        </div>
        <div class="racetrack-stat-grid">
          <div v-for="stat in backtestResult.racetrackStats" :key="stat.name" class="racetrack-stat" :class="{ inactive: !stat.predictions }">
            <div><strong>{{ stat.shortName }}</strong><span>{{ stat.predictions }}×</span></div>
            <div class="racetrack-rates"><b>{{ stat.hitRate.toFixed(1) }}%</b><small>baseline {{ stat.baseline.toFixed(1) }}%</small></div>
            <div class="bar"><i :style="{ width: `${Math.min(stat.hitRate, 100)}%` }" /></div>
            <small>{{ stat.hits }} hits · {{ signed(stat.delta) }} pp</small>
          </div>
        </div>
      </div>

      <div class="backtest-table-wrap">
        <table class="backtest-table">
          <thead><tr><th>Werkelijk</th><th>Zone</th><th>5-zone</th><th>5-resultaat</th><th>Racetrack</th><th>Alt.</th></tr></thead>
          <tbody>
            <tr v-for="row in recentBacktestRows" :key="row.index">
              <td><span class="mini-ball table-ball" :class="`num-${rouletteColor(row.actual)}`">{{ row.actual }}</span> <small>{{ row.actualSector }}</small></td>
              <td><span class="sector-badge" :class="sectorClass(row.predictedSector)">{{ row.predictedSector }}</span></td>
              <td class="zone-cell"><span v-for="n in row.numbers" :key="n" :class="{ 'zone-center': n === row.center }">{{ n }}</span></td>
              <td><strong :class="row.hit ? 'hit' : 'miss'">{{ row.hit ? 'HIT' : 'MISS' }}</strong></td>
              <td><strong>{{ row.racetrackShortName }}</strong><br><small>{{ row.racetrackBaseline.toFixed(1) }}% baseline</small></td>
              <td><strong :class="row.racetrackHit ? 'hit' : 'miss'">{{ row.racetrackHit ? 'HIT' : 'MISS' }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="disclaimer">Een historische voorsprong bewijst geen voorspelbaar roulettevoordeel. Gebruik vooral langere reeksen van hetzelfde fysieke wiel en let op regimewissels, tafelwissels of onderhoud.</p>
    </section>

    <section v-if="history.length" class="card history-card">
      <div class="card-title-row"><div><p class="label">Reeks</p><h2>Recente spins</h2></div><span class="muted">nieuwste rechts</span></div>
      <div class="history-strip">
        <div v-for="(number,index) in history" :key="`${index}-${number}`" class="history-item">
          <span class="mini-ball" :class="`num-${rouletteColor(number)}`">{{ number }}</span>
          <small>{{ sectorOf(number) }}</small>
        </div>
      </div>
    </section>
  </main>
</template>
