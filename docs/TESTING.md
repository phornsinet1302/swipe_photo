# Testing & Edge Cases

The project relied on a layered strategy: **static analysis** for type and dependency correctness, **end-to-end manual flows** on real devices, and **deliberate edge-case engineering** for the failure modes that mobile photo apps see in production.

## 1. Static analysis (continuous)

### TypeScript strict mode
The mobile project runs in `"strict": true` (see `mobile/tsconfig.json`) and every change in this project ended with:
```bash
cd mobile && npx tsc --noEmit
```
A passing `tsc` was the precondition for shipping any feature in this codebase. Several historical bugs (wrong store field names, broken route casts, unused locals) were caught before runtime.

### Dependency / Expo doctor
`npx expo-doctor` was the second precondition — particularly important after each new native module was added (`expo-audio`, `expo-secure-store`):

> *18 / 18 checks passed. No issues detected.*

Specific issues this caught:
- Missing peer `expo-asset` (required by `expo-audio`).
- Duplicate `expo-asset` / `expo-constants` brought in by transitive deps.
- Missing `metro.config.js` extending Expo's default.

All resolved via `npx expo install --fix` and a one-line `metro.config.js`.

### Backend smoke check
After every backend change, a one-liner verifies Mongo connectivity and listener startup before deploy:
```bash
cd backend && timeout 20 node server.js | head
```
Look for:
```
MongoDB connected: ac-…/test
PhotoSwipe backend listening on http://localhost:4000
```

## 2. Manual end-to-end test flows

Each flow was executed on at least one **real device** (the iPhone for iOS, an Android device for Android). The flows below were rerun whenever swipe-store, settings, or auth code changed.

| # | Flow | What it verifies |
|---|---|---|
| 1 | Cold start → permission grant → first swipe | Permission UX, gallery loading, initial render |
| 2 | Right-swipe → undo → left-swipe → undo → review modal | Decision recording, undo, pending queue |
| 3 | Mark 30 photos for delete → review → confirm → OS prompt → done | Native delete, stats update, modal sequencing |
| 4 | Force-quit at mid-deck → re-open | Lightweight persistence: stats persist, deck restreams |
| 5 | Light → Dark → System theme | Theme propagates without restart |
| 6 | Settings → Christmas / Halloween | Overlay + music + palette change |
| 7 | Smart → Scan → Screenshots → Review → swipe | Indexer, suggestion grouping, curated session |
| 8 | Curated session → tap chip → confirm → back to general | Session label, dismissible chip, dialog sequencing |
| 9 | Sign up → force-quit → re-open → still signed in | SecureStore token persistence and re-hydration |
| 10 | Sign in with wrong password → red error | Generic 401 path, no email enumeration |
| 11 | Toggle Share Analytics off → swipe → check Atlas | Privacy gate (no traffic when off) |
| 12 | Reset review history → confirm → deck reloads | Multi-store reset (decided + session + auto-start dep) |

## 3. Device & environment matrix

Different hardware exposes different bugs. The following were explicitly validated:

| Device class | Specific concern verified |
|---|---|
| iPhone with home indicator | Bottom safe-area inset applied to tab bar (no overlap with indicator) |
| iPhone with home button | Tab bar collapses to original 64 dp (no extra padding) |
| Android, 3-button navigation | Tab bar grows by `insets.bottom` so labels sit above system bar |
| Android, gesture navigation | Tab bar at original size, no overlap |
| Expo Go (development) | Photo permission attached to *Expo Go* identity, not "PhotoSwipe" |
| Built APK (EAS preview) | App-level permission strings from `app.json` plugins are applied |
| Web preview | `galleryService.isWeb` returns gracefully — no native crash |

## 4. Edge cases — handled and tested

Each row below describes a real failure mode mobile photo apps hit and what PhotoSwipe does instead of crashing.

### 4.1 Permissions
| Edge case | Behavior |
|---|---|
| User denies permission first time | Permissions screen explains why, offers "Open Settings" |
| User picks "Limited Access" (iOS) | Same empty-state UI; "Open Settings" guides them to Full Access |
| User revokes permission later | All loads silently fail to the empty state, no crash |
| Permission was granted, library is empty | Empty-state screen explicitly says "No photos found" |

### 4.2 Gallery streaming
| Edge case | Behavior |
|---|---|
| Library has 0 photos | Empty state; auto-start does not loop (deps unchanged) |
| Library has 5 000–20 000 photos | Paginated load + per-asset filter + prefetch; never holds more than one page in memory |
| Entire next page already reviewed | `startNewSession` / `maybeLoadMore` loops pages until one fresh photo is found, or the cursor reaches the end |
| `getAssetsAsync` throws (e.g. limited + nothing selected) | Caught, console-warned, empty state shown |
| sortBy edge case (`Invalid sortBy key: false`) | Fixed by nesting `[[key, false]]`; regression-protected by a comment block in `loadPhotoPage` |

### 4.3 Images
| Edge case | Behavior |
|---|---|
| Image URI is dead (asset deleted since indexing) | `onError` triggers `skipMissing(photo.id)` after 1.5 s; card auto-advances; asset id added to decided log |
| Bitmap cache grows past safe size | `clearMemoryCache()` every 20 swipes + when review modal opens |
| Hundreds of pending-delete thumbnails | `FlatList` virtualization keeps ~9 alive; thumbnails use `cachePolicy="disk"` |

### 4.4 Modals & UI
| Edge case | Behavior |
|---|---|
| Two RN `Modal`s open simultaneously on iOS | Avoided by 350 ms `setTimeout` between dismiss and present |
| Dialog backdrop tap | Closes the dialog without firing any button — same as Android back |
| Smart "Review" while a curated session is still in progress | Previous session is recorded to history; new one replaces the deck cleanly |

### 4.5 Persistence & store
| Edge case | Behavior |
|---|---|
| App crash / force-quit mid-session | Pending deletes, stats, history, decided log all survive (lightweight `partialize`) |
| Old persisted state from before the season-mode refactor | Unknown fields silently dropped, defaults applied — no broken hydration |
| `decidedAssetIds` exceeds 10 000 | FIFO eviction in `decide()` keeps it bounded |
| Hydration in flight when first render runs | Auto-start gated by `hydrated && permission.granted && sessionPhotos.length === 0` — no clobbered resume |

### 4.6 Backend & network
| Edge case | Behavior |
|---|---|
| Backend unreachable | Every `api.ts` function returns `null` / no-op; dashboard falls back to local state; swipe path is unaffected (fire-and-forget) |
| Render cold start (~30 s) | 45 s axios timeout absorbs it; fire-and-forget posts mean cold start doesn't block UI |
| Mongo Atlas paused (free tier) | Backend logs "connect ETIMEDOUT" and exits 1; Render reports the failed deploy clearly |
| IP allowlist missing | Same as above — surfaced explicitly in logs |
| Invalid JWT / expired token | `/api/auth/me` returns 401; client clears the stored token; user falls back to anonymous mode |
| Duplicate-email register | Backend returns 409; UI displays the message verbatim |
| `assetId` / `decision` missing on `/photos` POST | 400 with explicit field error; client doesn't even hit this in practice (always sends both) |

### 4.7 Audio (seasonal modes)
| Edge case | Behavior |
|---|---|
| Switching season while music is playing | `replace(source)` swaps tracks on the existing player — no double-playback |
| Audio file fails to load | `try/catch` in `ensurePlayer` logs and returns `null`; UI still works, just no music |
| Returning to default mode | `stopSeasonalMusic()` pauses; player retained so next switch is instant |

### 4.8 Build & tooling
| Edge case | Behavior |
|---|---|
| Adding new files (Metro doesn't see them) | Documented in onboarding: `npx expo start -c` after any file move |
| TypeScript types out of sync with new expo-router files | Documented `as never` cast; not a build-time bug, just a typed-routes regeneration delay |
| Render "Root Directory" misconfigured | Documented: trailing whitespace will silently break the deploy |

### 4.9 Cross-platform
| Edge case | Behavior |
|---|---|
| Web build (`output: "static"`) | `galleryService` early-returns on web; no native calls attempted |
| Android with 3-button nav | Tab bar safe-area inset applied |
| Different status-bar themes | `<StatusBar style={scheme === 'light' ? 'dark' : 'light'} />` flips for Halloween + dark mode |

## 5. Regression markers

A handful of fixes are protected by inline comments so they don't reappear:

- **sortBy nesting** in `loadPhotoPage` (`// Note: a [key, ascending] pair must be nested...`)
- **Image memory flushing** in `index.tsx` (`// keeps memory bounded during long delete sessions...`)
- **Modal sequencing** in `handleConfirmDelete` (`// Always close the review modal first...`)
- **Axios timeout rationale** in `api.ts` (`// Render's free tier cold-starts in ~30s...`)

When the next contributor wonders "why is this here," the comment answers.

## 6. What we deliberately do **not** test

Honest gaps so the report is credible:

- **No automated unit / integration tests.** All testing is manual + type/dependency checks. For a class project this was a deliberate scope decision — adding Jest + react-native-testing-library would have eaten time that went into features instead.
- **No iOS production-build tested.** Apple Developer account ($99/year) was out of scope; Android EAS preview build is the only platform tested as a real binary.
- **No load testing of the backend.** Render free-tier limits make this academic; for a real launch we'd need Render Pro + a load tool like k6.
