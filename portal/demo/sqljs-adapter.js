// Adaptador de sql.js con la misma API mínima que node:sqlite (DatabaseSync),
// que es todo lo que usan server/schema.mjs, context.mjs y las rutas:
//   db.exec(sql)                         varias sentencias separadas por ;
//   db.prepare(sql).get(...args)         primera fila u undefined
//   db.prepare(sql).all(...args)         todas las filas
//   db.prepare(sql).run(...args)         { changes, lastInsertRowid }
//   db.close()
// Parámetros posicionales con "?". undefined → null y booleanos → 0/1 (node:sqlite
// los rechaza; aquí se aceptan para no romper la demo por un detalle).
//
// sql.js guarda cada sentencia preparada en la memoria de SQLite hasta que se
// libera, y el servidor prepara sentencias dentro de cada petición. Por eso se
// reutiliza una sola sentencia por texto SQL: cada llamada es síncrona y la
// deja reiniciada al terminar, así que compartirla es seguro.

const normalize = (value) => {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
};

export function wrapSqlJsDatabase(raw) {
  const cache = new Map();
  let closed = false;

  const statementFor = (sql) => {
    if (closed) throw new Error('database is not open');
    let stmt = cache.get(sql);
    if (!stmt) {
      stmt = raw.prepare(sql);
      cache.set(sql, stmt);
    }
    return stmt;
  };

  const withStatement = (sql, args, fn) => {
    if (args.length && args[0] !== null && typeof args[0] === 'object' && !ArrayBuffer.isView(args[0])) {
      throw new Error('La demo solo admite parámetros posicionales (?)');
    }
    const stmt = statementFor(sql);
    stmt.reset();
    try {
      if (args.length) stmt.bind(args.map(normalize));
      return fn(stmt);
    } finally {
      stmt.reset();
    }
  };

  const lastRowId = () => withStatement('SELECT last_insert_rowid() AS id', [], (s) => (s.step() ? s.getAsObject().id : 0));

  return {
    exec(sql) {
      if (closed) throw new Error('database is not open');
      raw.exec(sql);
    },
    prepare(sql) {
      statementFor(sql); // valida el SQL al preparar, igual que node:sqlite
      return {
        get: (...args) => withStatement(sql, args, (s) => (s.step() ? s.getAsObject() : undefined)),
        all: (...args) => withStatement(sql, args, (s) => {
          const rows = [];
          while (s.step()) rows.push(s.getAsObject());
          return rows;
        }),
        run: (...args) => {
          withStatement(sql, args, (s) => { while (s.step()) { /* consumir filas */ } });
          return { changes: raw.getRowsModified(), lastInsertRowid: Number(lastRowId()) };
        },
      };
    },
    close() {
      if (closed) return;
      closed = true;
      for (const stmt of cache.values()) stmt.free();
      cache.clear();
      raw.close();
    },
    get isOpen() { return !closed; },
  };
}

/**
 * Abre una base SQLite en memoria con la versión asm.js de sql.js (JavaScript
 * puro: sin archivo .wasm, sin eval). `initSqlJs` se inyecta para poder usar
 * el mismo adaptador desde Node en pruebas.
 */
export async function openDemoDatabase(initSqlJs) {
  const SQL = await initSqlJs();
  const db = wrapSqlJsDatabase(new SQL.Database());
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}
