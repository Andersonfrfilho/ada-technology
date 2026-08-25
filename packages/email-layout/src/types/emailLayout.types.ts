/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** Quem recebe, no cartao de identificacao do e-mail. */
export type EmailRecipientCard = {
  readonly name: string;
  readonly email: string;
  /** Papel no painel ("Atendente", "Administradora"). Ausente, a linha some. */
  readonly role?: string;
  /** Empresa a que a conta pertence. Ausente, a linha some. */
  readonly companyName?: string;
  /** Ja formatado pelo chamador: fuso e idioma sao decisao de quem envia. */
  readonly lastAccessLabel?: string;
};

/** A acao unica do e-mail. Ausente, nenhum botao e desenhado. */
export type EmailAction = {
  readonly label: string;
  readonly url: string;
};

export type BuildEmailHtmlParams = {
  readonly subject: string;
  /**
   * O corpo ja renderizado e ESCAPADO pelo `renderTemplate` do contracts, com `<br>` no lugar da
   * quebra de linha. O layout nao escapa de novo — escaparia o proprio `<br>`.
   */
  readonly bodyHtml: string;
  readonly recipient: EmailRecipientCard;
  readonly action?: EmailAction;
  /**
   * URL publica e absoluta do logo. Chega de fora (`environment.EMAIL_LOGO_URL`) em vez de o layout
   * ler o config: a moldura e uma funcao pura de string, e ler ambiente aqui obrigaria qualquer
   * teste ou preview a subir o schema inteiro de env.
   */
  readonly logoUrl?: string;
  /** Por que esta pessoa recebeu — o rodape precisa dizer, e varia por notificacao. */
  readonly reason: string;
};
