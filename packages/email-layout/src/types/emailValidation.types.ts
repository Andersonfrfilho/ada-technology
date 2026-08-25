/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type EmailHtmlSeverity = 'error' | 'warning';

export type EmailHtmlProblem = {
  /** Codigo estavel — a mensagem muda de idioma, o codigo nao (apis.md). */
  readonly code: string;
  readonly severity: EmailHtmlSeverity;
  readonly message: string;
};

export type ValidateEmailHtmlResult = {
  /** `false` quando ha ao menos um `error`. Aviso nao reprova: cliente de e-mail perdoa muita coisa. */
  readonly isValid: boolean;
  readonly problems: readonly EmailHtmlProblem[];
  /** Bytes do documento — Gmail corta acima de 102KB e esconde o rodape atras de "ver mensagem inteira". */
  readonly byteSize: number;
};
