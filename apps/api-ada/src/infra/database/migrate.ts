/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { runCatalogMigrations } from '@adatechnology/catalog-module';
import { runMetaWhatsAppMigrations } from '@adatechnology/meta-whatsapp-module';
import { runNotificationMigrations } from '@adatechnology/notification-module';
import { runSchedulingMigrations } from '@adatechnology/scheduling-module';
import { runUserMigrations } from '@adatechnology/user-module';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { closeDatabase, database } from '@/infra/database/client';
import { logger } from '@/shared/logger';

const SOURCE = 'infra.database.migrate';

// O modulo carrega migrations proprias, com journal separado, e cria o schema meta_whatsapp.
// Roda primeiro porque as tabelas da Ada referenciam conversa por id.
async function runMigrations(): Promise<void> {
  logger.info({ message: 'Aplicando migrations do modulo meta-whatsapp', source: SOURCE });

  await runMetaWhatsAppMigrations({ db: database as never, migrate: migrate as never });

  // Journal proprio tambem, e schema `catalog` separado: catalogo nao referencia conversa, entao
  // a ordem entre os dois modulos e indiferente.
  logger.info({ message: 'Aplicando migrations do modulo de catalogo', source: SOURCE });

  await runCatalogMigrations({ db: database as never, migrate: migrate as never });

  // Idem: schema `scheduling` proprio. O recurso da agenda referencia o atendente por id, e nao
  // por FK, justamente para o modulo nao depender do schema deste produto.
  logger.info({ message: 'Aplicando migrations do modulo de agendamento', source: SOURCE });

  await runSchedulingMigrations({ db: database as never, migrate: migrate as never });

  // Antes das migrations da Ada, e nao depois: a FK de `scheduling` para `"user".users` (Fase C do
  // plano de migracao) so pode ser criada com o schema `user` ja no lugar. Travar a ordem aqui e o
  // que evita depender de disciplina humana no deploy.
  logger.info({ message: 'Aplicando migrations do modulo de usuario', source: SOURCE });

  await runUserMigrations({ db: database as never, migrate: migrate as never });

  logger.info({ message: 'Aplicando migrations do modulo de notificacao', source: SOURCE });

  await runNotificationMigrations({ db: database as never, migrate: migrate as never });

  logger.info({ message: 'Aplicando migrations da Ada', source: SOURCE });

  await migrate(database, { migrationsFolder: `${import.meta.dir}/../../../drizzle` });

  logger.info({ message: 'Migrations aplicadas', source: SOURCE });
}

try {
  await runMigrations();
} finally {
  await closeDatabase();
}
