import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DeviceShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="app-stage">
      <div className={cn("app-device", className)}>{children}</div>
    </div>
  );
}
