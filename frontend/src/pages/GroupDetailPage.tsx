import React, { useCallback, useRef, useState } from 'react';
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
  FileText,
  ClipboardList,
} from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { ExportModal } from '../components/shared/ExportModal';
import { Card } from '../components/ui/Card';
import { Badge, severityToBadge, readinessToBadge, readinessLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import type { Severity, ReadinessStatus, MatrixRow, TraceEvidence } from '../types';
import { toExportAudit } from '../services/export';
import { useProject } from '../hooks/queries';
import type { ApiGap, ApiTraceLink } from '../types/api';

interface ApiLink extends ApiTraceLink {
  evidencePairs: Array<{ upstream: string; downstream: string; similarity: number }>;
}

const DOC_LABELS: Record<string, string> = {
  PROPOSAL: 'Proposal',
  SRS: 'Requirements (SRS)',
  SDD: 'Design (SDD)',
  SPMP: 'Project Plan (SPMP)',
  STD: 'Test Document (STD)',
  SOURCE_CODE: 'Source Code',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const severityIcon: Record<Severity, React.ReactNode> = {
  CRITICAL: <AlertCircle size={18} className="text-red-600" />,
  HIGH: <AlertTriangle size={18} className="text-orange-500" />,
  MEDIUM: <Info size={18} className="text-amber-500" />,
  LOW: <CheckCircle2 size={18} className="text-blue-500" />,
};

function docLabel(type: string): string {
  return DOC_LABELS[type] ?? type.replaceAll('_', ' ');
}

function linkStatusLabel(status: string): { label: string; className: string } {
  if (status === 'PASS') {
    return { label: 'Good', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' };
  }
  if (status === 'WARN') {
    return { label: 'Needs review', className: 'bg-amber-50 text-amber-800 ring-amber-200' };
  }
  return { label: 'Action needed', className: 'bg-red-50 text-red-800 ring-red-200' };
}

function scoreColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#B45309';
  return '#B91C1C';
}

function GapDetailPanel({ gap, onClose }: { readonly gap: ApiGap; readonly onClose: () => void }) {
  return (
    <Card padding="none" className="overflow-hidden border border-slate-200 shadow-lg rounded-2xl bg-white">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500 mb-1">Issue details</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={severityToBadge(gap.severity)}>{SEVERITY_LABELS[gap.severity]}</Badge>
            {gap.affectedArtifacts?.map((a) => (
              <span key={a} className="text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md ring-1 ring-slate-200">
                {docLabel(a)}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          aria-label="Close issue details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">What was found</p>
          <p className="text-base text-slate-800 leading-relaxed">{gap.description}</p>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-amber-700" />
            <p className="text-sm font-semibold text-amber-900">Why this happened</p>
          </div>
          <p className="text-sm text-amber-950 leading-relaxed">{gap.rootCause}</p>
        </div>

        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={16} className="text-emerald-700" />
            <p className="text-sm font-semibold text-emerald-900">Suggested fix for the team</p>
          </div>
          <p className="text-sm text-emerald-950 leading-relaxed">{gap.recommendation}</p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-0.5">AI confidence</p>
            <p className="font-semibold text-slate-800">{(gap.aiConfidence * 100).toFixed(0)}%</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 mb-0.5">Reported on</p>
            <p className="font-semibold text-slate-800">
              {gap.createdAt
                ? new Date(gap.createdAt).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TeamInfoPanel({ group }: { readonly group: NonNullable<ReturnType<typeof useProject>['data']> }) {
  const lead = group.members[0];
  const members = group.members.slice(1);

  return (
    <Card className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-[#1E3A5F] flex items-center justify-center text-[#D4AF37]">
          <Users size={22} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Team information</h3>
          <p className="text-sm text-slate-500">Team code: <span className="font-semibold text-slate-700">{group.teamCode}</span></p>
        </div>
      </div>

      {lead && (
        <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Team lead</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-sm font-bold">
              {lead.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
              <p className="text-sm text-slate-500 truncate">{lead.email}</p>
            </div>
          </div>
        </div>
      )}

      {members.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Team members</p>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                  {m.name.charAt(0)}
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedGap, setSelectedGap] = useState<ApiGap | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [gapFilter, setGapFilter] = useState<Severity | 'ALL'>('ALL');
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const { data: group, isPending: loading } = useProject(id);

  const selectGap = useCallback((gap: ApiGap) => {
    setSelectedGap(gap);
    requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const latestAudit = group?.auditResults[0];
  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const allGaps: ApiGap[] = [...(latestAudit?.gaps ?? [])].sort(
    (a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99),
  );
  const gaps = allGaps.filter((g) => gapFilter === 'ALL' || g.severity === gapFilter);

  if (loading) {
    return (
      <Layout title="Group Detail" badge="Faculty" heroIcon={<Users size={26} />}>
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout title="Group Not Found" badge="Faculty" heroIcon={<Users size={26} />}>
        <div className="text-center py-20">
          <p className="text-slate-600 mb-4">This team could not be found.</p>
          <Button onClick={() => navigate('/faculty')}>← Back to dashboard</Button>
        </div>
      </Layout>
    );
  }

  const healthScore = latestAudit?.overallScore ?? 0;
  const readinessStatus: ReadinessStatus = latestAudit?.readinessStatus ?? 'NEEDS_REVISION';
  const criticalGaps = allGaps.filter((g) => g.severity === 'CRITICAL').length;
  const highGaps = allGaps.filter((g) => g.severity === 'HIGH').length;
  const mediumGaps = allGaps.filter((g) => g.severity === 'MEDIUM').length;
  const exportAudit = latestAudit ? toExportAudit(latestAudit) : null;

  const matrixRows: MatrixRow[] = (latestAudit?.traceLinks ?? []).map((link: ApiLink) => ({
    id: link.id,
    upstreamType: link.upstream.type,
    downstreamType: link.downstream.type,
    alignmentScore: link.alignmentScore,
    coverage: link.alignmentScore,
    criticalGaps,
    warnings: highGaps,
    status: link.status,
    traceEvidence: (link.evidencePairs ?? []).map((ep): TraceEvidence => ({
      upstreamSection: ep.upstream,
      downstreamSection: ep.downstream,
      similarityScore: ep.similarity,
    })),
  }));

  const healthLabel = healthScore >= 80 ? 'Strong alignment' : healthScore >= 60 ? 'Needs improvement' : 'Significant gaps';

  return (
    <Layout
      title={group.projectTitle}
      subtitle={`Team ${group.teamCode} — Capstone document review`}
      badge="Faculty"
      heroIcon={<ClipboardList size={26} />}
      headerAction={
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={readinessToBadge(readinessStatus)} dot>
            {readinessLabel(readinessStatus)}
          </Badge>
          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] text-[#1E3A5F] rounded-xl text-sm font-semibold hover:bg-[#c9a227] transition-colors shadow-sm"
          >
            <Download size={16} />
            Export report
          </button>
        </div>
      }
    >
      {/* Top summary bar */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between mb-8">
        <button
          type="button"
          onClick={() => navigate('/faculty')}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#1E3A5F] transition-colors w-fit"
        >
          <ArrowLeft size={18} />
          Back to faculty dashboard
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Critical issues', value: criticalGaps, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'High priority', value: highGaps, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Medium priority', value: mediumGaps, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Overall score', value: `${healthScore.toFixed(0)}%`, color: '', bg: 'bg-slate-50', score: true },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl px-4 py-3 ${stat.bg} border border-slate-100`}>
              <p className="text-xs font-medium text-slate-500 mb-1">{stat.label}</p>
              {'score' in stat && stat.score ? (
                <p className="text-2xl font-bold" style={{ color: scoreColor(healthScore) }}>{stat.value}</p>
              ) : (
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-8 -mt-4">
        Overall alignment: <span className="font-semibold text-slate-800">{healthLabel}</span>
        {latestAudit?.auditedAt && (
          <> · Last reviewed {new Date(latestAudit.auditedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</>
        )}
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: alignment table + issues list */}
        <div className="xl:col-span-7 space-y-8">
          {/* Document alignment */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center text-[#D4AF37]">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Document alignment</h2>
                <p className="text-sm text-slate-500">How well each project document connects to the next</p>
              </div>
            </div>

            <Card padding="none" className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[480px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-sm font-semibold text-slate-700">Documents compared</th>
                      <th className="px-4 py-3.5 text-sm font-semibold text-slate-700 text-center">Score</th>
                      <th className="px-5 py-3.5 text-sm font-semibold text-slate-700 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {matrixRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-500">
                          No alignment data yet. The team has not completed an audit.
                        </td>
                      </tr>
                    ) : (
                      matrixRows.map((row) => {
                        const status = linkStatusLabel(row.status);
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/80">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-slate-800">{docLabel(row.upstreamType)}</span>
                                <ChevronRight size={14} className="text-slate-400 shrink-0" />
                                <span className="text-sm font-semibold text-slate-800">{docLabel(row.downstreamType)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-lg font-bold" style={{ color: scoreColor(row.alignmentScore) }}>
                                {row.alignmentScore.toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-semibold ring-1 ${status.className}`}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          {/* Issues found */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Issues found</h2>
                  <p className="text-sm text-slate-500">Problems detected between project documents</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
                {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setGapFilter(s);
                      if (selectedGap && s !== 'ALL' && selectedGap.severity !== s) {
                        setSelectedGap(null);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      gapFilter === s
                        ? 'bg-[#1E3A5F] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : SEVERITY_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {gaps.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center bg-emerald-50 rounded-2xl border border-emerald-100">
                <CheckCircle2 size={40} className="text-emerald-600 mb-3" />
                <p className="text-base font-semibold text-emerald-900">No issues in this category</p>
                <p className="text-sm text-emerald-700 mt-1">Try another filter or review all issues.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                {gaps.map((gap) => {
                  const isSelected = selectedGap?.id === gap.id;
                  return (
                    <button
                      key={gap.id}
                      type="button"
                      onClick={() => selectGap(gap)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#1E3A5F] shadow-md ring-2 ring-[#D4AF37]/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`shrink-0 mt-0.5 ${isSelected ? 'text-[#D4AF37]' : ''}`}>
                          {severityIcon[gap.severity]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge
                              variant={severityToBadge(gap.severity)}
                              className={isSelected ? '!bg-white/15 !text-white !ring-white/20' : ''}
                            >
                              {SEVERITY_LABELS[gap.severity]}
                            </Badge>
                            {gap.affectedArtifacts?.slice(0, 2).map((a) => (
                              <span
                                key={a}
                                className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                                  isSelected ? 'bg-white/10 text-white/90' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {docLabel(a)}
                              </span>
                            ))}
                          </div>
                          <p className={`text-sm leading-relaxed line-clamp-4 ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                            {gap.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: issue detail or team info */}
        <div className="xl:col-span-5" ref={detailPanelRef}>
          <div className="sticky top-6 space-y-6">
            {selectedGap ? (
              <GapDetailPanel gap={selectedGap} onClose={() => setSelectedGap(null)} />
            ) : (
              <Card className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <AlertCircle size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600">Click an issue above to view the full analysis and recommended fix.</p>
              </Card>
            )}
            <TeamInfoPanel group={group} />
          </div>
        </div>
      </div>

      {showExport && exportAudit && (
        <ExportModal
          onClose={() => setShowExport(false)}
          auditData={exportAudit}
          projectTitle={group.projectTitle}
        />
      )}
    </Layout>
  );
};
