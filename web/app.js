// Same-origin by default (the API serves this page). To call an API on another
// host, open the page with ?api=http://localhost:3000
const API_BASE = new URLSearchParams(location.search).get('api') || '';

const $ = (id) => document.getElementById(id);

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const h = await res.json();
    $('status').textContent = h.llm === 'configured' ? `LLM (${h.model})` : 'mock mode (no API key)';
  } catch {
    $('status').textContent = 'API unreachable';
  }
}

$('ask-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const question = $('question').value.trim();
  if (!question) return;

  $('submit').disabled = true;
  $('submit').textContent = 'Thinking…';
  $('error').hidden = true;

  try {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    $('answer').textContent = data.answer;            // textContent: never inject HTML from a model
    $('badge').textContent = data.source;
    $('badge').className = `badge ${data.source}`;
    $('meta').textContent = `${data.model ?? 'mock'} · ${data.latencyMs} ms${data.reason ? ` · ${data.reason}` : ''}`;
    $('result').hidden = false;
  } catch (err) {
    $('error').textContent = `Request failed: ${err.message}`;
    $('error').hidden = false;
  } finally {
    $('submit').disabled = false;
    $('submit').textContent = 'Ask';
  }
});

checkHealth();
