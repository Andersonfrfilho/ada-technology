/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { localCredentialsSchema } from '@ada/user-sdk';
import { z } from 'zod';

/**
 * Mesmas regras de `localCredentialsSchema` do `@ada/user-sdk` (teto de senha incluso: sem ele, um
 * corpo de megabytes vira um argon2 sobre megabytes, e uma rota de login sem sessao alguma derruba
 * a API). O alias existe so para o nome do dominio (`agent`) continuar aparecendo no import deste
 * modulo.
 */
export const agentLoginSchema = localCredentialsSchema.extend({
  /**
   * Lembrar-me: decide a VIDA DO COOKIE, nao a do token.
   *
   * Marcado, o refresh vira cookie persistente e a sessao sobrevive a fechar o navegador. Desmarcado
   * — o padrao — o cookie e de sessao e morre com a janela, que e o que se espera de uma maquina
   * emprestada. O token no Redis expira no mesmo prazo nos dois casos: quem some e o cookie, e um
   * refresh sem cookie nao renova nada.
   */
  rememberMe: z.boolean().default(false),
});

/**
 * Cadastro de atendente pelo painel.
 *
 * A senha inicial vem de quem cria. Trocar depois e por redefinicao: o administrador dispara o
 * e-mail pela tela de usuarios, e a pessoa escolhe a propria senha pelo link.
 */
export const agentCreateSchema = localCredentialsSchema.extend({
  name: z.string().trim().min(2).max(120),
  role: z.enum(['admin', 'agent']).default('agent'),
});

/**
 * Alteracao parcial: nome, papel e situacao, em qualquer combinacao.
 *
 * O e-mail nao entra. Ele e a identidade de login e aparece em trilha de auditoria e em historico
 * de conversa — troca-lo por um campo de formulario faria o passado apontar para outra pessoa.
 *
 * `refine` exige ao menos um campo: um corpo vazio passaria pelo schema, gravaria nada e responderia
 * 200, dizendo que salvou.
 */
export const agentUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    role: z.enum(['admin', 'agent']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.role !== undefined || value.isActive !== undefined,
    { message: 'informe ao menos um campo' },
  );

/**
 * Confirmacao da redefinicao: o token do e-mail e a senha nova.
 *
 * A senha reusa as regras do `localCredentialsSchema` — inclusive o teto, sem o qual um corpo de
 * megabytes viraria um argon2 sobre megabytes numa rota publica.
 */
export const agentResetConfirmSchema = z.object({
  token: z.string().min(16).max(128),
  password: localCredentialsSchema.shape.password,
});
