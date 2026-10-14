import React from 'react';
import { Home, Library, Camera, Settings } from 'lucide-react';

export type TabType = 'home' | 'library' | 'scan' | 'settings' | 'profile';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'library' as TabType, label: 'Libreria', icon: Library },
    { id: 'scan' as TabType, label: 'scan.ocr', icon: Camera },
    { id: 'settings' as TabType, label: 'Impostazioni', icon: Settings },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Navigazione principale"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0E1017] border-t border-[#1C202B] pb-safe shadow-2xl"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around h-20 px-2">
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
              className={`flex-1 flex flex-col items-center justify-center min-h-[64px] py-1 px-1 transition-colors relative rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isActive ? 'text-red-500' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={26} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
              <span className={`text-xs mt-1 tracking-wide ${isActive ? 'font-bold text-red-500' : 'font-medium text-gray-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div
                  className="w-1.5 h-1.5 rounded-full bg-red-500 mt-0.5"
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
