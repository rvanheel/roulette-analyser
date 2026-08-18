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
        name: 'Roulette Analyser',
        short_name: 'Roulette',
        description: 'Analyseer roulette reeksen op wielsectoren en fysieke vijf-vaks clusters.',
        theme_color: '#0d5c3d',
        background_color: '#071d16',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'roulette.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })
  ]
})
