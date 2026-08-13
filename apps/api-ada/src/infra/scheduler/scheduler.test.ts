/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { runDueTasks, startScheduler, type ScheduledTask } from '@/infra/scheduler/scheduler';

const COMPANY_ID = 'company-1';
const NOW = new Date('2026-08-13T10:05:00');

function everyFiveMinutes(run: ScheduledTask['run']): ScheduledTask {
  return { name: 'catalog:sync-pending', cronExpression: '*/5 * * * *', run };
}

describe('startScheduler', () => {
  test('sem tarefa declarada nao sobe relogio nenhum', () => {
    expect(() => startScheduler({ tasks: [], companyId: COMPANY_ID }).stop()).not.toThrow();
  });

  test('expressao invalida derruba o boot, em vez de virar tarefa muda', () => {
    const task: ScheduledTask = { name: 'quebrada', cronExpression: 'todo dia', run: async () => undefined };

    expect(() => startScheduler({ tasks: [task], companyId: COMPANY_ID })).toThrow(/invalida/);
  });
});

describe('runDueTasks', () => {
  test('a tarefa que vence neste minuto recebe a empresa do host', async () => {
    const seen: string[] = [];

    await runDueTasks({
      tasks: [everyFiveMinutes(async (companyId) => void seen.push(companyId))],
      companyId: COMPANY_ID,
      now: NOW,
      running: new Set(),
    });

    expect(seen).toEqual([COMPANY_ID]);
  });

  test('minuto que nao casa nao dispara nada', async () => {
    let calls = 0;

    await runDueTasks({
      tasks: [everyFiveMinutes(async () => void (calls += 1))],
      companyId: COMPANY_ID,
      now: new Date('2026-08-13T10:07:00'),
      running: new Set(),
    });

    expect(calls).toBe(0);
  });

  test('falha da Graph API nao propaga para o processo', async () => {
    const task = everyFiveMinutes(async () => {
      throw new Error('Graph API fora do ar');
    });

    await expect(
      runDueTasks({ tasks: [task], companyId: COMPANY_ID, now: NOW, running: new Set() }),
    ).resolves.toBeUndefined();
  });

  test('tique novo e ignorado enquanto a varredura anterior nao termina', async () => {
    let started = 0;
    const running = new Set<string>();
    const task = everyFiveMinutes(async () => {
      started += 1;
      await Bun.sleep(20);
    });

    const first = runDueTasks({ tasks: [task], companyId: COMPANY_ID, now: NOW, running });
    await runDueTasks({ tasks: [task], companyId: COMPANY_ID, now: NOW, running });
    await first;

    expect(started).toBe(1);
  });
});
