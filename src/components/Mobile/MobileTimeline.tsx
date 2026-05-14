import React, { useState, useCallback, useRef } from "react";
import { TimelineState, FrameData } from "../../types/voxel";

interface MobileTimelineProps {
  timeline: TimelineState;
  onTimelineChange: (timeline: TimelineState) => void;
  onFrameChange: (frame: number) => void;
  onKeyframeAdd: () => void;
  onKeyframeDelete: (frame: number) => void;
  onFrameReorder?: (fromIndex: number, toIndex: number) => void;
  onFrameDurationChange?: (frameIndex: number, duration: number) => void;
}

const MobileTimeline: React.FC<MobileTimelineProps> = ({
  timeline,
  onTimelineChange,
  onFrameChange,
  onKeyframeAdd,
  onKeyframeDelete,
  onFrameReorder,
  onFrameDurationChange
}) => {
  const [showFrameDetails, setShowFrameDetails] = useState<number | null>(null);
  const [draggedFrame, setDraggedFrame] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handlePlayPause = useCallback(() => {
    onTimelineChange({ ...timeline, playing: !timeline.playing });
  }, [timeline, onTimelineChange]);

  const handleFrameTap = useCallback(
    (index: number) => {
      onFrameChange(index);
    },
    [onFrameChange]
  );

  const handleKeyframeToggle = useCallback(
    (index: number) => {
      if (index === timeline.currentFrame) {
        onKeyframeAdd();
      } else {
        onFrameChange(index);
        setTimeout(() => onKeyframeAdd(), 50);
      }
    },
    [timeline.currentFrame, onFrameChange, onKeyframeAdd]
  );

  const handleFrameLongPress = useCallback((index: number) => {
    setShowFrameDetails(index);
  }, []);

  const handleDurationChange = useCallback(
    (frameIndex: number, duration: number) => {
      if (onFrameDurationChange) {
        onFrameDurationChange(frameIndex, duration);
      }
      setShowFrameDetails(null);
    },
    [onFrameDurationChange]
  );

  const handleFramesCountChange = useCallback(
    (totalFrames: number) => {
      onTimelineChange({ ...timeline, totalFrames: Math.max(1, Math.min(120, totalFrames)) });
    },
    [timeline, onTimelineChange]
  );

  const handleFPSChange = useCallback(
    (fps: number) => {
      onTimelineChange({ ...timeline, fps: Math.max(1, Math.min(60, fps)) });
    },
    [timeline, onTimelineChange]
  );

  const handleLoopToggle = useCallback(() => {
    onTimelineChange({ ...timeline, loop: !timeline.loop });
  }, [timeline, onTimelineChange]);

  const handleStepForward = useCallback(() => {
    const next = Math.min(timeline.currentFrame + 1, timeline.totalFrames - 1);
    onFrameChange(next);
  }, [timeline, onFrameChange]);

  const handleStepBackward = useCallback(() => {
    const prev = Math.max(timeline.currentFrame - 1, 0);
    onFrameChange(prev);
  }, [timeline, onFrameChange]);

  const handleGoToStart = useCallback(() => {
    onFrameChange(0);
  }, [onFrameChange]);

  const handleGoToEnd = useCallback(() => {
    onFrameChange(timeline.totalFrames - 1);
  }, [timeline, onFrameChange]);

  // Scroll to current frame when it changes
  React.useEffect(() => {
    if (scrollRef.current) {
      const frameEl = scrollRef.current.children[timeline.currentFrame] as HTMLElement;
      if (frameEl) {
        frameEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [timeline.currentFrame]);

  return (
    <div className="flex flex-col bg-panel rounded-lg border border-border overflow-hidden">
      {/* Playback Controls Bar */}
      <div className="flex items-center gap-2 p-3 bg-panel-header border-b border-border">
        {/* Transport Controls */}
        <button
          onClick={handleGoToStart}
          className="w-10 h-10 flex items-center justify-center rounded bg-panel-hover active:bg-panel-active text-text-dim active:text-text transition-colors touch-target-min"
          aria-label="Go to first frame"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>

        <button
          onClick={handleStepBackward}
          className="w-10 h-10 flex items-center justify-center rounded bg-panel-hover active:bg-panel-active text-text-dim active:text-text transition-colors touch-target-min"
          aria-label="Previous frame"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="15 18 9 12 15 6 15 18" />
          </svg>
        </button>

        <button
          onClick={handlePlayPause}
          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all touch-target-min ${
            timeline.playing
              ? "bg-accent text-white active:bg-accent-hover"
              : "bg-accent-dim text-text-bright active:bg-accent"
          }`}
          aria-label={timeline.playing ? "Pause" : "Play"}
        >
          {timeline.playing ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <button
          onClick={handleStepForward}
          className="w-10 h-10 flex items-center justify-center rounded bg-panel-hover active:bg-panel-active text-text-dim active:text-text transition-colors touch-target-min"
          aria-label="Next frame"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="9 18 15 12 9 6 9 18" />
          </svg>
        </button>

        <button
          onClick={handleGoToEnd}
          className="w-10 h-10 flex items-center justify-center rounded bg-panel-hover active:bg-panel-active text-text-dim active:text-text transition-colors touch-target-min"
          aria-label="Go to last frame"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>

        {/* Frame Counter */}
        <div className="flex-1 text-center">
          <span className="text-xs font-mono text-text-dim">
            <span className="text-text font-bold">{timeline.currentFrame + 1}</span>
            <span className="mx-1">/</span>
            <span>{timeline.totalFrames}</span>
          </span>
        </div>

        {/* Loop Toggle */}
        <button
          onClick={handleLoopToggle}
          className={`w-10 h-10 flex items-center justify-center rounded transition-colors touch-target-min ${
            timeline.loop ? "bg-accent-dim text-text-bright" : "bg-panel-hover text-text-dim active:text-text"
          }`}
          aria-label={timeline.loop ? "Loop on" : "Loop off"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
        </button>
      </div>

      {/* FPS and Frames Controls */}
      <div className="flex items-center gap-3 px-3 py-2 bg-panel-header border-b border-border">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">FPS</label>
          <input
            type="number"
            min={1}
            max={60}
            value={timeline.fps}
            onChange={(e) => handleFPSChange(parseInt(e.target.value) || 12)}
            className="w-16 bg-surface border border-border rounded px-2 py-1 text-xs font-mono text-text focus:border-accent outline-none"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Frames</label>
          <input
            type="number"
            min={1}
            max={120}
            value={timeline.totalFrames}
            onChange={(e) => handleFramesCountChange(parseInt(e.target.value) || 24)}
            className="w-16 bg-surface border border-border rounded px-2 py-1 text-xs font-mono text-text focus:border-accent outline-none"
          />
        </div>
        <button
          onClick={onKeyframeAdd}
          className="flex items-center gap-1 px-3 py-1.5 bg-accent-dim active:bg-accent rounded text-xs font-bold text-text-bright transition-colors touch-target-min"
          aria-label="Add keyframe"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Key</span>
        </button>
      </div>

      {/* Frame Strip - horizontally scrollable */}
      <div ref={scrollRef} className="flex gap-1 p-3 overflow-x-auto no-scrollbar" style={{ minHeight: "80px" }}>
        {Array.from({ length: timeline.totalFrames }, (_, i) => {
          const frame = timeline.frames[i];
          const isCurrent = i === timeline.currentFrame;
          const hasKeyframe = frame?.hasKeyframe || false;
          const duration = frame?.duration || 1;
          const isDragged = draggedFrame === i;

          return (
            <div
              key={i}
              className={`flex-shrink-0 flex flex-col items-center gap-1 transition-all duration-150 ${
                isDragged ? "opacity-50 scale-95" : ""
              }`}
              style={{ width: "60px" }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                const startX = touch.clientX;
                const startY = touch.clientY;
                let isDragging = false;

                const handleMove = (me: TouchEvent) => {
                  const dx = me.touches[0].clientX - startX;
                  const dy = me.touches[0].clientY - startY;
                  if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy)) {
                    isDragging = true;
                  }
                };

                const handleEnd = (me: TouchEvent) => {
                  document.removeEventListener("touchmove", handleMove);
                  document.removeEventListener("touchend", handleEnd);
                  if (!isDragging) {
                    handleFrameTap(i);
                  }
                };

                document.addEventListener("touchmove", handleMove, { passive: true });
                document.addEventListener("touchend", handleEnd);
              }}
              onClick={() => handleFrameTap(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                handleFrameLongPress(i);
              }}
            >
              {/* Frame thumbnail */}
              <div
                className={`w-12 h-12 rounded border-2 transition-all touch-target-min flex items-center justify-center relative ${
                  isCurrent
                    ? "border-accent bg-panel-active shadow-lg shadow-accent/20"
                    : hasKeyframe
                      ? "border-warning bg-panel-hover"
                      : "border-border bg-surface"
                }`}
              >
                {/* Mini canvas preview */}
                <div className="w-10 h-10 bg-surface rounded-sm overflow-hidden">
                  <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
                    {Array.from({ length: 16 }, (_, j) => {
                      const hash = ((i * 31 + j * 17 + (frame?.pixels.size || 0)) % 100) / 100;
                      return (
                        <div
                          key={j}
                          className={`${
                            frame && frame.pixels.size > 0 && hash > 0.4 ? "bg-accent/30" : "bg-transparent"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Keyframe indicator */}
                {hasKeyframe && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full border border-panel" />
                )}

                {/* Duration badge */}
                {duration > 1 && (
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono bg-panel/80 text-text-dim px-0.5 rounded">
                    {duration}x
                  </span>
                )}
              </div>

              {/* Frame number */}
              <span className={`text-[9px] font-mono ${isCurrent ? "text-accent font-bold" : "text-text-dim"}`}>
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* Frame Details Panel (shown on long press) */}
      {showFrameDetails !== null && (
        <div className="border-t border-border bg-panel-header p-3 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text">Frame {showFrameDetails + 1} Details</span>
            <button
              onClick={() => setShowFrameDetails(null)}
              className="w-8 h-8 flex items-center justify-center rounded bg-panel-hover active:bg-panel-active text-text-dim touch-target-min"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Duration Control */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-dim uppercase">Duration</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleDurationChange(
                      showFrameDetails,
                      Math.max(1, (timeline.frames[showFrameDetails]?.duration || 1) - 1)
                    )
                  }
                  className="w-8 h-8 flex items-center justify-center rounded bg-panel-hover active:bg-panel-active text-text-dim touch-target-min"
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-mono text-text">
                  {timeline.frames[showFrameDetails]?.duration || 1}
                </span>
                <button
                  onClick={() =>
                    handleDurationChange(showFrameDetails, (timeline.frames[showFrameDetails]?.duration || 1) + 1)
                  }
                  className="w-8 h-8 flex items-center justify-center rounded bg-panel-hover active:bg-panel-active text-text-dim touch-target-min"
                >
                  +
                </button>
              </div>
            </div>

            {/* Keyframe Toggle */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-dim uppercase">Keyframe</label>
              <button
                onClick={() => {
                  if (timeline.frames[showFrameDetails]?.hasKeyframe) {
                    onKeyframeDelete(showFrameDetails);
                  } else {
                    handleKeyframeToggle(showFrameDetails);
                  }
                }}
                className={`w-full py-2 rounded text-xs font-bold transition-colors touch-target-min ${
                  timeline.frames[showFrameDetails]?.hasKeyframe
                    ? "bg-warning text-white"
                    : "bg-panel-hover text-text-dim active:text-text"
                }`}
              >
                {timeline.frames[showFrameDetails]?.hasKeyframe ? "Has Keyframe" : "Add Keyframe"}
              </button>
            </div>
          </div>

          {/* Pixel count */}
          <div className="text-[10px] text-text-dim">Voxels: {timeline.frames[showFrameDetails]?.pixels.size || 0}</div>
        </div>
      )}
    </div>
  );
};

export default MobileTimeline;
