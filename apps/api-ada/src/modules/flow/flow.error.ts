/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { DomainError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';

const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;

export class FlowNotFoundError extends DomainError {
  constructor(flowKey: string) {
    super({
      code: ERROR_CODES.flow.NOT_FOUND,
      message: 'Fluxo nao encontrado',
      statusCode: NOT_FOUND,
      context: { flowKey },
    });
  }
}

export class FlowKeyAlreadyExistsError extends DomainError {
  constructor(flowKey: string) {
    super({
      code: ERROR_CODES.flow.KEY_ALREADY_EXISTS,
      message: 'Ja existe um fluxo com essa chave',
      statusCode: CONFLICT,
      context: { flowKey },
    });
  }
}

/** Salvar o grafo A no endereco do grafo B sobrescreveria o fluxo errado sem ninguem perceber. */
export class FlowKeyMismatchError extends DomainError {
  constructor(context: { readonly pathKey: string; readonly bodyKey: string }) {
    super({
      code: ERROR_CODES.flow.KEY_MISMATCH,
      message: 'A chave do fluxo no corpo nao corresponde a do endereco',
      statusCode: BAD_REQUEST,
      context,
    });
  }
}

/**
 * Duas edicoes partindo da mesma versao: a segunda apagaria a primeira em silencio.
 *
 * O 409 e o que faz o editor pedir recarga em vez de mostrar "salvo" sobre um grafo que ja mudou.
 */
export class FlowVersionConflictError extends DomainError {
  constructor(context: { readonly flowKey: string; readonly expectedVersion: number }) {
    super({
      code: ERROR_CODES.flow.VERSION_CONFLICT,
      message: 'O fluxo foi alterado por outra pessoa; recarregue antes de salvar',
      statusCode: CONFLICT,
      context,
    });
  }
}

/**
 * O fluxo raiz e por onde toda conversa comeca.
 *
 * O editor ja esconde o botao, mas quem chama a rota direto nao passa pelo editor — e sem raiz o bot
 * para de atender, o que nenhuma tela deveria conseguir causar.
 */
export class FlowRootNotDeletableError extends DomainError {
  constructor(flowKey: string) {
    super({
      code: ERROR_CODES.flow.ROOT_NOT_DELETABLE,
      message: 'O fluxo principal nao pode ser excluido',
      statusCode: CONFLICT,
      context: { flowKey },
    });
  }
}
