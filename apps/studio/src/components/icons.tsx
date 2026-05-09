// intent: monoline SVG icons (Lucide-inspired) for nav, buttons, status
// status: done — currentColor stroke, 24-viewbox, configurable size
// next: add filled variants if a feature wants emphasis

interface IconProps {
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function IconWand({ size = 18, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M15 4V2" />
      <path d="M15 16v-2" />
      <path d="M8 9h2" />
      <path d="M20 9h2" />
      <path d="M17.8 11.8 19 13" />
      <path d="M15 9h.01" />
      <path d="M17.8 6.2 19 5" />
      <path d="m3 21 9-9" />
      <path d="M12.2 6.2 11 5" />
    </svg>
  );
}

export function IconLayers({ size = 18, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.91a1 1 0 0 0 0-1.83Z" />
      <path d="m2.6 12.08 8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.91" />
      <path d="m2.6 16.08 8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.91" />
    </svg>
  );
}

export function IconFolder({ size = 18, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

export function IconBarChart({ size = 18, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

export function IconBookOpen({ size = 18, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" />
    </svg>
  );
}

export function IconSettings({ size = 16, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconPlay({ size = 14, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={{ ...style, fill: "currentColor" }}>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

export function IconSquare({ size = 14, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={{ ...style, fill: "currentColor" }}>
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

export function IconSearch({ size = 14, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconPlus({ size = 14, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export function IconClose({ size = 14, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconRefresh({ size = 14, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export function IconArrowUp({ size = 12, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  );
}

export function IconArrowDown({ size = 12, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

export function IconWarning({ size = 12, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function IconSparkle({ size = 14, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

export function IconBranch({ size = 12, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} style={style}>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}
