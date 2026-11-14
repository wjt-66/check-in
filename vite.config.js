import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages 子路径部署（https://wjt-66.github.io/check-in/）
  base: '/check-in/',
  // 监听局域网地址，方便手机真机联调
  server: { host: true },
  plugins: [
    vue(),
    VitePWA({
      // Service Worker 更新后自动激活新版本
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: '周期打卡备忘录',
        short_name: '周期打卡',
        description: '纯本地运行的周期打卡备忘录，支持离线打卡',
        lang: 'zh-CN',
        theme_color: '#4f46e5',
        background_color: '#f7f8fa',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // 预缓存全部静态资源，实现断网可用
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html'
      }
    })
  ]
})
