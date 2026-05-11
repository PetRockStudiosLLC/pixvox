import { useEffect, useRef } from 'react';
import type { ToastType } from '../components/Toast';

export function useKeyboard(
  handleUndo: () => void,
  handleRedo: () => void,
  handleFrameChange: (frame: number) => void,
  handleKeyframeAdd: () => void,
  setRenderMode: (mode: '2d' | '3d' | ((prev: '2d' | '3d') => '2d' | '3d')) => void,
  setTimeline: (updater: (prev: any) => any) => void,
  totalFrames: number,
  currentFrameRef: React.MutableRefObject<number>
) {
  const isCtrlPressed = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        isCtrlPressed.current = true;
        document.body.classList.add('ctrl-pressed');
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setRenderMode(prev => prev === '2d' ? '3d' : '2d');
      }
      if (e.key === ' ') {
        e.preventDefault();
        setTimeline(prev => ({ ...prev, playing: !prev.playing }));
      }
      if (e.key === 'k' && !e.ctrlKey) {
        handleKeyframeAdd();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleFrameChange(Math.max(0, currentFrameRef.current - 1));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleFrameChange(Math.min(totalFrames - 1, currentFrameRef.current + 1));
      }
      if (e.key === 'Home') {
        e.preventDefault();
        handleFrameChange(0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        handleFrameChange(totalFrames - 1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        isCtrlPressed.current = false;
        document.body.classList.remove('ctrl-pressed');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.body.classList.remove('ctrl-pressed');
    };
  }, [handleUndo, handleRedo, handleFrameChange, handleKeyframeAdd, setRenderMode, setTimeline, totalFrames, currentFrameRef]);

  return isCtrlPressed;
}
