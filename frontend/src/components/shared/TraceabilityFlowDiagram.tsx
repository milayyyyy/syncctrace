import React from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';

export const TraceabilityFlowDiagram: React.FC = () => {
  return (
    <div className="w-full rounded-2xl border border-brand-gold/20 bg-brand-gold/5 p-6 backdrop-blur-sm shadow-lg transition-all duration-300 hover:border-brand-gold/40 hover:shadow-lg hover:shadow-brand-gold/10">
      <p className="text-xs text-brand-gold/60 uppercase tracking-widest font-semibold mb-5">
        Traceability Flow
      </p>
      <div className="flex flex-col items-center gap-1">
        {/* PROPOSAL */}
        <div className="px-8 py-2 rounded-xl bg-gradient-to-r from-brand-gold to-brand-gold/80 text-white text-sm font-bold tracking-wide shadow-lg shadow-brand-gold/40 hover:scale-105 transition-transform duration-200 cursor-default">
          PROPOSAL
        </div>
        
        <ArrowDown size={16} className="text-brand-gold/40 animate-bounce my-1" />
        
        {/* SRS */}
        <div className="px-8 py-2 rounded-xl bg-white/[0.08] border border-brand-gold/20 text-brand-gold/90 text-sm font-semibold tracking-wide hover:border-brand-gold/40 hover:text-brand-gold transition-all duration-200 cursor-default">
          SRS
        </div>
        
        <ArrowDown size={16} className="text-brand-gold/40 animate-bounce my-1" />
        
        {/* SDD, SPMP, STD */}
        <div className="flex items-center gap-2">
          <div className="px-6 py-2 rounded-xl bg-white/[0.08] border border-brand-gold/20 text-brand-gold/80 text-sm font-semibold hover:border-brand-gold/40 hover:text-brand-gold transition-all duration-200 cursor-default">
            SDD
          </div>
          <ArrowRight size={14} className="text-brand-gold/40" />
          <div className="px-6 py-2 rounded-xl bg-white/[0.08] border border-brand-gold/20 text-brand-gold/80 text-sm font-semibold hover:border-brand-gold/40 hover:text-brand-gold transition-all duration-200 cursor-default">
            SPMP
          </div>
          <ArrowRight size={14} className="text-brand-gold/40" />
          <div className="px-6 py-2 rounded-xl bg-white/[0.08] border border-brand-gold/20 text-brand-gold/80 text-sm font-semibold hover:border-brand-gold/40 hover:text-brand-gold transition-all duration-200 cursor-default">
            STD
          </div>
        </div>
        
        <ArrowDown size={16} className="text-brand-gold/40 animate-bounce my-1" />
        
        {/* SOURCE CODE */}
        <div className="px-8 py-2 rounded-xl bg-brand-gold/15 border border-brand-gold/40 text-brand-gold text-sm font-semibold tracking-wide hover:bg-brand-gold/25 transition-all duration-200 cursor-default">
          SOURCE CODE
        </div>
      </div>
    </div>
  );
};
