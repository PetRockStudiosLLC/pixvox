import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
}

const Icon: React.FC<{ children: React.ReactNode; size?: number; className?: string }> = ({ children, size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {children}
  </svg>
);

export const IconPoint = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconRect = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.2"/>
  </Icon>
);

export const IconLine = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <line x1="2" y1="14" x2="14" y2="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </Icon>
);

export const IconEraser = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M5.5 13H3L4.5 5L9 3.5L14 8.5L10 13H5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
  </Icon>
);

export const IconEye = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
  </Icon>
);

export const IconEyeOff = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M3 5L13 11M4 3C4 3 3 3.5 3 5.5M12 13C12 13 13 12.5 13 10.5M2 10C2 10 3.5 13 8 13C10 13 11.5 12 12.5 11M6 4C7 3.5 8 3.5 9 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </Icon>
);

export const IconLock = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5 7V5C5 3.5 6 2.5 8 2.5C10 2.5 11 3.5 11 5V7" stroke="currentColor" strokeWidth="1.2"/>
  </Icon>
);

export const IconUnlock = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5 7V5C5 3.5 6 2.5 8 2.5C9.5 2.5 10.5 3.2 11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </Icon>
);

export const IconPlus = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </Icon>
);

export const IconCopy = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M3 7V4C3 3 4 2 5 2H8" stroke="currentColor" strokeWidth="1.2"/>
  </Icon>
);

export const IconArrowUp = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M8 12V4M8 4L4 8M8 4L12 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconArrowDown = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M8 4V12M8 12L4 8M8 12L12 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconSave = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M12 14H4C3 14 2 13 2 12V4C2 3 3 2 4 2H10L14 6V12C14 13 13 14 12 14Z" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M6 14V10H10V14M6 6H8" stroke="currentColor" strokeWidth="1.2"/>
  </Icon>
);

export const IconLoad = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M4 4H10L14 8V14H4V4Z" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M7 2V6M5 4H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </Icon>
);

export const IconExport = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M4 12V14H14V12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M9 8L12 4M12 4L9 2M12 4H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconTrash = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M3 5H13L12 14H4L3 5Z" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M2 5H14M6 5V3H10V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </Icon>
);

export const IconUndo = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M4 6H10C12 6 14 8 14 10C14 12 12 14 10 14H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M7 3L4 6L7 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconRedo = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M12 6H6C4 6 2 8 2 10C2 12 4 14 6 14H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M9 3L12 6L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconLayers = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M2 5L8 2L14 5L8 8L2 5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M2 8L8 11L14 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 11L8 14L14 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconCube = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M2 5L8 8M8 8L14 5M8 8V14" stroke="currentColor" strokeWidth="1.2"/>
  </Icon>
);

export const IconGrid = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.2"/>
    <line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.2"/>
    <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="1.2"/>
    <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.2"/>
  </Icon>
);

export const IconImage = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1"/>
    <path d="M2 11L5.5 7L9 11H14L12 7" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
  </Icon>
);

export const IconCollapse = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconExpand = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconPalette = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="6" cy="6" r="1" fill="currentColor"/>
    <circle cx="10" cy="6" r="1" fill="currentColor"/>
    <circle cx="5" cy="9" r="1" fill="currentColor"/>
  </Icon>
);

export const IconSettings = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M8 2V4M8 12V14M2 8H4M12 8H14M3.5 3.5L5 5M11 11L12.5 12.5M12.5 3.5L11 5M5 11L3.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </Icon>
);

export const IconChevronDown = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconChevronRight = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconClose = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </Icon>
);

export const IconCheck = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <path d="M3 8L6 11L13 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
);

export const IconInfo = ({ size, className }: IconProps) => (
  <Icon size={size} className={className}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
    <line x1="8" y1="7" x2="8" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
  </Icon>
);
