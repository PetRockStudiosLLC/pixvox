# PixVox Mobile UI Design

## Mobile-First Native Experience

### Layout Structure
- **Full-screen canvas** with minimal chrome
- **Bottom tab bar** (native app style) with haptic feedback
- **Swipe gestures** to switch between views (1-6)
- **Bottom sheet** for tools, palette, layers
- **Floating brush controls** overlay on canvas

### Bottom Tab Bar (Native Style)
Tabs: Draw | Palette | Layers | 3D | Menu

### Gesture Controls
- **Swipe left/right**: Switch views (Main → Front → Left → etc.)
- **Pinch**: Zoom in/out
- **Two-finger drag**: Pan canvas
- **Long press**: Eyedropper tool (pick color from canvas)

### Electron Preparation
- Add Electron as dev dependency
- Create main.js for Electron entry point
- Configure build scripts for desktop app
- Enable file system access for saving/loading projects

### Safe Area Handling
- Respect notch and home indicator
- Use `env(safe-area-inset-bottom)` for bottom padding
- Full-screen canvas with proper insets
