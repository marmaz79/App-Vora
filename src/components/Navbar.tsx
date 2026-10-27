import React from 'react';
import { Home, Library, Camera, BarChart3, Settings } from 'lucide-react';

export type TabType = 'home' | 'library' | 'scan' | 'stats' | 'settings' | 'profile';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'library' as TabType, label: 'Libreria', icon: Library },
    { id: 'scan' as TabType, label: 'Scansione', icon: Camera },
    { id: 'stats' as TabType, label: 'Statistiche', icon: BarChart3 },
    { id: 'settings' as TabType, label: 'Impostazioni', icon: Settings },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Navigazione principale"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#1E8C86] border-t-2 border-[#166E69] pb-safe shadow-teal-glow select-none"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around h-20 px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const isSpecialScan = tab.id === 'scan';
          const Icon = tab.icon;

          if (isSpecialScan) {
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                onClick={() => onSelectTab(tab.id)}
                className="flex-1 flex flex-col items-center justify-center min-h-[64px] py-1 px-1 transition-all relative group active:scale-95 focus-visible:outline-none"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-[#FFD23F] text-[#1E8C86] shadow-accent-glow -translate-y-2 border-2 border-white'
                      : 'bg-[#2BA8A2] text-white hover:bg-[#3CC4BD] shadow-sm -translate-y-1'
                  }`}
                >
                  <Icon size={24} strokeWidth={2.5} />
                </div>
                <span
                  className={`text-[10px] sm:text-xs mt-0.5 tracking-tight font-extrabold transition-colors ${
                    isActive ? 'text-[#FFD23F]' : 'text-[#E8F6F5]/85 group-hover:text-white'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => onSelectTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center min-h-[64px] py-1 px-1 transition-all relative rounded-2xl active:scale-95 focus-visible:outline-none"
            >
              <div
                className={`transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.8 : 2}
                  className={`transition-colors ${
                    isActive ? 'text-[#FFD23F] drop-shadow-xs' : 'text-[#E8F6F5]/75'
                  }`}
                  aria-hidden="true"
                />
              </div>
              <span
                className={`text-[11px] sm:text-xs mt-1 tracking-tight truncate transition-colors ${
                  isActive
                    ? 'font-black text-[#FFD23F]'
                    : 'font-bold text-[#E8F6F5]/75'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[#FFD23F] shadow-accent-glow mt-0.5"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
