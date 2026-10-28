import React, { useState } from 'react';
import { KemorLogo } from './KemorLogo';
import { UserProfile, VoiceRoom } from '../types';
import {
  Sun,
  Moon,
  Volume2,
  Smartphone,
  LogOut,
  User as UserIcon,
  PhoneCall,
  PhoneOff,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  activeRoom: VoiceRoom | null;
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onOpenProfile: () => void;
  onOpenAudioSettings: () => void;
  onOpenIosGuide: () => void;
  onLeaveRoom: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeRoom,
  theme,
  onThemeChange,
  onOpenProfile,
  onOpenAudioSettings,
  onOpenIosGuide,
  onLeaveRoom,
  onSignOut,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('system');
    else onThemeChange('light');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#0c0d0e]/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <KemorLogo size="md" glow={Boolean(activeRoom)} />
        </div>

        {/* Center / Active Call Status Pill */}
        {activeRoom && (
          <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/20 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#E53935]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E53935] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E53935]"></span>
            </span>
            <span className="max-w-[130px] sm:max-w-[200px] truncate">{activeRoom.name}</span>
            <span className="hidden sm:inline text-neutral-400 dark:text-neutral-500">•</span>
            <span className="hidden sm:inline font-mono">{activeRoom.participantCount} in squad</span>
            <button
              onClick={onLeaveRoom}
              title="Leave Room"
              className="ml-1 p-1 hover:bg-[#E53935]/20 rounded-full transition-colors text-[#E53935]"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* iOS Game Audio Guide */}
          <button
            onClick={onOpenIosGuide}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
            title="iOS & Free Fire Audio Compatibility"
          >
            <Smartphone className="w-4 h-4 text-[#E53935]" />
            <span className="hidden md:inline">iPhone Audio</span>
          </button>

          {/* Audio Settings */}
          <button
            onClick={onOpenAudioSettings}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Audio & Microphone Settings"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={`Current theme: ${theme} (click to cycle)`}
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-600" />}
          </button>

          {/* User Profile Dropdown */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-800"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-[#E53935]/30"
                />
                <span className="hidden sm:inline text-xs font-semibold max-w-[90px] truncate text-neutral-800 dark:text-neutral-200">
                  {user.displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 mr-1" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#18191C] rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2.5 border-b border-neutral-100 dark:border-neutral-800/80">
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                        {user.displayName}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate">
                        @{user.username} {user.gameTag ? `• ${user.gameTag}` : ''}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-neutral-400" />
                      Edit Profile & Game Tag
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenAudioSettings();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                      <Volume2 className="w-4 h-4 text-neutral-400" />
                      Voice & Mic Settings
                    </button>

                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800/80" />

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
