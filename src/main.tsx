import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const applySafeArea = () => {
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (isAndroid) {
    const viewportHeight = window.innerHeight;
    const visualHeight = window.visualViewport?.height || viewportHeight;
    const inset = viewportHeight - visualHeight;
    if (inset > 0) {
      document.documentElement.style.setProperty("--status-bar-height", `${inset}px`);
    }
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applySafeArea);
} else {
  applySafeArea();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
