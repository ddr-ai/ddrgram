export function Splash({ label = "Loading" }: { label?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-bg px-6 text-fg">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 shadow-[var(--shadow-border)]">
        <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
          <rect
            x="4"
            y="7"
            width="24"
            height="18"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="text-primary"
          />
          <path d="M14 12.5v7l7-3.5-7-3.5z" fill="currentColor" className="text-primary" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-display text-xl font-semibold tracking-tight">TG Videos</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </div>
    </main>
  );
}
