/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { matchesCronExpression, parseCronExpression } from '@/infra/scheduler/cronExpression';
import { SCHEDULER_SOURCE, SCHEDULER_TICK_MS } from '@/infra/scheduler/scheduler.constant';
import { logger } from '@/shared/logger';

export type ScheduledTask = {
  readonly name: string;
  readonly cronExpression: string;
  run(companyId: string): Promise<void>;
};

export type Scheduler = {
  stop(): void;
};

/**
 * Roda os descritores de agendamento que os modulos declaram; nenhum modulo abre timer proprio.
 *
 * O relogio vive dentro da API porque o deploy e um servico so. Se um dia houver mais de uma
 * replica, isto passa a disparar N vezes por minuto — e a hora de mover para `apps/cron-ada` ou
 * de por um lock de advisory no Postgres antes do `run`. Ate la, a duplicata seria absorvida pela
 * idempotencia do proprio use case, mas gastaria chamada da Graph API a toa.
 */
export function startScheduler(params: {
  readonly tasks: readonly ScheduledTask[];
  readonly companyId: string;
}): Scheduler {
  // Capacidade por ausencia: sem tarefa declarada nao ha relogio, e nao ha tique acordando o
  // processo de cinco em cinco minutos para nao fazer nada.
  if (params.tasks.length === 0) return { stop: () => undefined };

  // Valida no boot: expressao quebrada tem que derrubar o processo, nao virar tarefa que nunca roda.
  for (const task of params.tasks) parseCronExpression(task.cronExpression);

  const running = new Set<string>();

  const timer = setInterval(() => {
    void runDueTasks({ tasks: params.tasks, companyId: params.companyId, now: new Date(), running });
  }, SCHEDULER_TICK_MS);

  logger.info({
    message: 'Agendador no ar',
    source: SCHEDULER_SOURCE,
    meta: { tasks: params.tasks.map((task) => task.name) },
  });

  return {
    stop: () => clearInterval(timer),
  };
}

/**
 * Um tique do relogio: dispara o que vence neste minuto.
 *
 * Exportado porque e aqui que mora a decisao — o `setInterval` so conta o tempo, e testar tempo
 * custaria minutos de espera por asserto.
 */
export async function runDueTasks(params: {
  readonly tasks: readonly ScheduledTask[];
  readonly companyId: string;
  readonly now: Date;
  readonly running: Set<string>;
}): Promise<void> {
  const due = params.tasks.filter((task) =>
    matchesCronExpression({ expression: task.cronExpression, date: params.now }),
  );

  await Promise.all(
    due.map((task) => runTask({ task, companyId: params.companyId, running: params.running })),
  );
}

/**
 * Catch local legitimo: falha de uma tarefa nao pode derrubar o processo nem calar as outras. O
 * proximo tique tenta de novo, e o intervalo do cron ja e o backoff.
 */
async function runTask(params: {
  readonly task: ScheduledTask;
  readonly companyId: string;
  readonly running: Set<string>;
}): Promise<void> {
  const { task, companyId, running } = params;

  // Guarda de sobreposicao: varredura que passa dos cinco minutos nao pode ganhar uma concorrente.
  if (running.has(task.name)) {
    logger.warn({
      message: 'Tarefa agendada ainda em execucao, tique ignorado',
      source: SCHEDULER_SOURCE,
      meta: { task: task.name },
    });
    return;
  }

  running.add(task.name);

  try {
    await task.run(companyId);
  } catch (error) {
    logger.error({
      message: 'Tarefa agendada falhou',
      source: SCHEDULER_SOURCE,
      meta: { task: task.name, error: error instanceof Error ? error.message : String(error) },
    });
  } finally {
    running.delete(task.name);
  }
}
