/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { buildPreviewPayload } from '@adatechnology/notification-contracts';

import {
  NOTIFICATION_TEMPLATE_VARIABLES,
} from '@/modules/notification/passwordResetTemplate.constant';
import { NOTIFICATION_TEMPLATE_TEST_PATH } from '@/modules/notification/notification.constant';

describe('envio de teste de template', () => {
  /**
   * O destinatario e o agente autenticado, e nao ha campo de destino no corpo. Uma rota de "enviar
   * teste" que aceita endereco livre e um canhao de spam com a reputacao do dominio.
   */
  it('a rota nao expoe destinatario no caminho', () => {
    expect(NOTIFICATION_TEMPLATE_TEST_PATH).toBe('/v1/notifications/templates/:key/test');
    expect(NOTIFICATION_TEMPLATE_TEST_PATH).not.toContain('email');
    expect(NOTIFICATION_TEMPLATE_TEST_PATH).not.toContain('to');
  });

  /** O teste prova o que o preview mostra: os dois saem do MESMO catalogo. */
  it('o payload do teste e o mesmo do preview, para os dois nao divergirem', () => {
    const variables = NOTIFICATION_TEMPLATE_VARIABLES['auth.login_alert'];
    const payload = buildPreviewPayload(variables);

    expect(payload).toEqual({
      signedInAt: '25/08/2026 as 09:14',
      ipAddress: '187.45.10.22',
      passwordChangeUrl: 'https://painel.adatechnology.com.br/perfil/senha',
    });
  });

  it('todo template do catalogo tem exemplo para cada variavel obrigatoria', () => {
    for (const [key, variables] of Object.entries(NOTIFICATION_TEMPLATE_VARIABLES)) {
      const payload = buildPreviewPayload(variables);

      for (const variable of variables) {
        if (variable.kind === 'attachment') continue;
        expect(payload[variable.name], `${key} / ${variable.name}`).toBeTruthy();
      }
    }
  });

  /** Sem isso, uma chave desconhecida faria o modulo lancar e o painel receber 500 sem causa. */
  it('o catalogo e a fonte do que existe — chave fora dele nao tem variaveis', () => {
    expect(NOTIFICATION_TEMPLATE_VARIABLES['order.inexistente' as never]).toBeUndefined();
    expect(NOTIFICATION_TEMPLATE_VARIABLES['auth.password_reset']).toBeDefined();
    expect(NOTIFICATION_TEMPLATE_VARIABLES['auth.login_alert']).toBeDefined();
  });
});
