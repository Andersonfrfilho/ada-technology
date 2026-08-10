/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** Uma opcao clicavel de um no de menu. O `id` e o que a API espera de volta como resposta. */
export type WidgetOption = {
  readonly id: string;
  readonly title: string;
};

export type WidgetMessage = {
  readonly id: string;
  readonly direction: string;
  readonly sender: string;
  readonly type: string;
  readonly content: string | null;
  readonly options: readonly WidgetOption[];
  readonly createdAt: string;
};

export type WidgetTranscript = {
  readonly messages: readonly WidgetMessage[];
  readonly options: readonly WidgetOption[];
};

export type PostMessageResult = {
  readonly outcome: string;
};

export type WidgetApiParams = {
  readonly baseUrl: string;
};

export type PostMessageParams = {
  readonly sessionId: string;
  readonly text: string;
};

export type SubscribeParams = {
  readonly sessionId: string;
  readonly onChange: () => void;
};

export type WidgetViewState = {
  readonly isOpen: boolean;
  readonly isBusy: boolean;
  readonly status: string;
  readonly hasFailed: boolean;
  readonly transcript: WidgetTranscript;
};

export type WidgetViewHandlers = {
  readonly onToggle: () => void;
  readonly onSubmit: (text: string) => void;
};
