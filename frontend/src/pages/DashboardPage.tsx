import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Activity, CheckCircle2, Circle, Users, Upload,
  GitBranch, GitFork, Download, ChevronDown, AlertCircle,
  ShieldCheck, LayoutGrid, Clock, TrendingUp, Trophy,
} from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { ArtifactType } from '../types';

/* ─── types ──────────────────────────────────────────────── */
interface ApiMember   { id: string; name: string; email: string; role: string; avatarUrl: string | null; }
interface ApiArtifact { id: string; type: ArtifactType; url: string; fileName: string | null; uploadedAt: string; }
interface ApiAudit    { overallScore: number; readinessStatus: string; auditedAt: string; }
interface ApiGroup {
  id: string;
  name: string;
  projectTitle: string;
  teamCode: string;
  members: ApiMember[];
  artifacts: ApiArtifact[];
  auditResults: ApiAudit[];
}

/* ─── constants ──────────────────────────────────────────── */
const ARTIFACTS: { key: ArtifactType; label: string }[] = [
  { key: 'PROPOSAL',    label: 'Proposal'    },
  { key: 'SRS',         label: 'SRS'         },
  { key: 'SDD',         label: 'SDD'         },
  { key: 'SPMP',        label: 'SPMP'        },
  { key: 'STD',         label: 'STD'         },
  { key: 'SOURCE_CODE', label: 'Source Code' },
];

const READINESS: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  READY:          { label: 'Ready for Submission', color: '#059669', bg: '#ECFDF5', ring: '#A7F3D0' },
  NEEDS_REVISION: { label: 'Needs Revision',        color: '#D97706', bg: '#FFFBEB', ring: '#FDE68A' },
  CRITICAL_GAPS:  { label: 'Critical Gaps Found',   color: '#DC2626', bg: '#FEF2F2', ring: '#FECACA' },
};

function scoreColor(n: number) {
  if (n >= 80) return '#059669';
  if (n >= 60) return '#D97706';
  return '#DC2626';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── stat card ──────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string | number;
  readonly sub?: string;
  readonly color: string;
}) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid #f1f5f9',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        backgroundColor: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────── */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { setGroupId } = useAuthStore();
  const [groups, setGroups]       = useState<ApiGroup[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get('/api/projects');
      const fetched: ApiGroup[] = res.data.groups ?? [];
      setGroups(fetched);
      if (fetched.length > 0) {
        setSelectedId(fetched[0].id);
        setGroupId(fetched[0].id);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [setGroupId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setGroupId(id);
  };

  const group = groups.find((g) => g.id === selectedId) ?? groups[0];

  /* ── project selector shown in hero ── */
  const projectSelector = groups.length > 1 ? (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
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
          minWidth: '200px',
        }}
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id} style={{ backgroundColor: '#1E3A5F', color: '#fff' }}>
            {g.projectTitle || g.name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#D4AF37', pointerEvents: 'none' }} />
    </div>
  ) : null;

  if (loading) {
    return (
      <Layout title="Project Overview" subtitle="Monitor your capstone project progress and audit status" badge="Dashboard" heroIcon={<LayoutGrid size={26} />}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading project…</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout title="Project Overview" subtitle="Monitor your capstone project progress and audit status" badge="Dashboard" heroIcon={<LayoutGrid size={26} />}>
        <Card className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-5">
            <FolderOpen size={28} className="text-slate-300" />
          </div>
          <h2 className="text-[16px] font-bold text-gray-800 mb-2">No workspace found</h2>
          <p className="text-[13px] text-gray-400 mb-6 leading-relaxed max-w-sm mx-auto">
            You haven't joined or created a workspace yet. Head to the Workspaces page to get started.
          </p>
          <Button onClick={() => navigate('/setup')}>
            <FolderOpen size={15} />
            Go to Workspaces
          </Button>
        </Card>
      </Layout>
    );
  }

  const uploadedTypes  = new Set(group.artifacts.map((a) => a.type));
  const uploadedCount  = uploadedTypes.size;
  const latest         = group.auditResults[0];
  const students       = group.members.filter((m) => m.role === 'STUDENT');
  const readiness      = latest ? (READINESS[latest.readinessStatus] ?? null) : null;

  return (
    <Layout
      title="Project Overview"
      subtitle="Monitor your capstone project progress and audit status"
      badge="Dashboard"
      heroIcon={<LayoutGrid size={26} />}
      headerAction={projectSelector}
    >
      <div className="space-y-6 w-full">

        {/* ── Project identity banner ── */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          display: 'flex',
        }}>
          {/* Gold left accent stripe */}
          <div style={{ width: '6px', flexShrink: 0, background: 'linear-gradient(180deg, #D4AF37 0%, #1E3A5F 100%)' }} />

          <div style={{ flex: 1, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            {/* Left: title + meta */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {group.projectTitle || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No project title yet</span>}
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>
                {group.name} · {students.length} member{students.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* Right: readiness badge */}
            {readiness && (
              <div style={{ backgroundColor: readiness.bg, border: `1px solid ${readiness.ring}`, borderRadius: '12px', padding: '10px 18px', textAlign: 'center', alignSelf: 'center' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: readiness.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Status</p>
                <p style={{ fontSize: '13px', fontWeight: 800, color: readiness.color }}>{readiness.label}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Trophy size={20} />}
            label="Audit Score"
            value={latest ? `${latest.overallScore.toFixed(1)}%` : '—'}
            sub={latest ? formatDate(latest.auditedAt) : 'Not audited yet'}
            color={latest ? scoreColor(latest.overallScore) : '#94a3b8'}
          />
          <StatCard
            icon={<Upload size={20} />}
            label="Artifacts"
            value={`${uploadedCount} / ${ARTIFACTS.length}`}
            sub="documents uploaded"
            color="#1E3A5F"
          />
          <StatCard
            icon={<Users size={20} />}
            label="Team"
            value={students.length}
            sub="student members"
            color="#7C3AED"
          />
          <StatCard
            icon={<Activity size={20} />}
            label="Audits Run"
            value={group.auditResults.length}
            sub="total analyses"
            color="#D4AF37"
          />
        </div>

        {/* ── Artifact progress + Team ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Artifact checklist */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[13px] font-bold text-gray-900">Artifact Progress</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{uploadedCount} of {ARTIFACTS.length} documents uploaded</p>
              </div>
              <Button size="sm" onClick={() => navigate('/artifacts')}>
                <Upload size={13} />
                Manage
              </Button>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(uploadedCount / ARTIFACTS.length) * 100}%`,
                  background: 'linear-gradient(90deg, #1E3A5F, #D4AF37)',
                }}
              />
            </div>

            <div className="space-y-2">
              {ARTIFACTS.map(({ key, label }) => {
                const done = uploadedTypes.has(key);
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all ${
                      done
                        ? 'bg-emerald-50/60 border-emerald-100 text-emerald-800'
                        : 'bg-gray-50/50 border-gray-100 text-gray-400'
                    }`}
                  >
                    {done
                      ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      : <Circle       size={15} className="text-gray-300 shrink-0" />
                    }
                    <span className="text-[13px] font-semibold">{label}</span>
                    {done && <span className="ml-auto text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Uploaded</span>}
                    {!done && <span className="ml-auto text-[10px] font-bold text-gray-300 uppercase tracking-wider">Missing</span>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Team members + Latest audit */}
          <div className="space-y-5">
            {/* Team members */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[13px] font-bold text-gray-900">Team Members</p>
                <span className="text-[11px] text-gray-400">{students.length} member{students.length === 1 ? '' : 's'}</span>
              </div>
              {students.length === 0 ? (
                <div className="text-center py-6">
                  <Users size={24} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-[12px] text-gray-400">No members yet</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {students.map((m) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#2d5080] flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{m.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{m.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Latest audit summary */}
            <Card>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
                  <ShieldCheck size={15} className="text-[#1E3A5F]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">Latest Audit</p>
                  <p className="text-[11px] text-gray-400">
                    {latest ? formatDate(latest.auditedAt) : 'No audit run yet'}
                  </p>
                </div>
              </div>

              {latest ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Overall Score</span>
                    <span className="text-[18px] font-extrabold" style={{ color: scoreColor(latest.overallScore) }}>
                      {latest.overallScore.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${latest.overallScore}%`, backgroundColor: scoreColor(latest.overallScore) }}
                    />
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/matrix')}>
                    <TrendingUp size={13} />
                    View Full Matrix
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle size={22} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-[12px] text-gray-400 mb-3">No audit results yet</p>
                  <Button size="sm" onClick={() => navigate('/artifacts')}>
                    Run First Audit
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Upload Artifacts', icon: <Upload size={18} />, color: '#1E3A5F', to: '/artifacts' },
              { label: 'Run Audit',        icon: <GitBranch size={18} />, color: '#D4AF37', to: '/artifacts' },
              { label: 'View Matrix',      icon: <ShieldCheck size={18} />, color: '#059669', to: '/matrix' },
              { label: 'Gap Analysis',     icon: <GitFork size={18} />, color: '#7C3AED', to: '/diagnostics' },
              { label: 'Export Report',    icon: <Download size={18} />, color: '#0891B2', to: '/export' },
              { label: 'View Workspaces',  icon: <FolderOpen size={18} />, color: '#DB2777', to: '/setup' },
              { label: 'Audit History',    icon: <Clock size={18} />, color: '#EA580C', to: '/matrix' },
              { label: 'Diagnostics',      icon: <Activity size={18} />, color: '#64748B', to: '/diagnostics' },
            ].map(({ label, icon, color, to }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-150 text-center group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  {icon}
                </div>
                <span className="text-[12px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
