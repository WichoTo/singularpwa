// vite.config.ts
import { defineConfig, loadEnv, type ConfigEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default ({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), '')
  const SUPABASE_URL = env.VITE_SUPABASE_URL || ''
  const SUPABASE_ORIGIN = SUPABASE_URL ? new URL(SUPABASE_URL).origin : ''

  return defineConfig({
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: { enabled: false }, // para probar PWA en dev
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackAllowlist: [/.*/], 
          runtimeCaching: [
            // REST: NetworkFirst
            {
              urlPattern: ({ url }) =>
                SUPABASE_ORIGIN &&
                url.origin === SUPABASE_ORIGIN &&
                url.pathname.startsWith('/rest/v1/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-rest',
                networkTimeoutSeconds: 10,
                matchOptions: { ignoreSearch: false },
              },
            },
            // Storage público: CacheFirst
            {
              urlPattern: ({ url }) =>
                SUPABASE_ORIGIN &&
                url.origin === SUPABASE_ORIGIN &&
                url.pathname.startsWith('/storage/v1/object/public/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-storage',
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    server: { port: 2020, strictPort: true },
  })
}
