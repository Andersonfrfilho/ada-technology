/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const DEV_PORT = 5176;

/**
 * `strictPort` para a landing falhar alto em vez de escorregar de porta.
 *
 * Sem ele o Vite anda para a proxima porta livre quando a padrao esta ocupada, e a maquina de
 * desenvolvimento tem outros projetos em 5173 e 5174. O silencio custa caro dos dois lados: a
 * landing sobe onde ninguem procura, e ela pode ocupar a porta do painel. Porta fixa tambem e o
 * que mantem a origem estavel na allowlist de CORS que o widget precisa para falar com a API.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: DEV_PORT, strictPort: true },
});
