export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center neo-grid-bg text-black">
      <div className="neo-card px-6 py-5 text-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-black border-t-transparent mx-auto mb-3" />
        <p className="font-black uppercase tracking-wider text-sm">{label}</p>
      </div>
    </div>
  );
}

