import React from "react";
import { CanvasState } from "../types/voxel";

interface ViewcubeProps {
  onViewChange: (view: "main" | "front" | "left" | "right" | "top" | "bottom") => void;
  currentView: string;
}

const Viewcube: React.FC<ViewcubeProps> = ({ onViewChange, currentView }) => {
  const views = [
    { id: "main", label: "Main", position: "center" },
    { id: "front", label: "Front", position: "front" },
    { id: "left", label: "Left", position: "left" },
    { id: "right", label: "Right", position: "right" },
    { id: "top", label: "Top", position: "top" },
    { id: "bottom", label: "Bottom", position: "bottom" }
  ];

  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="w-20 h-20 relative bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700">
        {/* Main/Isometric view */}
        <button
          onClick={() => onViewChange("main")}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded border-2 transition-all ${
            currentView === "main" ? "bg-cyan-600 border-cyan-400" : "bg-gray-700 border-gray-600 hover:bg-gray-600"
          }`}
          title="Main View"
        >
          <span className="text-[8px] text-white font-bold">ISO</span>
        </button>

        {/* Front */}
        <button
          onClick={() => onViewChange("front")}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-10 w-6 h-6 rounded border transition-all ${
            currentView === "front" ? "bg-cyan-600 border-cyan-400" : "bg-gray-700 border-gray-600 hover:bg-gray-600"
          }`}
          title="Front View"
        >
          <span className="text-[6px] text-white">F</span>
        </button>

        {/* Left */}
        <button
          onClick={() => onViewChange("left")}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -ml-10 w-6 h-6 rounded border transition-all ${
            currentView === "left" ? "bg-cyan-600 border-cyan-400" : "bg-gray-700 border-gray-600 hover:bg-gray-600"
          }`}
          title="Left View"
        >
          <span className="text-[6px] text-white">L</span>
        </button>

        {/* Right */}
        <button
          onClick={() => onViewChange("right")}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ml-10 w-6 h-6 rounded border transition-all ${
            currentView === "right" ? "bg-cyan-600 border-cyan-400" : "bg-gray-700 border-gray-600 hover:bg-gray-600"
          }`}
          title="Right View"
        >
          <span className="text-[6px] text-white">R</span>
        </button>

        {/* Top */}
        <button
          onClick={() => onViewChange("top")}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-10 w-6 h-6 rounded border transition-all ${
            currentView === "top" ? "bg-cyan-600 border-cyan-400" : "bg-gray-700 border-gray-600 hover:bg-gray-600"
          }`}
          title="Top View"
        >
          <span className="text-[6px] text-white">T</span>
        </button>

        {/* Bottom */}
        <button
          onClick={() => onViewChange("bottom")}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-16 w-6 h-6 rounded border transition-all ${
            currentView === "bottom" ? "bg-cyan-600 border-cyan-400" : "bg-gray-700 border-gray-600 hover:bg-gray-600"
          }`}
          title="Bottom View"
        >
          <span className="text-[6px] text-white">B</span>
        </button>
      </div>
    </div>
  );
};

export default Viewcube;
