import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { TimelineState } from "../types/voxel";

interface TimelineProps {
  timeline: TimelineState;
  onTimelineChange: (timeline: TimelineState) => void;
  onFrameChange: (frame: number) => void;
  onKeyframeAdd: () => void;
  onKeyframeDelete: (frame: number) => void;
  onFrameReorder: (fromIndex: number, toIndex: number) => void;
  onFrameDurationChange: (frameIndex: number, duration: number) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const FRAME_MIN_WIDTH = 40;
const FRAME_HEIGHT = 96;
const VISIBLE_BUFFER = 10;

const Timeline: React.FC<TimelineProps> = ({
  timeline,
  onTimelineChange,
  onFrameChange,
  onKeyframeAdd,
  onKeyframeDelete,
  onFrameReorder,
  onFrameDurationChange,
  collapsed,
  onToggle
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draggingPlayhead, setDraggingPlayhead] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [editingDuration, setEditingDuration] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const totalTicks = useMemo(() => timeline.frames.reduce((sum, f) => sum + (f.duration || 1), 0), [timeline.frames]);

  const totalWidth = useMemo(() => {
    const frameCount = timeline.frames.length;
    if (frameCount === 0) return 0;
    const avgDuration = totalTicks / frameCount;
    const avgWidth = (avgDuration / totalTicks) * containerWidth;
    return Math.max(containerWidth, frameCount * FRAME_MIN_WIDTH);
  }, [timeline.frames.length, totalTicks, containerWidth]);

  const framePositions = useMemo(() => {
    const positions: Array<{ start: number; width: number }> = [];
    let accumulated = 0;
    for (let i = 0; i < timeline.frames.length; i++) {
      const dur = timeline.frames[i].duration || 1;
      const width = (dur / totalTicks) * containerWidth;
      positions.push({ start: accumulated, width: Math.max(width, FRAME_MIN_WIDTH) });
      accumulated += Math.max(width, FRAME_MIN_WIDTH);
    }
    return positions;
  }, [timeline.frames, totalTicks, containerWidth]);

  const visibleRange = useMemo(() => {
    if (!scrollRef.current || framePositions.length === 0) return { start: 0, end: framePositions.length };
    const scrollLeft = scrollRef.current.scrollLeft;
    const viewRight = scrollLeft + containerWidth;
    let startIdx = 0;
    let endIdx = framePositions.length - 1;
    for (let i = 0; i < framePositions.length; i++) {
      const pos = framePositions[i];
      if (pos.start + pos.width / 2 < scrollLeft) startIdx = i + 1;
      if (pos.start + pos.width / 2 > viewRight) {
        endIdx = i;
        break;
      }
    }
    return {
      start: Math.max(0, startIdx - VISIBLE_BUFFER),
      end: Math.min(framePositions.length - 1, endIdx + VISIBLE_BUFFER)
    };
  }, [framePositions, containerWidth, scrollRef.current?.scrollLeft]);

  const togglePlayback = useCallback(() => {
    onTimelineChange({ ...timeline, playing: !timeline.playing });
  }, [timeline, onTimelineChange]);

  const stepFrame = useCallback(
    (delta: number) => {
      onFrameChange(Math.max(0, Math.min(timeline.frames.length - 1, timeline.currentFrame + delta)));
    },
    [timeline.currentFrame, timeline.frames.length, onFrameChange]
  );

  const changeFps = useCallback(
    (fps: number) => {
      onTimelineChange({ ...timeline, fps: Math.max(1, Math.min(60, fps)) });
    },
    [timeline, onTimelineChange]
  );

  const changeTotalFrames = useCallback(
    (totalFrames: number) => {
      onTimelineChange({ ...timeline, totalFrames: Math.max(1, Math.min(999, totalFrames)) });
    },
    [timeline, onTimelineChange]
  );

  const toggleLoop = useCallback(() => {
    onTimelineChange({ ...timeline, loop: !timeline.loop });
  }, [timeline, onTimelineChange]);

  const goToStart = useCallback(() => onFrameChange(0), [onFrameChange]);
  const goToEnd = useCallback(() => onFrameChange(timeline.frames.length - 1), [onFrameChange, timeline.frames.length]);

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
    let accumulated = 0;
    for (let i = 0; i < framePositions.length; i++) {
      const pos = framePositions[i];
      if (x >= accumulated && x <= accumulated + pos.width) {
        onFrameChange(i);
        break;
      }
      accumulated += pos.width;
    }
    setDraggingPlayhead(true);
  };

  useEffect(() => {
    if (!draggingPlayhead) return;
    const handleMove = (e: MouseEvent) => {
      if (!scrollRef.current) return;
      const rect = scrollRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
      let accumulated = 0;
      for (let i = 0; i < framePositions.length; i++) {
        const pos = framePositions[i];
        if (x >= accumulated && x <= accumulated + pos.width) {
          onFrameChange(i);
          break;
        }
        accumulated += pos.width;
      }
    };
    const handleUp = () => setDraggingPlayhead(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingPlayhead, framePositions, onFrameChange]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const currentPos = framePositions[timeline.currentFrame];
    if (currentPos && scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const viewWidth = scrollRef.current.clientWidth;
      const frameLeft = currentPos.start;
      if (frameLeft < scrollLeft || frameLeft + currentPos.width > scrollLeft + viewWidth) {
        scrollRef.current.scrollTo({ left: Math.max(0, frameLeft - viewWidth / 2), behavior: "smooth" });
      }
    }
  }, [timeline.currentFrame, framePositions]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex) {
      onFrameReorder(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDurationChange = (index: number, value: number) => {
    onFrameDurationChange(index, Math.max(1, Math.min(99, value)));
  };

  const playheadPos = framePositions[timeline.currentFrame];
  const playheadLeft = playheadPos ? playheadPos.start + playheadPos.width / 2 : 0;

  if (collapsed) {
    return (
      <div className="h-6 bg-panel-header border-t border-border flex items-center px-2 flex-shrink-0">
        <div className="flex items-center gap-3 text-[10px] text-text-dim">
          <span>
            F:{timeline.currentFrame + 1}/{timeline.frames.length}
          </span>
          <span>{timeline.fps}fps</span>
          <span>KF:{timeline.frames.filter((f) => f.hasKeyframe).length}</span>
          <span>Ticks:{totalTicks}</span>
        </div>
        <div className="flex-1" />
        <button onClick={onToggle} className="blender-icon-btn p-0.5" title="Expand timeline">
          <svg width={10} height={10} viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  }

  const visibleFrames = framePositions.slice(visibleRange.start, visibleRange.end + 1);

  return (
    <div className="bg-panel border-t border-border flex-shrink-0">
      <div className="flex items-center justify-between px-2 py-1 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim">Dope Sheet</span>
          <span className="text-[9px] text-text-dim">|</span>
          <span className="text-[10px] text-text-dim">
            Frame {timeline.currentFrame + 1}/{timeline.frames.length}
          </span>
          <span className="text-[9px] text-text-dim">|</span>
          <span className="text-[10px] text-text-dim">{timeline.fps} fps</span>
          <span className="text-[9px] text-text-dim">|</span>
          <span className="text-[10px] text-text-dim">
            {timeline.frames.filter((f) => f.hasKeyframe).length} keyframes
          </span>
          <span className="text-[9px] text-text-dim">|</span>
          <span className="text-[10px] text-text-dim">{totalTicks} ticks</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={goToStart} className="blender-icon-btn p-0.5" title="Go to Start (Home)">
            <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 8L12 12"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M3 4L3 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={() => stepFrame(-1)} className="blender-icon-btn p-0.5" title="Previous Frame">
            <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
              <path
                d="M10 4L6 8L10 12"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={togglePlayback}
            className={`blender-icon-btn p-0.5 ${timeline.playing ? "blender-icon-btn-active" : ""}`}
            title={timeline.playing ? "Pause (Space)" : "Play (Space)"}
          >
            {timeline.playing ? (
              <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
                <rect x="3" y="3" width="3.5" height={10} fill="currentColor" rx={0.5} />
                <rect x="9.5" y="3" width="3.5" height={10} fill="currentColor" rx={0.5} />
              </svg>
            ) : (
              <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
                <path d="M4 3L13 8L4 13V3Z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button onClick={() => stepFrame(1)} className="blender-icon-btn p-0.5" title="Next Frame">
            <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button onClick={goToEnd} className="blender-icon-btn p-0.5" title="Go to End (End)">
            <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 8L4 12"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M13 4L13 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="h-3 w-px bg-border-light mx-1" />
          <button
            onClick={toggleLoop}
            className={`blender-icon-btn p-0.5 text-[10px] ${timeline.loop ? "blender-icon-btn-active" : ""}`}
            title="Loop (L)"
          >
            <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
              <path
                d="M3 5H11C12.5 5 14 6.5 14 8C14 9.5 12.5 11 11 11H7"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path
                d="M5 3L3 5L5 7"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="h-3 w-px bg-border-light mx-1" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-dim">FPS</span>
            <input
              type="number"
              min={1}
              max={60}
              value={timeline.fps}
              onChange={(e) => changeFps(parseInt(e.target.value) || 12)}
              className="w-10 px-1 py-0.5 bg-surface text-text rounded-sm border border-border-light text-[10px] text-center outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] text-text-dim">Frames</span>
            <input
              type="number"
              min={1}
              max={999}
              value={timeline.totalFrames}
              onChange={(e) => changeTotalFrames(parseInt(e.target.value) || 24)}
              className="w-12 px-1 py-0.5 bg-surface text-text rounded-sm border border-border-light text-[10px] text-center outline-none focus:border-accent"
            />
          </div>
          <div className="h-3 w-px bg-border-light mx-1" />
          <button onClick={onKeyframeAdd} className="blender-icon-btn p-0.5" title="Add Keyframe (K)">
            <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
              <path d="M8 3L9.5 6.5L13 8L9.5 9.5L8 13L6.5 9.5L3 8L6.5 6.5Z" fill="currentColor" />
            </svg>
          </button>
          <button onClick={onToggle} className="blender-icon-btn p-0.5" title="Collapse timeline">
            <svg width={10} height={10} viewBox="0 0 16 16" fill="none">
              <path
                d="M12 10L8 6L4 10"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="h-24 overflow-hidden relative">
        <div
          ref={scrollRef}
          className="w-full h-full overflow-x-auto overflow-y-auto cursor-crosshair select-none"
          onMouseDown={handleTimelineMouseDown}
          style={{ scrollBehavior: draggingPlayhead ? "auto" : "smooth" }}
        >
          <div style={{ width: totalWidth, height: FRAME_HEIGHT, position: "relative" }}>
            {visibleFrames.map((pos, vi) => {
              const index = visibleRange.start + vi;
              const frame = timeline.frames[index];
              if (!frame) return null;
              const isCurrent = index === timeline.currentFrame;
              const isDragged = dragIndex === index;
              const isDropTarget = dropIndex === index;

              return (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFrameChange(index);
                  }}
                  className={`absolute top-1 bottom-1 rounded-sm border-2 transition-all cursor-grab active:cursor-grabbing group ${
                    isDragged
                      ? "opacity-40 border-accent/50"
                      : isDropTarget
                        ? "border-accent bg-accent-dim/30"
                        : isCurrent
                          ? "border-accent bg-accent-dim"
                          : "border-border-light bg-surface hover:border-border-light/80"
                  }`}
                  style={{
                    left: `${pos.start}px`,
                    width: `${Math.max(pos.width, FRAME_MIN_WIDTH)}px`
                  }}
                  title={`Frame ${index + 1} (dur: ${frame.duration || 1})`}
                >
                  <div className="flex flex-col h-full p-0.5">
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <span className={`text-[8px] font-mono font-bold ${isCurrent ? "text-accent" : "text-text-dim"}`}>
                        {index + 1}
                      </span>
                      {frame.hasKeyframe && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                      {editingDuration === index ? (
                        <input
                          type="number"
                          min={1}
                          max={99}
                          defaultValue={frame.duration || 1}
                          onBlur={(e) => {
                            handleDurationChange(index, parseInt(e.target.value) || 1);
                            setEditingDuration(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleDurationChange(index, parseInt((e.target as HTMLInputElement).value) || 1);
                              setEditingDuration(null);
                            }
                          }}
                          className="w-6 px-0.5 py-0 bg-surface text-[8px] text-center rounded border border-accent outline-none"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDuration(index);
                          }}
                          className="text-[8px] text-text-dim hover:text-accent cursor-pointer"
                          title={`Duration: ${frame.duration || 1} ticks`}
                        >
                          {frame.duration || 1}t
                        </button>
                      )}
                    </div>

                    <div className="flex-1 bg-panel rounded-sm overflow-hidden relative flex items-center justify-center">
                      {frame.pixels.size > 0 ? (
                        <div className="flex gap-px">
                          {Array.from(frame.pixels.values())
                            .slice(0, 12)
                            .map((color, ci) => (
                              <div key={ci} className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                            ))}
                          {frame.pixels.size > 12 && (
                            <span className="text-[7px] text-text-dim self-center">+{frame.pixels.size - 12}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[7px] text-text-dim/30">empty</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onKeyframeDelete(index);
                        }}
                        className="text-[8px] text-text-dim hover:text-red-400"
                        title="Remove keyframe"
                      >
                        ✕
                      </button>
                      <div className="flex gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDurationChange(index, (frame.duration || 1) - 1);
                          }}
                          className="text-[8px] text-text-dim hover:text-accent w-3 h-3 flex items-center justify-center"
                          disabled={(frame.duration || 1) <= 1}
                        >
                          −
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDurationChange(index, (frame.duration || 1) + 1);
                          }}
                          className="text-[8px] text-text-dim hover:text-accent w-3 h-3 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent z-10 pointer-events-none"
              style={{ left: `${playheadLeft}px` }}
            >
              <div className="w-3 h-3 -ml-1 bg-accent transform rotate-45" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
