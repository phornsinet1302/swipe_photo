# PhotoSwipe

Swipe to clean up your gallery. Review photos one card at a time — swipe **right to keep**,
**left to delete** — then confirm deletions in a batch. Track how much space you've reclaimed
in the Stats dashboard.

This is a two-part project:

| Part | Owner | Stack |
| --- | --- | --- |
| `mobile/` | Student A | React Native + Expo (expo-router), Zustand, Reanimated, expo-media-library |
| `backend/` | Student B | Node.js + Express (in-memory store, ready to swap for a DB) |

## Project structure

```
photoswipe/
├── mobile/                    # Student A — Expo (Android-focused)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx          # Swipe Screen
│   │   │   ├── dashboard.tsx      # Analytics / Stats
│   │   │   └── settings.tsx       # Settings
│   │   ├── _layout.tsx            # Root layout (gesture + safe area)
│   │   └── permissions.tsx        # Gallery Permission Screen
│   ├── components/
│   │   ├── SwipeCard.tsx          # Tinder-style gesture card
│   │   ├── PhotoQueue.tsx         # Card-stack / queue manager
│   │   ├── UndoButton.tsx
│   │   └── DeleteReviewModal.tsx  # Confirm deletions
│   ├── services/
│   │   ├── api.ts                 # Axios calls to backend (optional)
│   │   └── galleryService.ts      # expo-media-library wrapper
│   ├── store/
│   │   └── swipeStore.ts          # Zustand state
│   ├── constants/theme.ts         # Colors / spacing / radius
│   ├── utils/format.ts
│   └── assets/
│
├── backend/                   # Student B — Express API
│   ├── src/
│   │   ├── routes/                # sessions.js, photos.js, analytics.js
│   │   ├── models/                # Session.js, Photo.js, Analytics.js (in-memory)
│   │   ├── controllers/           # *Controller.js
│   │   └── middleware/            # errorHandler.js
│   ├── server.js
│   └── .env
│
└── README.md
```

## Color palette

| Hex | Role |
| --- | --- |
| `#FFE5EC` | App background (lightest) |
| `#FFC2D1` | Light pink surfaces / borders |
| `#FFB3C6` | Pink accent |
| `#FF8FAB` | Secondary |
| `#FB6F92` | Primary / delete action |

Defined in [`mobile/constants/theme.ts`](mobile/constants/theme.ts).

## Getting started

### Mobile (Android via Expo Go)

```bash
cd mobile
npm install
npx expo start            # press "a" to open Android, or scan the QR in Expo Go
```

The app requests gallery permission on first launch. On a real device you'll see your own
photos; swipe through them and confirm deletions (the OS shows its own delete prompt).

> Testing on a physical device and want the backend too? Set `expo.extra.apiUrl` in
> `mobile/app.json` to your computer's LAN IP, e.g. `http://192.168.1.10:4000`.
> The app works fully **offline** — the backend is optional.

### Backend (optional API)

```bash
cd backend
npm install
npm run dev               # starts http://localhost:4000
```

Endpoints (all under `/api`):

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/sessions` | Start a cleanup session |
| `GET` | `/sessions/:id` | Fetch a session |
| `PATCH` | `/sessions/:id` | Finish a session with summary |
| `POST` | `/photos` | Record a keep/delete decision |
| `GET` | `/photos` | List decisions (optional `?sessionId=`) |
| `GET` | `/analytics` | Aggregated dashboard summary |

The backend uses an in-memory store so it runs with zero setup; swap the `src/models/*`
files for a real database when you're ready.

## How it works

- **galleryService** loads recent photos via `expo-media-library` and maps them into the store.
- **swipeStore** (Zustand) holds the session queue, decision history (for undo), the
  pending-delete list, and lifetime analytics.
- **SwipeCard** uses `react-native-gesture-handler` + `react-native-reanimated` for the
  drag/rotate/fly-out animation and KEEP/DELETE overlays.
- **DeleteReviewModal** lets you un-mark photos before the real deletion runs.
