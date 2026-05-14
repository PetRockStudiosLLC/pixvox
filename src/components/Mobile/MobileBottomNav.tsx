import React from "react";

export type MobileTab = "draw" | "palette" | "layers" | "voxel" | "menu";

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onMenuPress: () => void;
}

const navItems: { tab: MobileTab; label: string; icon: React.ReactNode }[] = [
  {
    tab: "draw",
    label: "Draw",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    )
  },
  {
    tab: "palette",
    label: "Palette",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="13.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="10.5" r="2.5" />
        <circle cx="8.5" cy="7.5" r="2.5" />
        <circle cx="6.5" cy="12.5" r="2.5" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.64-.647 1.64-1.5 0-.539-.13-.984-.36-1.336A4.504 4.504 0 0 0 14.5 15c1.78-1.172 3-3.144 3-5.5 0-3.866-3.582-7.5-8-7.5Z" />
      </svg>
    )
  },
  {
    tab: "layers",
    label: "Layers",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m16.02 12 5.48 3.16L12 22 2.5 15.16 8 12v-3.16L2.5 5.68 12 2l9.5 3.68L16.02 5.84Z" />
        <path d="M12 2v4" />
        <path d="m8 5.84 4 2.34 4-2.34" />
        <path d="M12 13v9" />
      </svg>
    )
  },
  {
    tab: "voxel",
    label: "3D",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  }
];

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange, onMenuPress }) => {
  return (
    <nav
      className="mobile-nav bg-panel border-t border-border flex-shrink-0"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around h-14">
        {navItems.map(({ tab, label, icon }) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 touch-target-min relative ${
              activeTab === tab ? "text-accent" : "text-text-dim active:text-text"
            }`}
            aria-label={label}
            aria-current={activeTab === tab ? "page" : undefined}
          >
            {/* Active indicator pill */}
            {activeTab === tab && <span className="absolute inset-x-0 top-0 h-0.5 bg-accent rounded-full mx-4" />}
            <span className={`transition-transform duration-200 ${activeTab === tab ? "scale-110" : ""}`}>{icon}</span>
            <span className="text-[10px] font-bold tracking-wide">{label}</span>
          </button>
        ))}
        {/* Menu button */}
        <button
          onClick={onMenuPress}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 touch-target-min text-text-dim active:text-text"
          aria-label="Menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
          <span className="text-[10px] font-bold tracking-wide">Menu</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
