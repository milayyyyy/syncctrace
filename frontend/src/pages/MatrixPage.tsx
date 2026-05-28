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
import { useAuthStore } from '../stores/authStore';
import { ExportModal, type ExportAudit } from '../components/shared/ExportModal';

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
  const { groupId } = useAuthStore();

  interface WorkspaceOption { id: string; name: string; projectTitle: string; auditResults?: unknown[]; }
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Fetch all groups — prefer the group that has audit results
  useEffect(() => {
    api.get('/api/projects')
      .then((res) => {
        const groups: WorkspaceOption[] = res.data.groups ?? [];
        setWorkspaces(groups);
        // Pick the first group that has audit results, otherwise fall back to first group
        const activeGroup = groups.find((g) => g.id === groupId);
        const withAudit = groups.find((g) => (g.auditResults?.length ?? 0) > 0);
        const best = activeGroup ?? withAudit ?? groups[0];
        if (best) setSelectedGroupId(best.id);
      })
      .catch(() => {});
  }, [groupId]);

  interface RawLink {
    id: string;
    upstream: { type: string };
    downstream: { type: string };
    alignmentScore: number;
    coverageScore?: number;
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
      coverage: link.coverageScore ?? link.alignmentScore,
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
