import React, { useState, useEffect } from 'react';
import {
  Search, ChevronRight, Users, AlertCircle, TrendingUp, CheckCircle2,
  AlertTriangle, Loader2, Calendar, Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/shared/Layout';
import type { ReadinessStatus } from '../types';
import { api } from '../services/api';

interface ApiMember { id: string; name: string; email: string; role: string; }
interface ApiAudit { overallScore: number; readinessStatus: ReadinessStatus; auditedAt: string; gaps: Array<{ severity: string }>; }
interface ApiGroup {
  id: string;
  name: string;
  projectTitle: string;
  teamCode: string;
  members: ApiMember[];
  auditResults: ApiAudit[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#D4AF37';
  return '#B91C1C';
}

function formatAuditDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getReadinessLabel(s: ReadinessStatus): string {
  if (s === 'READY') return 'Ready';
  if (s === 'NEEDS_REVISION') return 'Needs Revision';
  return 'Critical Gaps';
}

function getReadinessPill(s: ReadinessStatus): { bg: string; text: string; dot: string } {
  if (s === 'READY') return { bg: 'rgba(5,150,105,0.1)', text: '#059669', dot: '#059669' };
  if (s === 'NEEDS_REVISION') return { bg: 'rgba(212,175,55,0.12)', text: '#B45309', dot: '#D4AF37' };
  return { bg: 'rgba(185,28,28,0.1)', text: '#B91C1C', dot: '#B91C1C' };
}

// ── GroupCard ─────────────────────────────────────────────────────────────────

interface GroupCardProps {
  readonly group: ApiGroup;
  readonly onClick: () => void;
}

function GroupCard({ group, onClick }: GroupCardProps) {
  const audit = group.auditResults[0] ?? null;
  const score = audit?.overallScore ?? 0;
  const status: ReadinessStatus = audit?.readinessStatus ?? 'NEEDS_REVISION';
  const pill = getReadinessPill(status);
  const color = scoreColor(score);
  const criticals = (audit?.gaps ?? []).filter((g) => g.severity === 'CRITICAL').length;
  const warnings  = (audit?.gaps ?? []).filter((g) => g.severity === 'HIGH').length;
  const circ = 2 * Math.PI * 22;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-navy/15 transition-all duration-200 group overflow-hidden"
    >
      <div className="p-6 flex items-center gap-5">

        {/* Score ring */}
        <div className="shrink-0 relative w-16 h-16">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#E2E8F0" strokeWidth="5" />
            <circle
              cx="28" cy="28" r="22" fill="none"
              stroke={color} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={String(circ)}
              strokeDashoffset={String(circ * (1 - score / 100))}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[13px] font-black" style={{ color }}>{score.toFixed(0)}%</span>
          </div>
        </div>

        {/* Group info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-[14px] font-black text-brand-navy tracking-tight">{group.projectTitle || group.name}</p>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-brand-navy/5 text-brand-navy/40">
              #{group.teamCode}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-medium mb-3">{group.name}</p>

          <div className="flex items-center gap-4 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl"
              style={{ background: pill.bg, color: pill.text }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: pill.dot }} />
              {getReadinessLabel(status)}
            </span>

            {criticals > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                <AlertCircle size={11} />
                {criticals} critical
              </span>
            )}
            {warnings > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                <AlertTriangle size={11} />
                {warnings} warning{warnings > 1 ? 's' : ''}
              </span>
            )}

            {audit ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                <Calendar size={10} />
                {formatAuditDate(audit.auditedAt)}
              </span>
            ) : (
              <span className="text-[10px] font-medium text-gray-400">No audit yet</span>
            )}
          </div>
        </div>

        {/* Member avatars */}
        <div className="flex -space-x-2 shrink-0">
          {group.members.slice(0, 4).map((m) => (
            <div
              key={m.id}
              className="w-8 h-8 rounded-full border-2 border-white bg-brand-navy/5 flex items-center justify-center text-[10px] font-black text-brand-navy/40 uppercase"
            >
              {m.name.charAt(0)}
            </div>
          ))}
          {group.members.length > 4 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-brand-navy text-white flex items-center justify-center text-[9px] font-black">
              +{group.members.length - 4}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 bg-brand-navy/5 group-hover:bg-brand-navy group-hover:text-white text-brand-navy/30">
          <ChevronRight size={18} />
        </div>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const FacultyDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadinessStatus | 'ALL'>('ALL');
  const [groups, setGroups]             = useState<ApiGroup[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    api.get('/api/projects')
      .then((res) => setGroups(res.data.groups ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = groups.filter((g) => {
    const status: ReadinessStatus = g.auditResults[0]?.readinessStatus ?? 'NEEDS_REVISION';
    const matchSearch =
      (g.projectTitle || g.name).toLowerCase().includes(search.toLowerCase()) ||
      g.teamCode.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalGroups   = groups.length;
  const readyCount    = groups.filter((g) => g.auditResults[0]?.readinessStatus === 'READY').length;
  const revisionCount = groups.filter((g) => g.auditResults[0]?.readinessStatus === 'NEEDS_REVISION').length;
  const criticalCount = groups.filter((g) => g.auditResults[0]?.readinessStatus === 'CRITICAL_GAPS').length;

  const filterLabels: Array<{ value: ReadinessStatus | 'ALL'; label: string }> = [
    { value: 'ALL',            label: 'All Groups' },
    { value: 'READY',          label: 'Ready'      },
    { value: 'NEEDS_REVISION', label: 'Revision'   },
    { value: 'CRITICAL_GAPS',  label: 'Critical'   },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={32} className="animate-spin text-brand-navy/20" />
          <p className="text-[13px] font-semibold text-gray-400 animate-pulse">Loading assigned groups…</p>
        </div>
      );
    }

    if (groups.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-2"
            style={{ background: 'linear-gradient(135deg, #0B1521 0%, #1E3A5F 100%)' }}
          >
            <Users size={32} style={{ color: 'rgba(212,175,55,0.6)' }} />
          </div>
          <div>
            <p className="text-[18px] font-black text-brand-navy tracking-tight">No Groups Assigned</p>
            <p className="text-[13px] text-gray-400 font-medium mt-1.5 max-w-sm leading-relaxed">
              No student groups are currently assigned to you as faculty adviser. Groups will appear here once students select you during workspace setup.
            </p>
          </div>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Search size={22} className="text-gray-300" />
          </div>
          <p className="text-[15px] font-black text-brand-navy tracking-tight">No Matching Groups</p>
          <p className="text-[12px] text-gray-400 font-medium">
            {search
              ? <>No groups match <span className="font-bold text-gray-600">"{search}"</span> with the selected filter.</>
              : 'No groups match the selected status filter.'}
          </p>
          <button
            type="button"
            onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
            className="mt-1 text-[12px] font-black text-brand-navy/50 hover:text-brand-navy transition-colors underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
          {filtered.length} group{filtered.length === 1 ? '' : 's'} found
        </p>
        {filtered.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onClick={() => navigate(`/faculty/group/${group.id}`)}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout
      title="Faculty Dashboard"
      subtitle="Monitor traceability integrity and project readiness across all assigned groups"
      badge="Adviser Portal"
      heroIcon={<Users size={26} />}
    >
      <div className="space-y-5">

        {/* ── HERO SUMMARY PANEL ─────────────────────────────────────────── */}
        <div
          className="rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 60%, #1E3A5F 100%)' }}
        >
          <div className="p-7">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(212,175,55,0.18)', border: '1px solid rgba(212,175,55,0.35)' }}
              >
                <Shield size={20} style={{ color: '#D4AF37' }} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: 'rgba(212,175,55,0.75)' }}>
                  Adviser Overview
                </p>
                <p className="text-[15px] font-black text-white tracking-tight">Assigned Student Groups</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Groups',   value: totalGroups,   icon: <Users size={18} />,        color: 'rgba(148,163,184,0.9)', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.2)' },
                { label: 'Ready',          value: readyCount,    icon: <CheckCircle2 size={18} />,  color: '#34d399',               bg: 'rgba(52,211,153,0.1)',    border: 'rgba(52,211,153,0.2)'  },
                { label: 'Needs Revision', value: revisionCount, icon: <TrendingUp size={18} />,    color: '#D4AF37',               bg: 'rgba(212,175,55,0.1)',    border: 'rgba(212,175,55,0.2)'  },
                { label: 'Critical Gaps',  value: criticalCount, icon: <AlertCircle size={18} />,   color: '#f87171',               bg: 'rgba(248,113,113,0.1)',   border: 'rgba(248,113,113,0.2)' },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-2xl px-5 py-4 border"
                  style={{ background: tile.bg, borderColor: tile.border }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: tile.color }}>{tile.icon}</span>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {tile.label}
                    </p>
                  </div>
                  <p className="text-4xl font-black tracking-tight" style={{ color: tile.color }}>
                    {tile.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SEARCH + FILTER ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by project title or team code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1.5 bg-white border border-gray-200 rounded-2xl w-full md:w-auto overflow-x-auto">
            {filterLabels.map(({ value, label }) => {
              const activeClass = statusFilter === value
                ? 'bg-brand-navy text-white shadow-sm'
                : 'text-gray-400 hover:text-brand-navy';
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeClass}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── GROUP LIST / EMPTY STATES ──────────────────────────────────── */}
        {renderContent()}

      </div>
    </Layout>
  );
};
