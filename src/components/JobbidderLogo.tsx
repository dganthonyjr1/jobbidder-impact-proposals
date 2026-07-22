import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Two ink variants of the wordmark: white text for the dark theme, dark navy
// text for the light theme. Both render; CSS in styles.css (keyed off the
// `.light` class on <html>) shows only the one that matches the active theme.
// This is pure CSS so it can't mismatch between server and client render.
const LOGO_URL_DARK_BG =
  "https://impact-proposals.lovable.app/__l5e/assets-v1/f69bfaf6-7f63-4453-9585-4e0a5219a83b/jobbidder-logo-full.png";
const LOGO_URL_LIGHT_BG = "/jobbidder-logo-dark.png";

export function JobbidderLogo({ className = "", size = "md" }: Props) {
  const sizeClasses = {
    sm: "h-6 sm:h-8",
    md: "h-10 sm:h-12",
    lg: "h-12 sm:h-16",
  };

  return (
    <>
      <img
        src={LOGO_URL_DARK_BG}
        alt="Jobbidder.io — Win more work. Everywhere."
        className={cn(
          "jobbidder-logo-for-dark-bg w-auto object-contain",
          sizeClasses[size],
          className,
        )}
      />
      <img
        src={LOGO_URL_LIGHT_BG}
        alt=""
        aria-hidden="true"
        className={cn(
          "jobbidder-logo-for-light-bg w-auto object-contain",
          sizeClasses[size],
          className,
        )}
      />
    </>
  );
}
