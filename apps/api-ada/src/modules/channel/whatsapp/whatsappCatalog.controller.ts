/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { verifyWebhookChallenge, verifyWebhookSignature } from '@adatechnology/meta-whatsapp-module';

import { environment } from '@/infra/config/environment';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonData } from '@/infra/http/responses';
import { HTTP_METHOD, type Route } from '@/infra/http/router';
import { logger } from '@/shared/logger';

const SOURCE = 'modules.channel.whatsapp.catalog.controller';

/**
 * Rota propria porque o catalogo e outro produto no app da Meta.
 *
 * A assinatura `whatsapp_business_management` tem callback URL e verify token separados dos da
 * conta de mensagens, e entrega campos que o handler de conversa nao sabe ler (`product_catalogs`,
 * revisao de item, rejeicao de feed). Misturar os dois no mesmo endpoint faria evento de catalogo
 * cair no caminho de mensagem e sair no log como payload nao reconhecido.
 *
 * Hoje o endpoint apenas autentica e confirma o recebimento. Confirmar sem processar e deliberado:
 * a Meta reentrega por dias o que nao recebe 200, e uma fila de retentativa acumulada e pior do
 * que evento descartado enquanto o consumo nao existe. O que cada campo dispara entra depois, junto
 * ao SDK — este arquivo ja deixa a porta autenticada de pe para a subscricao poder ser criada.
 */
const CATALOG_WEBHOOK_PATH = '/v1/whatsapp/catalog/webhook';
const SIGNATURE_HEADER = 'x-hub-signature-256';

const challengeRoute: Route = {
  method: HTTP_METHOD.GET,
  path: CATALOG_WEBHOOK_PATH,
  rateLimit: RATE_LIMIT.WHATSAPP_CHALLENGE,
  // Desafio cru de volta, sem envelope: qualquer JSON aqui reprova a verificacao no painel da Meta.
  handler: ({ url }) => {
    const challenge = verifyWebhookChallenge({
      mode: url.searchParams.get('hub.mode'),
      token: url.searchParams.get('hub.verify_token'),
      challenge: url.searchParams.get('hub.challenge'),
      expectedToken: environment.WHATSAPP_CATALOG_WEBHOOK_VERIFY_TOKEN,
    });

    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};

const receiveRoute: Route = {
  method: HTTP_METHOD.POST,
  path: CATALOG_WEBHOOK_PATH,
  rateLimit: RATE_LIMIT.WHATSAPP_CATALOG_WEBHOOK,
  handler: async ({ request, traceId }) => {
    // Texto cru, e nao `request.json()`: o HMAC e sobre os bytes enviados, e reserializar o objeto
    // muda espacos e ordem de chaves o bastante para invalidar a assinatura de um evento legitimo.
    const rawBody = await request.text();

    verifyWebhookSignature({
      rawBody,
      signatureHeader: request.headers.get(SIGNATURE_HEADER),
      appSecret: environment.WHATSAPP_APP_SECRET,
    });

    // So o tamanho e o campo — nunca o corpo. Evento de catalogo carrega dado comercial, e log nao
    // e lugar de inventario nem de preco.
    logger.info({
      message: 'Webhook de catalogo recebido (sem consumo ainda)',
      source: SOURCE,
      traceId,
      meta: { bytes: rawBody.length },
    });

    return jsonData({ received: true });
  },
};

/**
 * Sem verify token a rota nao existe.
 *
 * Endpoint publico que aceita qualquer corpo e pior do que endpoint nenhum: sem o segredo nao ha o
 * que conferir no desafio, e a rota viraria confirmacao gratuita de que o host responde.
 */
export const whatsappCatalogRoutes: readonly Route[] =
  environment.WHATSAPP_ENABLED && environment.WHATSAPP_CATALOG_WEBHOOK_VERIFY_TOKEN.length > 0
    ? [challengeRoute, receiveRoute]
    : [];
