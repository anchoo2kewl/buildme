import { component$, Slot, useContext, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { AuthContext } from "~/context/auth-context";

export default component$(() => {
  const auth = useContext(AuthContext);
  const nav = useNavigate();

  useVisibleTask$(({ track }) => {
    track(() => auth.user);
    track(() => auth.isLoading);
    if (!auth.isLoading && (!auth.user || !auth.user.is_super_admin)) {
      nav("/dashboard");
    }
  });

  if (auth.isLoading || !auth.user?.is_super_admin) {
    return (
      <div class="flex items-center justify-center p-8">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return <Slot />;
});
