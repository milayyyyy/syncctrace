import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Brain, ChevronRight, Lightbulb, Target, ChevronDown, ArrowRight } from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { Badge, severityToBadge } from '../components/ui/Badge';
import type { Severity } from '../types';
import { formatDate } from '../lib/utils';
import { useLatestAudit, useWorkspacePicker } from '../hooks/queries';
import type { ApiGap } from '../types/api';

const severityIcon: Record<Severity, React.ReactNode> = {
  CRITICAL: <AlertCircle size={15} className="text-critical" />,
  HIGH: <AlertTriangle size={15} className="text-orange-500" />,
  MEDIUM: <Info size={15} className="text-warning" />,
  LOW: <CheckCircle2 size={15} className="text-blue-500" />,
};

const severityBorderColor: Record<Severity, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#F59E0B',
  LOW: '#3B82F6',
};

interface GapCardProps { readonly gap: ApiGap; readonly isSelected: boolean; readonly onClick: () => void; }

function GapCard({ gap, isSelected, onClick }: GapCardProps) {
  let containerStyle: React.CSSProperties;
  let wrapClass: string;
  let descClass: string;
  let tagClass: string;
  let chevClass: string;
  let confBarClass: string;
  let confBarBgClass: string;
  let confTextClass: string;

  if (isSelected) {
    containerStyle = { background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 80%, #1E3A5F 100%)', borderLeft: '3px solid #D4AF37' };
    wrapClass = 'w-full text-left rounded-2xl border border-brand-gold/20 transition-all duration-200 overflow-hidden shadow-xl';
    descClass = 'text-[12.5px] text-white/75 leading-snug line-clamp-2 mt-1.5';
    tagClass = 'text-[10px] font-bold bg-white/10 text-white/50 px-1.5 py-0.5 rounded-md';
    chevClass = 'shrink-0 mt-0.5 text-brand-gold transition-colors';
    confBarClass = 'h-full rounded-full bg-brand-gold/70 transition-all';
    confBarBgClass = 'mt-3 h-0.5 rounded-full overflow-hidden bg-white/10';
    confTextClass = 'text-[10px] font-bold text-white/35';
  } else {
    containerStyle = { borderLeft: `3px solid ${severityBorderColor[gap.severity]}` };
    wrapClass = 'w-full text-left rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-md shadow-sm transition-all duration-200 overflow-hidden';
    descClass = 'text-[12.5px] text-gray-600 leading-snug line-clamp-2 mt-1.5';
    tagClass = 'text-[10px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md';
    chevClass = 'shrink-0 mt-0.5 text-gray-200 transition-colors';
    confBarClass = 'h-full rounded-full bg-gradient-to-r from-primary to-ai transition-all';
    confBarBgClass = 'mt-3 h-0.5 rounded-full overflow-hidden bg-gray-100';
    confTextClass = 'text-[10px] font-bold text-gray-300';
  }

  return (
    <button type="button" onClick={onClick} style={containerStyle} className={wrapClass}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">{severityIcon[gap.severity]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={severityToBadge(gap.severity)} dot>{gap.severity}</Badge>
              <span className={confTextClass}>{Math.round(gap.aiConfidence * 100)}% conf.</span>
            </div>
            <p className={descClass}>{gap.description}</p>
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {gap.affectedArtifacts.map((a) => (
                <span key={a} className={tagClass}>{a}</span>
              ))}
            </div>
          </div>
          <ChevronRight size={13} className={chevClass} />
        </div>
        <div className={confBarBgClass}>
          <div className={confBarClass} style={{ width: `${gap.aiConfidence * 100}%` }} />
        </div>
      </div>
    </button>
  );
}

interface DiagnosticPanelProps { readonly gap: ApiGap; }

function DiagnosticPanel({ gap }: DiagnosticPanelProps) {
  const navigate = useNavigate();
  return (
    <div className="rounded-3xl overflow-hidden ring-1 ring-brand-navy/8 shadow-xl">
      {/* Dark hero header */}
      <div
        className="px-6 pt-6 pb-5"
        style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 60%, #1E3A5F 100%)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.18)', border: '1px solid rgba(212,175,55,0.35)' }}>
              <Brain size={18} style={{ color: '#D4AF37' }} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: 'rgba(212,175,55,0.75)' }}>AI Diagnostic Engine</p>
              <h3 className="text-[15px] font-black text-white tracking-tight">Root Cause Analysis</h3>
            </div>
          </div>
          <Badge variant={severityToBadge(gap.severity)} dot>{gap.severity}</Badge>
        </div>
        <p className="text-[13px] text-white/65 leading-relaxed font-medium">{gap.description}</p>
        <div className="flex items-center gap-5 mt-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.45)' }}>AI Confidence</span>
              <span className="text-[12px] font-black" style={{ color: '#D4AF37' }}>{Math.round(gap.aiConfidence * 100)}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${gap.aiConfidence * 100}%`, background: 'linear-gradient(90deg, #D4AF37, #c9a227)' }}
              />
            </div>
          </div>
          <span className="text-[10px] font-medium whitespace-nowrap shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {gap.createdAt ? formatDate(gap.createdAt) : '—'}
          </span>
        </div>
      </div>

      {/* White body */}
      <div className="bg-white px-6 py-5 space-y-4">
        {/* Affected artifacts */}
        <div>
          <p className="text-[9px] font-black text-brand-navy/25 uppercase tracking-[0.22em] mb-2.5">Affected Artifacts</p>
          <div className="flex flex-wrap gap-2">
            {gap.affectedArtifacts.map((a) => (
              <span
                key={a}
                className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[11px] font-black border border-primary/20 uppercase tracking-wide"
              >
                {a}
              </span>
            ))}
          </div>
        </div>

        {/* Root Cause */}
        <div className="rounded-2xl overflow-hidden border border-orange-200/60">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-orange-50 border-b border-orange-100">
            <div className="w-5 h-5 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <Target size={12} className="text-orange-500" />
            </div>
            <p className="text-[9px] font-black text-orange-600 uppercase tracking-[0.2em]">Root Cause Analysis</p>
          </div>
          <div className="px-4 py-3.5 bg-orange-50/30">
            <p className="text-[13px] text-orange-900/80 leading-relaxed font-medium">{gap.rootCause}</p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="rounded-2xl overflow-hidden border border-purple-200/60">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-purple-50 border-b border-purple-100">
            <div className="w-5 h-5 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <Lightbulb size={12} className="text-purple-500" />
            </div>
            <p className="text-[9px] font-black text-purple-600 uppercase tracking-[0.2em]">AI Recommendation</p>
          </div>
          <div className="px-4 py-3.5 bg-purple-50/30">
            <p className="text-[13px] text-purple-900/80 leading-relaxed font-medium">{gap.recommendation}</p>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate('/artifacts')}
          className="w-full flex items-center justify-between p-4 rounded-2xl group hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 100%)' }}
        >
          <div className="text-left">
            <p className="text-[11px] font-black text-white uppercase tracking-widest">Fix on Artifacts Page</p>
            <p className="text-[10px] text-white/35 font-medium mt-0.5">Modify documents &amp; update trace links</p>
          </div>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #c9a227)' }}
          >
            <ArrowRight size={14} className="text-[#0B1521]" />
          </div>
        </button>
      </div>
    </div>
  );
}

type SeverityFilter = 'ALL' | Severity;

export const DiagnosticsPage: React.FC = () => {
  const [selected, setSelected] = useState<ApiGap | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const {
    workspaces,
    selectedGroupId,
    selectedGroup,
    selectGroup,
    isInitialLoad,
  } = useWorkspacePicker({ preferGroupWithAudit: true });
  const auditQuery = useLatestAudit(selectedGroupId);

  const gaps = useMemo(() => {
    const raw = auditQuery.data?.gaps ?? selectedGroup?.auditResults?.[0]?.gaps ?? [];
    const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return [...raw].sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));
  }, [auditQuery.data, selectedGroup]);

  useEffect(() => {
    setSelected((current) => current && gaps.some((gap) => gap.id === current.id) ? current : gaps[0] ?? null);
  }, [gaps]);

  const loading = isInitialLoad && gaps.length === 0;

  const handleWorkspaceChange = (id: string) => {
    selectGroup(id);
  };

  const counts = {
    CRITICAL: gaps.filter((g) => g.severity === 'CRITICAL').length,
    HIGH: gaps.filter((g) => g.severity === 'HIGH').length,
    MEDIUM: gaps.filter((g) => g.severity === 'MEDIUM').length,
    LOW: gaps.filter((g) => g.severity === 'LOW').length,
  };

  const filteredGaps = severityFilter === 'ALL' ? gaps : gaps.filter((g) => g.severity === severityFilter);

  const workspaceSelector = workspaces.length > 1 ? (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={selectedGroupId}
        onChange={(e) => handleWorkspaceChange(e.target.value)}
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

  return (
    <Layout
      title="Gap Diagnostics"
      subtitle="Root cause analysis and AI-powered recommendations for each detected gap"
      badge="AI Analysis Engine"
      heroIcon={<Brain size={26} />}
      headerAction={workspaceSelector}
    >
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {([
          { key: 'CRITICAL' as Severity, label: 'Critical', count: counts.CRITICAL, icon: <AlertCircle size={16} />, accent: '#EF4444' },
          { key: 'HIGH' as Severity, label: 'High', count: counts.HIGH, icon: <AlertTriangle size={16} />, accent: '#F97316' },
          { key: 'MEDIUM' as Severity, label: 'Medium', count: counts.MEDIUM, icon: <Info size={16} />, accent: '#F59E0B' },
          { key: 'LOW' as Severity, label: 'Low', count: counts.LOW, icon: <CheckCircle2 size={16} />, accent: '#3B82F6' },
        ]).map((s) => {
          const isActiveFilter = severityFilter === s.key;
          const cardStyle: React.CSSProperties = {
            background: '#ffffff',
            border: isActiveFilter ? `2px solid ${s.accent}` : '2px solid transparent',
            boxShadow: isActiveFilter ? `0 4px 16px ${s.accent}25` : '0 1px 4px rgba(0,0,0,0.06)',
            cursor: 'pointer',
          };
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => { setSeverityFilter(isActiveFilter ? 'ALL' : s.key); setSelected(null); }}
              className="rounded-2xl px-5 py-4 text-left transition-all duration-200 hover:shadow-md active:scale-[0.98]"
              style={cardStyle}
            >
              <div className="flex items-center gap-2 mb-3" style={{ color: s.accent }}>
                {s.icon}
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: s.accent }}>{s.label}</span>
              </div>
              <p className="text-3xl font-black tracking-tight text-gray-800">{s.count}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">gaps detected</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Gap list panel */}
        <div className="lg:col-span-2 rounded-3xl overflow-hidden ring-1 ring-brand-navy/8 shadow-lg flex flex-col">
          {/* Dark header */}
          <div
            className="px-5 py-4 shrink-0"
            style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 100%)' }}
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.18)', border: '1px solid rgba(212,175,55,0.35)' }}>
                  <AlertCircle size={13} style={{ color: '#D4AF37' }} />
                </div>
                <p className="text-[11px] font-black text-white uppercase tracking-[0.18em]">Detected Gaps</p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full" style={{ color: '#D4AF37', background: 'rgba(212,175,55,0.18)', border: '1px solid rgba(212,175,55,0.3)' }}>
                {severityFilter === 'ALL' ? `${filteredGaps.length} total` : `${filteredGaps.length} / ${gaps.length}`}
              </span>
            </div>
            {/* Filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as SeverityFilter[]).map((f) => {
                const pillActive: Record<SeverityFilter, string> = {
                  ALL: 'bg-white/15 text-white border border-white/20',
                  CRITICAL: 'bg-red-500/25 text-red-300 border border-red-500/30',
                  HIGH: 'bg-orange-500/25 text-orange-300 border border-orange-500/30',
                  MEDIUM: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
                  LOW: 'bg-blue-500/25 text-blue-300 border border-blue-500/30',
                };
                const pillInactive: Record<SeverityFilter, string> = {
                  ALL: 'text-white/35 hover:text-white/65 border border-transparent',
                  CRITICAL: 'text-white/30 hover:text-red-300 border border-transparent',
                  HIGH: 'text-white/30 hover:text-orange-300 border border-transparent',
                  MEDIUM: 'text-white/30 hover:text-amber-300 border border-transparent',
                  LOW: 'text-white/30 hover:text-blue-300 border border-transparent',
                };
                const countMap: Record<SeverityFilter, number> = { ALL: gaps.length, CRITICAL: counts.CRITICAL, HIGH: counts.HIGH, MEDIUM: counts.MEDIUM, LOW: counts.LOW };
                const isActive = severityFilter === f;
                const pillClass = isActive ? pillActive[f] : pillInactive[f];
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => { setSeverityFilter(f); setSelected(null); }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${pillClass}`}
                  >
                    {f === 'ALL' ? 'All' : f}{' '}
                    <span className="text-[9px] opacity-55">({countMap[f]})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable list */}
          <div className="bg-slate-50/60 flex-1 p-3 space-y-2 overflow-y-auto max-h-[min(520px,60vh)] lg:max-h-[520px]">
            {(() => {
              if (loading) return (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Brain size={28} className="text-primary/20" />
                  <p className="text-sm text-gray-400 font-medium animate-pulse">Loading gap analysis…</p>
                </div>
              );
              if (gaps.length === 0) return (
                <div className="flex flex-col items-center py-12 gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-600">No gaps detected</p>
                  <p className="text-xs text-gray-400 max-w-[180px] leading-relaxed">Run an audit on the Artifacts page to generate gap analysis.</p>
                </div>
              );
              if (filteredGaps.length === 0) return (
                <div className="flex flex-col items-center py-10 gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-bold text-gray-400">No {severityFilter.toLowerCase()} gaps</p>
                </div>
              );
              return filteredGaps.map((gap) => (
                <GapCard
                  key={gap.id}
                  gap={gap}
                  isSelected={selected?.id === gap.id}
                  onClick={() => setSelected(gap)}
                />
              ));
            })()}
          </div>
        </div>

        {/* Diagnostic panel */}
        <div className="lg:col-span-3 min-h-[280px] lg:min-h-[420px]">
          {selected ? (
            <DiagnosticPanel gap={selected} />
          ) : (
            <div
              className="rounded-3xl overflow-hidden ring-1 ring-brand-navy/8 shadow-lg h-full min-h-[280px] lg:min-h-[420px] flex flex-col items-center justify-center gap-4"
              style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 60%, #1E3A5F 100%)' }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                <Brain size={28} style={{ color: 'rgba(212,175,55,0.5)' }} />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-black text-white/35 uppercase tracking-widest">AI Diagnostic Engine</p>
                <p className="text-[11px] text-white/20 font-medium mt-1.5">Select a gap to view root cause analysis</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
