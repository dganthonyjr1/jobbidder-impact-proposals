import { useId } from "react";

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { iconH: 36, word: 17, tag: 9,  gap: 8  },
  md: { iconH: 50, word: 24, tag: 12, gap: 10 },
  lg: { iconH: 66, word: 32, tag: 15, gap: 14 },
};

function JBIcon({ height }: { height: number }) {
  const uid = useId().replace(/:/g, "");
  const maskId = `jb-bowl-${uid}`;
  const w = Math.round(height * 105 / 85);

  return (
    <svg
      viewBox="0 0 105 85"
      height={height}
      width={w}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        {/*
          Ring mask: outer circle visible (white), inner circle cut out (black).
          Applying this mask to any rect produces a donut/ring shape.
        */}
        <mask id={maskId}>
          <circle cx="79" cy="51" r="26" fill="white" />
          <circle cx="79" cy="51" r="14" fill="black" />
        </mask>
      </defs>

      {/* ── j ── */}
      <circle cx="23" cy="7"  r="7"  fill="white" />
      <rect   x="17" y="16" width="12" height="52" rx="3" fill="white" />
      {/* hook curves left at bottom */}
      <path d="M17 65 Q16 78 6 79 Q0 79 0 73 Q6 73 11 67" fill="white" />

      {/* ── b ── */}
      <rect x="39" y="4" width="12" height="78" rx="3" fill="white" />

      {/* top half of ring — white */}
      <rect x="49" y="25" width="56" height="26" fill="white"    mask={`url(#${maskId})`} />
      {/* bottom half of ring — blue */}
      <rect x="49" y="51" width="56" height="34" fill="#2563EB"  mask={`url(#${maskId})`} />
    </svg>
  );
}

export function JobbidderLogo({ className = "", size = "md" }: Props) {
  const s = sizes[size];
  return (
    <div
      className={`flex items-center select-none ${className}`}
      style={{ gap: s.gap }}
    >
      <JBIcon height={s.iconH} />
      <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
        <span
          style={{
            fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
            fontWeight: 900,
            fontSize: s.word,
            color: "white",
          }}
        >
          jobbidder.io
        </span>
        <span
          style={{
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontSize: s.tag,
            color: "rgba(255,255,255,0.8)",
          }}
        >
          Win more work. Everywhere.
        </span>
      </div>
    </div>
  );
}
