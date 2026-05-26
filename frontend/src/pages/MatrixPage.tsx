import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, AlertCircle, AlertTriangle, CheckCircle2, Info, ChevronDown, Layers, XCircle, X, Download, FileText, FileJson, FileSpreadsheet } from 'lucide-react';
import type { MatrixRow, TraceEvidence, ExportFormat } from '../types';
import { Layout } from '../components/shared/Layout';
import { Card } from '../components/ui/Card';
import { Badge, matrixStatusToBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatScore } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface GaugeProps { readonly score: number; }

function getGaugeColor(score: number): string {
  if (score >= 80) return '#059669'; // brand-emerald
  if (score >= 60) return '#D4AF37'; // brand-gold
  return '#B91C1C'; // status-critical
}

function AlignmentGauge({ score }: GaugeProps) {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  const color = getGaugeColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="#E2E8F0" strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-brand-navy tracking-tight">{score.toFixed(1)}</span>
          <span className="text-[12px] text-brand-slate font-bold mt-1 uppercase tracking-widest">Alignment</span>
        </div>
      </div>
    </div>
  );
}

function getSimTextColor(pct: number): string {
  if (pct >= 70) return 'text-brand-emerald';
  if (pct >= 40) return 'text-brand-gold';
  return 'text-brand-coral';
}

function getAlignTextClass(score: number): string {
  if (score >= 80) return 'text-brand-emerald';
  if (score >= 60) return 'text-brand-gold';
  return 'text-brand-coral';
}

function getAlignBgClass(score: number): string {
  if (score >= 80) return 'bg-brand-emerald';
  if (score >= 60) return 'bg-brand-gold';
  return 'bg-brand-coral';
}

function getStatusBorderColor(status: string): string {
  if (status === 'PASS') return '#059669';
  if (status === 'WARN') return '#D4AF37';
  return '#B91C1C';
}

function getSimilarityColor(pct: number): string {
  if (pct >= 70) return 'bg-brand-emerald';
  if (pct >= 40) return 'bg-brand-gold';
  return 'bg-brand-coral';
}

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
    const slug = projectTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
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
          {stage === 'idle' && (
            <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-emerald-300">Audit results available — ready to export</span>
            </div>
          )}
        </div>

        {/* White body */}
        <div className="bg-white px-7 py-6">
          {stage === 'idle' && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Select Format</p>
                <div className="space-y-2">
                  {FORMAT_OPTIONS.map((opt) => {
                    const isSelected = format === opt.value;
                    const btnClass = isSelected
                      ? 'border-primary bg-primary/[0.03] ring-1 ring-primary/10'
                      : 'border-slate-100 hover:border-slate-200 bg-white';
                    const iconClass = isSelected
                      ? 'bg-primary text-white border-primary/20'
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
                            {opt.value === 'PDF' && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">Recommended</span>}
                          </div>
                          <p className="text-[11px] text-gray-400 font-medium mt-0.5">{opt.desc}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStage('processing')}
                className="w-full py-3.5 rounded-2xl text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #162D4A 100%)' }}
              >
                <Download size={15} />
                Generate {format} Report
              </button>
            </div>
          )}

          {stage === 'processing' && (
            <div className="space-y-5 py-2">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-gray-400">Generating report…</span>
                  <span className="text-[11px] font-black text-brand-navy">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #1E3A5F, #D4AF37)' }}
                  />
                </div>
              </div>
              <div className="space-y-1.5 min-h-[120px]">
                {EXPORT_LOGS.slice(0, logIndex + 1).map((log, i) => (
                  <div key={log} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === logIndex ? 'bg-brand-gold animate-pulse' : 'bg-emerald-400'}`} />
                    <p className={`text-[11px] font-medium ${i === logIndex ? 'text-gray-700' : 'text-gray-300'}`}>{log}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage === 'done' && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center py-4 gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={26} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-[15px] font-black text-gray-900">Report Ready</p>
                  <p className="text-[12px] text-gray-400 font-medium mt-1">Your {format} audit report has been generated successfully.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3.5 rounded-2xl text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
              >
                <Download size={15} />
                Download {format} Report
              </button>
              <button
                type="button"
                onClick={() => { setStage('idle'); setProgress(0); }}
                className="w-full py-2.5 rounded-2xl text-[12px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Export another format
              </button>
            </div>
          )}

          {stage === 'downloaded' && (
            <div className="py-6 flex flex-col items-center gap-5 text-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 100%)' }}>
                  <Download size={30} style={{ color: '#D4AF37' }} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white">
                  <CheckCircle2 size={14} className="text-white" />
                </div>
              </div>
              <div>
                {format === 'PDF' ? (
                  <>
                    <p className="text-[17px] font-black text-gray-900 tracking-tight">Report Opened</p>
                    <p className="text-[12px] text-gray-400 font-medium mt-1.5">Your report opened in a new tab.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Press <kbd className="bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono text-[10px]">Ctrl+P</kbd> to save as PDF.</p>
                  </>
                ) : (
                  <>
                    <p className="text-[17px] font-black text-gray-900 tracking-tight">Download Started</p>
                    <p className="text-[12px] text-gray-400 font-medium mt-1.5">
                      <span className="font-bold text-gray-600">{format} Report</span> saved to your downloads folder.
                    </p>
                  </>
                )}
              </div>
              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl text-[13px] font-black text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #162D4A 100%)' }}
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => { setStage('idle'); setProgress(0); }}
                  className="w-full py-2.5 rounded-2xl text-[12px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Export another format
                </button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}

interface EvidenceModalProps { readonly row: MatrixRow; readonly onClose: () => void; }

function EvidenceModal({ row, onClose }: EvidenceModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const weakCount = row.traceEvidence.filter(
    (ev) => Math.round(ev.similarityScore * 100) < 40,
  ).length;
  const avgSim = row.traceEvidence.length > 0
    ? Math.round(
        row.traceEvidence.reduce((sum, ev) => sum + ev.similarityScore, 0) /
        row.traceEvidence.length * 100,
      )
    : 0;

  let statusBadgeBg: string;
  let statusBadgeText: string;
  if (row.status === 'PASS') {
    statusBadgeBg = 'bg-emerald-500/15 border-emerald-500/25';
    statusBadgeText = 'text-emerald-400';
  } else if (row.status === 'WARN') {
    statusBadgeBg = 'bg-amber-500/15 border-amber-500/25';
    statusBadgeText = 'text-amber-400';
  } else {
    statusBadgeBg = 'bg-red-500/15 border-red-500/25';
    statusBadgeText = 'text-red-400';
  }

  const weakLabel = weakCount === 1 ? '1 weak link' : `${weakCount} weak links`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <dialog
        className="relative w-full max-w-3xl flex flex-col max-h-[88vh] rounded-3xl overflow-hidden shadow-2xl bg-transparent p-0 m-auto"
        open
        aria-modal="true"
      >
        {/* Dark hero header */}
        <div
          className="px-8 py-6 shrink-0"
          style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 60%, #1E3A5F 100%)' }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.25em] mb-2">Trace Evidence Report</p>
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-black text-white tracking-tight">{row.upstreamType}</span>
                <ChevronRight size={16} className="text-brand-gold/50" />
                <span className="text-[22px] font-black text-white tracking-tight">{row.downstreamType}</span>
              </div>
              <p className="text-[11px] text-white/35 font-semibold mt-1.5">
                Consistency analysis · {row.traceEvidence.length} evidence pairs evaluated
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${statusBadgeBg} ${statusBadgeText}`}>
                {row.status}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-all"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Alignment', value: formatScore(row.alignmentScore), color: getAlignTextClass(row.alignmentScore) },
              { label: 'Coverage', value: formatScore(row.coverage), color: 'text-white' },
              { label: 'Avg Similarity', value: `${avgSim}%`, color: getSimTextColor(avgSim) },
              { label: 'Weak Matches', value: String(weakCount), color: weakCount > 0 ? 'text-red-400' : 'text-emerald-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/[0.05] rounded-2xl px-4 py-3 border border-white/[0.07]">
                <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.18em]">{stat.label}</p>
                <p className={`text-xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3" style={{ backgroundColor: '#F1F5F9' }}>
          {row.traceEvidence.map((ev: TraceEvidence, i: number) => {
            const pct = Math.round(ev.similarityScore * 100);
            const isWeak = pct < 40;
            const simColor = getSimTextColor(pct);
            const simBg = getSimilarityColor(pct);
            const cardBorder = isWeak ? 'border-red-200' : 'border-gray-200/60';
            const cardBg = isWeak ? 'bg-red-50/50' : 'bg-white';
            return (
              <div key={ev.upstreamSection} className={`rounded-2xl border ${cardBorder} ${cardBg} overflow-hidden shadow-sm`}>
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100/80 bg-white/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-brand-navy/6 flex items-center justify-center text-[10px] font-black text-brand-navy/40 ring-1 ring-brand-navy/8">
                      {i + 1}
                    </span>
                    <span className="text-[11px] font-black text-brand-navy/40 uppercase tracking-widest">Match #{i + 1}</span>
                    {isWeak ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <AlertCircle size={9} />{'Weak Link'}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${simBg}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-[13px] font-black tabular-nums ${simColor}`}>{pct}%</span>
                    {isWeak ? (
                      <AlertCircle size={14} className="text-red-400" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    )}
                  </div>
                </div>
                {/* Section columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-gray-100">
                  <div className="p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500/80 mb-2.5 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-md bg-blue-500/10 inline-flex items-center justify-center text-blue-600 text-[9px] font-black">↑</span>
                      {row.upstreamType}
                    </p>
                    <p className="text-[12px] text-gray-700 leading-relaxed">{ev.upstreamSection}</p>
                  </div>
                  <div className="p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/80 mb-2.5 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-md bg-indigo-500/10 inline-flex items-center justify-center text-indigo-600 text-[9px] font-black">↓</span>
                      {row.downstreamType}
                    </p>
                    <p className="text-[12px] text-gray-700 leading-relaxed">{ev.downstreamSection}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-gray-400 font-semibold">
            {row.traceEvidence.length} pairs evaluated · {weakLabel}
          </p>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </dialog>
    </div>
  );
}

export const MatrixPage: React.FC = () => {
  const [selectedRow, setSelectedRow] = useState<MatrixRow | null>(null);
  const [showExport, setShowExport] = useState(false);
  const navigate = useNavigate();

  interface WorkspaceOption { id: string; name: string; projectTitle: string; }
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Fetch all groups — prefer the group that has audit results
  useEffect(() => {
    api.get('/api/projects')
      .then((res) => {
        const groups: WorkspaceOption[] = res.data.groups ?? [];
        setWorkspaces(groups);
        // Pick the first group that has audit results, otherwise fall back to first group
        const withAudit = groups.find((g: any) => g.auditResults?.length > 0);
        const best = withAudit ?? groups[0];
        if (best) setSelectedGroupId(best.id);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  interface RawLink {
    id: string;
    upstream: { type: string };
    downstream: { type: string };
    alignmentScore: number;
    status: 'PASS' | 'WARN' | 'FAIL';
    evidencePairs: Array<{ upstream: string; downstream: string; similarity: number }>;
  }

  interface RawGap {
    id?: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    description?: string;
    rootCause?: string;
    recommendation?: string;
    aiConfidence?: number;
    affectedArtifacts?: string[];
  }

  interface RawAudit {
    overallScore: number;
    readinessStatus: string;
    traceLinks: RawLink[];
    gaps: RawGap[];
  }

  const [audit, setAudit] = useState<RawAudit | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAudit = useCallback(async () => {
    if (!selectedGroupId) { setLoading(false); return; }
    setLoading(true);
    setAudit(null);
    try {
      const res = await api.get(`/api/audit/${selectedGroupId}/latest`);
      setAudit(res.data.auditResult ?? null);
    } catch (err) {
      console.error('MatrixPage fetchAudit error:', err);
    } finally { setLoading(false); }
  }, [selectedGroupId]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const matrixRows: MatrixRow[] = (audit?.traceLinks ?? []).map((link) => {
    const linkGaps = (audit?.gaps ?? []).filter((g) => g.severity === 'CRITICAL' || g.severity === 'HIGH');
    const criticalGaps = linkGaps.filter((g) => g.severity === 'CRITICAL').length;
    const warnings = linkGaps.filter((g) => g.severity === 'HIGH').length;
    const evidencePairs: TraceEvidence[] = (link.evidencePairs ?? []).map((ep) => ({
      upstreamSection: ep.upstream,
      downstreamSection: ep.downstream,
      similarityScore: ep.similarity,
    }));
    return {
      id: link.id,
      upstreamType: link.upstream.type,
      downstreamType: link.downstream.type,
      alignmentScore: link.alignmentScore,
      coverage: (link as any).coverageScore ?? link.alignmentScore,
      criticalGaps,
      warnings,
      status: link.status,
      traceEvidence: evidencePairs,
    };
  });

  const overallScore = audit?.overallScore ?? 0;
  const criticalTotal = (audit?.gaps ?? []).filter((g) => g.severity === 'CRITICAL').length;
  const warnTotal = (audit?.gaps ?? []).filter((g) => g.severity === 'HIGH').length;
  const partialPairs = matrixRows.filter((r) => r.status === 'WARN').length;
  const missingPairs = matrixRows.filter((r) => r.status === 'FAIL').length;

  const statCards = [
    { label: 'Critical Gaps', value: criticalTotal, icon: <AlertCircle size={20} />, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { label: 'Warnings', value: warnTotal, icon: <AlertTriangle size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'Partial Pairs', value: partialPairs, icon: <Layers size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Missing Pairs', value: missingPairs, icon: <XCircle size={20} />, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  ];

  const workspaceSelector = workspaces.length > 1 ? (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={selectedGroupId}
        onChange={(e) => setSelectedGroupId(e.target.value)}
        style={{
          appearance: 'none' as const,
          WebkitAppearance: 'none' as const,
          backgroundColor: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(212,175,55,0.35)',
          borderRadius: '12px',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 700,
          padding: '10px 40px 10px 16px',
          cursor: 'pointer',
          outline: 'none',
          minWidth: '0',
          width: '100%',
          maxWidth: '280px',
        }}
      >
        {workspaces.map((ws) => (
          <option key={ws.id} value={ws.id} style={{ backgroundColor: '#1E3A5F', color: '#fff' }}>
            {ws.projectTitle || ws.name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#D4AF37', pointerEvents: 'none' }} />
    </div>
  ) : null;

  if (loading) {
    return (
      <Layout title="Traceability Matrix" subtitle="AI-generated cross-document alignment scores and traceability pairs" badge="Audit Results" heroIcon={<Layers size={26} />} headerAction={workspaceSelector}>
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
            <Layers size={26} className="text-primary/30" />
          </div>
          <p className="text-sm font-semibold text-gray-400 animate-pulse">Fetching audit results…</p>
        </div>
      </Layout>
    );
  }

  if (!audit) {
    return (
      <Layout title="Traceability Matrix" subtitle="AI-generated cross-document alignment scores and traceability pairs" badge="Audit Results" heroIcon={<Layers size={26} />} headerAction={workspaceSelector}>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-2">
            <Layers size={36} className="text-primary/20" />
          </div>
          <p className="text-xl font-black text-brand-navy tracking-tight">No Audit Results Found</p>
          <p className="text-sm text-gray-400 font-medium max-w-xs leading-relaxed">
            Upload your project artifacts and run the traceability audit to generate cross-document alignment scores.
          </p>
          <Button onClick={() => navigate('/artifacts')} className="mt-2">
            Go to Artifacts → Run Audit
          </Button>
        </div>
      </Layout>
    );
  }

  const readiness = audit.readinessStatus;
  let readinessText: string;
  let readinessIcon: React.ReactNode;
  if (readiness === 'READY') {
    readinessText = 'Ready for Submission';
    readinessIcon = <CheckCircle2 size={16} className="text-success shrink-0" />;
  } else if (readiness === 'NEEDS_REVISION') {
    readinessText = 'Needs Revision';
    readinessIcon = <Info size={16} className="text-warning shrink-0" />;
  } else {
    readinessText = 'Critical Gaps Detected';
    readinessIcon = <AlertCircle size={16} className="text-critical shrink-0" />;
  }

  const criticalIssueText = criticalTotal === 0
    ? `All ${matrixRows.length} document pairs verified \u2014 no structural blockers found`
    : `${criticalTotal} critical issues and ${warnTotal} warnings require attention before submission`;

  let healthTierLabel: string;
  let healthTierColor: string;
  if (overallScore >= 80) {
    healthTierLabel = 'Excellent';
    healthTierColor = 'text-[#059669]';
  } else if (overallScore >= 60) {
    healthTierLabel = 'Caution';
    healthTierColor = 'text-brand-gold';
  } else {
    healthTierLabel = 'Critical';
    healthTierColor = 'text-red-500';
  }

  let readinessBgDark: string;
  let readinessIconBgDark: string;
  let readinessIconColorDark: string;
  if (readiness === 'READY') {
    readinessBgDark = 'bg-emerald-500/10 border border-emerald-500/20';
    readinessIconBgDark = 'bg-emerald-500/20';
    readinessIconColorDark = 'text-emerald-400';
  } else if (readiness === 'NEEDS_REVISION') {
    readinessBgDark = 'bg-amber-500/10 border border-amber-500/20';
    readinessIconBgDark = 'bg-amber-500/20';
    readinessIconColorDark = 'text-amber-400';
  } else {
    readinessBgDark = 'bg-red-500/10 border border-red-500/20';
    readinessIconBgDark = 'bg-red-500/20';
    readinessIconColorDark = 'text-red-400';
  }
  const readinessIconDark = React.cloneElement(
    readinessIcon as React.ReactElement<{ size?: number; className?: string }>,
    { size: 22, className: readinessIconColorDark },
  );

  return (
    <Layout
      title="Traceability Matrix"
      subtitle="AI-generated cross-document alignment scores and traceability pairs"
      badge="Audit Results"
      heroIcon={<Layers size={26} />}
      headerAction={workspaceSelector}
    >
      <div className="space-y-5">
        {/* ── SUMMARY HERO PANEL ── */}
        <div className="rounded-3xl overflow-hidden shadow-2xl shadow-brand-navy/15" style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 60%, #1E3A5F 100%)' }}>
          <div className="p-4 sm:p-6 lg:p-7">
            <div className="flex flex-col xl:flex-row items-stretch gap-4 sm:gap-6">
              {/* Gauge pod */}
              <div className="flex flex-col items-center justify-center bg-white rounded-2xl shadow-xl px-6 py-5 sm:px-8 sm:py-6 w-full xl:w-auto xl:min-w-[190px] shrink-0">
                <AlignmentGauge score={overallScore} />
                <div className="mt-3 text-center border-t border-gray-100 pt-3 w-full">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-navy/30">Health Tier</p>
                  <p className={`text-[13px] font-black mt-0.5 ${healthTierColor}`}>{healthTierLabel}</p>
                </div>
              </div>
              {/* Right column */}
              <div className="flex-1 flex flex-col gap-4">
                {/* Stat tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {statCards.map((s) => (
                    <div key={s.label} className="relative rounded-2xl bg-white/[0.04] border border-white/[0.07] p-5 overflow-hidden flex flex-col">
                      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full ${s.bg} opacity-40 pointer-events-none`} />
                      <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center ${s.color} mb-3 shrink-0`}>
                        {s.icon}
                      </div>
                      <p className={`text-4xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.15em] mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Readiness strip */}
                <div className={`rounded-2xl flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 px-4 py-4 sm:px-6 ${readinessBgDark}`}>
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${readinessIconBgDark}`}>
                      {readinessIconDark}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-[15px] font-black text-white tracking-tight">{readinessText}</p>
                      <p className="text-[11px] sm:text-[12px] text-white/40 font-medium mt-0.5 line-clamp-2 sm:truncate">{criticalIssueText}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => navigate('/diagnostics')}
                    className="flex-1 sm:flex-none text-center text-[11px] sm:text-[12px] font-black text-white/60 hover:text-brand-gold border border-white/10 hover:border-brand-gold/40 rounded-xl px-3 py-2.5 sm:px-4 transition-all duration-200"
                  >
                    View Gap Analysis →
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExport(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-[11px] sm:text-[12px] font-black text-white/60 hover:text-brand-gold border border-white/10 hover:border-brand-gold/40 rounded-xl px-3 py-2.5 sm:px-4 transition-all duration-200"
                  >
                    <Download size={13} />
                    Export Report
                  </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Threshold legend strip */}
          <div className="border-t border-white/[0.05] bg-white/[0.02] px-4 sm:px-7 py-3 sm:py-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-6 lg:gap-10">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.25em] whitespace-nowrap shrink-0">
              Thresholds
            </p>
            {[
              { range: '≥ 80%', title: 'Excellent', text: 'Trace integrity verified', color: 'text-emerald-400', dot: 'bg-emerald-500' },
              { range: '60–79%', title: 'Caution', text: 'Minor drift detected', color: 'text-amber-400', dot: 'bg-amber-500' },
              { range: '< 60%', title: 'Critical', text: 'High architectural risk', color: 'text-red-400', dot: 'bg-red-500' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${item.dot} shrink-0`} />
                <span className={`text-[12px] font-black ${item.color}`}>{item.title}</span>
                <span className="text-[10px] font-mono bg-white/[0.06] px-1.5 py-0.5 rounded-md text-white/35">{item.range}</span>
                <span className="text-[11px] text-white/25 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── MATRIX TABLE ── */}
        <Card padding="none" className="bg-white overflow-hidden">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100/80 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <h3 className="text-[17px] font-black text-brand-navy tracking-tight">Traceability Matrix</h3>
              <p className="text-[12px] text-brand-slate/60 font-semibold mt-0.5">Cross-reference analysis between adjacent engineering phases</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-brand-gold uppercase tracking-widest px-3 py-1.5 bg-brand-gold/10 rounded-full border border-brand-gold/20">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" aria-hidden="true"></span>{'Live Audit Data'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/50">
                  <th className="text-left px-8 py-4 text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">Artifact Pair</th>
                  <th className="text-right px-4 py-4 text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">Alignment</th>
                  <th className="text-right px-4 py-4 text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">Coverage</th>
                  <th className="text-center px-4 py-4 text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">Critical</th>
                  <th className="text-center px-4 py-4 text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">Warnings</th>
                  <th className="text-center px-6 py-4 text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {matrixRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    style={{ borderLeft: `3px solid ${getStatusBorderColor(row.status)}30` }}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-brand-navy/5 flex items-center justify-center text-brand-navy font-black text-xs ring-1 ring-brand-navy/10 group-hover:bg-brand-navy group-hover:text-white transition-all duration-200 shrink-0">
                          {row.upstreamType.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-black text-brand-navy uppercase tracking-tight">{row.upstreamType}</span>
                            <ChevronRight size={11} className="text-brand-navy/20" />
                            <span className="text-[13px] font-black text-brand-navy uppercase tracking-tight">{row.downstreamType}</span>
                          </div>
                          <span className="text-[11px] text-brand-slate/45 font-semibold">Consistency Check · {row.traceEvidence.length} evidence pairs</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[15px] font-black ${getAlignTextClass(row.alignmentScore)}`}>{formatScore(row.alignmentScore)}</span>
                        <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getAlignBgClass(row.alignmentScore)}`} style={{ width: `${row.alignmentScore}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right">
                      <span className="text-[14px] font-bold text-brand-navy/60">{formatScore(row.coverage)}</span>
                    </td>
                    <td className="px-4 py-5 text-center">
                      {row.criticalGaps > 0 ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 text-red-500 text-[13px] font-black ring-1 ring-red-100">
                          {row.criticalGaps}
                        </span>
                      ) : (
                        <span className="text-brand-navy/10 font-bold">—</span>
                      )}
                    </td>
                    <td className="px-4 py-5 text-center">
                      {row.warnings > 0 ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-50 text-amber-500 text-[13px] font-black ring-1 ring-amber-100">
                          {row.warnings}
                        </span>
                      ) : (
                        <span className="text-brand-navy/10 font-bold">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant={matrixStatusToBadge(row.status)} className="font-black text-[10px] tracking-widest px-3 py-1 uppercase">
                          {row.status}
                        </Badge>
                        <div className="w-7 h-7 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 group-hover:border-brand-gold group-hover:text-brand-gold transition-all duration-200">
                          <ChevronRight size={13} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {selectedRow && (
        <EvidenceModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}
      {showExport && audit && (
        <ExportModal
          onClose={() => setShowExport(false)}
          auditData={audit}
          projectTitle={workspaces.find((w) => w.id === selectedGroupId)?.projectTitle ?? workspaces.find((w) => w.id === selectedGroupId)?.name ?? 'Audit Report'}
        />
      )}
    </Layout>
  );
};
