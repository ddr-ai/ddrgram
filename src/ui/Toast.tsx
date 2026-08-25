import { Toaster, toast } from "sonner";

export { toast };

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="top-center"
      toastOptions={{
        className: "bg-surface text-fg border-border",
      }}
    />
  );
}
