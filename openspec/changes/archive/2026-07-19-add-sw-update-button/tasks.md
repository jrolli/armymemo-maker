## 1. Service worker

- [x] 1.1 In `scripts/generate-sw.mjs`, add a `message` event listener to the generated worker template that calls `self.skipWaiting()` when it receives the `"SKIP_WAITING"` message; leave install/activate/fetch handlers unchanged

## 2. Update control UI

- [x] 2.1 Add a hidden "Update available" button to the footer `.actions` group in `index.html` (`id="update-button"`, `type="button"`, `hidden`)
- [x] 2.2 Style the button in `src/style.css` consistently with the existing action-bar buttons, visually distinguishable as an update notice

## 3. Client wiring

- [x] 3.1 In `src/main.ts`, keep the resolved registration and add a `showUpdateButton(worker)` helper that unhides the button and, on click, attaches a `{ once: true }` `controllerchange` → `location.reload()` listener and posts `"SKIP_WAITING"` to the waiting worker
- [x] 3.2 Detect an update already waiting at load (`reg.waiting`) and one arriving while the page is open (`updatefound` → installing worker `statechange` to `"installed"`), showing the button only when `navigator.serviceWorker.controller` is non-null so first installs never surface it
- [x] 3.3 Add a `visibilitychange` handler that calls `reg.update()` when the document becomes visible, throttled to at most once per hour, so long-lived tabs and installed windows discover updates

## 4. Verification

- [x] 4.1 `npm run build` passes (typecheck plus acknowledgements, local-only, precache, and asset-size checks) with the new worker template and UI
- [x] 4.2 Ad-hoc Playwright check of the full update flow against a static server serving `dist/`: first visit shows no button; after swapping in a rebuilt (byte-different) deploy, a reload surfaces the button without any unsolicited reload; clicking it reloads once and subsequent loads serve the new version
- [x] 4.3 Confirm offline behavior is unchanged: with the network blocked after precache, the app still loads and functions, and no update button appears
