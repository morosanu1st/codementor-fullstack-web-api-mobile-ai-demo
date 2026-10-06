// Run with: npm test   (uses Node's built-in test runner; no extra deps)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { askLlm, mockAnswer } from '../src/llm.js';

let server, base;
before(async () => {
  server = createApp({ env: { CORS_ORIGIN: '*' } }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (body, raw = false) =>
  fetch(`${base}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ? body : JSON.stringify(body),
  });

test('GET /api/health reports mock mode without a key', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok', llm: 'mock', model: null });
});

test('POST /api/ask returns a mock answer without a key', async () => {
  const res = await post({ question: 'What is an API?' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.source, 'mock');
  assert.equal(body.reason, 'no_api_key');
  assert.match(body.answer, /What is an API\?/);
  assert.equal(typeof body.latencyMs, 'number');
});

test('POST /api/ask validates input', async () => {
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ question: '   ' })).status, 400);
  assert.equal((await post({ question: 'x'.repeat(2001) })).status, 413);
  assert.equal((await post('{bad json', true)).status, 400);
});

test('serves the web front end', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<form id="ask-form"/);
});

test('CORS preflight is answered', async () => {
  const res = await fetch(`${base}/api/ask`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8081' } });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

const cfg = { apiKey: 'sk-test', baseUrl: 'https://llm.example/v1', model: 'test-model', timeoutMs: 1000 };

test('askLlm parses an OpenAI-compatible response', async () => {
  let seen;
  const fakeFetch = async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify({ model: 'test-model', choices: [{ message: { content: ' Hello! ' } }] }), { status: 200 });
  };
  const r = await askLlm('hi', { config: cfg, fetchImpl: fakeFetch });
  assert.deepEqual(r, { answer: 'Hello!', source: 'llm', model: 'test-model' });
  assert.equal(seen.url, 'https://llm.example/v1/chat/completions');
  assert.equal(seen.init.headers.Authorization, 'Bearer sk-test');
  assert.equal(JSON.parse(seen.init.body).messages.at(-1).content, 'hi');
});

test('askLlm falls back to mock on upstream errors and network failures', async () => {
  const http500 = async () => new Response('boom', { status: 500 });
  const r1 = await askLlm('q', { config: cfg, fetchImpl: http500 });
  assert.equal(r1.source, 'mock');
  assert.equal(r1.reason, 'upstream_500');

  const offline = async () => { throw new TypeError('fetch failed'); };
  const r2 = await askLlm('q', { config: cfg, fetchImpl: offline });
  assert.equal(r2.reason, 'network_error');
  assert.equal(r2.answer, mockAnswer('q'));
});
