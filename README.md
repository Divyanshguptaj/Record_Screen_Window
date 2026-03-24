# Screen & Webcam Recorder

A cross-platform desktop application built with **Electron**, **React**, and **TypeScript** that records any screen or window — with an optional simultaneous webcam feed. Each session is saved into a unique UUID-named folder so recordings never overwrite each other.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup & Running](#setup--running)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Output File Structure](#output-file-structure)
- [Edge Cases & How They Are Handled](#edge-cases--how-they-are-handled)
- [Known Limitations](#known-limitations)

---

## Features

- Browse thumbnail previews of all screens and open windows
- Filter sources by All / Screens / Windows
- Toggle webcam recording on or off independently
- Live mirrored webcam preview during recording
- Pause and resume both screen and webcam recorders simultaneously
- Real-time elapsed timer during recording
- Each session saved to `Videos/screen-recorder/<uuid>/`
- Separate `screen.webm` and `webcam.webm` files per session
- Rename the session folder from the Recording Complete screen
- One-click open of the saved session folder in Explorer / Finder
- Custom frameless title bar with minimize, maximize, and close controls

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 28 |
| UI framework | React 18 |
| Language | TypeScript 5 |
| Bundler | Webpack 5 (separate configs for main process and renderer) |
| Screen capture | Electron `desktopCapturer` + `getUserMedia` with `chromeMediaSource: desktop` |
| Recording API | Web `MediaRecorder` API — `video/webm;codecs=vp8` |
| Session IDs | `uuid` v9 — `uuidv4()` |

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later (bundled with Node.js)
- Windows 10/11, macOS 12+, or Linux with a desktop environment

---

## Setup & Running

### 1. Install dependencies

```bash
npm install
```

### 2. Start the app

```bash
npm start
```

This builds both the main process and renderer bundles and then launches the Electron app. Use this for a clean one-shot run.

### 3. Development mode (file watching + auto-rebuild)

```bash
npm run dev
```

Runs webpack in watch mode for both bundles in parallel. Once both output files exist, Electron launches automatically. Webpack rebuilds on every file save — restart Electron manually to pick up main-process changes.

### 4. Build only (no launch)

```bash
npm run build
```

Compiled output is written to the `dist/` folder.

---

## Project Structure

```
screen-recorder/
├── src/
│   ├── main/
│   │   ├── main.ts          # Electron main process — window, IPC handlers, file system
│   │   └── preload.ts       # Context bridge — exposes IPC API safely to the renderer
│   └── renderer/
│       ├── index.html       # HTML shell
│       ├── index.tsx        # React entry point
│       ├── App.tsx          # Root component — drives screen transitions
│       ├── App.css          # Global dark-theme styles
│       ├── types.ts         # Shared TypeScript types + window.electronAPI declaration
│       └── components/
│           ├── TitleBar.tsx       # Frameless title bar with window controls
│           ├── SourcePicker.tsx   # Source grid, filter tabs, webcam toggle
│           ├── RecordingView.tsx  # Live recording — timer, pause/stop, webcam preview
│           └── CompleteView.tsx   # Post-recording — rename session, open folder
├── webpack.main.js          # Webpack config for main + preload processes
├── webpack.renderer.js      # Webpack config for React renderer
├── tsconfig.json
├── package.json
└── README.md
```

---

## How It Works

**Step 1 — Source Picker**
The renderer invokes `window.electronAPI.getSources()` over IPC. The main process calls `desktopCapturer.getSources()` and returns each source's name and a 320×200 thumbnail as a base64 data URL. The renderer renders these as a clickable card grid.

**Step 2 — Starting a Recording**
On clicking Start Recording, the renderer calls `getUserMedia` with the Electron-specific desktop constraint:
```js
video: {
  mandatory: {
    chromeMediaSource: 'desktop',
    chromeMediaSourceId: source.id,
  }
}
```
If webcam is enabled, a second `getUserMedia({ video: true, audio: true })` acquires the camera. Both streams are fed into separate `MediaRecorder` instances that collect chunks every 250 ms.

**Step 3 — Stopping & Saving**
On Stop, both recorders are finalized, their chunks assembled into a `Blob`, converted to `ArrayBuffer`, and sent via IPC to the main process which writes the files to disk.

**Step 4 — Recording Complete**
The app shows a summary with duration, saved file names, and the full folder path. The user can rename the session folder, open it in Explorer/Finder, or start a new recording.

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

The `Videos` folder resolves per OS via `app.getPath('videos')`:

| OS | Path |
|---|---|
| Windows | `C:\Users\<user>\Videos\screen-recorder\` |
| macOS | `/Users/<user>/Movies/screen-recorder/` |
| Linux | `/home/<user>/Videos/screen-recorder/` |

---

## Edge Cases & How They Are Handled

### ✅ User denies camera permission

**What happens:** When the user toggles webcam on, the app calls `getUserMedia({ video: true })` to probe permission before recording starts.

**How it is handled:** If the browser throws a `NotAllowedError`, the toggle switches itself back off and displays an inline "Camera permission denied" message. The app continues normally and records screen only. Webcam is never silently enabled.

---

### ✅ App closed mid-recording

**What happens:** The user closes the window while `MediaRecorder` is still running.

**How it is handled:** A `beforeunload` event listener on the renderer window calls `.stop()` on both the screen and webcam `MediaRecorder` instances, which flushes any buffered chunks. This prevents a completely empty file.

> **Partial limitation:** The subsequent IPC `save-buffer` call (which writes the file to disk) is asynchronous. If the process exits before it completes, the session folder may be missing or contain a truncated file. A fully robust solution would require streaming chunks to disk as they arrive, which is not implemented in the current version.

---

### ✅ Green screen on Windows during recording

**What happens:** On Windows, Electron's GPU hardware acceleration pipeline interferes with `desktopCapturer`, causing video frames to turn green whenever on-screen content changes.

**How it is handled:** `app.disableHardwareAcceleration()` is called before `app.whenReady()` in the main process, forcing CPU-based compositing. The recorder also uses `video/webm;codecs=vp8` (VP8) instead of VP9, as VP9 has additional hardware-encoder green-frame bugs on Windows GPU drivers.

---

### ✅ Session rename collision

**What happens:** The user tries to rename a session to a name that already exists as a folder on disk.

**How it is handled:** The main process checks for the existence of the target path before calling `fs.renameSync`. If the path is already taken, the rename is skipped, and the renderer displays an inline error: *"Could not rename — a folder with that name may already exist."*

---

### ✅ Webcam source unavailable after permission is granted

**What happens:** The webcam stream fails to start even after permission is granted (e.g. camera in use by another app).

**How it is handled:** The `getUserMedia` call is wrapped in a `try/catch`. If it throws, the app logs a warning and continues with screen-only recording. The webcam preview section is not shown.

---

### ⚠️ No system / desktop audio capture

**Status: Not handled — known limitation.**

`chromeMediaSource: desktop` does not reliably capture system audio across all platforms (especially macOS and Linux). Webcam audio (the microphone) is captured when the webcam stream is active. A full system audio solution would require platform-specific APIs or a virtual audio device, which is out of scope for this version.

---

### ⚠️ App closed before recording starts saving

**Status: Partial — see mid-recording close above.**

If the window is closed during the save operation (after Stop is clicked but before files are written), the IPC round-trip may not complete. The session folder will exist but the `.webm` files may be absent or empty. No user-facing error is shown in this scenario.

---

## Known Limitations

| Limitation | Status |
|---|---|
| No system audio capture | Not implemented — platform APIs required |
| App closed during save may produce empty files | Partially mitigated via `beforeunload` |
| Frame rate capped at 30 fps on some Windows GPU drivers | Upstream Chromium/Electron limitation |
| No MP4 export | WebM (VP8) only — convert with `ffmpeg -i screen.webm output.mp4` |
| Single window only | Multiple simultaneous recording sessions not supported |
| No audio waveform or audio track in screen recording | Out of scope for this version |
