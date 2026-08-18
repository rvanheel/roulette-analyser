import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/roulette-analyser/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['roulette.svg'],
      manifest: {
        id: base,
        name: 'Roulette Analyser',
        short_name: 'Roulette',
        description: 'Analyseer roulette reeksen op wielsectoren en fysieke vijf-vaks clusters.',
        theme_color: '#061710',
        background_color: '#061710',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        start_url: base,
        scope: base,
        categories: ['utilities'],
        icons: [
          { src: 'roulette.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'roulette.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      }
    })
  ]
})
