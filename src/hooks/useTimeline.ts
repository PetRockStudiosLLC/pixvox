import { useState, useRef, useCallback, useEffect } from 'react';
import { TimelineState, FrameData } from '../types/voxel';
import type { ToastType } from '../components/Toast';

export function useTimeline(
  canvasStateRef: React.MutableRefObject<any>,
  setCanvasState: React.Dispatch<React.SetStateAction<any>>,
  onToast: (msg: string, type?: ToastType) => void
) {
  const [timeline, setTimeline] = useState<TimelineState>({
    fps: 12,
    totalFrames: 24,
    currentFrame: 0,
    frames: Array.from({ length: 24 }, () => ({ pixels: new Map(), hasKeyframe: false, duration: 1 })),
    playing: false,
    loop: true,
  });
  const timelineRef = useRef(timeline);
  useEffect(() => { timelineRef.current = timeline; }, [timeline]);

  const currentFrameRef = useRef(timeline.currentFrame);
  useEffect(() => { currentFrameRef.current = timeline.currentFrame; }, [timeline.currentFrame]);

  const handleFrameChange = useCallback((frame: number) => {
    setTimeline(prev => {
      const newFrames = prev.frames.map(f => f);
      if (newFrames[prev.currentFrame]) {
        newFrames[prev.currentFrame] = {
          ...newFrames[prev.currentFrame],
          pixels: new Map(canvasStateRef.current.pixels),
        };
      }
      const target = newFrames[frame];
      if (target) {
        setCanvasState((cs: any) => ({ ...cs, pixels: new Map(target.pixels) }));
      }
      return { ...prev, frames: newFrames, currentFrame: frame };
    });
  }, [canvasStateRef, setCanvasState]);

  const handleKeyframeAdd = useCallback(() => {
    setTimeline(prev => {
      const newFrames = [...prev.frames];
      if (newFrames[prev.currentFrame]) {
        newFrames[prev.currentFrame] = {
          ...newFrames[prev.currentFrame],
          pixels: new Map(canvasStateRef.current.pixels),
          hasKeyframe: true,
        };
      }
      return { ...prev, frames: newFrames };
    });
    onToast(`Keyframe set at frame ${timeline.currentFrame + 1}`, 'success');
  }, [canvasStateRef, timeline.currentFrame, onToast]);

  const handleKeyframeDelete = useCallback((frame: number) => {
    setTimeline(prev => {
      const newFrames = [...prev.frames];
      if (newFrames[frame]) {
        newFrames[frame] = { ...newFrames[frame], hasKeyframe: false };
      }
      return { ...prev, frames: newFrames };
    });
    onToast(`Keyframe removed from frame ${frame + 1}`, 'warning');
  }, [onToast]);

  const handleTimelineChange = useCallback((newTimeline: TimelineState) => {
    setTimeline(prev => {
      let frames = [...prev.frames];
      while (frames.length < newTimeline.totalFrames) {
        frames.push({ pixels: new Map(), hasKeyframe: false, duration: 1 });
      }
      if (frames.length > newTimeline.totalFrames) {
        frames = frames.slice(0, newTimeline.totalFrames);
      }
      return {
        ...newTimeline,
        frames,
        currentFrame: Math.min(newTimeline.currentFrame, newTimeline.totalFrames - 1),
      };
    });
  }, []);

  const handleFrameReorder = useCallback((fromIndex: number, toIndex: number) => {
    setTimeline(prev => {
      const newFrames = [...prev.frames];
      const [moved] = newFrames.splice(fromIndex, 1);
      newFrames.splice(toIndex, 0, moved);
      return { ...prev, frames: newFrames, currentFrame: toIndex };
    });
  }, []);

  const handleFrameDurationChange = useCallback((frameIndex: number, duration: number) => {
    setTimeline(prev => {
      const newFrames = [...prev.frames];
      if (newFrames[frameIndex]) {
        newFrames[frameIndex] = { ...newFrames[frameIndex], duration: Math.max(1, duration) };
      }
      return { ...prev, frames: newFrames };
    });
  }, []);

  return {
    timeline, setTimeline, timelineRef, currentFrameRef,
    handleFrameChange, handleKeyframeAdd, handleKeyframeDelete,
    handleTimelineChange, handleFrameReorder, handleFrameDurationChange,
  };
}
