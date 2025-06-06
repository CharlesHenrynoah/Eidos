# Eidos

Eidos is a Next.js application that showcases AI‑assisted data visualisation.

## Installation

1. Copy `.env.example` to `.env.local` and add your Gemini API key.
2. Install dependencies using **pnpm**:
   ```bash
   pnpm install
   ```

## Usage

Start the development server with:
```bash
pnpm dev
```

Build and launch a production version with:
```bash
pnpm build
pnpm start
```

## Project structure

- `app/` – Next.js routes
- `components/` – React components including the visualisation canvas
- `services/` – Helper functions interacting with the Gemini API
- `styles/` – Tailwind CSS configuration

## Environment variables

The project requires a Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

Create an `.env.local` file (ignored by Git) and set the value before running the application.
