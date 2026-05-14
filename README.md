# PixVox

🎨 **Transform 2D pixel art into 3D voxel models** - A cross-platform pixel art editor with real-time 3D preview and GLTF/OBJ export.

![PixVox Banner](https://img.shields.io/badge/PixVox-1.0.2-cyan?style=for-the-badge)
![License](https://img.shields.io/github/license/PetRockStudiosLLC/pixvox?style=for-the-badge)
![Stars](https://img.shields.io/github/stars/PetRockStudiosLLC/pixvox?style=for-the-badge)

## ✨ Features

- **Multi-View Canvas**: Six synchronized views (Main, Front, Left, Right, Top, Bottom) with keyboard shortcuts (1-6)
- **Real-time 3D Preview**: Watch your voxel model update as you paint - persistent 3D panel (320px desktop, full-width mobile)
- **Modular Brush System**: Point, Line, Bucket Fill, and Eraser tools
- **Smart Palette Management**: Save/load palettes, generate random color schemes (complementary, analogous, triadic)
- **Layer System**: Add, duplicate, reorder, and navigate layers
- **Import Images**: Convert existing pixel art images directly into voxels
- **Export Options**: GLTF with vertex colors or OBJ format for Blender/Maya/Unity
- **Mobile-First Design**: Native bottom tab bar (Draw, Palette, Layers, 3D, Menu), swipe gestures, floating brush controls
- **Undo/Redo**: Full history support with Ctrl+Z / Ctrl+Y
- **Native Apps**: Desktop (Windows) and Mobile (Android) apps via Tauri v2
- **Local Storage**: Auto-save projects to browser storage

## 🚀 Quick Start

### Web Version
```bash
# Clone the repository
git clone https://github.com/PetRockStudiosLLC/pixvox.git
cd pixvox

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Desktop App (Windows)
```bash
# Install Rust and Tauri dependencies first
# Then run Tauri dev
npm run tauri:dev

# Build Windows installer (MSI + NSIS)
npm run tauri:build
```

### Android
```bash
npx tauri android init
npx tauri android build
# Output: PixVox-v1.0.0-signed.apk
```

## 🎮 Controls

### Keyboard Shortcuts
- **1-6**: Switch between views (Main, Front, Left, Right, Top, Bottom)
- **Q/E**: Navigate layers down/up
- **Tab**: Toggle 2D/3D view
- **Ctrl+Z**: Undo
- **Ctrl+Y / Ctrl+Shift+Z**: Redo

### Mouse Controls
- **Left Click**: Paint pixels
- **Middle Click + Drag**: Pan canvas
- **Scroll Wheel**: Zoom in/out (centered on cursor)

### Touch Controls (Mobile)
- **Tap**: Paint pixel
- **Drag**: Paint continuously
- **Swipe Left/Right**: Switch views
- **Pinch**: Zoom (coming soon)

## 🛠️ Tech Stack

- **React 18** with TypeScript (strict mode)
- **Three.js** for 3D rendering
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Tauri v2** for native Windows/Android/iOS apps
- **Canvas API** for 2D pixel editing
- **Rust** backend for native apps

## 📦 Export Formats

### GLTF/GLB (Recommended)
- Vertex colors preserved
- Compatible with Blender, Unity, Godot, Three.js
- Two modes: Fast Draft (instant preview) and Final Bake (optimized)

### OBJ + MTL
- Traditional format with material files
- Easy import into any 3D software

## 🖥️ Desktop App

### Windows (Working ✓)
- MSI installer: `src-tauri/target/release/bundle/msi/PixVox_1.0.0_x64_en-US.msi`
- NSIS installer: `src-tauri/target/release/bundle/nsis/`
- Auto-updater support via Vercel Blob

### Android (✓ Build Working)
```bash
# Requires: Android SDK (API 36), NDK 30.0.14904198
npx tauri android init
npx tauri android build

# Sign APK:
# keytool -genkeypair -v -keystore android-key.keystore -alias pixvox ...
# apksigner sign --ks android-key.keystore PixVox-v1.0.0-signed.apk
```

### iOS (Planned)
- Requires macOS for building
- Tauri v2 iOS support ready

## 🌐 Self-Hosting

PixVox can run on your local network via Tailscale:

```bash
npm run dev -- --host 0.0.0.0
```

Access from any device on your Tailscale network at `http://your-device:5173`

## 📝 Project Structure

```
pixvox/
├── src/
│   ├── components/       # React components
│   │   ├── Canvas2D.tsx          # Main 2D canvas with responsive sizing
│   │   ├── MultiCanvasView.tsx   # Multi-view layout with per-view pixelSize
│   │   ├── VoxelScene.tsx        # 3D preview with Three.js
│   │   ├── Toolbar.tsx           # Brush/tools UI (compact mode for mobile)
│   │   ├── PaletteManager.tsx    # Color palette UI
│   │   └── ...
│   ├── utils/            # Core logic
│   │   ├── brushSystem.ts        # Modular brush handlers
│   │   ├── canvasBuffer.ts       # Pixel data management
│   │   ├── objExporter.ts        # GLTF/OBJ export
│   │   └── ...
│   ├── types/            # TypeScript definitions
│   └── App.tsx           # Main app with mobile tab bar
├── src-tauri/          # Tauri native app
│   ├── src/              # Rust backend code
│   ├── gen/              # Generated Android/iOS projects
│   └── tauri.conf.json   # Tauri v2 config
├── public/               # Static assets
└── dist/                 # Production build output
```

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the **PixVox Hybrid License**:
- **BSL 1.1** (Business Source License) for the initial period
- **MIT License** conversion on **January 1, 2030**

See the [LICENSE](LICENSE) file for full details.

## 🌟 Acknowledgments

- Built with modern web technologies for accessibility and ease of use
- Tauri framework for lightweight native apps

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **Issue Tracker**: [GitHub Issues](https://github.com/PetRockStudiosLLC/pixvox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/PetRockStudiosLLC/pixvox/discussions)
- **Releases**: [GitHub Releases](https://github.com/PetRockStudiosLLC/pixvox/releases)

---

Made with ❤️ for pixel artists and game developers
