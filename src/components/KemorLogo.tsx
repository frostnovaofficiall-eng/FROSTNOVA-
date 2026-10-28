import React from 'react';

interface KemorLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  glow?: boolean;
}

export const KemorLogo: React.FC<KemorLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  glow = false,
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', icon: 16, text: 'text-base' },
    md: { box: 'w-9 h-9', icon: 20, text: 'text-xl' },
    lg: { box: 'w-12 h-12', icon: 26, text: 'text-2xl' },
    xl: { box: 'w-16 h-16', icon: 34, text: 'text-3xl' },
  };

  const { box, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Headset Shape */}
      <div
        className={`relative ${box} flex items-center justify-center rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm transition-all duration-200 ${
          glow ? 'ring-2 ring-[#E53935]/40 shadow-[0_0_15px_rgba(229,57,53,0.35)]' : ''
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#E53935"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3/5 h-3/5 text-[#E53935]"
        >
          {/* Headband arch */}
          <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a9 9 0 0 1 18 0v11a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
          {/* Mic boom */}
          <path d="M16 19a3 3 0 0 1-3 3h-2" />
        </svg>

        {/* Dynamic active status pip */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E53935] opacity-60"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E53935]"></span>
        </span>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight font-sans text-neutral-900 dark:text-white ${text} flex items-center gap-1`}>
            KEMOR
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-[#E53935]/10 text-[#E53935] rounded-md ml-1">
              VOICE
            </span>
          </span>
        </div>
      )}
    </div>
  );
};
