/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Paleta e textos fixos do e-mail.
 *
 * Valor literal em vez de token de CSS porque cliente de e-mail nao resolve `var()`: Outlook,
 * Gmail no Android e a maioria dos webmails descartam a propriedade inteira. A escala e a mesma do
 * painel (`index.css`, `--color-brand-*`) — quando ela mudar, muda aqui tambem, e nao ha como
 * derivar uma da outra sem um passo de build que este projeto nao tem.
 */
export const EMAIL_PALETTE = {
  BRAND: '#163fae',
  BRAND_DARK: '#0f2668',
  BRAND_SOFT: '#f5f8ff',
  CANVAS: '#eef2f9',
  SURFACE: '#ffffff',
  TEXT: '#0d1b3e',
  MUTED: '#64748b',
  BORDER: '#dbe3f2',
} as const;

export const EMAIL_COMPANY = {
  NAME: 'Ada Technology',
  TAGLINE: 'Atendimento, agenda e catalogo num painel so.',
  SITE_LABEL: 'adatechnology.com.br',
  SITE_URL: 'https://adatechnology.com.br',
  SUPPORT_EMAIL: 'suporte@adatechnology.com.br',
} as const;

/** 600px e a largura que Outlook e Gmail desenham sem cortar; acima disso vira barra de rolagem. */
export const EMAIL_MAX_WIDTH = 600;

/** O `ada-logo.png` e retrato (239x262); 44px de altura o mantem legivel sem dominar o cabecalho. */
export const EMAIL_LOGO_HEIGHT = 44;
