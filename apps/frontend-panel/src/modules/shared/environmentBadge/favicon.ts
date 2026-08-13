/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ENVIRONMENT_BADGE_EMOJI } from '@/modules/shared/config/appEnvironment.constant';

const CANVAS_SIZE = 64;
/** O icone recua para o fundo e cede o canto da frente ao simbolo. */
const ICON_SCALE = 0.78;
const EMOJI_SCALE = 0.62;

/**
 * Pinta o simbolo na frente do icone, em vez de trocar o icone.
 *
 * Com tres abas abertas — producao, homologacao e local — o que diferencia uma da outra e o
 * favicon, que aparece antes do titulo e continua visivel na aba inativa. Trocar o icone por um
 * emoji perderia a marca; sobrepor mantem as duas leituras no mesmo desenho.
 *
 * Falha de carregamento nao e tratada: o icone original fica, e favicon nao vale um erro na tela.
 */
export async function paintEnvironmentFavicon(): Promise<void> {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;

  const context = document.createElement('canvas').getContext('2d');
  if (!context) return;

  context.canvas.width = CANVAS_SIZE;
  context.canvas.height = CANVAS_SIZE;

  try {
    const icon = new Image();
    icon.src = link.href;
    await icon.decode();

    const iconSize = CANVAS_SIZE * ICON_SCALE;
    context.drawImage(icon, CANVAS_SIZE - iconSize, 0, iconSize, iconSize);
  } catch {
    return;
  }

  context.font = `${CANVAS_SIZE * EMOJI_SCALE}px serif`;
  context.textBaseline = 'bottom';
  context.fillText(ENVIRONMENT_BADGE_EMOJI, 0, CANVAS_SIZE);

  link.href = context.canvas.toDataURL('image/png');
}
