import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, FileJson, FileSpreadsheet, FileText, X } from 'lucide-react';
import type { ExportFormat } from '../../types';
import { Badge } from '../ui/Badge';
import { exportAuditReport, type ExportAudit } from '../../services/export';

const EXPORT_LOGS = [
  'Initializing export engine and verifying authorization...',
  'Retrieving workspace traceability definitions...',
  'Validating requirements mapping matrices...',
  'Compiling AI recommendations and gap evidence...',
  'Formatting charts and status indicators...',
  'Finalizing report package...',
];

const FORMAT_OPTIONS: { value: ExportFormat; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'PDF', label: 'PDF Report', desc: 'Full audit report with matrix, gaps and AI diagnostics', icon: <FileText size={16} /> },
  { value: 'JSON', label: 'JSON Data', desc: 'Machine-readable traceability data', icon: <FileJson size={16} /> },
  { value: 'CSV', label: 'CSV Spreadsheet', desc: 'Matrix and gap data in spreadsheet format', icon: <FileSpreadsheet size={16} /> },
];

type ExportStage = 'idle' | 'processing' | 'done' | 'downloaded';

interface ExportModalProps {
  readonly onClose: () => void;
  readonly auditData: ExportAudit;
  readonly projectTitle: string;
  readonly onExportComplete?: (format: ExportFormat) => void | Promise<void>;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose, auditData, projectTitle, onExportComplete }) => {
  const [format, setFormat] = useState<ExportFormat>('PDF');
  const [stage, setStage] = useState<ExportStage>('idle');
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (stage !== 'processing') return;
    setProgress(0);
    setLogIndex(0);
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setStage('done');
          return 100;
        }
        const next = prev + 16.67;
        setLogIndex(Math.min(Math.floor(next / 16.67), EXPORT_LOGS.length - 1));
        return next;
      });
    }, 300);
    return () => clearInterval(timer);
  }, [stage]);

  const handleDownload = async () => {
    exportAuditReport(auditData, projectTitle, format);
    await onExportComplete?.(format);
    setStage('downloaded');
  };

  const isIdle = stage === 'idle';
  const isProcessing = stage === 'processing';
  const isDownloaded = stage === 'downloaded';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <dialog className="relative w-full max-w-lg flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-transparent p-0 m-auto" open aria-modal="true">
        <div className="px-7 py-6 shrink-0" style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 60%, #1E3A5F 100%)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.18)', border: '1px solid rgba(212,175,55,0.35)' }}>
                <Download size={18} style={{ color: '#D4AF37' }} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: 'rgba(212,175,55,0.75)' }}>Export Service</p>
                <h3 className="text-[16px] font-black text-white tracking-tight">Export Audit Report</h3>
              </div>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-all" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          {isIdle && (
            <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-emerald-300">Audit results available - ready to export</span>
            </div>
          )}
        </div>

        <div className="bg-white px-7 py-6">
          {isIdle && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Select Format</p>
                <div className="space-y-2">
                  {FORMAT_OPTIONS.map((opt) => {
                    const isSelected = format === opt.value;
                    const btnClass = isSelected
                      ? 'border-brand-gold bg-brand-gold/[0.03] ring-1 ring-brand-gold/10'
                      : 'border-slate-100 hover:border-slate-200 bg-white';
                    const iconClass = isSelected
                      ? 'bg-brand-gold text-brand-navy border-brand-gold/20'
                      : 'bg-slate-50 text-gray-400 border-slate-100';
                    return (
                      <button key={opt.value} type="button" onClick={() => setFormat(opt.value)} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${btnClass}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${iconClass}`}>
                          {opt.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-bold text-gray-900">{opt.label}</p>
                            {isSelected && <Badge variant="pass" className="text-[9px] px-1.5 py-0">SELECTED</Badge>}
                          </div>
                          <p className="text-[11px] text-gray-400 font-medium truncate">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="button" onClick={() => setStage('processing')} className="w-full py-4 rounded-2xl bg-brand-navy text-white text-[13px] font-black uppercase tracking-widest hover:bg-brand-navy/90 transition-all shadow-lg active:scale-[0.98]">
                Continue to Export
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="py-6 flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-gray-100 border-t-brand-gold animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[14px] font-black text-brand-navy">{Math.floor(progress)}%</span>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-[15px] font-black text-brand-navy tracking-tight">Processing Documents...</p>
                <div className="h-4 overflow-hidden">
                  <p className="text-[11px] text-brand-gold font-bold italic animate-pulse">{EXPORT_LOGS[logIndex]}</p>
                </div>
              </div>
            </div>
          )}

          {(stage === 'done' || isDownloaded) && (
            <div className="py-6 flex flex-col items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                  <CheckCircle2 size={24} />
                </div>
              </div>
              <div className="text-center">
                <h4 className="text-[18px] font-black text-brand-navy tracking-tight">Export Successful</h4>
                <p className="text-[12px] text-gray-500 font-medium mt-1 leading-relaxed">
                  Your {format === 'PDF' ? 'PDF report' : `${format} file`} is ready. Click below to save it to your device.
                </p>
              </div>
              {!isDownloaded && (
                <button type="button" onClick={handleDownload} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-gold text-brand-navy text-[13px] font-black uppercase tracking-widest hover:bg-[#c9a227] transition-all shadow-lg active:scale-[0.98]">
                  <Download size={16} />
                  {format === 'PDF' ? 'Download PDF' : format === 'CSV' ? 'Download CSV' : 'Download JSON'}
                </button>
              )}
              {isDownloaded && (
                <div className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-600">Download complete. Check your downloads folder.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {!isProcessing && (
          <div className="bg-slate-50 px-7 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={isDownloaded ? onClose : () => { setStage('idle'); setProgress(0); }} className="px-4 py-2 rounded-xl text-[12px] font-bold text-gray-500 hover:text-gray-700 transition-colors">
              {isDownloaded ? 'Done' : 'Export another format'}
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
};
