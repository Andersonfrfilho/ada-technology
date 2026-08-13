/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { runCatalogMigrations } from '@adatechnology/catalog-module';
import { runMetaWhatsAppMigrations } from '@adatechnology/meta-whatsapp-module';
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

  logger.info({ message: 'Aplicando migrations da Ada', source: SOURCE });

  await migrate(database, { migrationsFolder: `${import.meta.dir}/../../../drizzle` });

  logger.info({ message: 'Migrations aplicadas', source: SOURCE });
}

try {
  await runMigrations();
} finally {
  await closeDatabase();
}
