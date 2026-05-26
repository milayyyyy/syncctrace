import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lightbulb,
  Target,
  Users,
  X,
  Sparkles,
  Layers,
  FileText,
  FileJson,
  FileSpreadsheet,
  Filter,
} from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { Card } from '../components/ui/Card';
import { Badge, severityToBadge, readinessToBadge, readinessLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import type { Severity, ReadinessStatus, MatrixRow, TraceEvidence, ExportFormat } from '../types';
import { api } from '../services/api';

interface ApiMember { id: string; name: string; email: string; }
interface ApiGap {
  id: string;
  description: string;
  severity: Severity;
  rootCause: string;
  recommendation: string;
  aiConfidence: number;
  affectedArtifacts: string[];
  createdAt: string;
}
interface ApiLink {
  id: string;
  upstream: { type: string };
  downstream: { type: string };
  alignmentScore: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  evidencePairs: Array<{ upstream: string; downstream: string; similarity: number }>;
}
interface ApiAudit {
  overallScore: number;
  readinessStatus: ReadinessStatus;
  auditedAt: string;
  traceLinks: ApiLink[];
  gaps: ApiGap[];
}
interface ApiGroup {
  id: string;
  projectTitle: string;
  teamCode: string;
  members: ApiMember[];
  auditResults: ApiAudit[];
}

const severityIcon: Record<Severity, React.ReactNode> = {
  CRITICAL: <AlertCircle size={14} className="text-critical" />,
  HIGH: <AlertTriangle size={14} className="text-orange-500" />,
  MEDIUM: <Info size={14} className="text-warning" />,
  LOW: <CheckCircle2 size={14} className="text-blue-500" />,
};

const gapTypeLabel: Record<string, string> = {
  MISSING_LINK: 'Missing Link',
  INCONSISTENCY: 'Inconsistency',
  IMPLEMENTATION_GAP: 'Implementation Gap',
  TERMINOLOGY_DRIFT: 'Terminology Drift',
  DOWNSTREAM_OMISSION: 'Downstream Omission',
};

const EXPORT_LOGS = [
  'Initializing export engine & verifying authorization...',
  'Retrieving workspace traceability definitions...',
  'Validating proposal requirements mapping matrices...',
  'Compiling AI code-to-specification recommendations...',
  'Formatting vector charts & status indicators...',
  'Polishing table structures & layout alignments...',
  'Compressing file stream buffer to target package...',
  'Finalizing file stream binaries... Ready!',
];

const FORMAT_OPTIONS: { value: ExportFormat; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'PDF', label: 'PDF Report', desc: 'Full audit report with matrix, gaps & AI diagnostics', icon: <FileText size={16} /> },
  { value: 'JSON', label: 'JSON Data', desc: 'Machine-readable traceability data', icon: <FileJson size={16} /> },
  { value: 'CSV', label: 'CSV Spreadsheet', desc: 'Matrix & gap data in spreadsheet format', icon: <FileSpreadsheet size={16} /> },
];

type ExportStage = 'idle' | 'processing' | 'done' | 'downloaded';

interface ExportAudit {
  overallScore: number;
  readinessStatus: string;
  traceLinks: Array<{ upstream: { type: string }; downstream: { type: string }; alignmentScore: number; status: string }>;
  gaps: Array<{ severity: string; description?: string; rootCause?: string; recommendation?: string; aiConfidence?: number }>;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildJsonBlob(auditData: ExportAudit, projectTitle: string): Blob {
  const payload = {
    exportedAt: new Date().toISOString(),
    projectTitle,
    overallScore: auditData.overallScore,
    readinessStatus: auditData.readinessStatus,
    traceLinks: auditData.traceLinks,
    gaps: auditData.gaps,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

function buildCsvBlob(auditData: ExportAudit, projectTitle: string): Blob {
  const q = (s: string) => `"${String(s ?? '').replaceAll('"', '""')}"`;
  const rows: string[] = [
    `SyncTrace Audit Report`,
    `Project: ${projectTitle}`,
    `Exported: ${new Date().toLocaleString()}`,
    `Overall Score: ${auditData.overallScore.toFixed(1)}%`,
    `Status: ${auditData.readinessStatus}`,
    '',
    'TRACEABILITY MATRIX',
    'Upstream,Downstream,Alignment Score,Status',
    ...auditData.traceLinks.map((l) =>
      `${l.upstream.type},${l.downstream.type},${l.alignmentScore.toFixed(1)},${l.status}`,
    ),
    '',
    'GAPS',
    'Severity,Description,Root Cause,Recommendation,AI Confidence',
    ...auditData.gaps.map((g) =>
      [
        g.severity,
        q(g.description ?? ''),
        q(g.rootCause ?? ''),
        q(g.recommendation ?? ''),
        g.aiConfidence == null ? '' : `${(g.aiConfidence * 100).toFixed(0)}%`,
      ].join(','),
    ),
  ];
  return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
}

function openPdfReport(auditData: ExportAudit, projectTitle: string): void {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const linkRows = auditData.traceLinks
    .map((l) => {
      let c: string;
      if (l.status === 'PASS') { c = '#059669'; }
      else if (l.status === 'WARN') { c = '#D4AF37'; }
      else { c = '#B91C1C'; }
      return `<tr><td>${l.upstream.type}</td><td>${l.downstream.type}</td><td>${l.alignmentScore.toFixed(1)}%</td><td style="color:${c};font-weight:700">${l.status}</td></tr>`;
    })
    .join('');
  const gapRows = auditData.gaps
    .map((g) => {
      let c: string;
      if (g.severity === 'CRITICAL') { c = '#B91C1C'; }
      else if (g.severity === 'HIGH') { c = '#D97706'; }
      else if (g.severity === 'MEDIUM') { c = '#0284C7'; }
      else { c = '#059669'; }
      return `<tr><td style="color:${c};font-weight:700">${g.severity}</td><td>${g.description ?? '-'}</td><td>${g.rootCause ?? '-'}</td></tr>`;
    })
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Audit Report – ${projectTitle}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a}h1{color:#1E3A5F}h2{color:#1E3A5F;border-bottom:2px solid #D4AF37;padding-bottom:6px;margin-top:32px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#1E3A5F;color:#fff;padding:10px;text-align:left}td{padding:8px 10px;border-bottom:1px solid #E2E8F0}tr:nth-child(even) td{background:#F8FAFC}.meta{background:#F1F5F9;padding:16px;border-radius:8px;margin-bottom:24px}.score{font-size:48px;font-weight:900;color:#1E3A5F;margin:8px 0}@media print{.no-print{display:none}}</style>
</head><body>
<h1>SyncTrace Audit Report</h1>
<div class="meta"><p><strong>Project:</strong> ${projectTitle}</p><p><strong>Exported:</strong> ${date}</p><p><strong>Status:</strong> ${auditData.readinessStatus.replaceAll('_',' ')}</p><div class="score">${auditData.overallScore.toFixed(1)}%</div><p style="color:#64748B;margin:0">Overall Alignment Score</p></div>
<h2>Traceability Matrix</h2><table><thead><tr><th>Upstream</th><th>Downstream</th><th>Alignment Score</th><th>Status</th></tr></thead><tbody>${linkRows}</tbody></table>
<h2>Identified Gaps</h2><table><thead><tr><th>Severity</th><th>Description</th><th>Root Cause</th></tr></thead><tbody>${gapRows}</tbody></table>
<script>window.onload=function(){window.print();}</` + `script>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

interface ExportModalProps { readonly onClose: () => void; readonly auditData: ExportAudit; readonly projectTitle: string; }

function ExportModal({ onClose, auditData, projectTitle }: ExportModalProps) {
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
        if (prev >= 100) { clearInterval(timer); setStage('done'); return 100; }
        const next = prev + 12.5;
        setLogIndex(Math.min(Math.floor(next / 12.5), EXPORT_LOGS.length - 1));
        return next;
      });
    }, 350);
    return () => clearInterval(timer);
  }, [stage]);

  const handleDownload = () => {
    const slug = (projectTitle || 'audit').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'JSON') {
      triggerBlobDownload(buildJsonBlob(auditData, projectTitle), `audit-${slug}-${dateStr}.json`);
    } else if (format === 'CSV') {
      triggerBlobDownload(buildCsvBlob(auditData, projectTitle), `audit-${slug}-${dateStr}.csv`);
    } else {
      openPdfReport(auditData, projectTitle);
    }
    setStage('downloaded');
  };

  const isIdle = stage === 'idle';
  const isProcessing = stage === 'processing';
  const isDownloaded = stage === 'downloaded';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <dialog
        className="relative w-full max-w-lg flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-transparent p-0 m-auto"
        open
        aria-modal="true"
      >
        {/* Dark header */}
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
              <span className="text-[11px] font-bold text-emerald-300">Audit results available — ready to export</span>
            </div>
          )}
        </div>

        {/* White body */}
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
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormat(opt.value)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${btnClass}`}
                      >
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

              <button
                type="button"
                onClick={() => setStage('processing')}
                className="w-full py-4 rounded-2xl bg-brand-navy text-white text-[13px] font-black uppercase tracking-widest hover:bg-brand-navy/90 transition-all shadow-lg active:scale-[0.98]"
              >
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
                  <p className="text-[11px] text-brand-gold font-bold italic animate-pulse">
                    {EXPORT_LOGS[logIndex]}
                  </p>
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
                  {format === 'PDF' 
                    ? 'Your report has been generated and opened in a new tab.'
                    : `Your ${format} file has been generated and is ready for download.`}
                </p>
              </div>
              {!isDownloaded && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-gold text-brand-navy text-[13px] font-black uppercase tracking-widest hover:bg-[#c9a227] transition-all shadow-lg active:scale-[0.98]"
                >
                  <Download size={16} />
                  {format === 'PDF' ? 'Open Print Dialog' : 'Download File'}
                </button>
              )}
              {isDownloaded && (
                <div className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-600">
                    {format === 'PDF' ? 'Report Opened / Press Ctrl+P' : 'Download Started'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer controls */}
        {!isProcessing && !isDownloaded && stage !== 'done' && (
          <div className="bg-slate-50 px-7 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-[12px] font-black text-gray-400 uppercase tracking-widest hover:text-brand-navy transition-colors font-sans"
            >
              Cancel
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedGap, setSelectedGap] = useState<ApiGap | null>(null);
  const [selectedRow, setSelectedRow] = useState<MatrixRow | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [group, setGroup] = useState<ApiGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [gapFilter, setGapFilter] = useState<Severity | 'ALL'>('ALL');

  useEffect(() => {
    if (!id) return;
    api.get(`/api/projects/${id}`)
      .then((res) => setGroup(res.data.group))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Layout title="Group Detail" badge="Team Overview" heroIcon={<Users size={26} />}>
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout title="Group Not Found" badge="Team Overview" heroIcon={<Users size={26} />}>
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">The requested group could not be found.</p>
          <Button onClick={() => navigate('/faculty')}>← Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  const latestAudit: ApiAudit | undefined = group.auditResults[0];
  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const allGaps: ApiGap[] = [...(latestAudit?.gaps ?? [])].sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));
  const gaps = allGaps.filter(g => gapFilter === 'ALL' || g.severity === gapFilter);
  const healthScore = latestAudit?.overallScore ?? 0;
  const readinessStatus: ReadinessStatus = latestAudit?.readinessStatus ?? 'NEEDS_REVISION';

  const criticalGaps = allGaps.filter((g) => g.severity === 'CRITICAL').length;
  const warnings = allGaps.filter((g) => g.severity === 'HIGH').length;

  const exportAudit: ExportAudit = {
    overallScore: healthScore,
    readinessStatus: readinessStatus,
    traceLinks: (latestAudit?.traceLinks ?? []).map(link => ({
      upstream: link.upstream,
      downstream: link.downstream,
      alignmentScore: link.alignmentScore,
      status: link.status
    })),
    gaps: gaps.map(gap => ({
      severity: gap.severity,
      description: gap.description,
      rootCause: gap.rootCause,
      recommendation: gap.recommendation,
      aiConfidence: gap.aiConfidence
    }))
  };

  const matrixRows: MatrixRow[] = (latestAudit?.traceLinks ?? []).map((link) => ({
    id: link.id,
    upstreamType: link.upstream.type,
    downstreamType: link.downstream.type,
    alignmentScore: link.alignmentScore,
    coverage: link.alignmentScore,
    criticalGaps,
    warnings,
    status: link.status,
    traceEvidence: (link.evidencePairs ?? []).map((ep): TraceEvidence => ({
      upstreamSection: ep.upstream,
      downstreamSection: ep.downstream,
      similarityScore: ep.similarity,
    })),
  }));

  return (
    <Layout
      title={group.projectTitle}
      subtitle={`Team ${group.teamCode} — Research Protocol Review`}
      badge="Adviser Portal"
      heroIcon={<Target size={26} />}
      headerAction={
        <div className="flex items-center gap-4">
          <Badge variant={readinessToBadge(readinessStatus)} dot>
            {readinessLabel(readinessStatus)}
          </Badge>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2.5 px-6 py-2.5 bg-brand-gold text-brand-navy rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-[#c9a227] transition-all shadow-lg active:scale-95"
          >
            <Download size={15} />
            Export Protocol
          </button>
        </div>
      }
    >
      {/* ── Dashboard Top Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <button
          onClick={() => navigate('/faculty')}
          className="group flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-brand-navy/30 hover:text-brand-navy transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-brand-navy/5 flex items-center justify-center group-hover:bg-brand-navy group-hover:text-white transition-all">
            <ArrowLeft size={14} />
          </div>
          Registry Dashboard
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 w-full sm:w-auto">
          <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8 sm:border-r sm:border-brand-navy/5 sm:pr-8 lg:pr-12">
            {[
              { label: 'Critical', value: criticalGaps, color: 'text-brand-coral' },
              { label: 'High', value: warnings, color: 'text-brand-gold' },
              { label: 'Resolved', value: matrixRows.length, color: 'text-brand-emerald' },
            ].map((stat) => (
              <div key={stat.label} className="text-right">
                <p className="text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className={`text-xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em] mb-1">Lifecycle Health</p>
            {(() => {
              let scoreColor = '#B91C1C';
              if (healthScore >= 80) scoreColor = '#059669';
              else if (healthScore >= 60) scoreColor = '#D4AF37';
              return (
                <p className="text-4xl font-black tracking-tight" style={{ color: scoreColor }}>
                  {healthScore.toFixed(1)}%
                </p>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left Column: Matrix & Detailed Analysis ─────────────────── */}
        <div className="lg:col-span-6 space-y-8">

          {/* Traceability Matrix Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-navy flex items-center justify-center text-brand-gold shadow-lg rotate-3 shrink-0">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-[16px] font-black text-brand-navy uppercase tracking-tight">Traceability Matrix</h3>
                <p className="text-[11px] text-brand-navy/40 font-bold uppercase tracking-widest">Alignment over Artifact Lifecycle</p>
              </div>
              <div className="h-[1px] flex-1 bg-brand-navy/5" />
            </div>

            <Card padding="none" className="overflow-hidden border-none shadow-sm ring-1 ring-brand-navy/5">
              <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[520px]">
                <thead>
                  <tr className="bg-[#0B1521] text-white">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Artifact Linkage</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-70 text-center">Score</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-70 text-center">Protocol</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-70 text-right">Insight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-navy/5 bg-white">
                  {matrixRows.map((row) => {
                    let scoreColor = '#B91C1C';
                    if (row.alignmentScore >= 80) scoreColor = '#059669';
                    else if (row.alignmentScore >= 60) scoreColor = '#D4AF37';

                    let statusStyles = { bg: 'rgba(185,28,28,0.08)', text: '#B91C1C' };
                    if (row.status === 'PASS') statusStyles = { bg: 'rgba(5,150,105,0.08)', text: '#059669' };
                    else if (row.status === 'WARN') statusStyles = { bg: 'rgba(212,175,55,0.12)', text: '#B45309' };

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedRow(selectedRow?.id === row.id ? null : row)}
                        className="group hover:bg-brand-navy/[0.01] transition-colors cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <span className="text-[13px] font-black text-brand-navy uppercase tracking-tight">{row.upstreamType}</span>
                            <div className="w-6 h-6 rounded-full bg-brand-navy/5 flex items-center justify-center">
                              <ChevronRight size={12} className="text-brand-gold opacity-50" />
                            </div>
                            <span className="text-[13px] font-black text-brand-navy uppercase tracking-tight">{row.downstreamType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span className="text-[18px] font-black" style={{ color: scoreColor }}>
                            {row.alignmentScore.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <div
                            className="inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                            style={{ background: statusStyles.bg, color: statusStyles.text }}
                          >
                            {row.status}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="inline-flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                            <span className="text-[10px] font-black text-brand-navy/50 uppercase tracking-widest group-hover:text-brand-navy/80 transition-colors">Details</span>
                            <div className="w-8 h-8 rounded-xl bg-brand-navy/5 flex items-center justify-center text-brand-navy/30 group-hover:bg-brand-navy group-hover:text-white transition-all border border-brand-navy/5">
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </Card>
          </section>

          {/* Neural Gaps Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-brand-gold flex items-center justify-center text-brand-navy shadow-lg -rotate-3 shrink-0">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-brand-navy uppercase tracking-tight">Neural Gap Reports</h3>
                  <p className="text-[11px] text-brand-navy/60 font-bold uppercase tracking-widest">Discontinuities Identified by AI</p>
                </div>
              </div>

              {/* Severity Filter */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-brand-navy/5 rounded-xl w-full lg:w-auto overflow-x-auto">
                <div className="px-2 border-r border-brand-navy/10 mr-1 hidden sm:block">
                  <Filter size={12} className="text-brand-navy/30" />
                </div>
                {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setGapFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                      gapFilter === s 
                        ? 'bg-brand-navy text-white shadow-sm' 
                        : 'text-brand-navy/40 hover:bg-brand-navy/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {gaps.length === 0 ? (
               <div className="py-12 flex flex-col items-center justify-center bg-emerald-50 rounded-3xl border border-emerald-100/50">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                      <CheckCircle2 size={32} />
                  </div>
                  <p className="text-[15px] font-black text-emerald-800 tracking-tight">No Continuity Gaps Detected</p>
                  <p className="text-[12px] text-emerald-600/60 font-medium">All artifacts are perfectly aligned with the research protocol.</p>
               </div>
            ) : (
                <div className="max-h-[min(580px,50vh)] sm:max-h-[580px] overflow-y-auto pr-1 sm:pr-3 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
                    {gaps.map((gap) => (
                      <Card
                        key={gap.id}
                        padding="none"
                        onClick={() => setSelectedGap(selectedGap?.id === gap.id ? null : gap)}
                        className={`group cursor-pointer transition-all duration-300 border-none ring-1 ${
                          selectedGap?.id === gap.id
                            ? 'ring-brand-gold shadow-premium !bg-[#1E3A5F] translate-y-[-4px]'
                            : 'ring-brand-navy/15 bg-white hover:ring-brand-navy/30'
                        }`}
                      >
                        <div className="p-5 flex gap-4">
                          <div className={`mt-1 h-fit p-2.5 rounded-xl shrink-0 transition-all ${
                              selectedGap?.id === gap.id 
                              ? 'bg-brand-gold text-brand-navy shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                              : 'bg-brand-navy/5 text-brand-navy/50 group-hover:text-brand-navy/70 group-hover:bg-brand-navy/10'
                          }`}>
                            {severityIcon[gap.severity]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant={severityToBadge(gap.severity)} className="text-[9px] uppercase tracking-widest py-0">
                                  {gap.severity}
                              </Badge>
                            </div>
                            <p className={`text-[12.5px] font-bold leading-relaxed line-clamp-3 transition-colors ${
                                selectedGap?.id === gap.id ? 'text-white' : 'text-brand-navy/80'
                            }`}>
                              {gap.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
            )}
          </section>
        </div>

        {/* ── Right Column: Contextual Pane ───────────────────────────── */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Diagnostic Insight Pane */}
          <div className="sticky top-6 space-y-6">
            {selectedGap ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card padding="none" className="overflow-hidden border-none shadow-2xl ring-1 ring-brand-navy/15 !bg-[#0B1521] rounded-[2.5rem]">
                        <div className="p-8 pb-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 60%, #1E3A5F 100%)' }}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/25 rounded-full blur-[60px] -mr-16 -mt-16" />
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold shadow-lg shadow-brand-gold/15">
                                            <Sparkles size={20} />
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-brand-gold">Diagnostic Report</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedGap(null)} 
                                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all border border-white/10 shadow-lg"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[22px] font-black text-white leading-tight tracking-tight drop-shadow-md">
                                        {gapTypeLabel[selectedGap.affectedArtifacts?.[0] as keyof typeof gapTypeLabel] || 'AI Issue Analysis'}
                                    </h4>
                                    <div className="h-1.5 w-16 bg-brand-gold rounded-full shadow-[0_0_15px_rgba(212,175,55,0.6)]" />
                                    <p className="text-[15.5px] font-bold text-white leading-relaxed italic pr-6 drop-shadow-sm">
                                        "{selectedGap.description}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 -mt-8 bg-white rounded-t-[3rem] relative z-20 space-y-10 shadow-[0_-15px_50px_rgba(0,0,0,0.15)]">
                            <div className="space-y-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-brand-coral/10 flex items-center justify-center">
                                        <Target size={14} className="text-brand-coral" />
                                    </div>
                                    <p className="text-[10px] font-black text-brand-navy/70 uppercase tracking-[0.2em]">Causal Analysis</p>
                                </div>
                                <div className="p-5 rounded-3xl bg-brand-coral/[0.04] border border-brand-coral/15 hover:border-brand-coral/25 transition-colors">
                                    <p className="text-[12.5px] font-bold text-brand-navy leading-relaxed">
                                        {selectedGap.rootCause}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <Lightbulb size={14} className="text-brand-emerald" />
                                    </div>
                                    <p className="text-[10px] font-black text-brand-navy/70 uppercase tracking-[0.2em]">Recommendation</p>
                                </div>
                                <div className="p-5 rounded-3xl bg-brand-emerald/[0.04] border border-brand-emerald/15 hover:border-brand-emerald/25 transition-colors">
                                    <p className="text-[12.5px] font-bold text-brand-navy leading-relaxed">
                                        {selectedGap.recommendation}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-brand-navy/10 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest">AI Confidence</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[16px] font-black text-brand-navy">{(selectedGap.aiConfidence * 100).toFixed(0)}%</p>
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest">Audited At</p>
                                    <p className="text-[12px] font-bold text-brand-navy/80">{new Date(selectedGap.createdAt).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' })}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            ) : (
                <Card className="!bg-[#1E3A5F] p-8 rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-brand-gold/10 rounded-full blur-[80px] -mr-24 -mt-24 transition-transform group-hover:scale-125 duration-700" />
                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-brand-gold rotate-3 group-hover:rotate-6 transition-all duration-300">
                                <Users size={28} />
                            </div>
                            <div>
                                <h4 className="text-[18px] font-black text-white tracking-tight leading-none uppercase mb-1.5">Group DNA</h4>
                                <div className="inline-flex px-2 py-0.5 bg-brand-gold/20 rounded-md">
                                    <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.3em]">{group.teamCode}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-3">Principal Investigator</p>
                                {group.members.slice(0, 1).map(m => (
                                    <div key={m.id} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-gold text-brand-navy flex items-center justify-center text-[13px] font-black shadow-lg shadow-brand-gold/20">
                                            {m.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-black text-white uppercase tracking-tight leading-none mb-1">{m.name}</p>
                                            <p className="text-[10px] font-bold text-white/70 truncate max-w-[120px]">{m.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em] ml-2">Team Personnel</p>
                                <div className="space-y-2">
                                    {group.members.slice(1).map((m) => (
                                        <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 transition-colors group/member">
                                            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black text-white/90 group-hover/member:bg-brand-gold group-hover/member:text-brand-navy transition-all">
                                                {m.name.charAt(0)}
                                            </div>
                                            <p className="text-[11px] font-bold text-white/90 group-hover/member:text-white transition-colors uppercase tracking-tight truncate flex-1">{m.name}</p>
                                            <ChevronRight size={12} className="text-white/40 group-hover/member:text-brand-gold opacity-10 group-hover/member:opacity-100 transition-all" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em] mb-3">Sync Status</p>
                            <div className="flex items-center gap-2 text-emerald-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/90">Live Connection</span>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
          </div>
        </div>
      </div>

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          auditData={exportAudit}
          projectTitle={group.projectTitle}
        />
      )}
    </Layout>
  );
};
