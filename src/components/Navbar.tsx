import React from 'react';
import { Home, Library, User, Settings } from 'lucide-react';

export type TabType = 'home' | 'library' | 'profile' | 'settings';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'library' as TabType, label: 'Libreria', icon: Library },
    { id: 'profile' as TabType, label: 'Profilo', icon: User },
    { id: 'settings' as TabType, label: 'Impostazioni', icon: Settings },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Navigazione principale"
      className="fixed bottom-0 left-0 right-0 z-40 bg-black border-t-4 border-[#FFD600] pb-safe"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around h-24 px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center min-h-[72px] py-2 px-1 transition-colors relative rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600] ${
                isActive ? 'text-[#FFD600]' : 'text-white hover:text-neutral-300'
              }`}
            >
              <Icon size={30} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
              <span className={`text-sm font-black mt-1 tracking-wide ${isActive ? 'text-[#FFD600]' : 'text-white'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div
                  className="w-2 h-2 rounded-full bg-[#FFD600] mt-1"
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
