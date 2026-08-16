// ============================================================
// Tradutor Will — backend
// ============================================================
// Serve a PWA estaticamente e expõe UM endpoint de tradução:
//
//   POST /api/translate
//     { text?: string }  OU  { audio?: { data: base64, mimeType } }
//     -> { sourceLanguage, targetLanguage, transcription,
//          translatedText, isComplete, shouldSpeak }
//
// A GEMINI_API_KEY existe APENAS aqui (variável de ambiente do servidor ou
// arquivo .env local) e nunca é enviada ao navegador. Cada chamada é
// independente e sem contexto: uma fala -> uma requisição -> uma tradução -> descarta.
//
// Zero dependências externas: usa apenas módulos nativos do Node (>=18).
// ============================================================
'use strict';

const http = require('node:http');
const { readFile, stat } = require('node:fs/promises');
const { readFileSync, existsSync } = require('node:fs');
const { extname, join, normalize, sep } = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_BODY_BYTES = 10 * 1024 * 1024; // áudio base64 de uma fala longa

// Carrega .env local, se existir. Variáveis já presentes em process.env
// (injetadas pela plataforma) têm prioridade e não são sobrescritas.
function loadEnv() {
  try {
    const envPath = join(ROOT, '.env');
    if (!existsSync(envPath)) return;
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } catch (_) {
    // Se o .env não puder ser lido, segue com o que já estiver em process.env.
  }
}
loadEnv();

// Um erro inesperado em uma requisição não pode derrubar o processo inteiro
// (a sessão de 1h não pode morrer por causa de uma fala). Loga e continua.
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err && err.message ? err.message : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason && reason.message ? reason.message : String(reason));
});

const { callGemini, getApiKey, getModel } = require('./lib/gemini');

// ------------------------------------------------------------
// HTTP — helpers
// ------------------------------------------------------------
function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const err = new Error('body_too_large');
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// ------------------------------------------------------------
// Rotas
// ------------------------------------------------------------
async function handleTranslate(req, res) {
  if (!getApiKey()) {
    sendJson(res, 503, { error: 'Serviço indisponível — o servidor não está configurado (falta a chave da API).' });
    return;
  }

  let payload;
  try {
    const body = await readBody(req);
    payload = JSON.parse(body || '{}');
  } catch (e) {
    if (e && e.status === 413) {
      sendJson(res, 413, { error: 'Áudio enviado é grande demais.' });
    } else {
      sendJson(res, 400, { error: 'Corpo da requisição inválido.' });
    }
    return;
  }

  const parts = [];

  if (payload && typeof payload.text === 'string' && payload.text.trim()) {
    parts.push({ text: payload.text.trim().slice(0, 4000) });
  }

  if (payload && payload.audio && payload.audio.data && payload.audio.mimeType) {
    parts.push({
      inlineData: {
        mimeType: String(payload.audio.mimeType),
        data: String(payload.audio.data),
      },
    });
  }

  if (parts.length === 0) {
    sendJson(res, 400, { error: 'Envie áudio ou texto para traduzir.' });
    return;
  }

  try {
    const out = await callGemini(parts);
    sendJson(res, 200, out);
  } catch (e) {
    sendJson(res, 502, { error: e && e.message ? e.message : 'Falha ao traduzir. Tente novamente.' });
  }
}

// ------------------------------------------------------------
// Arquivos estáticos (mesma lógica do antigo scripts/serve.mjs)
// ------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function mimeFor(file) {
  return MIME[extname(file).toLowerCase()] || 'application/octet-stream';
}

async function handleStatic(req, res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = normalize(join(ROOT, rel));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Forbidden');
    return;
  }

  let info;
  try {
    info = await stat(filePath);
  } catch (_) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 Not Found');
    return;
  }
  if (info.isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 Not Found');
    return;
  }

  const body = await readFile(filePath);
  res.writeHead(200, {
    'Content-Type': mimeFor(filePath),
    'Content-Length': body.length,
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

    if (req.method === 'GET' && urlPath === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        model: `models/${getModel()}`,
        configured: !!getApiKey(),
      });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/translate') {
      await handleTranslate(req, res);
      return;
    }

    await handleStatic(req, res, urlPath);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('500 Internal Server Error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Tradutor Will serving ${ROOT} at http://${HOST}:${PORT}`);
  console.log(`Gemini model: models/${getModel()} (key ${getApiKey() ? 'present' : 'MISSING'})`);
});
