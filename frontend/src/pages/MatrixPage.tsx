import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCode,
  Filter,
  Info,
  Layers,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import type { MatrixRow, TraceEvidence } from '../types';
import { Layout } from '../components/shared/Layout';
import { ExportModal } from '../components/shared/ExportModal';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useLatestAudit, useWorkspacePicker } from '../hooks/queries';
import type { ApiAudit, ApiTraceLink } from '../types/api';
import { toExportAudit } from '../services/export';
import {
  buildChainMatrixRows,
  filterChainRows,
  type ChainMatrixRow,
  type DisplayStatus,
} from '../lib/traceabilityMatrix';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATUS_TABS: Array<{ id: 'ALL' | DisplayStatus; label: string; icon: React.ReactNode }> = [
  { id: 'ALL', label: 'All Status', icon: null },
  { id: 'ALIGNED', label: 'Aligned', icon: <CheckCircle2 size={13} className="text-emerald-600" /> },
  { id: 'PARTIAL', label: 'Partial', icon: <Info size={13} className="text-blue-500" /> },
  { id: 'MISSING', label: 'Missing', icon: <XCircle size={13} className="text-red-500" /> },
  { id: 'WARNING', label: 'Warning', icon: <AlertTriangle size={13} className="text-amber-500" /> },
];

function getGaugeColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#D4AF37';
  return '#B91C1C';
}

function AlignmentGauge({ score }: { readonly score: number }) {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  const color = getGaugeColor(score);

  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="relative w-36 h-36 sm:w-40 sm:h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="#E2E8F0" strokeWidth="10" />
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
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl sm:text-4xl font-black text-[#1E3A5F] tracking-tight">{score.toFixed(1)}%</span>
          <span className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-[0.2em]">Alignment</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Health Tier</p>
        <p className={`text-sm font-black mt-0.5 ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
          {score >= 80 ? 'Excellent' : score >= 60 ? 'Caution' : 'Critical'}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { readonly status: DisplayStatus }) {
  if (status === 'ALIGNED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold ring-1 ring-emerald-200">
        <CheckCircle2 size={13} /> Aligned
      </span>
    );
  }
  if (status === 'PARTIAL') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold ring-1 ring-blue-200">
        <Info size={13} /> Partial
      </span>
    );
  }
  if (status === 'WARNING') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold ring-1 ring-amber-200">
        <AlertTriangle size={13} /> Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-[11px] font-bold ring-1 ring-red-200">
      <XCircle size={13} /> Missing
    </span>
  );
}

function ImplementationCellView({ cell }: { readonly cell: ChainMatrixRow['implementation'] }) {
  if (cell.kind === 'file') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1E3A5F]">
        <FileCode size={14} className="text-slate-400 shrink-0" />
        <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">{cell.label}</span>
      </span>
    );
  }
  if (cell.kind === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
        <FileCode size={14} className="shrink-0" />
        <span className="font-mono text-[11px] bg-amber-50 px-2 py-0.5 rounded-md ring-1 ring-amber-200">{cell.label}</span>
      </span>
    );
  }
  return <span className="text-[12px] text-slate-400 italic">{cell.label}</span>;
}

function getSimTextColor(pct: number): string {
  if (pct >= 70) return 'text-brand-emerald';
  if (pct >= 40) return 'text-brand-gold';
  return 'text-brand-coral';
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

  const weakCount = row.traceEvidence.filter((ev) => Math.round(ev.similarityScore * 100) < 40).length;
  const avgSim = row.traceEvidence.length > 0
    ? Math.round(row.traceEvidence.reduce((sum, ev) => sum + ev.similarityScore, 0) / row.traceEvidence.length * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <dialog className="relative w-full max-w-3xl flex flex-col max-h-[88vh] rounded-2xl overflow-hidden shadow-2xl bg-white p-0 m-auto" open aria-modal="true">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Trace Evidence</p>
            <h3 className="text-lg font-black text-[#1E3A5F]">{row.upstreamType} → {row.downstreamType}</h3>
            <p className="text-[12px] text-slate-500 mt-1">{row.traceEvidence.length} evidence pairs</p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3 bg-slate-50">
          {row.traceEvidence.map((ev: TraceEvidence, i: number) => {
            const pct = Math.round(ev.similarityScore * 100);
            return (
              <div key={`${ev.upstreamSection}-${i}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match #{i + 1}</span>
                  <span className={`text-sm font-black ${getSimTextColor(pct)}`}>{pct}%</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-[12px] text-slate-700 leading-relaxed">
                  <div><p className="text-[9px] font-black text-blue-600 uppercase mb-1">Upstream</p>{ev.upstreamSection}</div>
                  <div><p className="text-[9px] font-black text-indigo-600 uppercase mb-1">Downstream</p>{ev.downstreamSection}</div>
                </div>
                <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getSimilarityColor(pct)}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-white">
          <p className="text-[11px] text-slate-500">Avg similarity {avgSim}% · {weakCount} weak links</p>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </dialog>
    </div>
  );
}

export const MatrixPage: React.FC = () => {
  const [selectedRow, setSelectedRow] = useState<MatrixRow | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | DisplayStatus>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();

  const {
    workspaces,
    selectedGroupId,
    selectedGroup,
    selectGroup,
    isInitialLoad,
  } = useWorkspacePicker({ preferGroupWithAudit: true });
  const auditQuery = useLatestAudit(selectedGroupId);
  const audit = (auditQuery.data ?? selectedGroup?.auditResults?.[0] ?? null) as ApiAudit | null;
  const loading = isInitialLoad && !audit;

  const chainRows = useMemo(
    () => buildChainMatrixRows((audit?.traceLinks ?? []) as ApiTraceLink[]),
    [audit?.traceLinks],
  );

  const filteredRows = useMemo(
    () => filterChainRows(chainRows, statusFilter, search),
    [chainRows, statusFilter, search],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [statusFilter, search, selectedGroupId]);

  const overallScore = audit?.overallScore ?? 0;
  const criticalTotal = (audit?.gaps ?? []).filter((g) => g.severity === 'CRITICAL').length;
  const warnTotal = (audit?.gaps ?? []).filter((g) => g.severity === 'HIGH').length;
  const partialCount = chainRows.filter((r) => r.displayStatus === 'PARTIAL').length;
  const missingCount = chainRows.filter((r) => r.displayStatus === 'MISSING').length;

  const workspaceSelector = workspaces.length > 1 ? (
    <div className="relative inline-flex items-center">
      <select
        value={selectedGroupId}
        onChange={(e) => selectGroup(e.target.value)}
        className="appearance-none rounded-xl border border-[rgba(212,175,55,0.35)] bg-white/10 text-white text-[13px] font-bold py-2.5 pl-4 pr-10 outline-none cursor-pointer min-w-[200px] max-w-[280px]"
      >
        {workspaces.map((ws) => (
          <option key={ws.id} value={ws.id} className="bg-[#1E3A5F] text-white">
            {ws.projectTitle || ws.name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none" />
    </div>
  ) : null;

  if (loading) {
    return (
      <Layout title="Traceability Matrix" subtitle="Track requirements from objectives through to code" badge="Audit" heroIcon={<Layers size={26} />} headerAction={workspaceSelector}>
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          <div className="w-10 h-10 border-2 border-slate-200 border-t-[#1E3A5F] rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Loading traceability matrix…</p>
        </div>
      </Layout>
    );
  }

  if (!audit) {
    return (
      <Layout title="Traceability Matrix" subtitle="Track requirements from objectives through to code" badge="Audit" heroIcon={<Layers size={26} />} headerAction={workspaceSelector}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <Layers size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-lg font-black text-[#1E3A5F]">No audit results yet</p>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">Upload artifacts and run the traceability audit to populate the matrix.</p>
          <Button onClick={() => navigate('/artifacts')} className="mt-6">Go to Artifacts</Button>
        </div>
      </Layout>
    );
  }

  const readiness = audit.readinessStatus;
  const readinessText = readiness === 'READY'
    ? 'Ready for Submission'
    : readiness === 'NEEDS_REVISION'
      ? 'Needs Revision'
      : 'Critical Gaps Detected';
  const readinessSub = criticalTotal === 0
    ? 'All critical issues resolved — no structural blockers found.'
    : `${criticalTotal} critical and ${warnTotal} high-severity gaps need attention before submission.`;

  return (
    <Layout
      title="Traceability Matrix"
      subtitle="Track project requirements from objectives through to code implementation"
      badge="Audit"
      heroIcon={<Layers size={26} />}
      headerAction={workspaceSelector}
    >
      <div className="space-y-5 pb-6">
        {/* Summary panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">
            <AlignmentGauge score={overallScore} />
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Critical Items', value: criticalTotal, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: <AlertCircle size={18} className="text-red-500" /> },
                  { label: 'Warnings', value: warnTotal, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: <AlertTriangle size={18} className="text-amber-500" /> },
                  { label: 'Partial Items', value: partialCount, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: <Info size={18} className="text-blue-500" /> },
                  { label: 'Missing Items', value: missingCount, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: <XCircle size={18} className="text-slate-400" /> },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-xl border ${stat.border} ${stat.bg} px-4 py-4`}>
                    <div className="flex items-center gap-2 mb-2">{stat.icon}</div>
                    <p className={`text-3xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3.5">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-emerald-900">{readinessText}</p>
                    <p className="text-[12px] text-emerald-700/80 mt-0.5">{readinessSub}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/diagnostics')}
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    View Gap Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExport(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E3A5F] text-white text-[12px] font-bold hover:bg-[#162D4A] transition-colors"
                  >
                    <Download size={14} />
                    Export Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Matrix table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
                      active
                        ? 'bg-[#1E3A5F] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-56">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-[#1E3A5F]/40 focus:ring-2 focus:ring-[#1E3A5F]/10"
                />
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <Filter size={14} />
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Status', 'Proposal Objective', 'SRS Requirement', 'SDD Component', 'SPMP Deliverable', 'STD Coverage', 'Implementation (Code)'].map((col) => (
                    <th key={col} className="text-left px-4 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">
                      No rows match your filters.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRow(row.matrixRow)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        <StatusBadge status={row.displayStatus} />
                      </td>
                      <td className="px-4 py-4 align-top text-[13px] font-semibold text-[#1E3A5F] max-w-[200px]">{row.proposalObjective}</td>
                      <td className="px-4 py-4 align-top text-[12px] text-slate-700 max-w-[200px] leading-snug">{row.srsRequirement}</td>
                      <td className="px-4 py-4 align-top text-[12px] text-slate-600 max-w-[180px]">
                        {row.sddComponent ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-4 align-top text-[12px] text-slate-600 max-w-[180px]">
                        {row.spmpDeliverable ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-4 align-top text-[12px] text-slate-600 max-w-[180px]">
                        {row.stdCoverage ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-4 align-top max-w-[200px]">
                        <ImplementationCellView cell={row.implementation} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <span className="font-semibold">{pageSize} per page</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-700 outline-none"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-slate-400">· {filteredRows.length} rows</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-40 hover:bg-white"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`min-w-8 h-8 px-2 rounded-lg text-[12px] font-bold ${
                      pageNum === currentPage
                        ? 'bg-[#1E3A5F] text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-40 hover:bg-white"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedRow && <EvidenceModal row={selectedRow} onClose={() => setSelectedRow(null)} />}
      {showExport && audit && (
        <ExportModal
          onClose={() => setShowExport(false)}
          auditData={toExportAudit(audit)}
          projectTitle={workspaces.find((w) => w.id === selectedGroupId)?.projectTitle ?? workspaces.find((w) => w.id === selectedGroupId)?.name ?? 'Audit Report'}
        />
      )}
    </Layout>
  );
};
