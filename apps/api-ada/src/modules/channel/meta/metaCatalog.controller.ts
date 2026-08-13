/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { verifyWebhookChallenge, verifyWebhookSignature } from '@adatechnology/meta-whatsapp-module';

import { environment } from '@/infra/config/environment';
import { catalogModule } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonData } from '@/infra/http/responses';
import { HTTP_METHOD, type Route } from '@/infra/http/router';
import {
  CATALOG_WEBHOOK_PATH,
} from '@/modules/channel/meta/metaCatalog.constant';
import { extractReviewVerdicts } from '@/modules/channel/meta/metaCatalogEvent';
import { logger } from '@/shared/logger';

const SOURCE = 'modules.channel.meta.catalog.controller';

/**
 * Rota propria porque o catalogo nao pertence ao WhatsApp.
 *
 * O catalogo e objeto do Meta Commerce: o mesmo id alimenta anuncio dinamico, Instagram Shopping,
 * Messenger e o WhatsApp, que apenas o consome. Por isso o caminho e `/v1/meta/...` e nao
 * `/v1/whatsapp/...` — a subscricao hoje entra por `whatsapp_business_management`, mas o evento
 * descreve o objeto de commerce inteiro, e o dia em que o catalogo servir a loja do Instagram o
 * endpoint continua o mesmo.
 *
 * Callback URL e verify token sao separados dos da conta de mensagens, e os campos entregues
 * (`product_catalogs`, revisao de item, rejeicao de feed) o handler de conversa nao sabe ler.
 * Misturar os dois faria evento de catalogo cair no caminho de mensagem e sair no log como payload
 * nao reconhecido.
 *
 * O que o endpoint consome e o veredito da revisao de item. A publicacao devolve 200 muito antes de
 * a Meta aprovar, entao e por aqui que o produto reprovado deixa de aparecer como `synced` no
 * painel. Campo que nao seja `product_catalogs` continua confirmado e descartado: a Meta reentrega
 * por dias o que nao recebe 200, e fila de retentativa acumulada e pior que evento ignorado.
 */
const SIGNATURE_HEADER = 'x-hub-signature-256';

const challengeRoute: Route = {
  method: HTTP_METHOD.GET,
  path: CATALOG_WEBHOOK_PATH,
  rateLimit: RATE_LIMIT.META_CATALOG_CHALLENGE,
  // Desafio cru de volta, sem envelope: qualquer JSON aqui reprova a verificacao no painel da Meta.
  handler: ({ url }) => {
    const challenge = verifyWebhookChallenge({
      mode: url.searchParams.get('hub.mode'),
      token: url.searchParams.get('hub.verify_token'),
      challenge: url.searchParams.get('hub.challenge'),
      expectedToken: environment.META_CATALOG_WEBHOOK_VERIFY_TOKEN,
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
  rateLimit: RATE_LIMIT.META_CATALOG_WEBHOOK,
  handler: async ({ request, traceId }) => {
    // Texto cru, e nao `request.json()`: o HMAC e sobre os bytes enviados, e reserializar o objeto
    // muda espacos e ordem de chaves o bastante para invalidar a assinatura de um evento legitimo.
    const rawBody = await request.text();

    verifyWebhookSignature({
      rawBody,
      signatureHeader: request.headers.get(SIGNATURE_HEADER),
      appSecret: environment.WHATSAPP_APP_SECRET,
    });

    const verdicts = extractReviewVerdicts(rawBody);

    const applied = await Promise.all(
      verdicts.map((verdict) =>
        catalogModule.useCases.recordMetaReviewVerdict.execute({
          companyId: environment.ADA_COMPANY_ID,
          retailerId: verdict.retailerId,
          approved: verdict.approved,
          ...(verdict.externalId ? { externalId: verdict.externalId } : {}),
          ...(verdict.reason ? { reason: verdict.reason } : {}),
        }),
      ),
    );

    // So contagem e id opaco — nunca o corpo. Evento de catalogo carrega dado comercial, e log nao
    // e lugar de inventario nem de preco.
    logger.info({
      message: 'Webhook de catalogo recebido',
      source: SOURCE,
      traceId,
      meta: {
        bytes: rawBody.length,
        verdicts: verdicts.length,
        applied: applied.filter((result) => result.applied).length,
      },
    });

    return jsonData({ received: true });
  },
};

/**
 * Sem verify token a rota nao existe.
 *
 * Nao depende de `WHATSAPP_ENABLED`: desligar mensagens nao desliga o catalogo, que responde a
 * outros canais.
 *
 * Endpoint publico que aceita qualquer corpo e pior do que endpoint nenhum: sem o segredo nao ha o
 * que conferir no desafio, e a rota viraria confirmacao gratuita de que o host responde.
 */
export const metaCatalogRoutes: readonly Route[] =
  environment.META_CATALOG_WEBHOOK_VERIFY_TOKEN.length > 0 ? [challengeRoute, receiveRoute] : [];
