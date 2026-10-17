/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { EMAIL_COMPANY, EMAIL_LOGO_HEIGHT, EMAIL_MAX_WIDTH, EMAIL_PALETTE } from './emailLayout.constant';
import type { BuildEmailHtmlParams, EmailRecipientCard } from './types/emailLayout.types';

/**
 * A moldura HTML dos e-mails do produto.
 *
 * Mora num pacote do PRODUTO, e nao no `notification-module`, pela mesma razao que o texto do
 * template mora no host (`passwordResetTemplate.constant.ts`): marca e copy sao do produto. E mora
 * num pacote, e nao dentro do `api-ada`, porque o painel precisa da MESMA funcao para o preview —
 * duas copias divergem no primeiro ajuste de cor, e o preview passa a mentir.
 *
 * Restricoes que explicam o codigo feio: tabela em vez de flex, estilo inline em vez de classe, e
 * nenhum asset externo. Cliente de e-mail nao e navegador — Outlook desenha com o motor do Word,
 * Gmail remove `<style>` em encaminhamento, e imagem remota chega bloqueada por padrao. Por isso a
 * marca e tipografia, nao arquivo.
 */
export function buildEmailHtml(params: BuildEmailHtmlParams): string {
  const { subject, bodyHtml, recipient, action, reason, logoUrl } = params;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<style>
  /* Sobrevive no Apple Mail e no Gmail com HTML preservado; onde cair, o inline abaixo assume. */
  @media (max-width: 620px) {
    .adam-shell { width: 100% !important; }
    .adam-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .adam-stack { display: block !important; width: 100% !important; }
  }
  @media (prefers-color-scheme: dark) {
    .adam-canvas { background: #0b1220 !important; }
    .adam-surface { background: #111c33 !important; }
    .adam-text { color: #e8eefc !important; }
    .adam-muted { color: #9fb0d0 !important; }
    .adam-card { background: #0f1830 !important; border-color: #24324f !important; }
  }
</style>
</head>
<body class="adam-canvas" style="margin:0;padding:0;background:${EMAIL_PALETTE.CANVAS};">
<!-- Preheader: o trecho que a caixa de entrada mostra ao lado do assunto. Sem ele, o cliente
     rouba a primeira linha do corpo, que costuma ser "Ola, Fulano". -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(reason)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_PALETTE.CANVAS};">
<tr><td align="center" style="padding:32px 12px;">

<table role="presentation" class="adam-shell" width="${EMAIL_MAX_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${EMAIL_MAX_WIDTH}px;max-width:100%;">
  ${renderHeader(logoUrl)}

  <tr><td class="adam-surface" style="background:${EMAIL_PALETTE.SURFACE};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td class="adam-pad" style="padding:32px 32px 8px;">
        <p class="adam-text" style="margin:0 0 16px;font:600 20px/1.35 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.TEXT};">Ola, ${escapeHtml(firstNameOf(recipient.name))}</p>
        <div class="adam-text" style="font:400 15px/1.65 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.TEXT};">${bodyHtml}</div>
      </td></tr>
      ${action ? renderAction(action) : ''}
      <tr><td class="adam-pad" style="padding:8px 32px 32px;">
        ${renderRecipientCard(recipient)}
      </td></tr>
    </table>
  </td></tr>

  ${renderCompanyCard()}
  ${renderFooter(reason)}
</table>

</td></tr>
</table>
</body>
</html>`;
}

/**
 * Cabecalho com o logo quando ha `EMAIL_LOGO_URL`, e com a marca tipografica quando nao ha.
 *
 * Duas decisoes que nao sao gosto:
 *
 * 1. O logo entra por URL PUBLICA, nunca embutido. `data:` e descartado pelo Gmail e pelo Outlook,
 *    e anexo `cid:` exigiria o driver aceitar anexo — `SendEmailParams` nao tem esse campo.
 * 2. A faixa e BRANCA. O `ada-logo.png` e azul-marinho sobre transparente: sobre a faixa da marca
 *    ele sumiria. A cor volta como um filete no topo, que arredonda o cartao sem apagar o logo.
 *
 * O `alt` carrega o nome da empresa porque imagem remota chega bloqueada por padrao em quase todo
 * cliente — sem ele, quem nao clica em "exibir imagens" abre um e-mail sem remetente visivel.
 */
function renderHeader(logoUrl: string | undefined): string {
  const mark = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${EMAIL_COMPANY.NAME}" height="${EMAIL_LOGO_HEIGHT}" style="height:${EMAIL_LOGO_HEIGHT}px;width:auto;display:block;border:0;outline:none;text-decoration:none;">`
    : `<span style="font:700 18px/1 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:.14em;color:${EMAIL_PALETTE.TEXT};">ADA</span><span style="font:400 13px/1 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.MUTED};padding-left:10px;">${EMAIL_COMPANY.NAME}</span>`;

  return `<tr><td style="background:${EMAIL_PALETTE.BRAND};border-radius:14px 14px 0 0;font-size:0;line-height:0;height:4px;">&nbsp;</td></tr>
  <tr><td class="adam-surface adam-pad" style="background:${EMAIL_PALETTE.SURFACE};padding:20px 32px;border-bottom:1px solid ${EMAIL_PALETTE.BORDER};">${mark}</td></tr>`;
}

/**
 * Botao "a prova de balas": Outlook ignora `border-radius` e `padding` em `<a>`, entao o retangulo
 * clicavel e a propria celula da tabela. Sem isto, a acao vira um link azul sublinhado no cliente
 * que mais aparece em base corporativa.
 */
function renderAction(action: { readonly label: string; readonly url: string }): string {
  return `<tr><td class="adam-pad" style="padding:16px 32px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" bgcolor="${EMAIL_PALETTE.BRAND}" style="border-radius:10px;">
        <a href="${escapeHtml(action.url)}" style="display:inline-block;padding:14px 28px;font:600 15px/1 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(action.label)}</a>
      </td></tr>
    </table>
    <p class="adam-muted" style="margin:12px 0 0;font:400 12px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.MUTED};word-break:break-all;">Se o botao nao abrir, copie: ${escapeHtml(action.url)}</p>
  </td></tr>`;
}

/** Cartao de quem recebeu: confirma a conta a que o aviso se refere, sem expor nada alem do que o dono ja sabe. */
function renderRecipientCard(recipient: EmailRecipientCard): string {
  const rows: readonly (readonly [string, string | undefined])[] = [
    ['E-mail', recipient.email],
    ['Empresa', recipient.companyName],
    ['Perfil', recipient.role],
    ['Ultimo acesso', recipient.lastAccessLabel],
  ];

  const body = rows
    .filter((row): row is readonly [string, string] => Boolean(row[1]))
    .map(
      ([labelText, value]) => `<tr>
        <td class="adam-muted" style="padding:5px 12px 5px 0;font:400 12px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.MUTED};white-space:nowrap;">${escapeHtml(labelText)}</td>
        <td class="adam-text" style="padding:5px 0;font:500 13px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.TEXT};">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join('');

  return `<table role="presentation" class="adam-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_PALETTE.BRAND_SOFT};border:1px solid ${EMAIL_PALETTE.BORDER};border-radius:12px;">
    <tr><td style="padding:18px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="44" style="width:44px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${EMAIL_PALETTE.BRAND}" width="44" height="44" style="width:44px;height:44px;border-radius:22px;font:600 15px/44px -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">${escapeHtml(initialsOf(recipient.name))}</td></tr></table></td>
          <td style="padding-left:14px;">
            <p class="adam-text" style="margin:0;font:600 15px/1.35 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.TEXT};">${escapeHtml(recipient.name)}</p>
            <p class="adam-muted" style="margin:2px 0 0;font:400 12px/1.4 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.MUTED};">Conta do painel</p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border-top:1px solid ${EMAIL_PALETTE.BORDER};">
        <tr><td style="padding-top:10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">${body}</table></td></tr>
      </table>
    </td></tr>
  </table>`;
}

function renderCompanyCard(): string {
  return `<tr><td class="adam-surface adam-pad" style="background:${EMAIL_PALETTE.SURFACE};border-top:1px solid ${EMAIL_PALETTE.BORDER};padding:22px 32px;">
    <p class="adam-text" style="margin:0;font:600 14px/1.4 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.TEXT};">${EMAIL_COMPANY.NAME}</p>
    <p class="adam-muted" style="margin:4px 0 10px;font:400 13px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.MUTED};">${EMAIL_COMPANY.TAGLINE}</p>
    <a href="${EMAIL_COMPANY.SITE_URL}" style="font:500 13px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.BRAND};text-decoration:none;">${EMAIL_COMPANY.SITE_LABEL}</a>
    <span class="adam-muted" style="font:400 13px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.MUTED};padding:0 8px;">&middot;</span>
    <a href="mailto:${EMAIL_COMPANY.SUPPORT_EMAIL}" style="font:500 13px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.BRAND};text-decoration:none;">${EMAIL_COMPANY.SUPPORT_EMAIL}</a>
  </td></tr>`;
}

function renderFooter(reason: string): string {
  return `<tr><td class="adam-pad" style="padding:18px 32px 0;">
    <p class="adam-muted" style="margin:0;font:400 12px/1.6 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_PALETTE.MUTED};">${escapeHtml(reason)}</p>
  </td></tr>`;
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Escapa TUDO que veio de fora do layout. Nome e empresa sao texto que alguem digitou no cadastro;
 * sem isto, um `<img onerror>` no nome vira HTML no cliente de e-mail de quem recebe.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
