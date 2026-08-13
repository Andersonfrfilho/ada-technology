/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/modules/shared/App.component';
import { applyEnvironmentBadge } from '@/modules/shared/environmentBadge/environmentBadge';

import '@/index.css';

// Antes do React: a faixa e do documento, e nao de uma tela — ela vale inclusive no erro de boot.
applyEnvironmentBadge();

const container = document.getElementById('root');

if (!container) throw new Error('missing #root element');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
