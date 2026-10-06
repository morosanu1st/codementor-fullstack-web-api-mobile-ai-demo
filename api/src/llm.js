// llm.js: a tiny client for any OpenAI-compatible Chat Completions API,
// with a deterministic mock fallback so the app runs with no key and no network.

const SYSTEM_PROMPT =
  'You are a concise assistant inside a demo app. Answer in at most 3 short sentences.';

export function getLlmConfig(env = process.env) {
  return {
    apiKey: env.LLM_API_KEY || '',
    baseUrl: (env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: env.LLM_MODEL || 'gpt-4o-mini',
    timeoutMs: Number(env.LLM_TIMEOUT_MS) || 15000,
  };
}

export function mockAnswer(question) {
  const q = question.trim();
  const words = q.split(/\s+/).length;
  return (
    `[mock] You asked: "${q.slice(0, 120)}${q.length > 120 ? '…' : ''}" (${words} word${words === 1 ? '' : 's'}). ` +
    'Set LLM_API_KEY in api/.env to get a real model answer.'
  );
}

/**
 * Ask the configured LLM. Never throws: on missing key or upstream failure
 * it returns a mock answer and says why, so the UI always gets a response.
 * @returns {Promise<{answer: string, source: 'llm'|'mock', model: string|null, reason?: string}>}
 */
export async function askLlm(question, { config = getLlmConfig(), fetchImpl = globalThis.fetch } = {}) {
  if (!config.apiKey) {
    return { answer: mockAnswer(question), source: 'mock', model: null, reason: 'no_api_key' };
  }

  try {
    const res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!res.ok) {
      // Don't leak upstream error bodies (they can contain account details) to clients.
      console.warn(`[llm] upstream HTTP ${res.status}; falling back to mock`);
      return { answer: mockAnswer(question), source: 'mock', model: null, reason: `upstream_${res.status}` };
    }

    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return { answer: mockAnswer(question), source: 'mock', model: null, reason: 'empty_completion' };
    }
    return { answer, source: 'llm', model: data.model || config.model };
  } catch (err) {
    const reason = err?.name === 'TimeoutError' ? 'timeout' : 'network_error';
    console.warn(`[llm] ${reason}: ${err?.message}; falling back to mock`);
    return { answer: mockAnswer(question), source: 'mock', model: null, reason };
  }
}
