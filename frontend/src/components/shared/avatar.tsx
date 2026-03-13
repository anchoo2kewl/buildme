import { component$ } from "@builder.io/qwik";

interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

export const Avatar = component$<AvatarProps>(({ src, name, size = "md" }) => {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-12 w-12 text-lg",
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return src ? (
    <img
      src={src}
      alt={name}
      class={`rounded-full ${sizeClasses[size]}`}
      width={32}
      height={32}
    />
  ) : (
    <div
      class={`flex items-center justify-center rounded-full bg-accent font-medium text-white ${sizeClasses[size]}`}
    >
      {initials}
    </div>
  );
});
