// SVG icons matching the SENDISTRI maquette. Stroke inherits currentColor.
interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
});

export const IconSearch = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
export const IconBell = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
export const IconPlus = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);
export const IconDownload = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
);
export const IconX = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
export const IconCheck = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconChevronDown = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="m6 9 6 6 6-6" /></svg>
);
export const IconChevronRight = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="m9 18 6-6-6-6" /></svg>
);
export const IconLogout = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
);
export const IconMonitor = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
);
export const IconPhone = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><rect width="14" height="20" x="5" y="2" rx="2" /><path d="M12 18h.01" /></svg>
);
export const IconSun = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const IconMoon = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
);
export const IconInfo = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
);
export const IconMenu = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
);

// Navigation icons
export const IconHome = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>
);
export const IconStore = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="m2 7 2-4h16l2 4" /><path d="M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7" /><path d="M4 7h16" /></svg>
);
export const IconUsers = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
export const IconCash = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
);
export const IconBank = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="m3 10 9-6 9 6" /><path d="M5 10v9M19 10v9M9 10v9M15 10v9" /><path d="M3 21h18" /></svg>
);
export const IconBox = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
);
export const IconPercent = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M19 5 5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
);
export const IconTarget = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
);
export const IconShield = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" /></svg>
);
export const IconList = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
);
export const IconAlert = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
);
export const IconTrendUp = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></svg>
);
export const IconTrendDown = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M16 17h6v-6" /><path d="m22 17-8.5-8.5-5 5L2 7" /></svg>
);
