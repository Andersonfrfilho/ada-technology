/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * O que o painel pede, nao o que o canal transporta.
 *
 * O comando e semantico de proposito: `{ kind: 'text', text }` vira payload assinado no WhatsApp e
 * chamada de caso de uso no chat do site. Se o navegador mandasse o payload pronto, a rota viraria
 * um injetor de webhook arbitrario para quem tivesse sessao de atendente.
 */
export const SIMULATION_COMMAND_KIND = {
  TEXT: 'text',
  REPLY: 'reply',
  AUDIO: 'audio',
} as const;
export type SimulationCommandKind = (typeof SIMULATION_COMMAND_KIND)[keyof typeof SIMULATION_COMMAND_KIND];

/** Vocabulario de midia do simulador do `conversations-ui`. */
export const SIMULATION_MEDIA_KIND = {
  AUDIO: 'audio',
} as const;
export type SimulationMediaKind = (typeof SIMULATION_MEDIA_KIND)[keyof typeof SIMULATION_MEDIA_KIND];

/**
 * O chat do site so tem rota de entrada para audio; o WhatsApp simulado nao tem nenhuma.
 *
 * Mandar midia como cliente do WhatsApp exigiria subir o arquivo para a Meta antes, e o painel
 * ficaria com um clipe que falha ao ser tocado. Melhor um botao que nao existe.
 */
export const WEBCHAT_SIMULATION_MEDIA_KINDS: readonly SimulationMediaKind[] = [SIMULATION_MEDIA_KIND.AUDIO];
export const WHATSAPP_SIMULATION_MEDIA_KINDS: readonly SimulationMediaKind[] = [];

/**
 * Simulacao nao existe em producao — e a rota some, em vez de responder 403.
 *
 * Rota que existe e recusa ainda conta a quem procura que a capacidade esta ali, esperando uma
 * configuracao errada para abrir.
 */
export const SIMULATION_FORBIDDEN_ENV = 'production';

export const SIMULATION_SIGNATURE_PREFIX = 'sha256=';
export const SIMULATION_SIGNATURE_ALGORITHM = 'sha256';
