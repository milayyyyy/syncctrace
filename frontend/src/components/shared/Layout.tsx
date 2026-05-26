import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: string;
  heroIcon?: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, subtitle, badge, heroIcon, headerAction }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen min-h-dvh bg-slate-100 font-sans">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 w-full">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-[#0B1521] border-b border-white/10 shadow-md">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-white"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="text-sm font-black text-white tracking-wide">SyncTrace</span>
          <div className="w-10" aria-hidden="true" />
        </div>

        <main className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
          {(title || headerAction) && (
            <header className="relative shrink-0 mx-3 mt-3 sm:mx-4 sm:mt-4 lg:mx-5 lg:mt-5 rounded-2xl lg:rounded-[20px] bg-[#0B1521] overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(212,175,55,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.6) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
              <div className="absolute -top-20 -right-20 w-48 h-48 sm:w-80 sm:h-80 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.18)_0%,transparent_70%)] pointer-events-none" />
              <div className="absolute -bottom-16 left-[20%] w-32 h-32 sm:w-52 sm:h-52 rounded-full bg-[radial-gradient(circle,rgba(30,58,95,0.6)_0%,transparent_70%)] pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
                <div className="flex items-start gap-3 sm:gap-5 min-w-0">
                  {heroIcon && (
                    <div className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 rounded-xl sm:rounded-2xl bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center text-[#D4AF37]">
                      {heroIcon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {badge && (
                      <div className="inline-flex items-center gap-1.5 bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.25)] rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 mb-2">
                        <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                        <span className="text-[8px] sm:text-[9px] font-black text-[#D4AF37] tracking-[0.2em] uppercase">{badge}</span>
                      </div>
                    )}
                    {title && (
                      <h1 className="text-xl sm:text-2xl lg:text-[32px] font-black text-white tracking-tight leading-tight m-0 break-words">
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <p className="text-xs sm:text-[13px] text-white/65 font-semibold mt-1.5 sm:mt-2 flex items-center gap-2">
                        <span className="w-4 sm:w-5 h-0.5 bg-[#D4AF37] rounded shrink-0" />
                        <span className="break-words">{subtitle}</span>
                      </p>
                    )}
                  </div>
                </div>
                {headerAction && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
                    {headerAction}
                  </div>
                )}
              </div>
            </header>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8 pb-safe">
            {children}
          </div>
        </main>
      </div>

      {mobileNavOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
    </div>
  );
};
