import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-10 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto px-4 py-2.5 rounded-md shadow-lg border text-sm font-medium cursor-pointer animate-slide-up backdrop-blur-md ${
              t.type === "success"
                ? "bg-success/20 border-success/40 text-green-300"
                : t.type === "error"
                  ? "bg-danger/20 border-danger/40 text-red-300"
                  : t.type === "warning"
                    ? "bg-warning/20 border-warning/40 text-yellow-300"
                    : "bg-panel-hover/90 border-border-light text-text-bright"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useConfirm() {
  const { toast } = useToast();
  const confirm = (message: string, onConfirm: () => void): void => {
    toast(message, "warning");
    setTimeout(onConfirm, 100);
  };
  return confirm;
}
