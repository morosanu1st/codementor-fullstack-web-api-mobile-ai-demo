// mobile/App.js: Expo (React Native) client STUB for the same /api/ask endpoint.
// Not a standalone project: create one with `npx create-expo-app@latest` and
// replace its App.js (or app/index.tsx) with this file. See mobile/README.md.
import { useState } from 'react';
import { ActivityIndicator, Button, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

// Android emulator: http://10.0.2.2:3000 · iOS simulator: http://localhost:3000
// Physical phone (Expo Go): http://<your-computer-LAN-IP>:3000
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function App() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setError(`Request failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Ask the API</Text>
      <TextInput
        style={styles.input}
        multiline
        maxLength={2000}
        placeholder="Ask something…"
        value={question}
        onChangeText={setQuestion}
      />
      <Button title={loading ? 'Thinking…' : 'Ask'} onPress={ask} disabled={loading} />
      {loading && <ActivityIndicator style={{ marginTop: 12 }} />}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {result && (
        <View style={styles.card}>
          <Text style={styles.badge}>{result.source.toUpperCase()}</Text>
          <Text>{result.answer}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 24 },
  input: { borderWidth: 1, borderColor: '#cfd6e4', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  error: { color: '#c92a2a' },
  card: { padding: 12, borderRadius: 8, backgroundColor: '#f1f3f5', gap: 6 },
  badge: { fontSize: 12, fontWeight: '700', color: '#3b5bdb' },
});
