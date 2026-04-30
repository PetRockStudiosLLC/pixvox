# PixVox

🎨 **Transform 2D pixel art into 3D voxel models** - A browser-based pixel art editor with real-time 3D preview and GLTF/OBJ export.

![PixVox Banner](https://img.shields.io/badge/PixVox-1.0.0-cyan?style=for-the-badge)
![License](https://img.shields.io/github/license/PetRockStudiosLLC/pixvox?style=for-the-badge)
![Stars](https://img.shields.io/github/stars/PetRockStudiosLLC/pixvox?style=for-the-badge)

## ✨ Features

- **Multi-View Canvas**: Six synchronized views (Main, Front, Left, Right, Top, Bottom) with keyboard shortcuts (1-6)
- **Real-time 3D Preview**: Watch your voxel model update as you paint
- **Modular Brush System**: Point, Line, Bucket Fill, and Eraser tools
- **Smart Palette Management**: Save/load palettes, generate random color schemes (complementary, analogous, triadic)
- **Layer System**: Add, duplicate, reorder, and navigate layers
- **Import Images**: Convert existing pixel art images directly into voxels
- **Export Options**: GLTF with vertex colors or OBJ format for Blender/Maya/Unity
- **Mobile Support**: Touch-friendly UI with responsive design
- **Undo/Redo**: Full history support with Ctrl+Z / Ctrl+Y
- **Local Storage**: Auto-save projects to browser storage

## 🚀 Quick Start

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
- **Pinch**: Zoom (coming soon)

## 🛠️ Tech Stack

- **React 18** with TypeScript
- **Three.js** for 3D rendering
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Canvas API** for 2D pixel editing

## 📦 Export Formats

### GLTF/GLB (Recommended)
- Vertex colors preserved
- Compatible with Blender, Unity, Godot, Three.js
- Two modes: Fast Draft (instant preview) and Final Bake (optimized)

### OBJ + MTL
- Traditional format with material files
- Easy import into any 3D software

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
│   │   ├── Canvas2D.tsx          # Main 2D canvas
│   │   ├── MultiCanvasView.tsx   # Multi-view layout
│   │   ├── VoxelScene.tsx        # 3D preview
│   │   ├── Toolbar.tsx           # Brush/tools UI
│   │   ├── PaletteManager.tsx    # Color palette UI
│   │   └── ...
│   ├── utils/            # Core logic
│   │   ├── brushSystem.ts        # Modular brush handlers
│   │   ├── canvasBuffer.ts       # Pixel data management
│   │   ├── objExporter.ts        # GLTF/OBJ export
│   │   └── ...
│   ├── types/            # TypeScript definitions
│   └── App.tsx           # Main application
├── public/               # Static assets
└── output/               # Export directory
```

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- Inspired by voxel art tools like MagicaVoxel and Qubicle
- Built with modern web technologies for accessibility and ease of use

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **Issue Tracker**: [GitHub Issues](https://github.com/PetRockStudiosLLC/pixvox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/PetRockStudiosLLC/pixvox/discussions)

---

Made with ❤️ for pixel artists and game developers
