import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Brain, ChevronRight, Lightbulb, Target, ChevronDown, Layers, ArrowRight } from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { Card } from '../components/ui/Card';
import { Badge, severityToBadge } from '../components/ui/Badge';
import type { Severity } from '../types';
import { formatDate } from '../lib/utils';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

// Mapped gap shape from API
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

const severityIcon: Record<Severity, React.ReactNode> = {
  CRITICAL: <AlertCircle size={15} className="text-critical" />,
  HIGH: <AlertTriangle size={15} className="text-orange-500" />,
  MEDIUM: <Info size={15} className="text-warning" />,
  LOW: <CheckCircle2 size={15} className="text-blue-500" />,
};

const gapTypeLabel: Record<string, string> = {
  MISSING_LINK: 'Missing Link',
  INCONSISTENCY: 'Inconsistency',
  IMPLEMENTATION_GAP: 'Implementation Gap',
  TERMINOLOGY_DRIFT: 'Terminology Drift',
  DOWNSTREAM_OMISSION: 'Downstream Omission',
};

interface GapCardProps { readonly gap: ApiGap; readonly isSelected: boolean; readonly onClick: () => void; }

function GapCard({ gap, isSelected, onClick }: GapCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 ${
        isSelected
          ? 'border-primary/30 bg-primary/[0.04] shadow-sm ring-1 ring-primary/20'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-card shadow-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{severityIcon[gap.severity]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant={severityToBadge(gap.severity)} dot>{gap.severity}</Badge>
          </div>
          <p className="text-[13px] text-gray-700 leading-snug line-clamp-2">{gap.description}</p>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex gap-1 flex-wrap">
              {gap.affectedArtifacts.map((a) => (
                <span key={a} className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                  {a}
                </span>
              ))}
            </div>
            <span className="text-[10px] text-gray-300 ml-auto font-medium">
              {Math.round(gap.aiConfidence * 100)}% conf.
            </span>
          </div>
        </div>
        <ChevronRight
          size={13}
          className={`shrink-0 mt-1 transition-colors ${isSelected ? 'text-primary' : 'text-gray-200'}`}
        />
      </div>
    </button>
  );
}

interface DiagnosticPanelProps { readonly gap: ApiGap; }

function DiagnosticPanel({ gap }: DiagnosticPanelProps) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
        <div className="mt-0.5">{severityIcon[gap.severity]}</div>
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={severityToBadge(gap.severity)}>{gap.severity}</Badge>
            <span className="text-xs text-gray-400 font-medium">
              Detected {formatDate(gap.createdAt)}
            </span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed font-semibold">{gap.description}</p>
        </div>
      </div>

      {/* Affected artifacts */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Affected Artifacts</p>
        <div className="flex gap-2">
          {gap.affectedArtifacts.map((a) => (
            <span
              key={a}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/25 shadow-inner-sm uppercase"
            >
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Confidence */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span className="font-bold uppercase tracking-widest text-slate-400">AI Confidence</span>
          <span className="font-extrabold text-slate-700">{Math.round(gap.aiConfidence * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ai to-primary rounded-full"
            style={{ width: `${gap.aiConfidence * 100}%` }}
          />
        </div>
      </div>

      {/* Root Cause */}
      <div className="rounded-xl border border-orange-200/60 bg-orange-50/50 p-4 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-center gap-2 mb-2.5">
          <Target size={15} className="text-orange-500 shrink-0" />
          <p className="text-xs font-bold text-orange-700 uppercase tracking-widest">Root Cause Analysis</p>
        </div>
        <p className="text-sm text-orange-900 leading-relaxed font-medium">{gap.rootCause}</p>
      </div>

      {/* Recommendation */}
      <div className="rounded-xl border border-purple-200/60 bg-purple-50/50 p-4 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-center gap-2 mb-2.5">
          <Lightbulb size={15} className="text-purple-600 shrink-0 animate-pulse" />
          <p className="text-xs font-bold text-purple-700 uppercase tracking-widest">AI Recommendation</p>
        </div>
        <p className="text-sm text-purple-900 leading-relaxed font-medium">{gap.recommendation}</p>
      </div>

      {/* Fix buttons helper action */}
      <div className="pt-3">
        <Button
          variant="outline"
          className="w-full text-xs py-3 border-dashed border-primary/40 hover:border-primary text-primary bg-primary/[0.01] hover:bg-primary/[0.04] transition-all hover:scale-[1.01]"
          onClick={() => navigate('/artifacts')}
        >
          <span>Modify documents &amp; update links on Artifacts Page</span>
          <ArrowRight size={13} className="ml-1 animate-pulse" />
        </Button>
      </div>
    </div>
  );
}

export const DiagnosticsPage: React.FC = () => {
  const [selected, setSelected] = useState<ApiGap | null>(null);
  const [gaps, setGaps] = useState<ApiGap[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchGaps = useCallback(async () => {
    if (!selectedGroupId) { setLoading(false); return; }
    setLoading(true);
    setGaps([]);
    setSelected(null);
    try {
      const res = await api.get(`/api/audit/${selectedGroupId}/latest`);
      const result = res.data.auditResult;
      const fetchedGaps: ApiGap[] = result?.gaps ?? [];
      const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      fetchedGaps.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));
      setGaps(fetchedGaps);
      if (fetchedGaps.length > 0) setSelected(fetchedGaps[0]);
    } catch { /* no audit yet */ }
    finally { setLoading(false); }
  }, [selectedGroupId]);

  useEffect(() => { fetchGaps(); }, [fetchGaps]);

  const counts = {
    CRITICAL: gaps.filter((g) => g.severity === 'CRITICAL').length,
    HIGH: gaps.filter((g) => g.severity === 'HIGH').length,
    MEDIUM: gaps.filter((g) => g.severity === 'MEDIUM').length,
    LOW: gaps.filter((g) => g.severity === 'LOW').length,
  };

  return (
    <Layout
      title="AI Diagnostics"
      subtitle="Root cause analysis and recommendations powered by AI"
    >
      {/* Workspace selector */}
      {workspaces.length > 1 && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm max-w-sm mb-5">
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

      {/* Summary chips */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-[11.5px] font-semibold ring-1 ring-red-100">
          <AlertCircle size={11} /> {counts.CRITICAL} Critical
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 text-[11.5px] font-semibold ring-1 ring-orange-100">
          <AlertTriangle size={11} /> {counts.HIGH} High
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 text-[11.5px] font-semibold ring-1 ring-amber-100">
          <Info size={11} /> {counts.MEDIUM} Medium
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-[11.5px] font-semibold ring-1 ring-blue-100">
          <CheckCircle2 size={11} /> {counts.LOW} Low
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[12px] text-ai font-semibold bg-purple-50 px-3 py-1.5 rounded-xl ring-1 ring-purple-100">
          <Brain size={12} />
          AI-Powered Analysis
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Gap list */}
        <div className="col-span-2 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">
            Detected Gaps ({gaps.length})
          </p>
          {(() => {
            if (loading) return <p className="text-sm text-gray-400 px-1">Loading…</p>;
            if (gaps.length === 0) return <p className="text-sm text-gray-400 px-1">No gaps detected. Run an audit first.</p>;
            return gaps.map((gap) => (
              <GapCard
                key={gap.id}
                gap={gap}
                isSelected={selected?.id === gap.id}
                onClick={() => setSelected(gap)}
              />
            ));
          })()}
        </div>

        {/* Diagnostic panel */}
        <div className="col-span-3">
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-ai/10 flex items-center justify-center">
                <Brain size={15} className="text-ai" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">AI Diagnostic Panel</p>
                <p className="text-xs text-gray-400">Click a gap to view root cause and recommendation</p>
              </div>
            </div>
            {selected ? (
              <DiagnosticPanel gap={selected} />
            ) : (
              <div className="text-center py-16 text-gray-400">
                <Brain size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a gap to view AI analysis</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};
