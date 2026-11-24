import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve, normalize } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const dataDir = resolve(root, 'data');
const dbPath = resolve(dataDir, 'student-survey.sqlite');
const schemaPath = resolve(root, 'schema.sql');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8' };
let server;

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => {
    const index = line.indexOf('=');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
  }));
}

async function initialize() {
  await mkdir(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'survey_responses'").get();
  if (!table) db.exec(readFileSync(schemaPath, 'utf8'));
  db.close();
}

function openDb() {
  return new DatabaseSync(dbPath);
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function adaptContext(request, env, params = {}) {
  return { request, env, params };
}

async function runFunction(file, handler, request, env, params = {}) {
  const module = await import(pathToFileURL(resolve(root, file)).href);
  const context = adaptContext(request, env, params);
  const result = await module[handler](context);
  return result;
}

async function handleApi(request, url, env) {
  if (url.pathname === '/api/config' && request.method === 'GET') return response({ google_client_id: env.GOOGLE_CLIENT_ID || '' });
  if (url.pathname === '/api/auth/google' && request.method === 'POST') {
    const module = await import(pathToFileURL(resolve(root, 'functions/api/auth/google.js')).href);
    return module.onRequestPost(adaptContext(request, env));
  }
  if (url.pathname === '/api/submit') {
    if (request.method !== 'POST') return response({ success: false, message: 'Method not allowed.' }, 405);
    const db = openDb();
    try {
      const binding = { prepare(sql) { return { bind(...values) { return { async run() { const result = db.prepare(sql).run(...values); return { meta: { last_row_id: Number(result.lastInsertRowid) } }; } }; } }; } };
      const context = adaptContext(request, { ...env, DB: binding });
      const module = await import(pathToFileURL(resolve(root, 'functions/api/submit.js')).href);
      return await module.onRequestPost(context);
    } finally { db.close(); }
  }
  if (url.pathname.startsWith('/api/student/')) {
    if (request.method !== 'GET') return response({ success: false, message: 'Method not allowed.' }, 405);
    const id = decodeURIComponent(url.pathname.slice('/api/student/'.length));
    const db = openDb();
    try {
      const binding = { prepare(sql) { return { bind(...values) { return { async all() { return { results: db.prepare(sql).all(...values) }; } }; } }; } };
      const context = adaptContext(request, { ...env, DB: binding }, { id });
      const module = await import(pathToFileURL(resolve(root, 'functions/api/student/[id].js')).href);
      return await module.onRequestGet(context);
    } finally { db.close(); }
  }
  if (url.pathname === '/api/admin/dashboard') {
    if (request.method !== 'GET') return response({ success: false, message: 'Method not allowed.' }, 405);
    const db = openDb();
    try {
      const binding = { prepare(sql) { return { bind(...values) { return {
        async all() { return { results: db.prepare(sql).all(...values) }; },
        async first() { return db.prepare(sql).get(...values) || null; }
      }; } }; } };
      const context = adaptContext(request, { ...env, DB: binding });
      const module = await import(pathToFileURL(resolve(root, 'functions/api/admin/dashboard.js')).href);
      return await module.onRequestGet(context);
    } finally { db.close(); }
  }
  return response({ success: false, message: 'API route not found.' }, 404);
}

async function handle(request) {
  const url = new URL(request.url);
  const localEnv = { ...loadEnvFile(resolve(root, '.dev.vars')), ...process.env };
  if (url.pathname.startsWith('/api/')) {
    try { return await handleApi(request, url, localEnv); }
    catch (error) {
      console.error('API request failed:', error);
      return response({ success: false, message: 'The local server could not complete this request.' }, 500);
    }
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return response({ success: false, message: 'Method not allowed.' }, 405);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = normalize(resolve(root, 'public', `.${pathname}`));
  const publicDir = resolve(root, 'public');
  if (!filePath.startsWith(`${publicDir}/`) && filePath !== publicDir) return response({ success: false, message: 'Not found.' }, 404);
  try {
    const content = await readFile(filePath);
    return new Response(request.method === 'HEAD' ? null : content, { headers: { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' } });
  } catch {
    const notFound = await readFile(resolve(publicDir, '404.html')).catch(() => Buffer.from('Not found'));
    return new Response(notFound, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

export async function start({ port = Number(process.env.PORT || 8788), host = process.env.HOST || '127.0.0.1' } = {}) {
  if (!DatabaseSync) throw new Error('This Node version does not support the built-in SQLite database. Use Node 22.5 or newer.');
  await initialize();
  server = createServer(async (request, responseStream) => {
    try {
      const result = await handle(new Request(`http://${request.headers.host || `${host}:${port}`}${request.url}`, { method: request.method, headers: request.headers, body: ['GET', 'HEAD'].includes(request.method) ? undefined : request, duplex: 'half' }));
      responseStream.writeHead(result.status, Object.fromEntries(result.headers.entries()));
      if (result.body) {
        const bytes = Buffer.from(await result.arrayBuffer());
        responseStream.end(bytes);
      } else responseStream.end();
    } catch (error) {
      console.error('Request failed:', error);
      responseStream.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      responseStream.end('Local server error');
    }
  });
  await new Promise((resolveStart, reject) => { server.once('error', reject); server.listen(port, host, resolveStart); });
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const port = Number(process.env.PORT || 8788);
  const host = process.env.HOST || '127.0.0.1';
  start({ port, host }).then(() => {
    console.log(`Student Progress is available at http://${host}:${port}`);
    console.log(`Local database: ${dbPath}`);
    console.log('Press Ctrl+C to stop the server.');
  }).catch(error => { console.error(error); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server?.close(() => process.exit(0)); });
}
