/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        panel: 'var(--blender-panel)',
        'panel-header': 'var(--blender-panel-header)',
        'panel-hover': 'var(--blender-panel-hover)',
        'panel-active': 'var(--blender-panel-active)',
        surface: 'var(--blender-bg)',
        border: 'var(--blender-border)',
        'border-light': 'var(--blender-border-light)',
        text: 'var(--blender-text)',
        'text-dim': 'var(--blender-text-dim)',
        'text-bright': 'var(--blender-text-bright)',
        accent: 'var(--blender-accent)',
        'accent-hover': 'var(--blender-accent-hover)',
        'accent-dim': 'var(--blender-accent-dim)',
        warning: 'var(--blender-warning)',
        danger: 'var(--blender-danger)',
        success: 'var(--blender-success)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
      },
      fontSize: {
        'xs': ['11px', '13px'],
        'sm': ['12px', '16px'],
      },
    },
  },
  plugins: [],
}
