import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

export const Toast = component$<ToastProps>(
  ({ message, type = "info", duration = 3000 }) => {
    const visible = useSignal(true);

    useVisibleTask$(() => {
      const timer = setTimeout(() => {
        visible.value = false;
      }, duration);
      return () => clearTimeout(timer);
    });

    if (!visible.value) return null;

    const colors = {
      success: "bg-success/20 border-success text-success",
      error: "bg-failure/20 border-failure text-failure",
      info: "bg-accent/20 border-accent text-accent",
    };

    return (
      <div
        class={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 shadow-lg ${colors[type]}`}
      >
        {message}
      </div>
    );
  },
);
