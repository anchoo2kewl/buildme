import { component$ } from "@builder.io/qwik";

export const Loading = component$(() => {
  return (
    <div class="flex items-center justify-center p-8">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
});
