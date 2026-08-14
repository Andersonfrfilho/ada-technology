/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { APP_ENVIRONMENT } from '@/modules/shared/config/appEnvironment.constant';
import { environment } from '@/modules/shared/config/environment';

/**
 * Em producao a rota nao existe — a API nem a registra.
 *
 * Perguntar assim mesmo daria 404 a cada abertura do painel, e um erro de rede recorrente no console
 * de producao esconde os que importam. O selo aqui e o mesmo da faixa de ambiente: variavel esquecida
 * vira producao, e producao nao ganha afordancia de teste.
 */
export const IS_SIMULATION_AVAILABLE = environment.VITE_APP_ENV !== APP_ENVIRONMENT.PRODUCTION;

/** Comando semantico, nunca payload de canal pronto — a API monta o webhook do lado dela. */
export const SIMULATION_COMMAND_KIND = {
  TEXT: 'text',
  REPLY: 'reply',
} as const;

/** Mesmo campo do multipart do visitante do site: a rota simulada le o mesmo formulario. */
export const SIMULATION_AUDIO_FIELD = 'audio';

export const SIMULATION_QUERY_KEY = ['panel', 'simulation'] as const;
