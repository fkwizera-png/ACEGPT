# AceGPT

AceGPT is an AI assistant designed to help users with daily tasks, writing, explanations, summarization, and external information lookup through a safe Gemini-powered backend.

## Features

- Secure onboarding flow for Gemini API keys
- Server-side encrypted storage for local development
- Responsive dark assistant interface inspired by modern AI apps
- Suggestion chips, chat history, message composer, and settings panel
- Optional voice input and speech synthesis when supported by the browser
- File attachment validation for images and lightweight documents
- Gemini integration separated into a dedicated provider service layer

## Architecture

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript
- AI provider: Google Gemini SDK (`@google/generative-ai`)
- Credential storage: encrypted JSON file in a server-side data directory
- Security: Helmet, CORS, request validation, and no client-side secret storage

## Prerequisites

- Node.js 20+ and npm
- A Gemini API key from Google AI Studio

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```
   On Linux/macOS, use `cp .env.example .env`.

3. Add your secret and any required configuration in `.env`.

4. Start the app in development mode:
   ```bash
   npm run dev
   ```

5. Open the app in a browser at http://localhost:5173.

## Environment variables

Create a `.env` file with values like:

```env
PORT=3001
ACEGPT_MODEL=gemini-1.5-flash
ACEGPT_SECRET_KEY=replace-with-a-long-random-secret
```

- `PORT` controls the backend service port.
- `ACEGPT_MODEL` selects the default Gemini model.
- `ACEGPT_SECRET_KEY` protects the encrypted credential store in local development.

## Local development and deployment notes

- In local development, the app stores the encrypted Gemini key on the server in `server/data/credentials.json`.
- Production should use a managed secret store such as Azure Key Vault, AWS Secrets Manager, or Cloud Secret Manager.
- Web search, reminders, and notes are included as placeholders in the tooling layer and need external provider configuration before they become production-ready.

## Running tests

```bash
npm test
```

## Production build

```bash
npm run build
```

## Security reminders

- Never commit real API keys or secrets.
- Do not expose stored keys to browser storage or logs.
- Treat each user credential as a secret with authorization checks in production.
- If a production multi-user architecture is needed, each user should supply their own Gemini key or a trusted operator should pay for central access with clear billing policies.

## Known limitations

- This project is designed for single-user local development and includes a secure encrypted storage approach, but it is not a full multi-user identity system.
- External web-search, reminders, and notes features require provider configuration and user account persistence.
- The orb asset was not present in the repository; the app uses a CSS-generated orb until the official supplied image is added to `public/assets/acegpt-orb.png`.
