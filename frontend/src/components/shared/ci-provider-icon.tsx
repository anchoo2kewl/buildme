import { component$ } from "@builder.io/qwik";
import type { ProviderType } from "~/lib/types";

const ICON_URLS: Record<ProviderType, string> = {
  github: "https://img.icons8.com/ios-filled/50/ffffff/github.png",
  travis: "https://img.icons8.com/color/48/travis-ci.png",
  circleci: "https://img.icons8.com/color/48/circleci.png",
};

const DISPLAY_NAMES: Record<ProviderType, string> = {
  github: "GitHub Actions",
  travis: "Travis CI",
  circleci: "CircleCI",
};

export function providerDisplayName(provider: ProviderType): string {
  return DISPLAY_NAMES[provider] || provider;
}

interface CIProviderIconProps {
  provider: ProviderType;
  size?: number;
  class?: string;
}

export const CIProviderIcon = component$<CIProviderIconProps>(
  ({ provider, size = 16, class: className }) => {
    const url = ICON_URLS[provider];
    if (!url) return null;
    return (
      <img
        src={url}
        alt={providerDisplayName(provider)}
        width={size}
        height={size}
        class={className}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      />
    );
  },
);
