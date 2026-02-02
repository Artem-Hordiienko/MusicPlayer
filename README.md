# 🎵 Advanced React Music Player

A high-performance web-based audio player built with **React 18** and the **Web Audio API**. featuring a professional 5-band equalizer, real-time visualization, and a "Glassmorphism" mini-player. Designed for audiophiles and developers alike, focusing on offline capabilities and seamless state management.

## 🚀 Overview

This project demonstrates a complex front-end architecture without a backend dependency. It leverages **IndexedDB** for storing large audio files and metadata locally, ensuring a persistent library experience that survives browser refreshes. The audio engine is built directly on the Web Audio API, allowing for studio-grade audio processing (EQ, Preamp) completely within the browser.

## 🛠 Tech Stack

- **Core**: React 18, Vite 5
- **Audio Engine**: Web Audio API (`AudioContext`, `BiquadFilterNode`, `AnalyserNode`)
- **State/Storage**: IndexedDB (`idb-keyval`), LocalStorage, React Hooks
- **Styling**: CSS Variables, Glassmorphism UI, Responsive Design
- **Tooling**: Vitest, ESLint, Stylelint

## ✨ Key Features

### 🎛️ Advanced Audio Processing
- **5-Band Equalizer**: Precise frequency control (60Hz, 170Hz, 1kHz, 3.5kHz, 10kHz).
- **Preamp Stage**: Input gain control (0.5x - 1.5x) to prevent clipping.
- **Glitch-Free Routing**: Dynamic audio graph reconnection allows EQ toggling without audio dropouts.

### 🎨 Modern UI & Visualization
- **Real-Time Visualizer**: High-FPS canvas rendering using `AnalyserNode` frequency data.
- **Mini Player**: Detachable "Always-On-Top" style popup window (Spotify-like Card design) with bi-directional state synchronization (`postMessage`).
- **Glassmorphism**: Premium frosted glass effects on UI elements.

### 📂 Smart Library Management
- **Offline-First**: Audio files and cover art are stored in the browser's IndexedDB.
- **Drag & Drop**: Intuitive import zone with automatic duplicate detection (fingerprinting).
- **Metadata Parsing**: Automatically extracts ID3 tags and embedded artwork using `music-metadata-browser`.

## 🏗 Architecture

### Audio Signal Chain
```
Source (Element) ➔ Preamp (Gain) ➔ [EQ Filter Bank x5] ➔ Analyser ➔ Destination
```
The audio graph is lazily initialized to comply with browser autoplay policies and preserve resources.

### Data Flow
- **Library**: `File` object ➔ Fingerprint Check ➔ Metadata Extraction ➔ IndexedDB.
- **State**: `App.jsx` serves as the single source of truth, distributing state to `Player` and `Playlist` components.
- **Sync**: The main window and Mini Player communicate via a secure `postMessage` protocol to keep playback state and track info in perfect sync.

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Artem-Hordiienko/MusicPlayer.git
   cd MusicPlayer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## 🧪 Quality Assurance

- **Unit Testing**: `npm test` (Vitest + Testing Library)
- **Linting**: `npm run lint` (ESLint + Stylelint)
- **CSS Audit**: `npm run css:audit` (PurgeCSS)

---

*Built with ❤️ by Artem Hordiienko*
