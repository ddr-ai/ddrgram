import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg"
      style={{ minHeight: "100dvh", background: "#0b0c0e", color: "#eceef2" }}
    >
      <span className="text-danger" aria-hidden="true" style={{ color: "#e26d6d" }}>
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-lg font-semibold">Something went wrong</h1>
      <p
        className="max-w-md text-sm text-pretty break-words text-muted"
        style={{ color: "#8b919c" }}
      >
        {error.message || "An unexpected error occurred. Try reloading the page."}
      </p>
      <button
        type="button"
        className="mt-2 min-h-11 rounded-xl bg-surface-2 px-4 text-sm font-medium shadow-[var(--shadow-raised)]"
        style={{
          minHeight: 44,
          border: 0,
          borderRadius: 12,
          background: "#1c1f26",
          color: "#eceef2",
          padding: "0 16px",
        }}
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </main>
  );
}
