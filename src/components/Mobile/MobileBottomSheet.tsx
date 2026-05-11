import React, { useState, useCallback, useRef, useEffect } from 'react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  snapPoints?: number[]; // Percentage heights [0.3, 0.6, 1.0]
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.85],
}) => {
  const [currentSnap, setCurrentSnap] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Reset snap on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSnap(snapPoints.length - 1);
    }
  }, [isOpen, snapPoints.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setDragOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;
    const deltaY = touch.clientY - dragStart.y;
    setDragOffset(deltaY);
  }, [isDragging, dragStart.y]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    // Swipe down to close
    if (dragOffset > 100) {
      onClose();
      return;
    }

    // Snap to nearest point
    if (dragOffset < -30 && currentSnap > 0) {
      setCurrentSnap((prev) => Math.max(0, prev - 1));
    } else if (dragOffset > -30 && dragOffset < 30 && currentSnap < snapPoints.length - 1) {
      // Tap on handle to expand
      setCurrentSnap((prev) => Math.min(snapPoints.length - 1, prev + 1));
    }

    setDragOffset(0);
  }, [isDragging, dragOffset, currentSnap, snapPoints.length, onClose]);

  if (!isOpen) return null;

  const maxHeightPercent = snapPoints[currentSnap] * 100;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-panel rounded-t-2xl border-t border-border safe-pb"
        style={{
          maxHeight: `${maxHeightPercent}vh`,
          transform: isDragging ? `translateY(${Math.min(0, dragOffset)}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex flex-col items-center pt-3 pb-1">
          <div className="w-10 h-1 bg-panel-hover rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <h2 className="text-base font-bold text-accent uppercase tracking-wider">{title}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-panel-hover flex items-center justify-center active:bg-panel-active touch-target-min"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4L14 14M14 4L4 14" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: `calc(${maxHeightPercent}vh - 80px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default MobileBottomSheet;
