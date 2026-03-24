# Features, Architecture & Edge Cases

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Output File Structure](#output-file-structure)
- [Architecture Overview](#architecture-overview)
- [Edge Cases & How They Are Handled](#edge-cases--how-they-are-handled)
- [Known Limitations](#known-limitations)

---

## Features

| Feature | Description |
|---|---|
| Source picker | Thumbnail grid of all screens and open windows with All / Screens / Windows filter tabs |
| Webcam toggle | Enable or disable webcam recording independently before starting |
| Live webcam preview | Mirrored webcam feed shown on screen during recording |
| Pause / Resume | Pauses both screen and webcam recorders simultaneously without losing footage |
| Live timer | Real-time elapsed time display during recording |
| UUID sessions | Every session saved to its own uniquely named folder — sessions never overwrite each other |
| Separate files | `screen.webm` and `webcam.webm` stored as independent files |
| Session rename | Rename the session folder directly from the Recording Complete screen |
| Open folder | One-click reveal of the saved folder in Explorer / Finder |
| Frameless UI | Custom title bar with working minimize, maximize, and close buttons |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 28 |
| UI framework | React 18 |
| Language | TypeScript 5 |
| Bundler | Webpack 5 — separate configs for main process and renderer |
| Screen capture | Electron `desktopCapturer` + `getUserMedia` (`chromeMediaSource: desktop`) |
| Recording API | Web `MediaRecorder` API — `video/webm;codecs=vp8` |
| Session IDs | `uuid` v9 — `uuidv4()` |

---

## Project Structure

```
screen-recorder/
├── src/
│   ├── main/
│   │   ├── main.ts          # Electron main process — window, IPC handlers, file system
│   │   └── preload.ts       # Context bridge — exposes IPC API safely to the renderer
│   └── renderer/
│       ├── index.html       # HTML shell loaded by Electron
│       ├── index.tsx        # React entry point
│       ├── App.tsx          # Root component — drives screen transitions
│       ├── App.css          # Global dark-theme styles
│       ├── types.ts         # Shared TypeScript types + window.electronAPI declaration
│       └── components/
│           ├── TitleBar.tsx       # Frameless title bar with window controls
│           ├── SourcePicker.tsx   # Source grid, filter tabs, webcam toggle
│           ├── RecordingView.tsx  # Live recording — timer, pause/stop, webcam preview
│           └── CompleteView.tsx   # Post-recording — rename session, open folder
├── webpack.main.js          # Webpack config for main + preload (electron-main / electron-preload targets)
├── webpack.renderer.js      # Webpack config for React renderer (electron-renderer target)
├── tsconfig.json
├── package.json
├── .gitignore
├── README.md
└── FEATURES.md
```

---

## How It Works

### Step 1 — Source Picker

The renderer calls `window.electronAPI.getSources()` over IPC. The main process runs `desktopCapturer.getSources()` and returns each source's name and a 320×200 thumbnail as a base64 data URL. The renderer displays these as a clickable card grid.

### Step 2 — Starting a Recording

On clicking **Start Recording**, the renderer calls `getUserMedia` with the Electron desktop constraint:

```js
video: {
  mandatory: {
    chromeMediaSource: 'desktop',
    chromeMediaSourceId: source.id,
  }
}
```

If webcam is enabled, a second `getUserMedia({ video: true, audio: true })` acquires the camera stream. Both streams are fed into separate `MediaRecorder` instances that collect chunks every 250 ms.

### Step 3 — Stopping & Saving

On **Stop**, both recorders are finalized, their chunks assembled into a `Blob`, converted to `ArrayBuffer`, and sent via IPC to the main process. The main process writes the files to:

```
<Videos folder>/screen-recorder/<uuid>/screen.webm
<Videos folder>/screen-recorder/<uuid>/webcam.webm
```

### Step 4 — Recording Complete

The app transitions to a summary screen showing the duration, which files were saved, and the full folder path. From here the user can rename the session, open the folder, or start a new recording.

---

## Output File Structure

```
Videos/
└── screen-recorder/
    ├── 4a12ffac-b243-4fa3-8c9f-1123dfeaa342/
    │   ├── screen.webm
    │   └── webcam.webm        ← only present if webcam was enabled
    └── 9f3c1a2b-0d4e-4f5a-8b6c-7e8d9f0a1b2c/
        └── screen.webm
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                 Electron Main Process                 │
│                                                       │
│  main.ts                                              │
│  ├── Creates BrowserWindow (frameless)                │
│  ├── Loads dist/renderer/index.html                   │
│  ├── app.disableHardwareAcceleration()                │
│  └── IPC Handlers                                     │
│      ├── get-sources    → desktopCapturer.getSources  │
│      ├── save-buffer    → fs.writeFileSync            │
│      ├── rename-session → fs.renameSync               │
│      ├── open-folder    → shell.openPath              │
│      └── window-*       → minimize / maximize / close │
│                                                       │
│  preload.ts (context bridge)                          │
│  └── window.electronAPI → safe IPC wrapper            │
└─────────────────────┬────────────────────────────────┘
                      │  IPC over contextBridge
┌─────────────────────▼────────────────────────────────┐
│              Renderer Process (React)                 │
│                                                       │
│  App.tsx  (3-screen state machine)                    │
│  ├── picker     → SourcePicker.tsx                    │
│  │   └── source grid + webcam toggle                  │
│  ├── recording  → RecordingView.tsx                   │
│  │   ├── MediaRecorder — screen (VP8/WebM)            │
│  │   ├── MediaRecorder — webcam (VP8/WebM)            │
│  │   └── timer, pause/resume, stop                    │
│  └── complete   → CompleteView.tsx                    │
│      └── rename, open folder, new recording           │
└──────────────────────────────────────────────────────┘
```

---

## Edge Cases & How They Are Handled

### ✅ User denies camera permission

**Trigger:** User toggles webcam on; OS blocks the `getUserMedia` call.

**Handling:** The call is wrapped in `try/catch`. On failure the toggle resets to off and shows an inline *"Camera permission denied"* message. Screen recording is unaffected and continues normally.

---

### ✅ App closed mid-recording

**Trigger:** User closes the window while `MediaRecorder` is still active.

**Handling:** A `beforeunload` event listener calls `.stop()` on both the screen and webcam `MediaRecorder` instances, flushing any buffered chunks before the process exits.

> **Remaining gap:** The `save-buffer` IPC call that writes files to disk is asynchronous. If the process exits before it completes the session folder may be empty or missing. A fully robust solution would stream chunks to disk as they arrive rather than batching them on stop.

---

### ✅ Green screen on Windows

**Trigger:** Electron's GPU hardware acceleration pipeline conflicts with `desktopCapturer` on many Windows GPU drivers, producing green video frames whenever on-screen content changes.

**Handling:**
- `app.disableHardwareAcceleration()` is called before `app.whenReady()`, forcing CPU-based compositing.
- The codec is set to `video/webm;codecs=vp8` (VP8) instead of VP9, which has additional hardware-encoder green-frame issues on Windows.

---

### ✅ Session rename collision

**Trigger:** User tries to rename a session to a name already used by an existing folder.

**Handling:** The main process checks `fs.existsSync(newPath)` before calling `fs.renameSync`. If the target already exists the rename is skipped and the renderer displays: *"Could not rename — a folder with that name may already exist."*

---

### ✅ Webcam unavailable after permission is granted

**Trigger:** Camera permission is granted by the OS but the device fails to open (e.g. camera already in use by another application).

**Handling:** The `getUserMedia` call is inside a `try/catch`. On failure the app logs a warning and falls back to screen-only recording. The webcam preview section is not rendered.

---

### ⚠️ No system / desktop audio capture

**Status: Not handled.**

`chromeMediaSource: desktop` does not reliably capture system audio across all platforms (no support on macOS, unreliable on Linux). Webcam microphone audio is captured when the webcam stream is active. Full system audio would require platform-native APIs or a virtual audio device — out of scope for this version.

---

### ⚠️ Save interrupted by window close

**Status: Partially mitigated.**

If the window is closed after the user clicks Stop but before the IPC `save-buffer` call completes, the session folder may be created but contain empty or missing files. The `beforeunload` handler mitigates mid-recording closes but does not cover this save window.

---

## Known Limitations

| Limitation | Detail |
|---|---|
| No system audio | Platform-level limitation — requires native APIs not bundled here |
| Partial file on force-close during save | IPC save is async; process exit can interrupt it |
| 30 fps cap on some Windows GPU configs | Upstream Chromium / Electron limitation with `chromeMediaSource: desktop` |
| WebM only — no MP4 export | Convert manually: `ffmpeg -i screen.webm -c:v libx264 output.mp4` |
| Single window only | Multiple simultaneous recording sessions not supported |
