const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663141074869/FkAYBLUhmwGdVSSX.png";

const sizes = {
  sm: { height: 36 },
  md: { height: 50 },
  lg: { height: 66 },
};

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function JobbidderLogo({ className = "", size = "md" }: Props) {
  const { height } = sizes[size];
  return (
    <img
      src={LOGO_URL}
      alt="Jobbidder.io — Win more work. Everywhere."
      height={height}
      style={{ height, width: "auto", display: "block" }}
      className={className}
    />
  );
}
