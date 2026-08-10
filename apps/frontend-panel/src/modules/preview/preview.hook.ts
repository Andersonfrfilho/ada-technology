/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  createMockConversationsApi,
  createMockSSEProvider,
  createPreviewStore,
  PREVIEW_CONVERSATIONS,
  PREVIEW_MESSAGES,
  startPreviewScript,
} from '@adatechnology/conversations-ui/preview';
import { useCallback, useEffect, useMemo, useState } from 'react';

import previewLocale from '@/modules/preview/preview.locale.json';
import {
  PREVIEW_LATENCY_MILLISECONDS,
  PREVIEW_SCRIPT_INTERVAL_MILLISECONDS,
  PREVIEW_TAB,
  type PreviewTab,
} from '@/modules/preview/preview.constant';

type UsePreviewResult = {
  readonly api: ReturnType<typeof createMockConversationsApi>;
  readonly sse: ReturnType<typeof createMockSSEProvider>;
  readonly tab: PreviewTab;
  readonly isScriptRunning: boolean;
  readonly selectTab: (next: PreviewTab) => void;
  readonly toggleScript: () => void;
};

/**
 * O store e criado uma unica vez e sobrevive a troca de aba.
 *
 * Recria-lo a cada render descartaria o que o roteiro ja escreveu, e a fila voltaria ao estado
 * inicial toda vez que o componente remontasse — que e justamente o que se quer observar mudando.
 */
export function usePreview(): UsePreviewResult {
  const store = useMemo(
    () => createPreviewStore({ conversations: PREVIEW_CONVERSATIONS, messages: PREVIEW_MESSAGES }),
    [],
  );

  const api = useMemo(
    () =>
      createMockConversationsApi({
        store,
        latencyMs: PREVIEW_LATENCY_MILLISECONDS,
        agentName: previewLocale.agentName,
      }),
    [store],
  );

  const sse = useMemo(() => createMockSSEProvider({ store }), [store]);

  const [tab, setTab] = useState<PreviewTab>(PREVIEW_TAB.WORKSPACE);
  const [isScriptRunning, setIsScriptRunning] = useState(false);

  useEffect(() => {
    if (!isScriptRunning) return;

    return startPreviewScript({ store, intervalMs: PREVIEW_SCRIPT_INTERVAL_MILLISECONDS });
  }, [isScriptRunning, store]);

  const selectTab = useCallback((next: PreviewTab) => setTab(next), []);
  const toggleScript = useCallback(() => setIsScriptRunning((running) => !running), []);

  return { api, sse, tab, isScriptRunning, selectTab, toggleScript };
}
