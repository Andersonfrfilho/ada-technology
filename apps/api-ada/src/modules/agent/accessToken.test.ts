/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { signAccessToken, verifyAccessToken } from '@/modules/agent/accessToken';
import { authenticateRequest } from '@/modules/agent/authenticateRequest';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';

const AGENT = { agentId: '0f4d2a1e-8c6b-4f9a-9d1c-3b5e7a2c6d80', role: AGENT_ROLE.AGENT } as const;
const URL_UNDER_TEST = 'https://api.ada.test/v1/auth/me';

function buildRequest(authorization?: string): Request {
  return new Request(URL_UNDER_TEST, { headers: authorization ? { authorization } : {} });
}

describe('accessToken', () => {
  it('devolve o mesmo atendente que assinou', async () => {
    const token = await signAccessToken(AGENT);

    expect(await verifyAccessToken(token)).toEqual(AGENT);
  });

  it('nao carrega dado pessoal no corpo do token', async () => {
    const token = await signAccessToken(AGENT);
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));

    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'role', 'sub']);
  });

  it('recusa token com assinatura adulterada', async () => {
    const [header, payload] = (await signAccessToken(AGENT)).split('.');

    expect(await verifyAccessToken(`${header}.${payload}.assinaturaFalsa`)).toBeUndefined();
  });

  it('recusa qualquer coisa que nao seja um token', async () => {
    expect(await verifyAccessToken('nao-e-um-jwt')).toBeUndefined();
  });
});

describe('authenticateRequest', () => {
  it('autentica pelo cabecalho no formato esperado', async () => {
    const request = buildRequest(`Bearer ${await signAccessToken(AGENT)}`);

    expect(await authenticateRequest(request)).toEqual(AGENT);
  });

  it('ignora cabecalho ausente', async () => {
    expect(await authenticateRequest(buildRequest())).toBeUndefined();
  });

  it('ignora token enviado sem o esquema', async () => {
    const request = buildRequest(await signAccessToken(AGENT));

    expect(await authenticateRequest(request)).toBeUndefined();
  });

  it('ignora esquema sem token', async () => {
    expect(await authenticateRequest(buildRequest('Bearer   '))).toBeUndefined();
  });
});
