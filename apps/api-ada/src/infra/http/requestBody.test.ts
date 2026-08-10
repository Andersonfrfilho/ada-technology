/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { readJsonBody } from '@/infra/http/requestBody';
import { InvalidJsonBodyError } from '@/infra/http/requestBody.error';

const URL_UNDER_TEST = 'https://api.ada.test/v1/widget/sessions/w0123456789abcdef/messages';

function buildRequest(body: string): Request {
  return new Request(URL_UNDER_TEST, { method: 'POST', body });
}

const BAD_REQUEST = 400;

describe('readJsonBody', () => {
  it('devolve o corpo lido', async () => {
    expect(await readJsonBody(buildRequest('{"text":"ola"}'))).toEqual({ text: 'ola' });
  });

  // Sem esta conversao o `SyntaxError` do parser subiria cru e viraria 500 numa rota publica.
  it('troca falha de parse por erro de 400', async () => {
    const promise = readJsonBody(buildRequest('{"text":'));

    await expect(promise).rejects.toBeInstanceOf(InvalidJsonBodyError);
    await expect(promise).rejects.toMatchObject({ statusCode: BAD_REQUEST });
  });

  // `takeover`, `release` e o pedido de bilhete nao tem campo a mandar; onde ha campo obrigatorio,
  // quem reprova e o schema, com a mensagem que aponta o campo.
  it('trata corpo vazio como objeto vazio', async () => {
    expect(await readJsonBody(buildRequest(''))).toEqual({});
    expect(await readJsonBody(buildRequest('   '))).toEqual({});
  });
});
