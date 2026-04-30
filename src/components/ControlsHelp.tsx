import React, { useState } from 'react';

const ControlsHelp: React.FC = () => {
  const [show, setShow] = useState(false);

  const controls = [
    { category: 'Canvas Navigation', items: [
      { keys: ['Middle Click + Drag'], desc: 'Pan canvas' },
      { keys: ['Scroll Wheel'], desc: 'Zoom in/out (centered on cursor)' },
    ]},
    { category: 'View Switching (Multi-View)', items: [
      { keys: ['1'], desc: 'Main View (X-Y)' },
      { keys: ['2'], desc: 'Front View (X-Y)' },
      { keys: ['3'], desc: 'Left View (Z-Y)' },
      { keys: ['4'], desc: 'Right View (Z-Y)' },
      { keys: ['5'], desc: 'Top View (X-Z)' },
      { keys: ['6'], desc: 'Bottom View (X-Z)' },
    ]},
    { category: 'Layer Control', items: [
      { keys: ['Q'], desc: 'Previous layer' },
      { keys: ['E'], desc: 'Next layer' },
    ]},
    { category: 'View Mode', items: [
      { keys: ['Tab'], desc: 'Switch 2D/3D view' },
    ]},
    { category: 'Undo/Redo', items: [
      { keys: ['Ctrl+Z'], desc: 'Undo' },
      { keys: ['Ctrl+Y', 'Ctrl+Shift+Z'], desc: 'Redo' },
    ]},
    { category: 'Brush Tools', items: [
      { keys: ['Click + Drag'], desc: 'Paint with current brush' },
      { keys: ['Right Click'], desc: 'Erase (when using eraser brush)' },
    ]},
    { category: 'Palette Manager', items: [
      { keys: ['Click "Palettes"'], desc: 'Open palette manager' },
      { keys: ['Click color swatch'], desc: 'Select brush color' },
    ]},
  ];

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
        title="Show controls"
      >
        ?
      </button>
    );
  }

  return (
    <div className="absolute top-0 left-0 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-3 z-50 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Controls</h3>
        <button
          onClick={() => setShow(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        {controls.map(section => (
          <div key={section.category} className="bg-gray-700 p-2 rounded">
            <h4 className="text-xs font-semibold text-cyan-400 mb-1.5">{section.category}</h4>
            <div className="space-y-1">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex gap-1 flex-shrink-0">
                    {item.keys.map((key, j) => (
                      <span key={j} className="px-1.5 py-0.5 text-xs bg-gray-600 text-white rounded border border-gray-500 font-mono">
                        {key}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-300">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ControlsHelp;
