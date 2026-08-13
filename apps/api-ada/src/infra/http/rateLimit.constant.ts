/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

const ONE_MINUTE = 60;

/**
 * Tetos por IP, em janela de um minuto.
 *
 * Mais duros onde a requisicao custa dinheiro ou abre porta: iniciar conversa e mandar mensagem
 * disparam trabalho no banco e no canal, enquanto ler o proprio transcript e barato.
 */
export const RATE_LIMIT = {
  // A Meta reentrega em rajada apos instabilidade; apertar demais aqui perderia mensagem de cliente.
  WHATSAPP_WEBHOOK: { limit: 120, windowSeconds: ONE_MINUTE },
  WHATSAPP_CHALLENGE: { limit: 10, windowSeconds: ONE_MINUTE },
  // Catalogo muda em lote (importacao de feed, revisao da Meta), mas nada perto do volume de
  // mensagem: metade do teto do webhook de conversa ja cobre uma sincronizacao inteira.
  WHATSAPP_CATALOG_WEBHOOK: { limit: 60, windowSeconds: ONE_MINUTE },
  WIDGET_SESSION_CREATE: { limit: 10, windowSeconds: ONE_MINUTE },
  WIDGET_MESSAGE_SEND: { limit: 30, windowSeconds: ONE_MINUTE },
  WIDGET_TRANSCRIPT_READ: { limit: 120, windowSeconds: ONE_MINUTE },
  // Audio custa uma chamada de transcricao por envio: e a rota mais cara que um visitante nao
  // autenticado alcanca, e por isso a mais apertada das quatro.
  WIDGET_AUDIO_SEND: { limit: 10, windowSeconds: ONE_MINUTE },
  WIDGET_EVENTS_SUBSCRIBE: { limit: 20, windowSeconds: ONE_MINUTE },

  // Login e a unica rota onde tentar de novo tem valor para quem ataca: dez chances por minuto
  // por IP tornam forca bruta inviavel sem atrapalhar quem so errou a senha.
  PANEL_LOGIN: { limit: 10, windowSeconds: ONE_MINUTE },
  PANEL_REFRESH: { limit: 30, windowSeconds: ONE_MINUTE },
  PANEL_READ: { limit: 240, windowSeconds: ONE_MINUTE },
  PANEL_WRITE: { limit: 60, windowSeconds: ONE_MINUTE },
} as const;
