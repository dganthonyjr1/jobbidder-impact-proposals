import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663141074869/zdjCpFJwpCUgcrKP.png";

export function JobbidderLogo({ className = "", size = "md" }: Props) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
  };

  return (
    <img
      src={LOGO_URL}
      alt="Jobbidder.io — Win more work. Everywhere."
      className={cn("w-auto object-contain", sizeClasses[size], className)}
    />
  );
}
