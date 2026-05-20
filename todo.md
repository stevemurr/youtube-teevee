# YouTube TeeVee - Refactor & Upgrade Todo

## High Priority

- [x] **1. TypeScript version mismatch** — bumped `api/package.json` TS from `^5.3.3` → `^5.8.3`
- [x] **2. Duplicate time-conversion logic** — extracted `frontend/src/utils/time.ts` (`timeStringToSeconds`, `dateToSeconds`); updated `ChannelRow.tsx` and `LazyChannelRow.tsx`
- [x] **3. YouTube player init duplicated** — extracted `createYTPlayer()` helper in `usePlayerPair.ts`; shared `useYouTubeLoader.ts` replaces inline script injection in `GlobalVideoPlayer.tsx` and `useYouTubePlayer.ts`
- [x] **4. `GlobalVideoPlayer.tsx` too large (376 lines)** — split into `hooks/useYouTubeLoader.ts` + `hooks/usePlayerPair.ts`; component reduced to ~90 lines (JSX + layout only)
- [x] **5. Direct `localStorage` in `Settings.tsx:79`** — replaced with `token` destructured from `useTVStore()`

## Medium Priority

- [x] **6. Unused `@tanstack/react-query`** — removed import, `QueryClient`, `QueryClientProvider` wrapper from `App.tsx`; removed package from `frontend/package.json`
- [x] **7. `setInterval` without cleanup in `useTVStore.ts:211`** — stored handle; registered `beforeunload` listener to clear it
- [x] **8. `JSON.parse` without try/catch** — guarded `auth.ts:35` (falls back to `{}`), `cache-manager.ts:62` and `cache-manager.ts:147` (return `null` on corrupt data)
- [x] **9. Inconsistent API response format** — added `api/src/utils/response.ts` with `ok()` / `fail()` helpers; all routes now use them; `{ success: true }` replaced with `ok(res)`
- [x] **10. Magic numbers scattered** — frontend constants in `frontend/src/utils/constants.ts` (`GUIDE_PIXELS_PER_HOUR`, `GUIDE_HOURS_TO_SHOW`, `DEFAULT_MAX_VIDEO_DURATION_S`); API magic numbers promoted to `TimelineGenerator` class constants (`MIN_VIDEO_DURATION`, `MAX_VIDEO_DURATION`, `RECENT_DAYS`, `PRIME_TIME_RECENT_RATIO`, `POPULAR_PERCENTILE`)
- [x] **11. console.log in frontend** — created `frontend/src/utils/logger.ts` and `api/src/utils/logger.ts`; both silence `log`/`warn` in production, always pass through `error`; all route/service/component files updated

## Low Priority / Upgrades

- [x] **12. Zod barely used** — added `CurrentProgramQuery` schema to `timeline.ts`; replaces raw `parseInt` + manual null-checks with `z.coerce.number().int().min/max()` and `safeParse`
- [x] **13. No Docker health checks** — added `healthcheck` (wget spider, 5s interval, 30s start_period) to both `api` and `frontend` services; `caddy` now uses `condition: service_healthy` on both dependencies
- [x] **14. No path aliases in `vite.config.ts`** — added `resolve.alias` with `@` → `./src`; added matching `baseUrl` + `paths` in `tsconfig.app.json`
- [x] **15. Bump Axios** — `^1.6.2` → `^1.7.0` in `frontend/package.json`

## Quick Wins (1–2 file changes each)

- [x] Remove unused React Query wrapper — `App.tsx`
- [x] Fix `localStorage` → store token — `Settings.tsx:79`
- [ ] Add `JSON.parse` guards — `auth.ts:35`, `cache-manager.ts:62,147`
- [x] Bump TypeScript in `api/` — `api/package.json`
- [x] Extract time utils — `frontend/src/utils/time.ts`

---

## Completed

<!-- Items move here when done -->
