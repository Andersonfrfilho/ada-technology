/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Producao e o padrao de proposito.
 *
 * O ambiente entra por variavel de build, e variavel esquecida vira `undefined`. Se a ausencia
 * ligasse o selo, o dia em que alguem esquecesse de configurar o deploy poria "em obras" na frente
 * do visitante. Do jeito contrario, o esquecimento so tira a faixa de um ambiente interno.
 */
export const APP_ENVIRONMENT = {
  DEVELOPMENT: 'dev',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

export type AppEnvironment = (typeof APP_ENVIRONMENT)[keyof typeof APP_ENVIRONMENT];

/** Nao e enfeite: e o que distingue a aba de homologacao da aba de producao na mesma janela. */
export const ENVIRONMENT_BADGE_EMOJI = '🚧';

export const ENVIRONMENT_BADGE_HEIGHT = '1.5rem';

export const ENVIRONMENT_BADGE_LABEL: Readonly<Record<'dev' | 'staging', string>> = {
  dev: 'Ambiente de desenvolvimento',
  staging: 'Ambiente de homologação — os dados daqui são de teste',
};
