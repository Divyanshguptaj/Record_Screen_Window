# Screen & Webcam Recorder

A cross-platform desktop app built with **Electron**, **React**, and **TypeScript** for recording your screen and webcam simultaneously.

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later (bundled with Node.js)
- Windows 10/11, macOS 12+, or Linux with a desktop environment

---

## Installation

```bash
npm install
```

---

## Running the App

### Start (build once + launch)

```bash
npm start
```

Builds both the main process and renderer bundles, then launches the Electron app.

### Development mode (watch + auto-rebuild)

```bash
npm run dev
```

Runs webpack in watch mode for both bundles. Electron launches automatically once both bundles are ready. Webpack rebuilds on every file save — restart Electron manually to pick up main-process changes.

### Build only (no launch)

```bash
npm run build
```

Compiled output is written to the `dist/` folder.

---

## Output Location

Recordings are saved to your system's Videos folder:

| OS | Path |
|---|---|
| Windows | `C:\Users\<user>\Videos\screen-recorder\` |
| macOS | `/Users/<user>/Movies/screen-recorder/` |
| Linux | `/home/<user>/Videos/screen-recorder/` |

Each session is stored in a separate UUID-named folder containing `screen.webm` and optionally `webcam.webm`.

---

> For a full breakdown of features, architecture, and edge cases see [FEATURES.md](./FEATURES.md).
