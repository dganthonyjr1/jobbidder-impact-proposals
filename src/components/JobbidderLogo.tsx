type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { h: 40  },
  md: { h: 58  },
  lg: { h: 78  },
};

export function JobbidderLogo({ className = "", size = "md" }: Props) {
  const { h } = sizes[size];
  const w = Math.round(h * 3.76);

  return (
    <svg
      viewBox="-8 0 188 50"
      height={h}
      width={w}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Jobbidder.io — Win more work. Everywhere."
      className={className}
    >
      <defs>
        <mask id="jb-ring-mask">
          {/* outer ring visible */}
          <circle cx="37" cy="31" r="16" fill="white" />
          {/* inner hole cut out */}
          <circle cx="37" cy="31" r="8.5" fill="black" />
        </mask>
      </defs>

      {/* ── j ── */}
      {/* dot */}
      <circle cx="8" cy="4" r="4" fill="white" />
      {/* stem */}
      <rect x="4.5" y="9" width="7" height="33" rx="3.5" fill="white" />
      {/* hook left */}
      <path d="M4.5 39 Q4 48 -1 48 Q-5 48 -5 44 Q-1 44 2 41" fill="white" />

      {/* ── b ── */}
      {/* stem */}
      <rect x="18" y="2" width="7" height="46" rx="3.5" fill="white" />
      {/* ring top half — white */}
      <rect x="21" y="15" width="32" height="16" fill="white"   mask="url(#jb-ring-mask)" />
      {/* ring bottom half — blue */}
      <rect x="21" y="31" width="32" height="20" fill="#2563EB" mask="url(#jb-ring-mask)" />

      {/* ── wordmark ── */}
      <text
        x="58"
        y="30"
        fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif"
        fontWeight="900"
        fontSize="19"
        fill="white"
        letterSpacing="-0.3"
      >
        jobbidder.io
      </text>
      <text
        x="59"
        y="43"
        fontFamily="Arial,'Helvetica Neue',sans-serif"
        fontWeight="400"
        fontSize="9"
        fill="rgba(255,255,255,0.8)"
      >
        Win more work. Everywhere.
      </text>
    </svg>
  );
}
