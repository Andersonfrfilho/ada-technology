/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/infra/config/environment';
import { metaWhatsApp } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonData } from '@/infra/http/responses';
import { HTTP_METHOD, type Route } from '@/infra/http/router';
import { logger } from '@/shared/logger';

const SOURCE = 'modules.channel.whatsapp.controller';

const WEBHOOK_PATH = '/v1/whatsapp/webhook';
const SIGNATURE_HEADER = 'x-hub-signature-256';

const challengeRoute: Route = {
  method: HTTP_METHOD.GET,
  path: WEBHOOK_PATH,
  rateLimit: RATE_LIMIT.WHATSAPP_CHALLENGE,
  // A Meta espera o desafio cru de volta, sem envelope; qualquer JSON aqui reprova a verificacao.
  handler: ({ url }) => {
    const challenge = metaWhatsApp.webhook.verifyChallenge({
      mode: url.searchParams.get('hub.mode'),
      token: url.searchParams.get('hub.verify_token'),
      challenge: url.searchParams.get('hub.challenge'),
    });

    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};

const receiveRoute: Route = {
  method: HTTP_METHOD.POST,
  path: WEBHOOK_PATH,
  rateLimit: RATE_LIMIT.WHATSAPP_WEBHOOK,
  handler: async ({ request, traceId }) => {
    // Texto cru, e nao `request.json()`: o HMAC e sobre os bytes enviados, e reserializar o objeto
    // muda espacos e ordem de chaves o bastante para invalidar a assinatura de um evento legitimo.
    const rawBody = await request.text();

    const result = await metaWhatsApp.webhook.receive.execute({
      companyId: environment.ADA_COMPANY_ID,
      rawBody,
      signatureHeader: request.headers.get(SIGNATURE_HEADER),
    });

    logger.info({
      message: 'Webhook do WhatsApp processado',
      source: SOURCE,
      traceId,
      meta: result,
    });

    return jsonData({ received: true });
  },
};

/**
 * Vazio com o canal desligado: sem credencial nao ha segredo para conferir assinatura, e uma rota
 * publica que aceita qualquer corpo e pior do que rota nenhuma.
 */
export const whatsappRoutes: readonly Route[] = environment.WHATSAPP_ENABLED
  ? [challengeRoute, receiveRoute]
  : [];
