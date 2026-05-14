export default function LoadingOverlay({ isLoading, message }: { isLoading: boolean; message?: string }) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-panel border border-border rounded-lg p-8 flex flex-col items-center gap-4 shadow-2xl">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-accent/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-accent rounded-full animate-spin" />
        </div>
        <p className="text-sm font-bold text-text-bright tracking-wide">{message || "Loading..."}</p>
      </div>
    </div>
  );
}
