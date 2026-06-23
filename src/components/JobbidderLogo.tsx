type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { h: 32 },
  md: { h: 48 },
  lg: { h: 64 },
};

export function JobbidderLogo({ className = "", size = "md" }: Props) {
  const { h } = sizes[size];
  
  return (
    <img 
      src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663141074869/aoVDwGIUbpLpetKx.webp" 
      alt="Jobbidder.io — Win more work. Everywhere."
      style={{ height: `${h}px`, width: 'auto' }}
      className={className}
    />
  );
}
