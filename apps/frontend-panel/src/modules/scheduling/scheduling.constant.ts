/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

const SCHEDULING_BASE_PATH = '/v1/panel/scheduling';

export const SCHEDULING_PATH = {
  RESOURCES: `${SCHEDULING_BASE_PATH}/resources`,
  SERVICES: `${SCHEDULING_BASE_PATH}/services`,
  AVAILABILITY: `${SCHEDULING_BASE_PATH}/availability`,
  AVAILABILITY_EXCEPTIONS: `${SCHEDULING_BASE_PATH}/availability-exceptions`,
  BOOKINGS: `${SCHEDULING_BASE_PATH}/bookings`,
} as const;

export const SCHEDULING_ROWS_PER_PAGE = 20;

/** O expediente que a grade da agenda desenha. Fora dele nao ha linha, e nao ha rolagem morta. */
export const SCHEDULING_UI_CONFIG = {
  locale: 'pt-BR',
  weekStartsOn: 1,
  agendaStartHour: 8,
  agendaEndHour: 19,
} as const;

/** A area aberta mora na query string, em portugues, como nas outras telas do painel. */
export const SCHEDULING_AREA_URL_KEY = 'aba';

export const SCHEDULING_AREA_URL_VALUE = {
  AGENDA: 'agenda',
  BOOKINGS: 'reservas',
  RESOURCES: 'recursos',
  SERVICES: 'servicos',
  AVAILABILITY: 'disponibilidade',
} as const;
