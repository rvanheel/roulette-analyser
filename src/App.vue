<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { analyse, backtest, parseNumbers, rouletteColor, sectorOf, type Sector } from './roulette'

const STORAGE_KEY = 'roulette-analyser-history-v1'
const defaultHistory = [13,29,30,1,18,3,16,32,22,13,28,8,9,34,28,1]
const stored = localStorage.getItem(STORAGE_KEY)
const history = ref<number[]>(stored ? JSON.parse(stored) : defaultHistory)
const bulkInput = ref(history.value.join('-'))
const nextNumber = ref('')
const error = ref('')
const prediction = computed(() => analyse(history.value))
const backtestResult = computed(() => backtest(history.value, 5))
const recentBacktestRows = computed(() => backtestResult.value.rows.slice(-12).reverse())

watch(history, value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })

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
        <p class="sub">Markov-overgangen per fysieke wielsector, daarna selectie van het sterkste vijf-vaks cluster.</p>
      </div>
      <div class="status-pill">{{ history.length }} spins</div>
    </header>

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
        <p class="label">Volgende zone</p>
        <div class="prediction-top">
          <div class="last-block">
            <span class="muted">Laatste</span>
            <strong class="last-number" :class="`num-${rouletteColor(prediction.currentNumber)}`">{{ prediction.currentNumber }}</strong>
            <span class="sector-badge" :class="sectorClass(prediction.currentSector)">{{ prediction.currentSector }}</span>
          </div>
          <div class="arrow">→</div>
          <div class="pred-sector"><span class="muted">Voorkeur</span><strong>{{ prediction.predictedSector }}</strong></div>
        </div>

        <div class="numbers">
          <div v-for="number in prediction.numbers" :key="number" class="number-ball" :class="[`num-${rouletteColor(number)}`, { center: number === prediction.center }]">
            <span>{{ number }}</span><small v-if="number === prediction.center">centrum</small>
          </div>
        </div>

        <div class="confidence">
          <div><span class="muted">Confidence</span><strong>{{ prediction.confidence }}</strong></div>
          <div><span class="muted">Relevante overgangen</span><strong>{{ prediction.relevantTransitions }}</strong></div>
        </div>
        <p class="disclaimer">Dit visualiseert patronen in je ingevoerde reeks; het maakt onafhankelijke roulette-spins niet voorspelbaar.</p>
      </article>
    </section>

    <section v-if="prediction" class="card stats-card">
      <div class="card-title-row"><div><p class="label">Overgangsmatrix</p><h2>Na {{ prediction.currentSector }}</h2></div><span class="muted">alle spins tellen even zwaar</span></div>
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
        <div><p class="label">Walk-forward backtest</p><h2>Prestaties op historische spins</h2></div>
        <span class="muted">vanaf 5 trainingsspins · geen future leakage</span>
      </div>

      <div class="backtest-kpis">
        <div class="kpi hero-kpi">
          <span class="muted">5-getallen hit-rate</span>
          <strong>{{ backtestResult.hitRate.toFixed(1) }}%</strong>
          <small>{{ backtestResult.hits }} hits / {{ backtestResult.predictions }} voorspellingen</small>
        </div>
        <div class="kpi">
          <span class="muted">Willekeurige 5 baseline</span>
          <strong>{{ backtestResult.randomHitRate.toFixed(2) }}%</strong>
          <small>5 / 37 per spin</small>
        </div>
        <div class="kpi" :class="backtestResult.percentagePointDelta >= 0 ? 'positive' : 'negative'">
          <span class="muted">Verschil</span>
          <strong>{{ signed(backtestResult.percentagePointDelta) }} pp</strong>
          <small>{{ backtestResult.relativeLift.toFixed(2) }}× baseline</small>
        </div>
        <div class="kpi">
          <span class="muted">Sector geraakt</span>
          <strong>{{ backtestResult.sectorHitRate.toFixed(1) }}%</strong>
          <small>{{ backtestResult.sectorHits }} van {{ backtestResult.predictions }}</small>
        </div>
      </div>

      <div class="baseline-track">
        <div class="baseline-labels"><span>Random {{ backtestResult.randomHitRate.toFixed(2) }}%</span><span>Model {{ backtestResult.hitRate.toFixed(1) }}%</span></div>
        <div class="baseline-bar">
          <i class="random-mark" :style="{ left: `${Math.min(backtestResult.randomHitRate, 100)}%` }" />
          <b :style="{ width: `${Math.min(backtestResult.hitRate, 100)}%` }" />
        </div>
        <p class="hint">Bij {{ backtestResult.predictions }} voorspellingen verwacht willekeurig kiezen gemiddeld {{ backtestResult.expectedRandomHits.toFixed(1) }} hits.</p>
      </div>

      <div class="backtest-table-wrap">
        <table class="backtest-table">
          <thead><tr><th>Werkelijk</th><th>Voorspeld</th><th>5-zone</th><th>Resultaat</th></tr></thead>
          <tbody>
            <tr v-for="row in recentBacktestRows" :key="row.index">
              <td><span class="mini-ball table-ball" :class="`num-${rouletteColor(row.actual)}`">{{ row.actual }}</span> <small>{{ row.actualSector }}</small></td>
              <td><span class="sector-badge" :class="sectorClass(row.predictedSector)">{{ row.predictedSector }}</span></td>
              <td class="zone-cell"><span v-for="n in row.numbers" :key="n" :class="{ 'zone-center': n === row.center }">{{ n }}</span></td>
              <td><strong :class="row.hit ? 'hit' : 'miss'">{{ row.hit ? 'HIT' : 'MISS' }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="disclaimer">Een hoge historische hit-rate bewijst geen voorspellend voordeel. Bij kleine steekproeven kan toevalsvariantie zeer groot zijn; gebruik vooral langere reeksen om het model te beoordelen.</p>
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
