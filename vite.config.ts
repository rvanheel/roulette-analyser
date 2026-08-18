import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['roulette.svg'],
      manifest: {
        id: '/',
        name: 'Roulette Analyser',
        short_name: 'Roulette',
        description: 'Analyseer roulette reeksen op wielsectoren en fysieke vijf-vaks clusters.',
        theme_color: '#061710',
        background_color: '#061710',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['utilities'],
        icons: [
          { src: 'roulette.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'roulette.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      }
    })
  ]
})
