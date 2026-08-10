/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  StartWidgetSessionDependencies,
  StartWidgetSessionResult,
} from '@/modules/channel/widget/types/widget.types';
import { createWidgetSessionId } from '@/modules/channel/widget/widget.constant';

/**
 * Abre a conversa do visitante do site.
 *
 * O texto vazio nao e resposta a nada: `advanceConversation` descarta o texto quando a sessao ainda
 * nao existe e apenas apresenta o no de abertura do fluxo. E a mesma porta usada pela primeira
 * mensagem do WhatsApp, o que mantem os dois canais no mesmo grafo.
 */
export class StartWidgetSessionUseCase {
  constructor(private readonly dependencies: StartWidgetSessionDependencies) {}

  async execute(): Promise<StartWidgetSessionResult> {
    const { advanceConversation, channel } = this.dependencies;
    const sessionId = createWidgetSessionId();

    await advanceConversation.execute({ whatsappNumber: sessionId, text: '', channel });

    return { sessionId };
  }
}
