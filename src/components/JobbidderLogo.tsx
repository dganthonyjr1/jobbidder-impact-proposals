type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { letter: 36, word: 18, tag: 10, gap: 8, blueW: 16, blueH: 8, blueL: 9 },
  md: { letter: 52, word: 26, tag: 12, gap: 10, blueW: 22, blueH: 11, blueL: 13 },
  lg: { letter: 68, word: 34, tag: 15, gap: 14, blueW: 28, blueH: 14, blueL: 17 },
};

export function JobbidderLogo({ className = "", size = "md" }: Props) {
  const s = sizes[size];
  return (
    <div className={`flex items-center select-none ${className}`} style={{ gap: s.gap }}>
      {/* jb monogram */}
      <div className="relative flex items-end leading-none" style={{ lineHeight: 1 }}>
        <span
          style={{
            fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
            fontWeight: 900,
            fontSize: s.letter,
            color: "white",
            lineHeight: 1,
          }}
        >
          j
        </span>
        <span className="relative" style={{ lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
              fontWeight: 900,
              fontSize: s.letter,
              color: "white",
              lineHeight: 1,
            }}
          >
            b
          </span>
          {/* Blue half-circle accent on bottom of b's bowl */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              bottom: 4,
              left: s.blueL,
              width: s.blueW,
              height: s.blueH,
              background: "#2563EB",
              borderRadius: `0 0 ${s.blueW}px ${s.blueW}px`,
              pointerEvents: "none",
            }}
          />
        </span>
      </div>

      {/* wordmark */}
      <div className="flex flex-col" style={{ lineHeight: 1.15 }}>
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
