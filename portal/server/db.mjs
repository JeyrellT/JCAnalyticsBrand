// ============================================================================
//  server/db.mjs
//  Base de datos SQLite (módulo nativo node:sqlite, sin dependencias).
//  Un archivo, una réplica: suficiente y robusto para un equipo de 5 personas.
//  El esquema y las migraciones viven en schema.mjs (compartido con la demo).
// ============================================================================

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrate } from './schema.mjs';

export { transaction, DEFAULT_SETTINGS, MIGRATIONS } from './schema.mjs';

export function openDatabase(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  return migrate(db);
}
