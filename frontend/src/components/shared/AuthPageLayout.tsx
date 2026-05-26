import React from 'react';
import { Activity } from 'lucide-react';
import { TraceabilityFlowDiagram } from './TraceabilityFlowDiagram';

interface AuthPageLayoutProps {
  readonly children: React.ReactNode;
}

/** Shared split auth shell — login and signup use the same layout. */
export const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({ children }) => (
  <div className="min-h-screen min-h-dvh flex flex-col lg:flex-row overflow-x-hidden">
    <div
      className="hidden lg:flex flex-col w-1/2 bg-[#0a0f1e] text-white px-14 relative overflow-y-auto scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_20%_20%,rgba(30,58,138,0.25)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_80%_80%,rgba(124,58,237,0.12)_0%,transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="w-full max-w-[520px] my-auto py-8">
        <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
          <span className="text-[11px] font-semibold tracking-[0.15em] text-brand-gold/90 uppercase">
            Academic Traceability Platform
          </span>
        </div>

        <h1 className="text-[clamp(2rem,3vw,2.75rem)] font-bold leading-[1.1] text-white">
          Intelligent
          <br />
          <span className="text-brand-gold">Traceability</span>
          <br />
          Auditing
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-white/50 max-w-lg">
          Automate sequential traceability, continuity verification, and audit
          reporting for capstone projects.
        </p>

        <div className="my-5 h-px bg-gradient-to-r from-brand-gold/30 to-transparent" />

        <TraceabilityFlowDiagram />
      </div>
    </div>

    <div className="flex-1 flex items-center justify-center bg-white px-6 sm:px-8 lg:px-12 py-10 lg:py-0 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-md flex-shrink-0">
            <Activity size={26} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">SyncTrace</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Academic Audit</p>
          </div>
        </div>

        <div className="h-px bg-gray-200 mb-10" />

        {children}

        <p className="text-center text-xs text-gray-400 mt-6">
          SyncTrace · AI-Powered Academic Traceability
        </p>
      </div>
    </div>
  </div>
);
