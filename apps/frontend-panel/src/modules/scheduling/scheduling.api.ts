/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  AvailabilityException,
  AvailabilityRule,
  AvailableSlot,
  Booking,
  PaginatedResponse,
  Resource,
  Service,
} from '@adatechnology/scheduling-contracts';
import type { SchedulingApi } from '@adatechnology/scheduling-ui';

import { HTTP_METHOD } from '@/modules/shared/http/http.constant';
import { panelListRequest, panelRequest } from '@/modules/shared/http/panelHttpClient';
import {
  SCHEDULING_PATH,
  SCHEDULING_ROWS_PER_PAGE,
} from '@/modules/scheduling/scheduling.constant';
import { reviveDates } from '@/modules/scheduling/reviveDates.util';

/** Paginacao do modulo: `pageSize`/`totalPages`, e nao o `perPage` das rotas proprias do painel. */
type ModulePagination = {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

async function listPaginated<TItem>(
  path: string,
  query: Readonly<Record<string, string | number | boolean | undefined>>,
): Promise<PaginatedResponse<TItem>> {
  const { items, pagination } = await panelListRequest<TItem>({ path, query });
  const { total, page, pageSize, totalPages } = pagination as unknown as ModulePagination;

  return { data: reviveDates(items), total, page, pageSize, totalPages };
}

async function request<TResult>(params: Parameters<typeof panelRequest>[0]): Promise<TResult> {
  return reviveDates(await panelRequest<TResult>(params));
}

function resourcePath(id: string): string {
  return `${SCHEDULING_PATH.RESOURCES}/${encodeURIComponent(id)}`;
}

function servicePath(id: string): string {
  return `${SCHEDULING_PATH.SERVICES}/${encodeURIComponent(id)}`;
}

function bookingPath(id: string, action = ''): string {
  return `${SCHEDULING_PATH.BOOKINGS}/${encodeURIComponent(id)}${action}`;
}

/**
 * A ponte entre a tela do pacote e as rotas do modulo sob `/v1/panel/scheduling`.
 *
 * Nenhum metodo manda `companyId`: a empresa sai do token no servidor, e mandar do cliente seria
 * deixar o painel escolher tenant (`security.md` §2).
 */
export const schedulingApi: SchedulingApi = {
  listResources: (params) =>
    listPaginated<Resource>(SCHEDULING_PATH.RESOURCES, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? SCHEDULING_ROWS_PER_PAGE,
      kind: params?.kind,
      active: params?.active,
    }),

  createResource: (input) =>
    request<Resource>({ path: SCHEDULING_PATH.RESOURCES, method: HTTP_METHOD.POST, body: input }),

  updateResource: (id, input) =>
    request<Resource>({ path: resourcePath(id), method: HTTP_METHOD.PUT, body: input }),

  deleteResource: async (id) => {
    await panelRequest<void>({ path: resourcePath(id), method: HTTP_METHOD.DELETE });
  },

  listServices: (params) =>
    listPaginated<Service>(SCHEDULING_PATH.SERVICES, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? SCHEDULING_ROWS_PER_PAGE,
      active: params?.active,
    }),

  createService: (input) =>
    request<Service>({ path: SCHEDULING_PATH.SERVICES, method: HTTP_METHOD.POST, body: input }),

  updateService: (id, input) =>
    request<Service>({ path: servicePath(id), method: HTTP_METHOD.PUT, body: input }),

  deleteService: async (id) => {
    await panelRequest<void>({ path: servicePath(id), method: HTTP_METHOD.DELETE });
  },

  listAvailabilityRules: (resourceId) =>
    request<readonly AvailabilityRule[]>({ path: `${resourcePath(resourceId)}/availability-rules` }),

  setAvailabilityRules: (resourceId, rules) =>
    request<readonly AvailabilityRule[]>({
      path: `${resourcePath(resourceId)}/availability-rules`,
      method: HTTP_METHOD.PUT,
      body: { rules },
    }),

  listAvailabilityExceptions: (resourceId) =>
    request<readonly AvailabilityException[]>({
      path: `${resourcePath(resourceId)}/availability-exceptions`,
    }),

  addAvailabilityException: ({ resourceId, ...body }) =>
    request<AvailabilityException>({
      path: `${resourcePath(resourceId)}/availability-exceptions`,
      method: HTTP_METHOD.POST,
      body,
    }),

  removeAvailabilityException: async (id) => {
    await panelRequest<void>({
      path: `${SCHEDULING_PATH.AVAILABILITY_EXCEPTIONS}/${encodeURIComponent(id)}`,
      method: HTTP_METHOD.DELETE,
    });
  },

  getAvailableSlots: (params) =>
    request<readonly AvailableSlot[]>({
      path: SCHEDULING_PATH.AVAILABILITY,
      query: {
        resourceId: params.resourceId,
        serviceId: params.serviceId,
        from: params.from.toISOString(),
        until: params.until.toISOString(),
      },
    }),

  listBookings: (params) =>
    listPaginated<Booking>(SCHEDULING_PATH.BOOKINGS, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? SCHEDULING_ROWS_PER_PAGE,
      resourceId: params?.resourceId,
      status: params?.status?.join(','),
      from: params?.from?.toISOString(),
      until: params?.until?.toISOString(),
      sortBy: params?.sortBy,
      sortDirection: params?.sortDirection,
    }),

  getBooking: (id) => request<Booking>({ path: bookingPath(id) }),

  /**
   * A chave de idempotencia vai no cabecalho, e nunca no corpo: ela identifica a tentativa, nao a
   * reserva, e um duplo clique com o mesmo cabecalho devolve a mesma reserva em vez de duas.
   */
  requestBooking: (input, idempotencyKey) =>
    request<Booking>({
      path: SCHEDULING_PATH.BOOKINGS,
      method: HTTP_METHOD.POST,
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  confirmBooking: (id) =>
    request<Booking>({ path: bookingPath(id, '/confirm'), method: HTTP_METHOD.POST }),

  rescheduleBooking: (id, input) =>
    request<Booking>({ path: bookingPath(id, '/reschedule'), method: HTTP_METHOD.PUT, body: input }),

  cancelBooking: (id, input) =>
    request<Booking>({ path: bookingPath(id, '/cancel'), method: HTTP_METHOD.POST, body: input }),

  completeBooking: (id) =>
    request<Booking>({ path: bookingPath(id, '/complete'), method: HTTP_METHOD.POST }),

  markNoShow: (id) =>
    request<Booking>({ path: bookingPath(id, '/no-show'), method: HTTP_METHOD.POST }),
};
