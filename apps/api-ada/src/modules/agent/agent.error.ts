/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { DomainError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';

const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const CONFLICT = 409;

/**
 * Uma so mensagem para senha errada, e-mail inexistente e conta desativada.
 *
 * Distinguir os casos entregaria de graca a lista de quem tem conta aqui, que e o primeiro passo
 * de qualquer tentativa de forca bruta dirigida.
 */
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.agent.INVALID_CREDENTIALS,
      message: 'Credenciais invalidas',
      statusCode: UNAUTHORIZED,
    });
  }
}

export class AgentNotAuthenticatedError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.agent.NOT_AUTHENTICATED,
      message: 'Autenticacao necessaria',
      statusCode: UNAUTHORIZED,
    });
  }
}

export class AgentNotAuthorizedError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.agent.NOT_AUTHORIZED,
      message: 'Acesso negado',
      statusCode: FORBIDDEN,
    });
  }
}

/** Sem o id nem o e-mail no contexto: quem cria a conta ja sabe qual e-mail digitou. */
export class AgentEmailAlreadyExistsError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.agent.EMAIL_ALREADY_EXISTS,
      message: 'Ja existe um atendente com este e-mail',
      statusCode: CONFLICT,
    });
  }
}

export class AgentNotFoundError extends DomainError {
  constructor(agentId: string) {
    super({
      code: ERROR_CODES.agent.NOT_FOUND,
      message: 'Atendente nao encontrado',
      statusCode: NOT_FOUND,
      context: { agentId },
    });
  }
}

/**
 * Ninguem se desativa.
 *
 * Sem isto, um admin sozinho tira o proprio acesso com um clique e a unica saida vira `railway ssh`
 * no conteiner — exatamente o gargalo que a tela de usuarios existe para eliminar.
 */
export class AgentCannotDeactivateSelfError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.agent.CANNOT_DEACTIVATE_SELF,
      message: 'Voce nao pode desativar a propria conta',
      statusCode: 409,
    });
  }
}

/** Sem bucket configurado nao ha onde guardar — 503, e nao 500: e configuracao, nao defeito. */
export class AgentAvatarUnavailableError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.agent.AVATAR_UNAVAILABLE,
      message: 'Foto de perfil indisponivel neste ambiente',
      statusCode: 503,
    });
  }
}

export class AgentAvatarForbiddenError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.agent.AVATAR_FORBIDDEN,
      message: 'Voce so pode trocar a propria foto',
      statusCode: 403,
    });
  }
}

/**
 * O motivo vai no contexto, e nao na frase.
 *
 * "Grande demais" e "tipo nao suportado" pedem correcoes diferentes, e a tela precisa distinguir os
 * dois sem casar texto traduzido.
 */
export class AgentAvatarRejectedError extends DomainError {
  constructor(reason: string) {
    super({
      code: ERROR_CODES.agent.AVATAR_REJECTED,
      message: 'Foto recusada',
      statusCode: 400,
      context: { reason },
    });
  }
}
