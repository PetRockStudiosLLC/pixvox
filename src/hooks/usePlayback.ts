import { useEffect, useRef } from "react";
import type { TimelineState } from "../types/voxel";

export function usePlayback(timeline: TimelineState, handleFrameChange: (frame: number) => void) {
  const tickCountRef = useRef(0);
  useEffect(() => {
    tickCountRef.current = 0;
  }, [timeline.currentFrame]);

  useEffect(() => {
    if (!timeline.playing) return;
    const interval = setInterval(() => {
      tickCountRef.current++;
      const frame = timeline.frames[timeline.currentFrame];
      const duration = frame ? frame.duration : 1;
      if (tickCountRef.current < duration) return;
      tickCountRef.current = 0;
      const next = timeline.currentFrame + 1;
      if (next >= timeline.frames.length) {
        if (timeline.loop) {
          handleFrameChange(0);
        }
        // Stop playing if not looping
      } else {
        handleFrameChange(next);
      }
    }, 1000 / timeline.fps);
    return () => clearInterval(interval);
  }, [timeline.playing, timeline.fps, timeline.frames.length, timeline.loop, timeline.currentFrame, handleFrameChange]);
}
