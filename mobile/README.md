# Mobile client (Expo / React Native): stub

`App.js` is a single-screen React Native client for the same `POST /api/ask` endpoint the web page uses. It is a **stub**: this repo keeps it as one file so the monorepo stays small, and you generate the Expo scaffolding yourself.

```bash
# from the repo root, with the API already running (npm start)
npx create-expo-app@latest mobile-app --template blank
cp mobile/App.js mobile-app/App.js
cd mobile-app
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000 npx expo start
```

Scan the QR code with **Expo Go**. Choose the API URL for your setup:

| Where the app runs | `EXPO_PUBLIC_API_URL` |
|---|---|
| iOS simulator | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| Physical phone (same Wi-Fi) | `http://<computer-LAN-IP>:3000` |

Notes:
- **Never ship the LLM key in the app.** Mobile bundles can be unpacked. The key stays on the API server, and the app only talks to your API.
- Plain `http://` to a LAN IP works in development. Production builds need HTTPS (iOS ATS / Android cleartext rules).
- Next steps in a real project: Expo Router for navigation, a shared `api-client` package used by web and mobile, auth (e.g. JWT/session), and streaming responses.
