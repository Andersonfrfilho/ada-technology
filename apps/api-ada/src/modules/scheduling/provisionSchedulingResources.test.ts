/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';
import type { Resource, Service } from '@adatechnology/scheduling-contracts';
import type { SchedulingModule } from '@adatechnology/scheduling-module';

import type { AgentProfile, AgentRepositoryInterface } from '@/modules/agent/types/agent.types';
import { ProvisionSchedulingResourcesUseCase } from '@/modules/scheduling/provisionSchedulingResources.use-case';
import { SCHEDULING_DEFAULT_SERVICE } from '@/modules/scheduling/scheduling.constant';

const COMPANY = 'c0000000-0000-4000-8000-000000000001';
const ANA: AgentProfile = {
  id: 'a0000000-0000-4000-8000-000000000001',
  email: 'ana@example.com',
  name: 'Ana',
  role: 'admin',
} as AgentProfile;
const BRUNO: AgentProfile = { ...ANA, id: 'a0000000-0000-4000-8000-000000000002', name: 'Bruno' };

type Fake = {
  readonly module: SchedulingModule;
  readonly services: Service[];
  readonly resources: Resource[];
  readonly links: string[];
};

function fakeModule(seed: { services?: Service[]; resources?: Resource[] } = {}): Fake {
  const services = seed.services ?? [];
  const resources = seed.resources ?? [];
  const links: string[] = [];
  let sequence = 0;

  const useCases = {
    listServices: { execute: async () => ({ data: services, total: services.length, page: 1, pageSize: 100, totalPages: 1 }) },
    listResources: { execute: async () => ({ data: resources, total: resources.length, page: 1, pageSize: 100, totalPages: 1 }) },
    createService: {
      execute: async ({ input }: { input: { name: string } }) => {
        sequence += 1;
        const service = { id: `service-${sequence}`, companyId: COMPANY, name: input.name } as Service;
        services.push(service);
        return service;
      },
    },
    createResource: {
      execute: async ({ input }: { input: { name: string; externalRef?: string } }) => {
        sequence += 1;
        const resource = {
          id: `resource-${sequence}`,
          companyId: COMPANY,
          name: input.name,
          externalRef: input.externalRef,
        } as Resource;
        resources.push(resource);
        return resource;
      },
    },
    linkResourceToService: {
      execute: async ({ serviceId, resourceId }: { serviceId: string; resourceId: string }) => {
        links.push(`${serviceId}:${resourceId}`);
      },
    },
  };

  return { module: { useCases } as unknown as SchedulingModule, services, resources, links };
}

function fakeAgents(profiles: readonly AgentProfile[]): AgentRepositoryInterface {
  return {
    listActive: async () => profiles,
  } as unknown as AgentRepositoryInterface;
}

describe('ProvisionSchedulingResourcesUseCase', () => {
  test('cria o servico unico e um recurso por atendente', async () => {
    const fake = fakeModule();
    const useCase = new ProvisionSchedulingResourcesUseCase(fake.module, fakeAgents([ANA, BRUNO]), COMPANY);

    await useCase.execute();

    expect(fake.services.map((service) => service.name)).toEqual([SCHEDULING_DEFAULT_SERVICE.name]);
    expect(fake.resources.map((resource) => resource.externalRef)).toEqual([ANA.id, BRUNO.id]);
    expect(fake.links).toHaveLength(2);
  });

  /** Roda no deploy e ao criar atendente: a segunda passada nao pode duplicar nada. */
  test('rodar de novo nao duplica servico nem recurso', async () => {
    const fake = fakeModule();
    const useCase = new ProvisionSchedulingResourcesUseCase(fake.module, fakeAgents([ANA]), COMPANY);

    await useCase.execute();
    await useCase.execute();

    expect(fake.services).toHaveLength(1);
    expect(fake.resources).toHaveLength(1);
  });

  /** O vinculo e o id do atendente, nao o nome: quem troca de nome continua sendo o mesmo recurso. */
  test('atendente que trocou de nome reaproveita o recurso', async () => {
    const fake = fakeModule();
    const useCase = new ProvisionSchedulingResourcesUseCase(fake.module, fakeAgents([ANA]), COMPANY);
    await useCase.execute();

    const renamed = new ProvisionSchedulingResourcesUseCase(
      fake.module,
      fakeAgents([{ ...ANA, name: 'Ana Paula' }]),
      COMPANY,
    );
    await renamed.execute();

    expect(fake.resources).toHaveLength(1);
    expect(fake.resources[0]?.name).toBe('Ana');
  });
});
