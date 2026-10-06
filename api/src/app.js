// app.js: Express app factory (kept separate from server.js so tests can import it).
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askLlm, getLlmConfig } from './llm.js';

const MAX_QUESTION_CHARS = 2000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ ask = askLlm, env = process.env } = {}) {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  // Minimal CORS so the web page (another port) and the Expo app can call us.
  const allowed = (env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowed.includes('*')) res.set('Access-Control-Allow-Origin', '*');
    else if (origin && allowed.includes(origin)) res.set('Access-Control-Allow-Origin', origin).set('Vary', 'Origin');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/health', (_req, res) => {
    const cfg = getLlmConfig(env);
    res.json({ status: 'ok', llm: cfg.apiKey ? 'configured' : 'mock', model: cfg.apiKey ? cfg.model : null });
  });

  // The one AI endpoint: POST /api/ask { "question": "..." }
  app.post('/api/ask', async (req, res) => {
    const question = req.body?.question;
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Body must be JSON: { "question": "<non-empty string>" }' });
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return res.status(413).json({ error: `Question too long (max ${MAX_QUESTION_CHARS} characters)` });
    }
    const started = Date.now();
    const result = await ask(question, { config: getLlmConfig(env) });
    res.json({ ...result, latencyMs: Date.now() - started });
  });

  // Serve the tiny web front end from ../../web (same origin, so no CORS needed there).
  app.use(express.static(path.resolve(__dirname, '../../web')));

  // Malformed JSON -> 400 instead of an HTML stack trace.
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Body too large' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
