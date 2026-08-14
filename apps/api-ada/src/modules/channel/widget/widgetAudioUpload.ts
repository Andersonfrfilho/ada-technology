/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { WIDGET_AUDIO_FIELD, WIDGET_AUDIO_MAX_BYTES } from '@/modules/channel/widget/widget.constant';
import { WidgetAudioInvalidError } from '@/modules/channel/widget/widget.error';
import type { WidgetAudioUpload } from '@/modules/channel/widget/types/widget.types';

/**
 * Leitura do multipart de audio, compartilhada pelo visitante e pela simulacao do painel.
 *
 * O teto e checado aqui e nao no caso de uso porque a defesa precisa acontecer antes de carregar o
 * arquivo inteiro na memoria do processo.
 */
export async function readWidgetAudioUpload(request: Request): Promise<WidgetAudioUpload> {
  const form = await request.formData().catch(() => undefined);
  const file = form?.get(WIDGET_AUDIO_FIELD);

  if (!(file instanceof File)) throw new WidgetAudioInvalidError('arquivo ausente');
  if (file.size === 0) throw new WidgetAudioInvalidError('arquivo vazio');
  if (file.size > WIDGET_AUDIO_MAX_BYTES) throw new WidgetAudioInvalidError('arquivo grande demais');

  return { buffer: Buffer.from(await file.arrayBuffer()), mimeType: file.type };
}
