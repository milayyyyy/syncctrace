import React, { useState, useEffect } from 'react';
import { Download, FileText, FileJson, FileSpreadsheet, CheckCircle2, Clock, HardDrive, Trash2 } from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { ExportFormat } from '../types';
import { useAuthStore } from '../stores/authStore';
import { ExportModal, type ExportAudit } from '../components/shared/ExportModal';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: 'PDF',
    label: 'PDF Report',
    description: 'Full audit report with visualizations, matrix, and AI diagnostics',
    icon: <FileText size={20} />,
  },
  {
    value: 'JSON',
    label: 'JSON Data',
    description: 'Machine-readable traceability data for external processing',
    icon: <FileJson size={20} />,
  },
  {
    value: 'CSV',
    label: 'CSV Spreadsheet',
    description: 'Matrix and gap data in spreadsheet format for analysis',
    icon: <FileSpreadsheet size={20} />,
  },
];


interface HistoryItem {
  id: string;
  format: ExportFormat;
  date: string;
  size: string;
}

export const ExportPage: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('PDF');
  
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [showExport, setShowExport] = useState(false);
  const groupId = useAuthStore((s) => s.groupId);
  const navigate = useNavigate();
  
  // Historical logs tracking user downloads
  const [history, setHistory] = useState<HistoryItem[]>([]);
  useEffect(() => {
    if (!groupId) return;
    // fetch latest audit and project title
    (async () => {
      try {
        const [auditRes, projRes] = await Promise.all([
          api.get(`/api/audit/${groupId}/latest`),
          api.get(`/api/projects/${groupId}`),
        ]);
        setAuditResult(auditRes.data.auditResult ?? null);
        setProjectTitle(projRes.data.group?.projectTitle ?? 'Project');
      } catch (err) {
        setAuditResult(null);
      }
    })();
  }, [groupId]);

  const loadHistory = async () => {
    try {
      const res = await api.get('/api/export');
      const jobs = res.data.jobs ?? [];
      const mapped: HistoryItem[] = jobs.map((j: any) => ({
        id: j.id,
        format: j.format,
        date: new Date(j.createdAt).toLocaleString(),
        size: j.format,
      }));
      setHistory(mapped);
    } catch (err) {
      setHistory([]);
    }
  };

  useEffect(() => {
    if (!groupId) return;
    // load history initially and after modal closes
    loadHistory();
  }, [groupId]);

  useEffect(() => {
    if (!showExport) {
      // refresh history after modal closes (new job may have been created)
      loadHistory();
    }
  }, [showExport]);

  const handleExport = () => {
    if (!auditResult) return;
    setShowExport(true);
  };

  

  const exportAudit: ExportAudit | null = auditResult
    ? {
        overallScore: auditResult.overallScore,
        readinessStatus: auditResult.readinessStatus,
        traceLinks: (auditResult.traceLinks ?? []).map((link: any) => ({
          upstream: { type: link.upstream?.type ?? '' },
          downstream: { type: link.downstream?.type ?? '' },
          alignmentScore: link.alignmentScore ?? 0,
          status: link.status ?? 'FAIL',
        })),
        gaps: (auditResult.gaps ?? []).map((g: any) => ({
          severity: g.severity,
          description: g.description,
          rootCause: g.rootCause,
          recommendation: g.recommendation,
          aiConfidence: g.aiConfidence,
        })),
      }
    : null;

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <Layout
      title="Export Report"
      subtitle="Generate and download your full audit report in PDF, JSON, or CSV"
      badge="Report Generator"
      heroIcon={<Download size={26} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl items-start">
        {/* Left 2 cols for export block */}
        <div className="lg:col-span-2 space-y-4">
            <>
              {/* Format selector */}
              <Card className="hover:shadow duration-200 transition-all border border-slate-100 p-6">
                <h2 className="text-[14px] font-bold text-gray-900 mb-4 tracking-tight">Select Export Format</h2>
                <div className="space-y-3">
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedFormat(opt.value)}
                      className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all duration-150 ${
                        selectedFormat === opt.value
                          ? 'border-primary bg-primary/[0.03] ring-1 ring-primary/10 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                          selectedFormat === opt.value
                            ? 'bg-gradient-primary text-white border-primary/20'
                            : 'bg-slate-50 text-gray-400 border-slate-100'
                        }`}
                      >
                        {opt.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-bold text-gray-900">{opt.label}</p>
                          {opt.value === 'PDF' && (
                            <Badge variant="ready" dot>Recommended</Badge>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-400 mt-0.5 font-medium leading-relaxed">{opt.description}</p>
                      </div>
                      {selectedFormat === opt.value && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </Card>

              {/* What's included */}
              <Card className="bg-slate-50/60 border border-slate-100/90 p-5">
                <h3 className="text-[11.5px] font-extrabold text-slate-500 uppercase tracking-widest mb-3.5">Report includes</h3>
                <ul className="space-y-2.5">
                  {[
                    'Project information & metadata details',
                    'Full alignment matrix with coverage levels',
                    'High & Critical specification gap logs',
                    'AI recommendations & immediate actionable next steps',
                    'Audit timestamp with digital authentication signature',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[12.5px] text-gray-600 font-medium">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Button size="lg" className="w-full text-sm py-3.5 shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/15 transition-all text-white hover:scale-[1.01]" onClick={handleExport}>
                <Download size={16} className="mr-0.5" />
                Generate {selectedFormat} Report
              </Button>
            </>

          {/* Processing/done states removed — replaced by real ExportModal */}
        </div>

        {/* Right 1 col for Export history / details context */}
        <div className="space-y-4">
          <Card className="p-5 border border-slate-100/90 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-gray-400" />
                <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">Recent Downloads</h4>
              </div>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={11} />
                  Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/40 rounded-xl border border-dashed border-slate-100 text-gray-400">
                <HardDrive size={24} className="mx-auto mb-2 opacity-40 text-slate-300" />
                <p className="text-[11px] font-semibold uppercase tracking-wider">No historic exports</p>
                <p className="text-[10px] text-gray-300 mt-1">Generated files appear here</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div 
                    key={item.id}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 transition-all text-left font-normal"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100/80 text-slate-500 flex items-center justify-center font-bold text-xs select-none">
                        {item.format}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{item.format === 'PDF' ? 'Full Report' : 'Raw Data'}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{item.date}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10.5px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                        {item.size}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="bg-gradient-to-tr from-indigo-900 to-slate-900 text-white p-5 border-none shadow-md overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
            <h4 className="text-xs font-extrabold text-indigo-200 uppercase tracking-widest mb-1">Signed Integrity</h4>
            <p className="text-xs text-indigo-100 mb-3 font-medium leading-relaxed">
              Every exported report includes a cryptographically verifiable SHA-256 hash containing all document requirements.
            </p>
            <div className="p-2.5 rounded-lg bg-white/10 border border-white/10 flex items-center justify-between text-[11px] font-mono text-indigo-200">
              <span className="truncate mr-2">SHA256: 8f2b3e8c9...</span>
              <span className="text-[9px] font-bold bg-indigo-500/40 text-white px-1.5 py-0.5 rounded">SECURE</span>
            </div>
          </Card>
        </div>
      </div>
      {showExport && exportAudit && (
        <ExportModal onClose={() => setShowExport(false)} auditData={exportAudit} projectTitle={projectTitle} auditId={auditResult?.id} />
      )}
    </Layout>
  );
};
