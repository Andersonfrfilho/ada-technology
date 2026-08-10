/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FlowGraphData } from '@adatechnology/meta-whatsapp-contracts';
import { describe, expect, test } from 'bun:test';

import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import type { RecordAuditLogParams } from '@/modules/audit/types/audit.types';
import { DEFAULT_FLOW_KEY } from '@/modules/conversation/conversation.constant';
import { CreateFlowGraphUseCase } from '@/modules/flow/createFlowGraph.use-case';
import { DeleteFlowGraphUseCase } from '@/modules/flow/deleteFlowGraph.use-case';
import {
  FlowKeyAlreadyExistsError,
  FlowNotFoundError,
  FlowRootNotDeletableError,
  FlowVersionConflictError,
} from '@/modules/flow/flow.error';
import { SaveFlowGraphUseCase } from '@/modules/flow/saveFlowGraph.use-case';
import type { FlowGraphPort } from '@/modules/flow/types/flow.types';

const COMPANY_ID = 'ada';
const AGENT_ID = 'e2b7f0c4-6b6e-4a3f-9f2a-2c9d7e5b1a44';
const FLOW_KEY = 'produtos';

function buildGraph(overrides: Partial<FlowGraphData> = {}): FlowGraphData {
  return {
    key: FLOW_KEY,
    label: 'Produtos',
    startNodeId: 'inicio',
    version: 3,
    nodes: { inicio: { id: 'inicio', type: 'action', actionKind: 'handoff' } },
    ...overrides,
  };
}

function buildAuditSpy(): { useCase: RecordAuditLogUseCase; entries: RecordAuditLogParams[] } {
  const entries: RecordAuditLogParams[] = [];
  const useCase = {
    execute: async (params: RecordAuditLogParams) => {
      entries.push(params);
    },
  } satisfies RecordAuditLogUseCase;

  return { useCase, entries };
}

function buildFlowsPort(overrides: Partial<FlowGraphPort> = {}): FlowGraphPort {
  return {
    get: async () => undefined,
    save: async ({ graph }) => graph,
    create: async ({ key, label, startNodeId, nodes }) => ({
      key,
      label,
      startNodeId,
      version: 1,
      nodes,
    }),
    remove: async () => undefined,
    ...overrides,
  };
}

describe('CreateFlowGraphUseCase', () => {
  test('cria o fluxo com um unico no de handoff e registra a auditoria', async () => {
    const audit = buildAuditSpy();
    const useCase = new CreateFlowGraphUseCase({
      flows: buildFlowsPort(),
      recordAuditLog: audit.useCase,
    });

    const created = await useCase.execute({
      companyId: COMPANY_ID,
      key: FLOW_KEY,
      label: 'Produtos',
      showInMenu: true,
      agentId: AGENT_ID,
    });

    expect(Object.keys(created.nodes)).toEqual(['inicio']);
    expect(created.nodes.inicio).toMatchObject({ type: 'action', actionKind: 'handoff' });
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]?.metadata).toEqual({ flowKey: FLOW_KEY, showInMenu: true });
  });

  test('recusa chave ja usada por outro fluxo', async () => {
    const audit = buildAuditSpy();
    const useCase = new CreateFlowGraphUseCase({
      flows: buildFlowsPort({ get: async () => buildGraph() }),
      recordAuditLog: audit.useCase,
    });

    const attempt = useCase.execute({
      companyId: COMPANY_ID,
      key: FLOW_KEY,
      label: 'Produtos',
      showInMenu: false,
      agentId: AGENT_ID,
    });

    await expect(attempt).rejects.toBeInstanceOf(FlowKeyAlreadyExistsError);
    expect(audit.entries).toHaveLength(0);
  });
});

describe('SaveFlowGraphUseCase', () => {
  test('salva com a versao do editor e audita chave, versao e tamanho', async () => {
    const audit = buildAuditSpy();
    const seen: number[] = [];
    const useCase = new SaveFlowGraphUseCase({
      flows: buildFlowsPort({
        save: async ({ graph, expectedVersion }) => {
          seen.push(expectedVersion);
          return { ...graph, version: graph.version + 1 };
        },
      }),
      recordAuditLog: audit.useCase,
    });

    const saved = await useCase.execute({
      companyId: COMPANY_ID,
      graph: buildGraph(),
      agentId: AGENT_ID,
      ipAddress: '10.0.0.1',
    });

    expect(seen).toEqual([3]);
    expect(saved.version).toBe(4);
    expect(audit.entries[0]?.metadata).toEqual({ flowKey: FLOW_KEY, version: 4, nodeCount: 1 });
    expect(audit.entries[0]?.ipAddress).toBe('10.0.0.1');
  });

  test('traduz a colisao de versao do pacote em conflito de dominio', async () => {
    const audit = buildAuditSpy();
    const lockError = new Error('version mismatch');
    lockError.name = 'OptimisticLockError';

    const useCase = new SaveFlowGraphUseCase({
      flows: buildFlowsPort({
        save: async () => {
          throw lockError;
        },
      }),
      recordAuditLog: audit.useCase,
    });

    const attempt = useCase.execute({
      companyId: COMPANY_ID,
      graph: buildGraph(),
      agentId: AGENT_ID,
    });

    await expect(attempt).rejects.toBeInstanceOf(FlowVersionConflictError);
    expect(audit.entries).toHaveLength(0);
  });

  test('deixa passar erro que nao e de concorrencia', async () => {
    const audit = buildAuditSpy();
    const useCase = new SaveFlowGraphUseCase({
      flows: buildFlowsPort({
        save: async () => {
          throw new Error('conexao caiu');
        },
      }),
      recordAuditLog: audit.useCase,
    });

    const attempt = useCase.execute({
      companyId: COMPANY_ID,
      graph: buildGraph(),
      agentId: AGENT_ID,
    });

    await expect(attempt).rejects.toThrow('conexao caiu');
  });
});

describe('DeleteFlowGraphUseCase', () => {
  test('recusa excluir o fluxo por onde toda conversa comeca', async () => {
    const audit = buildAuditSpy();
    const removed: string[] = [];
    const useCase = new DeleteFlowGraphUseCase({
      flows: buildFlowsPort({
        get: async () => buildGraph({ key: DEFAULT_FLOW_KEY }),
        remove: async ({ key }) => {
          removed.push(key);
        },
      }),
      recordAuditLog: audit.useCase,
    });

    const attempt = useCase.execute({
      companyId: COMPANY_ID,
      key: DEFAULT_FLOW_KEY,
      agentId: AGENT_ID,
    });

    await expect(attempt).rejects.toBeInstanceOf(FlowRootNotDeletableError);
    expect(removed).toHaveLength(0);
  });

  test('recusa fluxo inexistente antes de tentar remover', async () => {
    const audit = buildAuditSpy();
    const useCase = new DeleteFlowGraphUseCase({
      flows: buildFlowsPort(),
      recordAuditLog: audit.useCase,
    });

    const attempt = useCase.execute({ companyId: COMPANY_ID, key: FLOW_KEY, agentId: AGENT_ID });

    await expect(attempt).rejects.toBeInstanceOf(FlowNotFoundError);
    expect(audit.entries).toHaveLength(0);
  });

  test('remove e audita chave e rotulo do que saiu do ar', async () => {
    const audit = buildAuditSpy();
    const removed: string[] = [];
    const useCase = new DeleteFlowGraphUseCase({
      flows: buildFlowsPort({
        get: async () => buildGraph(),
        remove: async ({ key }) => {
          removed.push(key);
        },
      }),
      recordAuditLog: audit.useCase,
    });

    await useCase.execute({ companyId: COMPANY_ID, key: FLOW_KEY, agentId: AGENT_ID });

    expect(removed).toEqual([FLOW_KEY]);
    expect(audit.entries[0]?.metadata).toEqual({ flowKey: FLOW_KEY, label: 'Produtos' });
    expect(audit.entries[0]?.targetId).toBeUndefined();
  });
});
