/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createWhatsAppTemplate, templateCatalog } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import { createTemplateSchema } from '@/modules/settings/settings.schema';

const TEMPLATES_PATH = '/v1/panel/templates';

const CREATED = 201;

/** Ler o catalogo custa uma ida a Meta, e nao ao banco: entra no teto de escrita, nao no de leitura. */
const listRoute: Route = {
  method: HTTP_METHOD.GET,
  path: TEMPLATES_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async () => {
    const templates = await templateCatalog.list();

    return jsonData(templates);
  },
};

const createRoute: Route = {
  method: HTTP_METHOD.POST,
  path: TEMPLATES_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const input = createTemplateSchema.parse(await readJsonBody(context.request));
    const { agentId } = requireAgent(context);

    const result = await createWhatsAppTemplate.execute({
      input,
      agentId,
      ipAddress: context.clientAddress,
    });

    return jsonData(result, CREATED);
  },
};

export const panelTemplateRoutes: readonly Route[] = [listRoute, createRoute];
