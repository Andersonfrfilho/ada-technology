/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Recarrega quando o service worker novo assume o controle.
 *
 * O `registerType: 'autoUpdate'` baixa e ativa o worker novo, mas a pagina ja carregou do cache
 * antigo — so a visita SEGUINTE mostra a versao nova. Na pratica, quem esta com o painel aberto fica
 * na versao velha ate fechar todas as abas, e nao tem como saber disso.
 *
 * Custou tres rodadas de "a correcao nao subiu" em uma tarde, com o codigo ja em producao. Em
 * ambiente de atendimento e pior: a pessoa opera uma versao que nao existe mais.
 *
 * `controllerchange` dispara uma vez, quando o worker novo toma o lugar do anterior. A guarda existe
 * porque o evento tambem dispara no PRIMEIRO registro (quando nao havia controller nenhum), e ali
 * recarregar seria um refresh gratuito no primeiro acesso de todo mundo.
 */
export function reloadOnServiceWorkerUpdate(): void {
  if (!('serviceWorker' in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  if (!hadController) return;

  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Chrome pode disparar mais de uma vez; recarregar duas vezes seria um piscar visivel.
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}
