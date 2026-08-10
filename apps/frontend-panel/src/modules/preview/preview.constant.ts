/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Caminho proprio, fora das secoes do painel.
 *
 * O preview roda sobre dado falso; se entrasse na barra lateral, um atendente acabaria respondendo
 * uma conversa que nao existe. Ele mora num endereco separado e so no bundle de desenvolvimento.
 */
export const PREVIEW_PATH = '/preview';

export const PREVIEW_TAB = {
  WORKSPACE: 'atendimento',
  MEDIA: 'midia',
} as const;

export type PreviewTab = (typeof PREVIEW_TAB)[keyof typeof PREVIEW_TAB];

/** Intervalo do roteiro automatico: rapido o bastante para ver a fila mexer sem virar ruido. */
export const PREVIEW_SCRIPT_INTERVAL_MILLISECONDS = 4000;

/** Latencia falsa nas respostas do mock — sem ela o preview esconde todo estado de carregamento. */
export const PREVIEW_LATENCY_MILLISECONDS = 120;
