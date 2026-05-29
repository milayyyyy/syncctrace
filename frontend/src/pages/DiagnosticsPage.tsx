import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Info,
  Lightbulb,
  Target,
} from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { Badge, severityToBadge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import type { Severity } from '../types';
import { formatDate } from '../lib/utils';
import { useLatestAudit, useWorkspacePicker } from '../hooks/queries';
import type { ApiGap } from '../types/api';

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

const STAT_ACCENTS: Record<Severity, string> = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#D97706',
  LOW: '#2563EB',
};

function docLabel(type: string): string {
  return DOC_LABELS[type] ?? type.replaceAll('_', ' ');
}

type SeverityFilter = 'ALL' | Severity;

interface GapListItemProps {
  readonly gap: ApiGap;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

function GapListItem({ gap, isSelected, onSelect }: GapListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? 'border-[#D4AF37] bg-[#1E3A5F] shadow-md ring-2 ring-[#D4AF37]/25'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex gap-3">
        <div className={`shrink-0 mt-0.5 ${isSelected ? 'text-[#D4AF37]' : ''}`}>
          {severityIcon[gap.severity]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge
              variant={severityToBadge(gap.severity)}
              className={isSelected ? '!bg-white/15 !text-white !ring-white/20' : ''}
            >
              {SEVERITY_LABELS[gap.severity]}
            </Badge>
            <span className={`text-xs font-medium ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
              {Math.round(gap.aiConfidence * 100)}% confidence
            </span>
          </div>
          <p className={`text-sm leading-relaxed line-clamp-3 ${isSelected ? 'text-white' : 'text-slate-700'}`}>
            {gap.description}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {gap.affectedArtifacts.map((a) => (
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
        </div>
      </div>
    </button>
  );
}

function IssueDetailPanel({ gap }: { readonly gap: ApiGap }) {
  const navigate = useNavigate();

  return (
    <Card padding="none" className="overflow-hidden border border-slate-200 shadow-lg rounded-2xl bg-white h-full">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Issue analysis</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={severityToBadge(gap.severity)} dot>
                {SEVERITY_LABELS[gap.severity]}
              </Badge>
              {gap.affectedArtifacts.map((a) => (
                <span
                  key={a}
                  className="text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md ring-1 ring-slate-200"
                >
                  {docLabel(a)}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500 mb-0.5">Reported</p>
            <p className="text-sm font-semibold text-slate-800">
              {gap.createdAt ? formatDate(gap.createdAt) : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">What was found</p>
          <p className="text-base text-slate-800 leading-relaxed">{gap.description}</p>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">AI confidence</span>
            <span className="text-sm font-bold text-[#1E3A5F]">{Math.round(gap.aiConfidence * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#D4AF37] transition-all"
              style={{ width: `${gap.aiConfidence * 100}%` }}
            />
          </div>
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
            <p className="text-sm font-semibold text-emerald-900">Suggested fix</p>
          </div>
          <p className="text-sm text-emerald-950 leading-relaxed">{gap.recommendation}</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/artifacts')}
          className="w-full flex items-center justify-between gap-4 p-4 rounded-xl bg-[#1E3A5F] text-white hover:bg-[#162D4A] transition-colors"
        >
          <div className="text-left">
            <p className="text-sm font-semibold">Update project documents</p>
            <p className="text-xs text-white/70 mt-0.5">Go to Artifacts to edit links and re-run the audit</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#D4AF37] flex items-center justify-center shrink-0">
            <ArrowRight size={16} className="text-[#1E3A5F]" />
          </div>
        </button>
      </div>
    </Card>
  );
}

export const DiagnosticsPage: React.FC = () => {
  const [selected, setSelected] = useState<ApiGap | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const detailRef = useRef<HTMLDivElement>(null);

  const {
    workspaces,
    selectedGroupId,
    selectedGroup,
    selectGroup,
    isInitialLoad,
  } = useWorkspacePicker();
  const auditQuery = useLatestAudit(selectedGroupId);

  const gaps = useMemo(() => {
    const raw = auditQuery.data?.gaps ?? selectedGroup?.auditResults?.[0]?.gaps ?? [];
    const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return [...raw].sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));
  }, [auditQuery.data, selectedGroup]);

  const counts = useMemo(() => ({
    CRITICAL: gaps.filter((g) => g.severity === 'CRITICAL').length,
    HIGH: gaps.filter((g) => g.severity === 'HIGH').length,
    MEDIUM: gaps.filter((g) => g.severity === 'MEDIUM').length,
    LOW: gaps.filter((g) => g.severity === 'LOW').length,
  }), [gaps]);

  const filteredGaps = severityFilter === 'ALL' ? gaps : gaps.filter((g) => g.severity === severityFilter);
  const loading = isInitialLoad && gaps.length === 0;

  const selectGap = useCallback((gap: ApiGap) => {
    setSelected(gap);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const applyFilter = (filter: SeverityFilter) => {
    setSeverityFilter(filter);
    setSelected(null);
  };

  const workspaceSelector = workspaces.length > 1 ? (
    <div className="relative inline-flex items-center">
      <select
        value={selectedGroupId}
        onChange={(e) => selectGroup(e.target.value)}
        className="appearance-none bg-white/10 border border-[#D4AF37]/35 rounded-xl text-white text-sm font-semibold py-2.5 pl-4 pr-10 cursor-pointer outline-none max-w-[280px]"
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

  return (
    <Layout
      title="Issue diagnostics"
      subtitle="Review problems found in your documents and follow the suggested fixes"
      badge="Student workspace"
      heroIcon={<ClipboardList size={26} />}
      headerAction={workspaceSelector}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((key) => {
          const accent = STAT_ACCENTS[key];
          const active = severityFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyFilter(active ? 'ALL' : key)}
              className="rounded-xl px-4 py-4 text-left border transition-all hover:shadow-md active:scale-[0.99] bg-white"
              style={{
                borderColor: active ? accent : '#E2E8F0',
                boxShadow: active ? `0 4px 14px ${accent}22` : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-2" style={{ color: accent }}>
                {severityIcon[key]}
                <span className="text-sm font-semibold">{SEVERITY_LABELS[key]}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{counts[key]}</p>
              <p className="text-xs text-slate-500 mt-0.5">issues found</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Issue list */}
        <div className="lg:col-span-2">
          <Card padding="none" className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Issues list</h2>
                  <p className="text-sm text-slate-500">
                    {filteredGaps.length} of {gaps.length} shown
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
                {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as SeverityFilter[]).map((f) => {
                  const count = f === 'ALL' ? gaps.length : counts[f];
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => applyFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        severityFilter === f
                          ? 'bg-[#1E3A5F] text-white shadow-sm'
                          : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      {f === 'ALL' ? 'All' : SEVERITY_LABELS[f]} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto max-h-[min(560px,65vh)] lg:max-h-[560px] bg-white">
              {loading && (
                <div className="py-16 text-center text-sm text-slate-500 animate-pulse">
                  Loading issues…
                </div>
              )}
              {!loading && gaps.length === 0 && (
                <div className="py-14 px-4 text-center">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
                  <p className="text-base font-semibold text-slate-800">No issues found</p>
                  <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                    Run an audit on the Artifacts page to analyze your project documents.
                  </p>
                </div>
              )}
              {!loading && gaps.length > 0 && filteredGaps.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-500">
                  No {SEVERITY_LABELS[severityFilter as Severity]?.toLowerCase()} issues in this category.
                </div>
              )}
              {filteredGaps.map((gap) => (
                <GapListItem
                  key={gap.id}
                  gap={gap}
                  isSelected={selected?.id === gap.id}
                  onSelect={() => selectGap(gap)}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3 min-h-[320px]" ref={detailRef}>
          {selected ? (
            <IssueDetailPanel gap={selected} />
          ) : (
            <Card className="h-full min-h-[320px] flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 bg-slate-50 text-center rounded-2xl">
              <AlertCircle size={36} className="text-slate-300 mb-4" />
              <p className="text-base font-semibold text-slate-700">Select an issue to view details</p>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                Click any issue on the left to see why it was flagged and what your team should fix.
              </p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};
