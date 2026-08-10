/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { MessagesWorkspace, type MessagesWorkspaceApi } from '@adatechnology/conversations-ui';

import { fetchBotMessages, saveBotMessages } from '@/modules/settings/settings.api';
import settingsLocale from '@/modules/settings/settings.locale.json';

/**
 * Referencia estavel de proposito: o workspace refaz a carga sempre que a identidade de `api` muda.
 *
 * So o par de mensagens entra aqui. Topicos, templates e transcricao sao capacidades opcionais do
 * pacote — ausentes, a tela colapsa na aba do bot e nem desenha a barra de abas. Templates tem menu
 * proprio no painel, e transcricao depende de midia, que este produto ainda nao serve.
 */
const messagesApi: MessagesWorkspaceApi = {
  getMessages: fetchBotMessages,
  saveMessages: saveBotMessages,
};

export function MessagesPage() {
  return (
    <section className="h-full overflow-y-auto p-4 desktop:p-6">
      <MessagesWorkspace api={messagesApi} labels={settingsLocale.messages} />
    </section>
  );
}
