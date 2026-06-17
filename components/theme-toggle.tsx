'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-[96px] rounded-xl bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200/50 dark:border-neutral-800/50 animate-pulse" />
    );
  }

  const options = [
    { value: 'light', icon: Sun, label: 'Terang', color: 'text-amber-500' },
    { value: 'dark', icon: Moon, label: 'Gelap', color: 'text-purple-400' },
    { value: 'system', icon: Monitor, label: 'Sistem', color: 'text-blue-400' },
  ];

  return (
    <div className="relative flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800/60 shadow-inner">
      {/* Sliding background indicator */}
      <div
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-lg bg-white dark:bg-neutral-800 shadow-sm transition-all duration-300 ease-out"
        style={{
          width: '28px',
          transform: `translateX(${
            theme === 'light' ? '0px' : theme === 'dark' ? '28px' : '56px'
          })`,
        }}
      />
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200 ${
              isActive
                ? opt.color
                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
            }`}
            title={`Mode ${opt.label}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
