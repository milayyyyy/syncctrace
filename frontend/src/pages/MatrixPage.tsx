import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, AlertCircle, AlertTriangle, CheckCircle2, Info, ChevronDown, Layers } from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { Card } from '../components/ui/Card';
import { Badge, matrixStatusToBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import type { MatrixRow, TraceEvidence } from '../types';
import { formatScore } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface GaugeProps { readonly score: number; }

function getGaugeColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#D97706';
  return '#DC2626';
}

function AlignmentGauge({ score }: GaugeProps) {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  const color = getGaugeColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="#F1F5F9" strokeWidth="9" />
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-none">{score.toFixed(1)}</span>
          <span className="text-[11px] text-gray-400 font-semibold mt-0.5">%</span>
        </div>
      </div>
      <p className="text-[12px] font-semibold text-gray-500 mt-2 tracking-tight">Overall Alignment</p>
    </div>
  );
}

interface SimilarityBarProps { readonly score: number; }

function getSimTextColor(pct: number): string {
  if (pct >= 70) return 'text-success';
  if (pct >= 40) return 'text-warning';
  return 'text-critical';
}

function getAlignTextClass(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-critical';
}

function getAlignBgClass(score: number): string {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-warning';
  return 'bg-critical';
}

function getSimilarityColor(pct: number): string {
  if (pct >= 70) return 'bg-success';
  if (pct >= 40) return 'bg-warning';
  return 'bg-critical';
}

function SimilarityBar({ score }: SimilarityBarProps) {
  const pct = Math.round(score * 100);
  const color = getSimilarityColor(pct);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

interface EvidenceModalProps { readonly row: MatrixRow; readonly onClose: () => void; }

function EvidenceModal({ row, onClose }: EvidenceModalProps) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Trace Evidence: ${row.upstreamType} → ${row.downstreamType}`}
      subtitle={`Alignment ${formatScore(row.alignmentScore)} · Coverage ${formatScore(row.coverage)}`}
      size="lg"
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
          {row.traceEvidence.map((ev: TraceEvidence, i: number) => {
          const pct = Math.round(ev.similarityScore * 100);
          const isWeak = pct < 40;
          const simColor = getSimTextColor(pct);
          return (
            <div
              key={ev.upstreamSection}
              className={`rounded-2xl border p-4 ${
                isWeak ? 'border-red-100 bg-red-50/60 ring-1 ring-red-100' : 'border-gray-100 bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.07em]">
                  Match #{i + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  {isWeak ? (
                    <AlertCircle size={13} className="text-critical" />
                  ) : (
                    <CheckCircle2 size={13} className="text-success" />
                  )}
                  <span className={`text-[12px] font-bold ${simColor}`}>
                    {pct}% similarity
                  </span>
                </div>
              </div>
              <SimilarityBar score={ev.similarityScore} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[0.07em] mb-1.5">
                    ↑ {row.upstreamType}
                  </p>
                  <p className="text-[12px] text-gray-700 leading-relaxed">{ev.upstreamSection}</p>
                </div>
                <div className="rounded-xl bg-white border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.07em] mb-1.5">
                    ↓ {row.downstreamType}
                  </p>
                  <p className="text-[12px] text-gray-700 leading-relaxed">{ev.downstreamSection}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

const statusIcon = {
  PASS: <CheckCircle2 size={14} className="text-success" />,
  WARN: <AlertTriangle size={14} className="text-warning" />,
  FAIL: <AlertCircle size={14} className="text-critical" />,
};

export const MatrixPage: React.FC = () => {
  const [selectedRow, setSelectedRow] = useState<MatrixRow | null>(null);
  const navigate = useNavigate();
  const { groupId } = useAuthStore();

  interface WorkspaceOption { id: string; name: string; projectTitle: string; }
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupId ?? '');

  // Fetch all groups
  useEffect(() => {
    api.get('/api/projects')
      .then((res) => {
        const groups: WorkspaceOption[] = res.data.groups ?? [];
        setWorkspaces(groups);
        if (!selectedGroupId && groups.length > 0) setSelectedGroupId(groups[0].id);
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
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
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
      setAudit(res.data.auditResult);
    } catch { /* no audit yet */ }
    finally { setLoading(false); }
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
      coverage: link.alignmentScore,
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
    { label: 'Critical Gaps', value: criticalTotal, color: 'text-critical', bg: 'bg-red-50', border: 'border-red-100' },
    { label: 'Warnings', value: warnTotal, color: 'text-warning', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Partial Pairs', value: partialPairs, color: 'text-primary', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Missing Pairs', value: missingPairs, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  ];

  if (loading) {
    return (
      <Layout title="Outcome Matrix" subtitle="AI-generated traceability analysis across document pairs">
        <div className="flex items-center justify-center py-20 text-gray-400">Loading audit data…</div>
      </Layout>
    );
  }

  if (!audit) {
    return (
      <Layout title="Outcome Matrix" subtitle="AI-generated traceability analysis across document pairs">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-gray-500">No audit results yet.</p>
          <Button onClick={() => navigate('/artifacts')}>Submit Artifacts &amp; Run Analysis</Button>
        </div>
      </Layout>
    );
  }

  const readiness = audit.readinessStatus;
  let readinessBg: string;
  let readinessText: string;
  let readinessIcon: React.ReactNode;
  if (readiness === 'READY') {
    readinessBg = 'bg-emerald-50 border-emerald-100';
    readinessText = 'Ready for Submission';
    readinessIcon = <CheckCircle2 size={16} className="text-success shrink-0" />;
  } else if (readiness === 'NEEDS_REVISION') {
    readinessBg = 'bg-amber-50 border-amber-100';
    readinessText = 'Needs Revision';
    readinessIcon = <Info size={16} className="text-warning shrink-0" />;
  } else {
    readinessBg = 'bg-red-50 border-red-100';
    readinessText = 'Critical Gaps Detected';
    readinessIcon = <AlertCircle size={16} className="text-critical shrink-0" />;
  }

  return (
    <Layout
      title="Outcome Matrix"
      subtitle="AI-generated traceability analysis across document pairs"
      headerAction={
        <Button variant="outline" size="sm" onClick={() => navigate('/diagnostics')}>
          View AI Diagnostics →
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Workspace selector */}
        {workspaces.length > 1 && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm max-w-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Layers size={15} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.06em] mb-1">Workspace</p>
              <div className="relative">
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full appearance-none pr-8 py-0 border-0 bg-transparent text-[13px] font-semibold text-gray-900 focus:outline-none cursor-pointer"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}{ws.projectTitle ? ` — ${ws.projectTitle}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Top summary row */}
        <div className="grid grid-cols-5 gap-4">
          {/* Gauge */}
          <Card className="col-span-1 flex items-center justify-center py-6 hover:scale-105 active:scale-95 transition-transform duration-300 shadow-md">
            <AlignmentGauge score={overallScore} />
          </Card>

          {/* Stat cards */}
          <div className="col-span-4 grid grid-cols-4 gap-4">
            {statCards.map((s) => (
              <Card key={s.label} className={`${s.bg} border ${s.border} hover:shadow-md transition-shadow`} padding="md">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.06em] mb-1">{s.label}</p>
                <p className={`text-[28px] font-extrabold tracking-tight leading-none ${s.color}`}>{s.value}</p>
              </Card>
            ))}
            {/* Readiness status */}
            <Card className={`col-span-4 ${readinessBg} ring-1 ring-current/10`} padding="sm">
              <div className="flex items-center gap-3 px-2">
                {readinessIcon}
                <div>
                  <p className="text-[13px] font-bold text-gray-800 uppercase tracking-wider">{readinessText}</p>
                  <p className="text-[12px] text-gray-500 font-medium">
                    {criticalTotal} critical gap{criticalTotal === 1 ? '' : 's'} detected. Click any row below to inspect trace evidence.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Alignment Rating Guidelines Legend */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100 shadow-sm leading-snug">
          {[
            { range: '>= 80%', title: 'Excellent', text: 'Sequential traces check out. Clear matching evidence found.', color: 'text-success', bg: 'bg-emerald-500/10' },
            { range: '60% - 79%', title: 'Caution', text: 'Minor divergence or partial implementation gap found.', color: 'text-warning', bg: 'bg-amber-500/10' },
            { range: '< 60%', title: 'Critical', text: 'High risk of omission. Terminology drift or missing links.', color: 'text-critical', bg: 'bg-red-500/10' },
          ].map((item) => (
            <div key={item.title} className="flex gap-2.5 items-start">
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <span className={`text-[10px] font-black ${item.color}`}>{item.range}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{item.title}</p>
                <p className="text-[11px] text-slate-500 font-medium tracking-tight mt-0.5">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Matrix table */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">Traceability Matrix</h3>
            <p className="text-[12px] text-gray-400 mt-0.5 font-medium">Click any row to inspect trace evidence</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/80">
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">Artifact Pair</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">Alignment</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">Coverage</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">Critical</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">Warnings</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {matrixRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-semibold text-gray-900">{row.upstreamType}</span>
                        <ChevronRight size={13} className="text-gray-300" />
                        <span className="text-[13.5px] font-semibold text-gray-900">{row.downstreamType}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[13px] font-bold ${getAlignTextClass(row.alignmentScore)}`}>
                          {formatScore(row.alignmentScore)}
                        </span>
                        <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getAlignBgClass(row.alignmentScore)}`}
                            style={{ width: `${row.alignmentScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-[13px] text-gray-600 font-medium">{formatScore(row.coverage)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {row.criticalGaps > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-red-50 ring-1 ring-red-200 text-critical text-[11px] font-bold">
                          {row.criticalGaps}
                        </span>
                      ) : (
                        <span className="text-gray-200">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {row.warnings > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-50 ring-1 ring-amber-200 text-warning text-[11px] font-bold">
                          {row.warnings}
                        </span>
                      ) : (
                        <span className="text-gray-200">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {statusIcon[row.status]}
                        <Badge variant={matrixStatusToBadge(row.status)}>{row.status}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight size={15} className="text-gray-200 group-hover:text-primary transition-colors" />
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
    </Layout>
  );
};
