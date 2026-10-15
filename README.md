# Pitaco Web

Pitaco is a football prediction pool app: players join pools, predict match scores and climb a ranking as results come in. This repository holds the web app, a React single-page app that installs as a PWA and talks to the API.

| Part | What it is |
| --- | --- |
| `pitaco-web` (this repo) | The web app: player screens, pool management and the admin area. |
| [`pitaco-api`](https://github.com/Viniciusadm/pitaco-api) | The Rust REST API that stores pools, predictions and results and sends the push notifications. |

The first version of the interface was generated with Lovable: the layout, the shadcn/ui components and most screens, including the admin area, running on mock data. The API integration, the session handling, offline support, the PWA, notifications and push, and the later features such as penalty predictions were written by hand.

## Screens

- `/login`, `/register`: account access.
- `/bolao/criar`, `/bolao/entrar`: create a pool or join one with an invite code.
- `/app`: the selected pool, with matches (`/app/jogos`), the player's predictions (`/app/palpites`), the ranking, the history of results, the participants, notifications and the pool settings and preferences.
- `/admin`: teams (`/admin/selecoes`) and matches with their results (`/admin/partidas`), for admin users.

The interface text is in Portuguese.

## Requirements

- Node.js 20.19+ or 22.12+ (required by Vite 8) with npm
- A running [`pitaco-api`](https://github.com/Viniciusadm/pitaco-api)

Main stack: React 19, TypeScript 5.8, Vite 8, TanStack Router and Query, Tailwind CSS 4, shadcn/ui on Radix, vite-plugin-pwa and the Firebase SDK for push.

## Running locally

Copy the environment file and point `VITE_API_BASE_URL` at the API (with the `/api/v1` prefix). Tournaments are managed in the admin area (`/admin/campeonatos`); pools pick an active tournament when they are created:

```bash
cp .env.example .env
```

Install the dependencies and start the dev server:

```bash
npm install
npm run dev
```

Build for production and preview the build:

```bash
npm run build
npm run preview
```

Push notifications stay off until the `VITE_FIREBASE_*` variables and `VITE_FCM_VAPID_KEY` are set; without them the app does not ask for permission or register a device. The service worker that receives the messages is [`public/firebase-messaging-sw.js`](public/firebase-messaging-sw.js).

Check the code with ESLint:

```bash
npm run lint
```
