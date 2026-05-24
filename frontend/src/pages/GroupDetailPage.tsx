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
  Brain,
  Lightbulb,
  Target,
  Users,
} from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { Card } from '../components/ui/Card';
import { Badge, severityToBadge, readinessToBadge, readinessLabel, matrixStatusToBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import type { Severity, ReadinessStatus, MatrixRow, TraceEvidence } from '../types';
import { formatDate, formatScore } from '../lib/utils';
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

interface ExportModalProps { readonly onClose: () => void; }

function ExportModal({ onClose }: ExportModalProps) {
  const [stage, setStage] = useState<'idle' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setStage('processing');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((v) => {
        if (v >= 100) {
          clearInterval(interval);
          setStage('done');
          return 100;
        }
        return v + 20;
      });
    }, 450);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Export Audit Report"
      subtitle="Generate a comprehensive PDF audit report for this group"
      size="sm"
      footer={
        stage === 'done' ? (
          <>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="primary" className="text-white">
              <Download size={15} />
              Download PDF
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={onClose} disabled={stage === 'processing'}>
            Cancel
          </Button>
        )
      }
    >
      {stage === 'idle' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 font-medium">
            The report will include:
          </p>
          <ul className="space-y-2.5">
            {[
              'Full traceability matrix with alignment scores',
              'All detected gaps with severity ratings',
              'AI root cause analysis and recommendations',
              'Audit timestamp and readiness status',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[12.5px] text-gray-700 font-medium">
                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <Button className="w-full text-white" onClick={handleExport}>
              <Download size={15} />
              Generate PDF Report
            </Button>
          </div>
        </div>
      )}
      {stage === 'processing' && (
        <div className="py-8 space-y-4 text-center">
          <Spinner size="lg" label="" className="mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Generating report... {progress}%</h3>
          <div className="h-1.5 bg-slate-100 rounded-full max-w-xs mx-auto overflow-hidden border border-slate-200/40">
            <div className="h-full bg-gradient-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400">
            Compiling traceability data and AI analysis…
          </p>
        </div>
      )}
      {stage === 'done' && (
        <div className="py-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <p className="text-base font-bold text-slate-900 mb-1">Report Ready</p>
          <p className="text-sm text-gray-400 font-medium">
            Your audit report has been generated (2.4 MB PDF).
          </p>
        </div>
      )}
    </Modal>
  );
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#D97706';
  return '#DC2626';
}

function getAlignTextClass(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-critical';
}

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedGap, setSelectedGap] = useState<ApiGap | null>(null);
  const [selectedRow, setSelectedRow] = useState<MatrixRow | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [group, setGroup] = useState<ApiGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/projects/${id}`)
      .then((res) => setGroup(res.data.group))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Layout title="Group Detail">
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout title="Group Not Found">
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">The requested group could not be found.</p>
          <Button onClick={() => navigate('/faculty')}>← Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  const latestAudit: ApiAudit | undefined = group.auditResults[0];
  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const gaps: ApiGap[] = [...(latestAudit?.gaps ?? [])].sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));
  const healthScore = latestAudit?.overallScore ?? 0;
  const readinessStatus: ReadinessStatus = latestAudit?.readinessStatus ?? 'NEEDS_REVISION';

  const criticalGaps = gaps.filter((g) => g.severity === 'CRITICAL').length;
  const warnings = gaps.filter((g) => g.severity === 'HIGH').length;
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
      subtitle={`Team ${group.teamCode} · Last audited ${latestAudit ? formatDate(latestAudit.auditedAt) : 'never'}`}
      headerAction={
        <div className="flex items-center gap-3">
          <Badge variant={readinessToBadge(readinessStatus)}>
            {readinessLabel(readinessStatus)}
          </Badge>
          <Button size="sm" onClick={() => setShowExport(true)}>
            <Download size={14} />
            Export Report
          </Button>
        </div>
      }
    >
      {/* Back button */}
      <button
        onClick={() => navigate('/faculty')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="space-y-6">
        {/* Project info + members */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{group.projectTitle}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{group.teamCode}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: getScoreTextColor(healthScore) }}>
                  {healthScore.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">Health Score</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Critical Gaps', value: criticalGaps, color: 'text-critical', bg: 'bg-red-50 ring-1 ring-red-100' },
                { label: 'Warnings', value: warnings, color: 'text-warning', bg: 'bg-amber-50 ring-1 ring-amber-100' },
                { label: 'Partial Pairs', value: matrixRows.filter((r) => r.status === 'WARN').length, color: 'text-primary', bg: 'bg-blue-50 ring-1 ring-blue-100' },
                { label: 'Missing Pairs', value: matrixRows.filter((r) => r.status === 'FAIL').length, color: 'text-gray-500', bg: 'bg-slate-50 ring-1 ring-slate-100' },
              ].map((s) => (
                <div key={s.label} className={`text-center p-3 rounded-xl ${s.bg}`}>
                  <p className={`text-[22px] font-extrabold tracking-tight leading-none ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-gray-400 mt-1 font-semibold">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Users size={15} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Team Members</h3>
            </div>
            <div className="space-y-2.5">
              {group.members.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-800">{m.name}</p>
                    <p className="text-[10px] text-gray-400">{m.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Traceability Matrix */}
        {matrixRows.length > 0 && (
          <Card padding="none">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-[14px] font-bold text-gray-900 tracking-tight">Traceability Matrix</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/80">
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">Artifact Pair</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">Alignment</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">Coverage</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {matrixRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(selectedRow?.id === row.id ? null : row)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        {row.upstreamType}
                        <ChevronRight size={13} className="text-gray-400" />
                        {row.downstreamType}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-sm font-bold ${getAlignTextClass(row.alignmentScore)}`}>
                        {formatScore(row.alignmentScore)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-gray-600">{formatScore(row.coverage)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant={matrixStatusToBadge(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight size={14} className="text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Gaps + Diagnostic Panel */}
        {gaps.length > 0 && (
          <div className="grid grid-cols-5 gap-5">
            {/* Gap list */}
            <div className="col-span-2 space-y-2.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Detected Gaps ({gaps.length})
              </p>
              {gaps.map((gap) => (
                <button
                  key={gap.id}
                  type="button"
                  onClick={() => setSelectedGap(selectedGap?.id === gap.id ? null : gap)}
                  className={`w-full text-left p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                    selectedGap?.id === gap.id
                      ? 'border-primary/30 bg-primary/[0.04] ring-1 ring-primary/20'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">{severityIcon[gap.severity]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={severityToBadge(gap.severity)}>{gap.severity}</Badge>
                        <span className="text-[10px] text-gray-400">{gap.severity}</span>
                      </div>
                      <p className="text-[12px] text-gray-600 leading-snug line-clamp-2 font-medium">{gap.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Diagnostic detail */}
            <div className="col-span-3">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={16} className="text-ai" />
                  <p className="text-sm font-semibold text-gray-900">AI Diagnostic Panel</p>
                </div>
                {selectedGap ? (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant={severityToBadge(selectedGap.severity)}>{selectedGap.severity}</Badge>
                          <span className="text-xs text-gray-500">{selectedGap.severity}</span>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">{selectedGap.description}</p>
                    </div>
                    <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-4 ring-1 ring-orange-100/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Target size={13} className="text-warning" />
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.07em]">Root Cause</p>
                      </div>
                      <p className="text-[12px] text-orange-900 leading-relaxed font-medium">{selectedGap.rootCause}</p>
                    </div>
                    <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4 ring-1 ring-purple-100/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb size={13} className="text-ai" />
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-[0.07em]">AI Recommendation</p>
                      </div>
                      <p className="text-[12px] text-purple-900 leading-relaxed font-medium">{selectedGap.recommendation}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    <Brain size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Select a gap to view analysis</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </Layout>
  );
};
