import React, { useState, useEffect } from 'react';
import { CanvasState, BrushState } from '../types/voxel';

interface StatusBarProps {
  canvasState: CanvasState;
  brush?: BrushState;
  isCtrlPressed: React.RefObject<boolean>;
}

const StatusBar: React.FC<StatusBarProps> = ({ canvasState, brush, isCtrlPressed }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <div className="h-6 bg-panel-header border-t border-border flex items-center px-2 text-[10px] text-text-dim flex-shrink-0 gap-3">
      <div className="flex items-center gap-3">
        <span>Grid: {canvasState.width}x{canvasState.height}</span>
        <span className="h-3 w-px bg-border-light" />
        <span>Layer: {canvasState.activeLayer + 1}/{canvasState.layers}</span>
        <span className="h-3 w-px bg-border-light" />
        <span>Voxels: {canvasState.pixels.size}</span>
        {brush && (
          <>
            <span className="h-3 w-px bg-border-light" />
            <span>Brush: {brush.tool} ({brush.size})</span>
          </>
        )}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <span className="font-mono">X:{mousePos.x} Y:{mousePos.y}</span>
        {isCtrlPressed.current && (
          <span className="text-accent font-bold animate-pulse">Ctrl: Pick</span>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
