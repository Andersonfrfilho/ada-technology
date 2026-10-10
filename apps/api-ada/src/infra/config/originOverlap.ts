/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type BuildOriginOverlapWarningParams = {
  readonly env: string;
  readonly panelOrigins: readonly string[];
  readonly widgetOrigins: readonly string[];
};

export type OriginOverlapWarning = {
  readonly message: string;
  readonly origins: readonly string[];
};

// Aviso e nao falha: derrubar o boot por configuracao que ja esta em producao seria pior que o risco.
export function buildOriginOverlapWarning({
  env,
  panelOrigins,
  widgetOrigins,
}: BuildOriginOverlapWarningParams): OriginOverlapWarning | undefined {
  if (env !== 'production') return undefined;

  const origins = panelOrigins.filter((origin) => widgetOrigins.includes(origin));
  if (origins.length === 0) return undefined;

  return {
    message:
      'Origem em CORS_ALLOWED_ORIGINS e WIDGET_ALLOWED_ORIGINS ao mesmo tempo: o site recebe credenciais do painel',
    origins,
  };
}
