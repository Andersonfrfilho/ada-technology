/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { FlowsWorkspace } from '@adatechnology/conversations-ui/flows';

import { flowsApi } from '@/modules/flows/flows.api';
import { DEFAULT_FLOW_KEY } from '@/modules/flows/flows.constant';
import flowsLocale from '@/modules/flows/flows.locale.json';

/**
 * O editor inteiro vem do pacote — barra de acoes, abas, paleta, canvas e painel de no.
 *
 * Os rotulos ja saem em portugues pelo padrao do pacote, entao `labels` fica de fora: repetir os
 * mais de cem textos aqui so criaria duas versoes do mesmo vocabulario para divergirem depois.
 * `renderMediaPicker` tambem nao entra enquanto o painel nao tiver biblioteca de arquivos.
 */
export function FlowsPage() {
  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      <p className="border-b border-gray-200 bg-white px-4 py-3 text-xs text-ink-500 desktop:px-6 dark:border-gray-800 dark:bg-gray-900">
        {flowsLocale.publishWarning}
      </p>

      {/* O pacote entrega o editor sem margem: a folga da pagina e do host, como nas demais secoes.
          O titulo e daqui (`showHeader={false}`) para ficar na mesma escala de Clientes e Templates,
          em vez do `text-2xl` do pacote. */}
      <div className="min-h-0 flex-1 space-y-4 p-4 desktop:p-6">
        <h1 className="text-lg font-semibold text-ink-900 dark:text-white">{flowsLocale.title}</h1>
        <FlowsWorkspace
          api={flowsApi}
          className="min-h-0"
          rootFlowKey={DEFAULT_FLOW_KEY}
          showHeader={false}
        />
      </div>
    </div>
  );
}
