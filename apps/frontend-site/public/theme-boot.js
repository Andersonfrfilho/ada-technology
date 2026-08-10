/*
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/*
 * Marca o tema escolhido no `<html>` antes da primeira pintura.
 *
 * Precisa ser script classico e bloqueante em `public/`, por dois motivos que se somam: o CSP de
 * producao nao aceita `script-src 'unsafe-inline'`, entao a alternativa obvia (um `<script>` inline
 * no `<head>`) esta fora; e todo modulo emitido pelo Vite carrega `type="module"`, que e diferido por
 * definicao — o tema chegaria depois da pintura e a pagina piscaria branca antes de escurecer.
 *
 * A chave de armazenamento tambem esta em `src/theme.ts`. Constante nao atravessa essa fronteira:
 * arquivos de `public/` sao copiados crus, fora do bundle. Mudar aqui exige mudar la.
 */
(function applyStoredTheme() {
  try {
    var stored = window.localStorage.getItem('ada-theme');

    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (error) {
    // Armazenamento bloqueado (navegacao privada, politica de cookies): cai no `prefers-color-scheme`.
  }
})();
