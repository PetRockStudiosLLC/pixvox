import { useState, useCallback } from "react";
import type { CanvasState, BrushState } from "../types/voxel";

export function useMobileUI(
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>,
  setBrush: React.Dispatch<React.SetStateAction<BrushState>>
) {
  const [mobileTab, setMobileTab] = useState<"draw" | "palette" | "layers" | "voxel" | "menu">("draw");
  const [renameModal, setRenameModal] = useState<{ layer: number; name: string } | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [sheetMinimized, setSheetMinimized] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [activeView, setActiveView] = useState<"main" | "front" | "left" | "right" | "top" | "bottom">("main");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sheetTouchStart, setSheetTouchStart] = useState({ x: 0, y: 0 });
  const [showTimeline, setShowTimeline] = useState(false);

  const handleTouchStartMobile = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEndMobile = (e: React.TouchEvent) => {
    if (!touchStart.x || !touchStart.y) return;
    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      const views: ("main" | "front" | "left" | "right" | "top" | "bottom")[] = [
        "main",
        "front",
        "left",
        "right",
        "top",
        "bottom"
      ];
      const currentIndex = views.indexOf(activeView);
      if (deltaX > 0 && currentIndex > 0) setActiveView(views[currentIndex - 1]);
      else if (deltaX < 0 && currentIndex < views.length - 1) setActiveView(views[currentIndex + 1]);
    }
    setTouchStart({ x: 0, y: 0 });
  };

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    setSheetTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    if (!sheetTouchStart.x || !sheetTouchStart.y) return;
    const deltaY = e.changedTouches[0].clientY - sheetTouchStart.y;
    if (Math.abs(deltaY) > 50) {
      if (deltaY < -50) setSheetMinimized(false);
      else if (deltaY > 50) {
        if (sheetMinimized) setShowBottomSheet(false);
        else setSheetMinimized(true);
      }
    }
    setSheetTouchStart({ x: 0, y: 0 });
  };

  const handleRenameModalSubmit = useCallback(
    (name: string) => {
      if (!renameModal || !name.trim()) {
        setRenameModal(null);
        return;
      }
      setCanvasState((prev) => {
        const newInfo = [...prev.layerInfo];
        newInfo[renameModal.layer] = { ...newInfo[renameModal.layer], name: name.trim() };
        return { ...prev, layerInfo: newInfo };
      });
      setRenameModal(null);
    },
    [renameModal, setCanvasState]
  );

  return {
    mobileTab,
    setMobileTab,
    renameModal,
    setRenameModal,
    showBottomSheet,
    setShowBottomSheet,
    sheetMinimized,
    setSheetMinimized,
    touchStart,
    setTouchStart,
    activeView,
    setActiveView,
    sidebarCollapsed,
    setSidebarCollapsed,
    sheetTouchStart,
    setSheetTouchStart,
    showTimeline,
    setShowTimeline,
    handleTouchStartMobile,
    handleTouchEndMobile,
    handleSheetTouchStart,
    handleSheetTouchEnd,
    handleRenameModalSubmit
  };
}
