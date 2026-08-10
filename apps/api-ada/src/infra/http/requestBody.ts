/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { InvalidJsonBodyError } from '@/infra/http/requestBody.error';

/**
 * Le o corpo da requisicao como JSON.
 *
 * Fronteira do sistema: converte a falha do parser em erro tipado antes que ela chegue ao schema.
 * O valor sai como `unknown` de proposito — quem chama valida com Zod.
 *
 * Corpo ausente vira objeto vazio: num POST cujos campos sao todos opcionais nao ha corpo a mandar, e
 * onde houver campo obrigatorio o schema reprova com a mensagem certa em vez de "JSON invalido".
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  const raw = (await request.text()).trim();

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new InvalidJsonBodyError();
  }
}
