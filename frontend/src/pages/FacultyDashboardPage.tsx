import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Users, AlertCircle, TrendingUp, CheckCircle2, AlertTriangle, Plus, Copy, X, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/shared/Layout';
import { Card } from '../components/ui/Card';
import { Badge, readinessToBadge, readinessLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { ReadinessStatus } from '../types';
import { formatDate } from '../lib/utils';
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

function getHealthColor(score: number): string {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-warning';
  return 'bg-critical';
}

function getHealthTextColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-critical';
}

interface HealthBarProps { readonly score: number; }

function HealthBar({ score }: HealthBarProps) {
  const color = getHealthColor(score);
  const textColor = getHealthTextColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold ${textColor}`}>
        {score.toFixed(1)}%
      </span>
    </div>
  );
}

const readinessIcon: Record<ReadinessStatus, React.ReactNode> = {
  READY: <CheckCircle2 size={14} className="text-success" />,
  NEEDS_REVISION: <AlertTriangle size={14} className="text-warning" />,
  CRITICAL_GAPS: <AlertCircle size={14} className="text-critical" />,
};

export const FacultyDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadinessStatus | 'ALL'>('ALL');
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadGroups = () => {
    api.get('/api/projects')
      .then((res) => setGroups(res.data.groups ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadGroups(); }, []);

  const handleCreate = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await api.post('/api/projects', { sectionName });
      setCreatedCode(res.data.group.teamCode);
      loadGroups();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setCreateError(axErr.response?.data?.error ?? 'Failed to create group.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdCode ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setShowCreate(false);
    setSectionName('');
    setCreateError(null);
    setCreatedCode(null);
    setCopied(false);
  };

  const filtered = groups.filter((g) => {
    const latestAudit = g.auditResults[0];
    const readinessStatus: ReadinessStatus = latestAudit?.readinessStatus ?? 'NEEDS_REVISION';
    const matchSearch =
      (g.projectTitle || g.name).toLowerCase().includes(search.toLowerCase()) ||
      g.teamCode.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || readinessStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const summary = {
    total: groups.length,
    ready: groups.filter((g) => g.auditResults[0]?.readinessStatus === 'READY').length,
    needsRevision: groups.filter((g) => g.auditResults[0]?.readinessStatus === 'NEEDS_REVISION').length,
    critical: groups.filter((g) => g.auditResults[0]?.readinessStatus === 'CRITICAL_GAPS').length,
  };

  return (
    <Layout
      title="Faculty Dashboard"
      subtitle="Monitor capstone group progress and traceability health"
      headerAction={
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={15} />
          New Group
        </Button>
      }
    >
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          {
            label: 'Total Groups',
            value: summary.total,
            icon: <Users size={17} />,
            iconBg: 'bg-indigo-50 border border-indigo-100',
            iconColor: 'text-indigo-600',
            valueColor: 'text-slate-900',
            gradient: 'hover:border-indigo-200 hover:shadow-indigo-50/50',
          },
          {
            label: 'Ready',
            value: summary.ready,
            icon: <CheckCircle2 size={17} />,
            iconBg: 'bg-emerald-50 border border-emerald-100',
            iconColor: 'text-emerald-600',
            valueColor: 'text-emerald-600',
            gradient: 'hover:border-emerald-200 hover:shadow-emerald-50/50',
          },
          {
            label: 'Needs Revision',
            value: summary.needsRevision,
            icon: <TrendingUp size={17} />,
            iconBg: 'bg-amber-50 border border-amber-100',
            iconColor: 'text-amber-600',
            valueColor: 'text-amber-600',
            gradient: 'hover:border-amber-200 hover:shadow-amber-50/50',
          },
          {
            label: 'Critical Gaps',
            value: summary.critical,
            icon: <AlertCircle size={17} />,
            iconBg: 'bg-rose-50 border border-rose-100',
            iconColor: 'text-rose-600',
            valueColor: 'text-rose-600',
            gradient: 'hover:border-rose-200 hover:shadow-rose-50/50',
          },
        ].map(({ label, value, icon, iconBg, iconColor, valueColor, gradient }) => (
          <Card key={label} className={`border-slate-100/90 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 relative overflow-hidden group ${gradient}`}>
            {/* Background absolute subtle element */}
            <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-slate-500/[0.02] rounded-full group-hover:scale-[2.5] transition-transform duration-500" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
                <p className={`text-3xl font-extrabold tracking-tight ${valueColor}`}>{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12 duration-300 ${iconBg} ${iconColor}`}>
                {icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups…"
            className="w-full pl-9 pr-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 bg-white shadow-sm placeholder:text-gray-400 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['ALL', 'READY', 'NEEDS_REVISION', 'CRITICAL_GAPS'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-150 ${
                statusFilter === s
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {s === 'ALL' && 'All Groups'}
              {s === 'NEEDS_REVISION' && 'Needs Revision'}
              {s === 'CRITICAL_GAPS' && 'Critical'}
              {s === 'READY' && 'Ready'}
            </button>
          ))}
        </div>
        <p className="ml-auto text-xs text-gray-400 font-medium">
          {filtered.length} group{filtered.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Groups table */}
      <Card padding="none">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.07em]">Group</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.07em]">Members</th>
              <th className="text-right px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.07em]">Health Score</th>
              <th className="text-center px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.07em]">Issues</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.07em]">Readiness</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.07em]">Last Audit</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">Loading groups…</td></tr>
            ) : filtered.map((group: ApiGroup) => {
              const latestAudit = group.auditResults[0];
              const readinessStatus: ReadinessStatus = latestAudit?.readinessStatus ?? 'NEEDS_REVISION';
              const healthScore = latestAudit?.overallScore ?? 0;
              const unresolvedIssues = (latestAudit?.gaps ?? []).filter((g) => g.severity === 'CRITICAL' || g.severity === 'HIGH').length;
              return (
              <tr
                key={group.id}
                onClick={() => navigate(`/faculty/group/${group.id}`)}
                className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
              >
                <td className="px-6 py-4">
                  <p className="text-[13.5px] font-semibold text-gray-900">{group.name}</p>
                  {group.projectTitle && (
                    <p className="text-[12px] text-gray-500 mt-0.5 truncate max-w-[220px]">{group.projectTitle}</p>
                  )}
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{group.teamCode}</p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex -space-x-1.5">
                    {group.members.slice(0, 3).map((m) => (
                      <div
                        key={m.id}
                        title={m.name}
                        className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-white text-[11px] font-bold border-2 border-white shadow-sm"
                      >
                        {m.name.charAt(0)}
                      </div>
                    ))}
                    {group.members.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[11px] font-bold border-2 border-white">
                        +{group.members.length - 3}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <HealthBar score={healthScore} />
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  {unresolvedIssues > 0 ? (
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold ${
                        unresolvedIssues >= 5
                          ? 'bg-red-50 text-critical ring-1 ring-red-200'
                          : 'bg-amber-50 text-warning ring-1 ring-amber-200'
                      }`}
                    >
                      {unresolvedIssues}
                    </span>
                  ) : (
                    <CheckCircle2 size={15} className="text-success mx-auto" />
                  )}
                </td>
                <td className="px-4 py-4">
                  <Badge variant={readinessToBadge(readinessStatus)} dot>
                    {readinessLabel(readinessStatus)}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <span className="text-[12px] text-gray-400 font-medium">
                    {latestAudit ? formatDate(latestAudit.auditedAt) : '—'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <ChevronRight size={15} className="text-gray-200 group-hover:text-primary transition-colors" />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            <Search size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No groups match your search</p>
            <p className="text-xs mt-1 opacity-70">Try adjusting the filter or search term</p>
          </div>
        )}
      </Card>

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Hash size={15} className="text-primary" />
                </div>
                <h2 className="text-[15px] font-bold text-gray-900">Create New Group</h2>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              {createdCode ? (
                /* Success state — show the code to share */
                <div className="text-center space-y-5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-gray-800 mb-1">Group Created!</p>
                    <p className="text-[12px] text-gray-400">Share this code with your students so they can join.</p>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="font-mono text-xl font-bold tracking-widest text-gray-900">{createdCode}</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      <Copy size={14} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <Button onClick={closeModal} className="w-full">Done</Button>
                </div>
              ) : (
                /* Create form */
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label htmlFor="create-section" className="block text-[11.5px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-1.5">
                      Section Name <span className="text-critical">*</span>
                    </label>
                    <input
                      id="create-section"
                      required
                      value={sectionName}
                      onChange={(e) => setSectionName(e.target.value)}
                      placeholder="e.g. G1, G2, BSCS-3A"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white"
                    />
                    <p className="text-[11px] text-gray-400 mt-1.5">A unique join code will be auto-generated for this section. Students will use it to join and then set their project title.</p>
                  </div>

                  {createError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                      <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-red-700">{createError}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Cancel</Button>
                    <Button type="submit" loading={createLoading} className="flex-1">Create Group</Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
