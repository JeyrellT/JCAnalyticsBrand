// Scans the real project repositories next to this one and writes the evidence
// (file counts, lines, commits, routes, endpoints, models, tests) that the
// "Proyectos reales" section displays. Nothing here is typed by hand: every
// number comes from the repository at the moment the script runs.
//
//   JCA_PROJECTS_ROOT=/ruta/a/los/repos node scripts/project-evidence.mjs
//
// Default root: the folder that contains the JCAnalyticsBrand checkout.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(process.env.JCA_PROJECTS_ROOT || join(app, '..', '..'));
const output = join(app, 'src', 'data', 'projects.evidence.json');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.venv', '__pycache__', 'generated', 'generado', 'test-results', 'playwright-report', 'artifacts', 'qa-output', 'output', '.turbo', '.railway', '.claude', 'static']);
const CODE = { '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.jsx': 'JavaScript', '.py': 'Python', '.prisma': 'Prisma', '.sql': 'SQL', '.css': 'CSS', '.html': 'HTML', '.lua': 'Lua' };
const IGNORE_FILES = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|uv\.lock|.*\.min\.(js|css)|.*\.map)$/;

async function walk(dir, files = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) await walk(path, files); }
    else if (entry.isFile() && !IGNORE_FILES.test(path)) files.push(path);
  }
  return files;
}

const countLines = async (path) => (await readFile(path, 'utf8')).split('\n').length;
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
const matchGlob = (pattern) => {
  // Minimal glob: ** = any path, * = any segment chars, supports {a,b}.
  const source = pattern.replace(/[.+^$()|[\]\\]/g, (c) => `\\${c}`)
    .replace(/\{([^}]+)\}/g, (_, options) => `(${options.split(',').join('|')})`)
    .replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '\u0002').replace(/\*/g, '[^/]*')
    .replace(/\u0001/g, '(.*/)?').replace(/\u0002/g, '.*');
  return new RegExp(`^${source}$`);
};

async function countRegex(files, regex, unique = false, flags = 'gm') {
  let total = 0;
  const seen = new Set();
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const matches = text.match(new RegExp(regex, flags)) || [];
    if (unique) matches.forEach((match) => seen.add(match));
    else total += matches.length;
  }
  return unique ? seen.size : total;
}

// Facts per project. `glob` selects files relative to the repo; `regex` counts
// matches inside them; without `regex` the number of matching files is used.
// `dirs` counts folders directly inside a path (e.g. migrations).
const PROJECTS = [
  { id: 'laburrada', dir: 'Laburrada', facts: [
    { key: 'pages', glob: 'app/**/page.tsx' },
    { key: 'endpoints', glob: 'api/src/modules/**/*.ts', regex: '\\.(get|post|put|patch|delete)\\(\\s*[\'"`]/' },
    { key: 'models', glob: 'api/prisma/schema.prisma', regex: '^model ' },
    { key: 'migrations', dirs: 'api/prisma/migrations' },
    { key: 'tests', glob: '{api/src,e2e}/**/*.{test,spec}.ts', regex: '^\\s*(it|test)\\(' },
  ] },
  { id: 'transportesluna', dir: 'TransportesLuna', facts: [
    { key: 'pages', glob: 'src/app/**/page.tsx' },
    { key: 'serverActions', glob: 'src/**/*.ts', regex: '^"use server"' },
    { key: 'models', glob: 'prisma/schema.prisma', regex: '^model ' },
    { key: 'migrations', dirs: 'prisma/migrations' },
    { key: 'tests', glob: 'scripts/probar-*.ts' },
  ] },
  { id: 'barberxcr', dir: 'BarberCR', facts: [
    { key: 'routes', glob: 'src/App.jsx', regex: '<Route path=' },
    { key: 'endpoints', glob: 'backend/app/routers/*.py', regex: '@router\\.(get|post|put|patch|delete)\\(' },
    { key: 'tables', glob: 'backend/app/models/*.py', regex: '__tablename__' },
    { key: 'tests', glob: '{backend/tests/**/*.py,backend/test_*.py,src/**/*.test.js}', regex: '^\\s*(def test_|it\\(|test\\()' },
    { key: 'leads', glob: 'Lista de barberias/prospectos_barberias_cr.csv', regex: '\\n', offset: -1 },
  ] },
  { id: 'caviq', dir: 'Caviq', facts: [
    { key: 'routes', glob: 'server/site-routes.mjs', regex: "path: '/" },
    { key: 'endpoints', glob: 'server/*.mjs', regex: "\\.(get|post|patch|delete)\\('/api" },
    { key: 'tables', glob: 'server/*.mjs', regex: 'CREATE TABLE IF NOT EXISTS' },
    { key: 'tests', glob: '{tests,e2e}/**/*.{mjs,ts}', regex: '^\\s*test\\(' },
  ] },
  { id: 'multiagencia', dir: 'MultiagenciaGutierres', facts: [
    { key: 'pages', glob: 'apps/web/src/app/**/page.tsx' },
    { key: 'endpoints', glob: 'apps/api/src/modules/**/*.routes.ts', regex: '\\.(get|post|put|patch|delete)\\(' },
    { key: 'models', glob: 'apps/api/prisma/schema.prisma', regex: '^model ' },
    { key: 'schemas', glob: 'packages/shared/src/schemas/*.ts', regex: 'export const \\w+Schema' },
    { key: 'tests', glob: '{apps,packages}/**/*.test.{ts,mjs}', regex: '^\\s*(it|test)\\(' },
    { key: 'productPhotos', glob: 'apps/web/public/images/products/*.webp' },
  ] },
  { id: 'crimson', dir: 'crimson-web', facts: [
    { key: 'endpoints', glob: 'api/app/**/*.py', regex: '@(router|pub|admin|seo)\\.(get|post|put|patch|delete)\\(' },
    { key: 'tables', glob: 'api/app/**/*.py', regex: '__tablename__' },
    { key: 'migrations', glob: 'api/alembic/versions/*.py' },
    { key: 'tests', glob: 'api/tests/**/*.py', regex: '^\\s*(async )?def test_' },
    { key: 'jobs', glob: 'worker/celery_app.py', regex: '"schedule":' },
    { key: 'portalModules', dirs: 'portal/src/modules' },
  ] },
  { id: 'placeres', dir: 'placeres-culposos-web', facts: [
    { key: 'frames', glob: 'img/vaso/**/*.webp' },
    { key: 'menuItems', glob: 'js/datos.js', regex: '^\\s*\\{\\s*cat:' },
    { key: 'sections', glob: 'index.html', regex: '<section' },
    { key: 'blenderLines', glob: 'tools/vaso-3d/vaso.py', regex: '\\n' },
  ] },
  { id: 'silglobal', dir: 'sil-global-web', facts: [
    { key: 'products', glob: 'app.js', regex: '^\\s*\\{\\s*(id|name|nombre|sku|code):' },
    { key: 'photos', glob: 'assets/fotos/*.webp' },
    { key: 'icons', glob: 'index.html', regex: '<symbol' },
    { key: 'sections', glob: 'index.html', regex: '<section' },
  ] },
  { id: 'soporte20', dir: 'Soluciones20', facts: [
    { key: 'modules', glob: 'src/operations/Operations.tsx', regex: "\\{ id: '[a-z-]+', label:" },
    { key: 'endpoints', glob: 'server/*.mjs', regex: "'/api/[a-z0-9/_:-]+'", unique: true },
    { key: 'tests', glob: '{server/*.test.mjs,tests/**/*.spec.ts}', regex: '^\\s*test\\(' },
    { key: 'cinemaFrames', glob: 'public/cinema/**/*.webp' },
  ] },
  { id: 'maison', dir: 'TallerMaison', facts: [
    { key: 'pages', glob: 'src/app/**/page.tsx' },
    { key: 'spaces', glob: 'README.md', regex: '\\(`#[a-z]+`\\)' },
    { key: 'endpoints', glob: 'api/src/modulos/*.ts', regex: '\\.(get|post|put|patch|delete)\\(\\s*["`]/' },
    { key: 'models', glob: 'api/prisma/schema.prisma', regex: '^model ' },
    { key: 'migrations', dirs: 'api/prisma/migrations' },
    { key: 'tests', glob: '{api/src,api/tests,scripts}/**/*.{test,spec,prueba}.ts', regex: '^\\s*(it|test)\\(' },
  ] },
];

const evidence = { generatedAt: new Date().toISOString().slice(0, 10), projects: {} };
for (const project of PROJECTS) {
  const dir = join(root, project.dir);
  try { await stat(dir); } catch { console.error(`skip ${project.id}: ${dir} not found`); continue; }
  const files = await walk(dir);
  const languages = {};
  let lines = 0;
  for (const file of files) {
    const language = CODE[extname(file)];
    if (!language) continue;
    const count = await countLines(file);
    lines += count;
    languages[language] = (languages[language] || 0) + count;
  }
  const facts = {};
  for (const fact of project.facts) {
    if (fact.dirs) {
      const entries = await readdir(join(dir, fact.dirs), { withFileTypes: true }).catch(() => []);
      facts[fact.key] = entries.filter((entry) => entry.isDirectory()).length;
      continue;
    }
    const pattern = matchGlob(fact.glob);
    const selected = files.filter((file) => pattern.test(relative(dir, file).split('\\').join('/')));
    facts[fact.key] = (fact.regex ? await countRegex(selected, fact.regex, fact.unique) : selected.length) + (fact.offset || 0);
  }
  const top = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => ({ name, share: Math.round((count / lines) * 100) }));
  evidence.projects[project.id] = {
    repo: project.dir,
    commits: Number(git(dir, 'rev-list', '--count', 'HEAD')),
    firstCommit: git(dir, 'log', '--reverse', '--format=%as').split('\n')[0],
    lastCommit: git(dir, 'log', '-1', '--format=%as'),
    codeFiles: files.filter((file) => CODE[extname(file)]).length,
    lines,
    languages: top,
    facts,
  };
  console.log(project.id, JSON.stringify(evidence.projects[project.id]));
}
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(`Wrote ${relative(app, output)} for ${Object.keys(evidence.projects).length} projects.`);
