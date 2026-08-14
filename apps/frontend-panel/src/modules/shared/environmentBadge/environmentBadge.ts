/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  APP_ENVIRONMENT,
  ENVIRONMENT_BADGE_EMOJI,
  ENVIRONMENT_BADGE_HEIGHT,
} from '@/modules/shared/config/appEnvironment.constant';
import { environment } from '@/modules/shared/config/environment';
import { paintEnvironmentFavicon } from '@/modules/shared/environmentBadge/favicon';
import sharedLocale from '@/modules/shared/shared.locale.json';

const BANNER_ID = 'ada-environment-banner';

/**
 * Marca a janela inteira quando o painel nao e o de producao.
 *
 * Sao dois sinais porque cada um falha sozinho: a faixa some quando a aba esta em segundo plano, e
 * o favicon fica. Quem faz suporte alterna entre producao e homologacao o dia todo, e agir na base
 * errada por confundir as abas custa muito mais que uma tarja.
 *
 * O titulo nao leva o simbolo: ele aparece colado no favicon, que ja o carrega sobreposto, e o par
 * repetido na mesma aba le como defeito em vez de aviso.
 */
export function applyEnvironmentBadge(): void {
  const current = environment.VITE_APP_ENV;
  if (current === APP_ENVIRONMENT.PRODUCTION) return;

  const label = sharedLocale.environmentBadge[current];

  void paintEnvironmentFavicon();
  mountBanner(label);
}

/**
 * A faixa e fixa, e o `<html>` desce e encolhe junto.
 *
 * O painel inteiro se apoia em `height: 100%` a partir do `<html>`: empurrar so o `body` deixaria
 * a coluna da conversa 24px alem da janela, com barra de rolagem que nao existe em producao.
 */
function mountBanner(label: string): void {
  if (document.getElementById(BANNER_ID)) return;

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  // Texto por no de texto, nunca `innerHTML`: o rotulo e conteudo, e conteudo nao vira marcacao.
  banner.textContent = `${ENVIRONMENT_BADGE_EMOJI} ${label}`;
  banner.setAttribute('role', 'status');
  banner.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    `height:${ENVIRONMENT_BADGE_HEIGHT}`,
    'z-index:2147483647',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'gap:0.5rem',
    'background:#f59e0b',
    'color:#1c1917',
    'font:600 0.75rem/1 system-ui,sans-serif',
    'letter-spacing:0.02em',
    'pointer-events:none',
  ].join(';');

  document.body.append(banner);
  document.documentElement.style.marginTop = ENVIRONMENT_BADGE_HEIGHT;
  document.documentElement.style.height = `calc(100% - ${ENVIRONMENT_BADGE_HEIGHT})`;
}
