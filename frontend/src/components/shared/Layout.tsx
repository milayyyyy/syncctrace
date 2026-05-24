import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, subtitle, headerAction }) => (
  <div className="flex min-h-screen bg-slate-50">
    <Sidebar />
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {(title || headerAction) && (
        <header className="bg-white border-b border-gray-100 px-8 py-5 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-[1.35rem] font-bold text-gray-900 tracking-tight leading-none">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-[13px] text-gray-400 mt-1.5 font-medium">{subtitle}</p>
              )}
            </div>
            {headerAction && <div className="flex items-center gap-3">{headerAction}</div>}
          </div>
        </header>
      )}
      <div className="flex-1 overflow-y-auto px-8 py-7 animate-fade-in">{children}</div>
    </main>
  </div>
);
