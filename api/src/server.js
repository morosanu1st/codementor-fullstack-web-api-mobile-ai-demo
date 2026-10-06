// server.js: entry point. Loads api/.env if present, then starts listening.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
if (existsSync(envPath) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envPath);

const { createApp } = await import('./app.js');
const port = Number(process.env.PORT) || 3000;

createApp().listen(port, () => {
  const mode = process.env.LLM_API_KEY ? `LLM (${process.env.LLM_MODEL || 'gpt-4o-mini'})` : 'MOCK (no LLM_API_KEY)';
  console.log(`API + web on http://localhost:${port}  |  mode: ${mode}`);
});
