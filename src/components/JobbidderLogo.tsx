import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LOGO_URL = "https://impact-proposals.lovable.app/__l5e/assets-v1/f69bfaf6-7f63-4453-9585-4e0a5219a83b/jobbidder-logo-full.png";

export function JobbidderLogo({ className = "", size = "md" }: Props) {
  const sizeClasses = {
    sm: "h-6 sm:h-8",
    md: "h-10 sm:h-12",
    lg: "h-12 sm:h-16",
  };

  return (
    <img
      src={LOGO_URL}
      alt="Jobbidder.io — Win more work. Everywhere."
      className={cn("w-auto object-contain", sizeClasses[size], className)}
    />
  );
}
