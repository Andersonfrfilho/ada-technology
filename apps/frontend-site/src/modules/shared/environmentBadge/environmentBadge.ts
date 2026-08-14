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
  ENVIRONMENT_BADGE_LABEL,
} from '@/modules/shared/config/appEnvironment.constant';
import { environment } from '@/modules/shared/config/environment';
import { paintEnvironmentFavicon } from '@/modules/shared/environmentBadge/favicon';

const BANNER_ID = 'ada-environment-banner';
const OFFSET_STYLE_ID = 'ada-environment-banner-offset';

/**
 * Marca a janela inteira quando o site nao e o de producao.
 *
 * Sao dois sinais porque cada um falha sozinho: a faixa some quando a aba esta em segundo plano, e
 * o favicon fica. Confundir a homologacao com o site publico custa muito mais que uma tarja.
 *
 * O titulo nao leva o simbolo: ele aparece colado no favicon, que ja o carrega sobreposto, e o par
 * repetido na mesma aba le como defeito em vez de aviso.
 */
export function applyEnvironmentBadge(): void {
  const current = environment.VITE_APP_ENV;
  if (current === APP_ENVIRONMENT.PRODUCTION) return;

  void paintEnvironmentFavicon();
  mountBanner(ENVIRONMENT_BADGE_LABEL[current]);
}

/**
 * A faixa e fixa, e o topo da pagina desce junto.
 *
 * As duas navegacoes do site sao presas ao topo (`fixed` na landing, `sticky` nas paginas legais):
 * sem descer o `top` delas, a faixa ficaria escondida atras do menu no primeiro pixel de rolagem —
 * exatamente onde ela precisa ser lida.
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
    'background:#f59e0b',
    'color:#1c1917',
    'font:600 0.75rem/1 system-ui,sans-serif',
    'letter-spacing:0.02em',
    'pointer-events:none',
  ].join(';');

  const offset = document.createElement('style');
  offset.id = OFFSET_STYLE_ID;
  offset.textContent = `body{padding-top:${ENVIRONMENT_BADGE_HEIGHT}}nav,.legal-nav{top:${ENVIRONMENT_BADGE_HEIGHT}}`;

  document.head.append(offset);
  document.body.append(banner);
}
