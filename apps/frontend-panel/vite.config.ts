/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const DEV_PORT = 5175;

const BRAND_NAVY = '#0d1b3e';
const BRAND_SURFACE = '#f5f8ff';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['ada-icon-192.png', 'ada-icon-512.png'],
      manifest: {
        name: 'Ada Technology — Atendimento',
        short_name: 'Ada Atendimento',
        description: 'Painel de atendimento das conversas da Ada Technology.',
        start_url: '/',
        display: 'standalone',
        theme_color: BRAND_NAVY,
        background_color: BRAND_SURFACE,
        icons: [
          { src: 'ada-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'ada-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'ada-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/v1\//],
        // A conversa nao pode ser servida de cache: mensagem velha em tela e pior que tela vazia.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/v1/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: DEV_PORT, strictPort: true },
});
