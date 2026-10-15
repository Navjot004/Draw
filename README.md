# 🎭 Mystery Name Shuffle — Student Winner Selection System (100% TypeScript & Node.js)

A high-energy, cryptographically fair, live-event web application built for college auditoriums and stage projectors. It selects **exactly ONE winner** uniformly at random from a verified list of participants uploaded directly via Excel (`.xlsx`, `.csv`), and reveals them through a suspenseful, cinematic game-show animation.

> **Design Principle**: No login screens, no passwords, no complex API setups. One direct cinematic stage with local Excel upload and instant single-winner reveal!

---

## 🌟 Key Features

- **100% TypeScript & Node.js**: Clean, type-safe architecture throughout frontend and backend. Zero Python/venv/ASGI dependency.
- **Direct Single-Page Experience (No Login)**: Open the app and jump immediately to the full-screen cinematic stage.
- **Direct Local Excel / CSV Upload**:
  - Drag & drop or browse `.xlsx`, `.xls`, `.csv` files directly in the browser.
  - Automatically parses in milliseconds using SheetJS (`xlsx`).
  - Supports 2-column sheets (Participant Name, Registration ID) or single-column name lists (with auto-generated clean IDs).
  - Automatically deduplicates and cleans whitespace.
  - Saved directly in browser `localStorage` so names persist across page reloads.
- **Cryptographically Fair Winner Selection**: Uses browser Web Crypto `window.crypto.getRandomValues()` and Node's `crypto.randomInt` for true uniform randomness.
- **Projector Fullscreen Mode**: Dedicated projector button with F11 compatibility, styled with electric-blue and golden glowing accents on dark glassmorphism.
- **Cinematic 4-Phase Suspense Animation**:
  - **Stage A (Ready)**: Live participant counter and big glowing "START DRAW" button.
  - **Stage B (Countdown)**: High-energy 3... 2... 1 countdown with synthesized audio beeps.
  - **Stage C (Rapid Name Shuffle)**: Central name slot rapidly cycling through participant names, smoothly decelerating over ~6.5 seconds.
  - **Stage D (Final Reveal)**: Dramatic winner reveal with golden card, multi-burst confetti, and triumph fanfare sound.
- **Audio Synthesizer (Zero External Assets)**: Powered directly by the browser Web Audio API with an instant mute toggle.
- **Audit List & Search Modal**: Search participants, view cryptographic SHA-256 pool hash, and inspect duplicate detection.
- **Draw History**: View all winners drawn during the session with timestamps.

---

## 🚀 Quick Start

### 1. Run the Frontend (Single-Page App)

```bash
cd frontend
npm install
npm run dev
```

Open your browser at:
```
http://localhost:5173
```
You will immediately see the **Mystery Name Shuffle Stage**!

- Click **Upload Excel** to upload your participants sheet (`.xlsx` or `.csv`).
- Or click **Template** to download a ready-to-fill sample Excel template.
- Click **START DRAW** to experience the countdown, suspense shuffle, and confetti reveal!

---

### 2. Run the Node.js TypeScript Backend (Optional)

If you wish to run the Node.js Express backend API:

```bash
cd backend
npm install
npm run dev
```

Backend will start on:
```
http://localhost:8000
```
Interactive endpoints:
- `GET  /api/health`
- `GET  /api/students/status`
- `POST /api/students/upload` (Multer Excel upload)
- `POST /api/draws` (Cryptographic winner selection)
- `GET  /api/students/template` (Generates sample `.xlsx`)

---

## 📁 Excel File Formats Supported

1. **Option A (Standard 2 Columns)**:
   - Column 1: `Participant Name` (e.g. "Aarav Sharma")
   - Column 2: `Registration Number` (e.g. "2026-CS-001")

2. **Option B (Single Column - Names Only)**:
   - Column 1: `Name` (e.g. "Priya Verma")
   - Unique IDs like `P-0001`, `P-0002` are generated automatically!
