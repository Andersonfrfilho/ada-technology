/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RESOURCE_KIND, type Resource, type Service } from '@adatechnology/scheduling-contracts';
import type { SchedulingModule } from '@adatechnology/scheduling-module';

import type { AgentRepositoryInterface } from '@/modules/agent/types/agent.types';
import {
  SCHEDULING_DEFAULT_SERVICE,
  SCHEDULING_PROVISION_PAGE_SIZE,
  SCHEDULING_RESOURCE_TIMEZONE,
} from '@/modules/scheduling/scheduling.constant';

/**
 * O atendente da Ada vira recurso da agenda.
 *
 * O modulo nao conhece usuario do produto: ele agenda recurso, e a ponte e o `externalRef`, que
 * guarda o id do atendente — id opaco, nunca nome nem contato. O servico existe porque a
 * disponibilidade e sempre calculada para um servico; este produto tem um so, e e ele que da a
 * duracao da conversa.
 *
 * Idempotente por construcao: rodar de novo reaproveita o que ja existe. E o que permite chamar no
 * deploy e ao criar atendente, sem ninguem precisar lembrar de qual dos dois ja rodou.
 */
export class ProvisionSchedulingResourcesUseCase {
  constructor(
    private readonly scheduling: SchedulingModule,
    private readonly agents: AgentRepositoryInterface,
    private readonly companyId: string,
  ) {}

  async execute(): Promise<void> {
    const service = await this.ensureService();
    const profiles = await this.agents.listActive();

    const { data: resources } = await this.scheduling.useCases.listResources.execute({
      companyId: this.companyId,
      pageSize: SCHEDULING_PROVISION_PAGE_SIZE,
    });
    const byExternalRef = new Map(
      resources.filter((resource) => resource.externalRef).map((resource) => [resource.externalRef, resource]),
    );

    for (const profile of profiles) {
      const resource = byExternalRef.get(profile.id) ?? (await this.createResource(profile));
      await this.scheduling.useCases.linkResourceToService.execute({
        companyId: this.companyId,
        serviceId: service.id,
        resourceId: resource.id,
      });
    }
  }

  private async ensureService(): Promise<Service> {
    const { data } = await this.scheduling.useCases.listServices.execute({
      companyId: this.companyId,
      pageSize: SCHEDULING_PROVISION_PAGE_SIZE,
    });
    const existing = data.find((service) => service.name === SCHEDULING_DEFAULT_SERVICE.name);
    if (existing) return existing;

    return this.scheduling.useCases.createService.execute({
      companyId: this.companyId,
      input: { ...SCHEDULING_DEFAULT_SERVICE },
    });
  }

  private async createResource(profile: { readonly id: string; readonly name: string }): Promise<Resource> {
    return this.scheduling.useCases.createResource.execute({
      companyId: this.companyId,
      input: {
        name: profile.name,
        kind: RESOURCE_KIND.PERSON,
        timezone: SCHEDULING_RESOURCE_TIMEZONE,
        externalRef: profile.id,
      },
    });
  }
}
