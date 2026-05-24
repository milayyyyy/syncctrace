import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hash, AlertCircle, Users, Upload, GitBranch, GitFork,
  Download, CheckCircle2, Circle, Copy, Check, Plus, X,
  FolderOpen, Activity, Sparkles, Trophy, Files
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

/* ─── artifact checklist order ───────────────────────────── */
const ARTIFACTS: { key: ArtifactType; short: string }[] = [
  { key: 'PROPOSAL',    short: 'Proposal'  },
  { key: 'SRS',         short: 'SRS'       },
  { key: 'SDD',         short: 'SDD'       },
  { key: 'SPMP',        short: 'SPMP'      },
  { key: 'STD',         short: 'STD'       },
  { key: 'SOURCE_CODE', short: 'Source'    },
];

/* ─── readiness colours ───────────────────────────────────── */
const READINESS: Record<string, { label: string; cls: string }> = {
  READY:           { label: 'Ready',          cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  NEEDS_REVISION:  { label: 'Needs Revision', cls: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200'   },
  CRITICAL_GAPS:   { label: 'Critical Gaps',  cls: 'bg-red-50     text-red-700     ring-1 ring-red-200'     },
};

/* ─── helpers ─────────────────────────────────────────────── */
function scoreColor(n: number) {
  if (n >= 80) return 'text-emerald-600';
  if (n >= 60) return 'text-amber-500';
  return 'text-red-500';
}

/* ─── sub-components ─────────────────────────────────────── */
function CopyButton({ text }: { readonly text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1 text-[11px] font-semibold text-primary/70 hover:text-primary transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ─── workspace card ─────────────────────────────────────── */
function WorkspaceCard({ group }: { readonly group: ApiGroup }) {
  const navigate = useNavigate();
  const uploadedTypes = new Set(group.artifacts.map((a) => a.type));
  const uploadedCount = uploadedTypes.size;
  const latest = group.auditResults[0];
  const students = group.members.filter((m) => m.role === 'STUDENT');

  return (
    <Card className="border-gray-100 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 active:scale-[0.998] transition-all duration-300 relative overflow-hidden bg-white shadow-card group">
      {/* Decorative gradient highlight on card hover */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-amber-400 to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 group-hover:scale-105 transition-all duration-300">
            <FolderOpen size={20} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-primary/80 bg-primary/8 px-2.5 py-0.5 rounded-full border border-primary/15 uppercase tracking-wider shadow-sm">
                {group.name}
              </span>
              {group.projectTitle && (
                <h3 className="text-[15px] font-bold text-gray-900 group-hover:text-primary transition-colors duration-200">{group.projectTitle}</h3>
              )}
              {!group.projectTitle && (
                <h3 className="text-[15px] font-semibold text-gray-400 italic">No project title yet</h3>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-mono text-[12px] text-gray-400 tracking-wider bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">{group.teamCode}</span>
              <CopyButton text={group.teamCode} />
            </div>
          </div>
        </div>

        {/* Audit score */}
        {latest ? (
          <div className="text-right shrink-0">
            <p className={`text-2xl font-extrabold tabular-nums tracking-tight filter drop-shadow-sm ${scoreColor(latest.overallScore)}`}>
              {latest.overallScore.toFixed(1)}%
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-inner-sm uppercase tracking-wide ${READINESS[latest.readinessStatus]?.cls ?? ''}`}>
              {READINESS[latest.readinessStatus]?.label ?? latest.readinessStatus}
            </span>
          </div>
        ) : (
          <span className="text-[11px] bg-slate-50 border border-slate-100 text-gray-400 px-2.5 py-1 rounded-full font-semibold shrink-0">Not audited yet</span>
        )}
      </div>

      {/* Artifact progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">
            Artifact Progress
          </p>
          <p className="text-[11px] font-extrabold text-primary-dark">
            {uploadedCount} / {ARTIFACTS.length} uploaded
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-[#fbbf24] to-primary/80 transition-all duration-500 shadow-sm"
            style={{ width: `${(uploadedCount / ARTIFACTS.length) * 100}%` }}
          />
        </div>
        {/* Checklist pills */}
        <div className="flex flex-wrap gap-1.5">
          {ARTIFACTS.map(({ key, short }) => {
            const done = uploadedTypes.has(key);
            return (
              <div
                key={key}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11.5px] font-semibold border transition-all duration-300 transform hover:scale-[1.03] cursor-default shadow-inner-sm ${
                  done
                    ? 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700 hover:border-emerald-300'
                    : 'bg-gray-50/50 border-gray-100 text-gray-400'
                }`}
              >
                {done
                  ? <CheckCircle2 size={11} className="text-emerald-500 animate-pulse" />
                  : <Circle size={11} className="text-gray-300" />
                }
                {short}
              </div>
            );
          })}
        </div>
      </div>

      {/* Members */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-gray-300" />
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.07em]">
            Team Members
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {students.slice(0, 5).map((m) => (
              <div
                key={m.id}
                title={m.name}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-md transform hover:translate-y-[-2px] transition-transform duration-150 cursor-pointer"
              >
                {m.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {students.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-gray-500 text-[9px] font-bold border-2 border-white shadow">
                +{students.length - 5}
              </div>
            )}
          </div>
          <span className="text-[12px] text-gray-400 ml-1 font-medium">
            {students.length} member{students.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-100">
        <Button size="sm" className="flex-1 hover:scale-[1.02] active:scale-[0.98] transition-transform" onClick={() => navigate('/artifacts')}>
          <Upload size={13} />
          Artifacts
        </Button>
        <button
          onClick={() => navigate('/matrix')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 text-[12.5px] font-semibold text-gray-600 hover:border-primary/40 hover:text-primary hover:bg-primary/[0.02] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <GitBranch size={13} />
          Audit
        </button>
        <button
          onClick={() => navigate('/diagnostics')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 text-[12.5px] font-semibold text-gray-600 hover:border-primary/40 hover:text-primary hover:bg-primary/[0.02] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <GitFork size={13} />
          Gaps
        </button>
        <button
          onClick={() => navigate('/export')}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 text-[12.5px] font-semibold text-gray-600 hover:border-primary/40 hover:text-primary hover:bg-primary/[0.02] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Download size={13} />
        </button>
      </div>
    </Card>
  );
}

/* ─── join form modal ────────────────────────────────────── */
function JoinModal({
  onClose,
  onJoined,
}: {
  readonly onClose: () => void;
  readonly onJoined: (group: ApiGroup) => void;
}) {
  const { setGroupId } = useAuthStore();
  const [teamCode, setTeamCode]       = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const handleJoin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!teamCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/projects/join', {
        teamCode: teamCode.trim(),
        projectTitle: projectTitle.trim() || undefined,
      });
      setGroupId(res.data.group.id);
      onJoined(res.data.group as ApiGroup);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error ?? 'Failed to join. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Hash size={15} className="text-primary" />
            </div>
            <h2 className="text-[15px] font-bold text-gray-900">Join a Workspace</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleJoin} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="jm-code" className="block text-[11.5px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-1.5">
              Section Code <span className="text-red-400">*</span>
            </label>
            <input
              id="jm-code"
              required
              value={teamCode}
              onChange={(e) => { setTeamCode(e.target.value); setError(null); }}
              placeholder="e.g. G1-X4K2AB"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[13px] font-mono text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white tracking-wider"
            />
          </div>

          <div>
            <label htmlFor="jm-title" className="block text-[11.5px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-1.5">
              Project Title
            </label>
            <input
              id="jm-title"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g. AI-Powered Traceability System"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Only applied if the group doesn't have a title yet — the first member to join sets it.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">Join Workspace</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────── */
export const SetupPage: React.FC = () => {
  const { setGroupId } = useAuthStore();
  const [groups, setGroups]           = useState<ApiGroup[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showJoin, setShowJoin]       = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get('/api/projects');
      const fetched: ApiGroup[] = res.data.groups ?? [];
      setGroups(fetched);
      if (fetched.length > 0) setGroupId(fetched[0].id);
    } catch { /* non-fatal */ }
    finally { setPageLoading(false); }
  }, [setGroupId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleJoined = (group: ApiGroup) => {
    setGroups((prev) => {
      const exists = prev.some((g) => g.id === group.id);
      return exists ? prev.map((g) => g.id === group.id ? group : g) : [group, ...prev];
    });
    setShowJoin(false);
  };

  /* Loading */
  if (pageLoading) {
    return (
      <Layout title="Workspace" subtitle="Your capstone projects and team overview">
        <div className="flex items-center justify-center mt-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading workspace…</p>
          </div>
        </div>
      </Layout>
    );
  }

  /* No groups → inline join prompt */
  if (groups.length === 0) {
    return (
      <Layout title="Workspace" subtitle="Your capstone projects and team overview">
        <div className="max-w-md mx-auto mt-16">
          <Card className="text-center py-14">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-5">
              <Activity size={28} className="text-slate-300" />
            </div>
            <h2 className="text-[16px] font-bold text-gray-800 mb-2">No workspace yet</h2>
            <p className="text-[13px] text-gray-400 mb-7 leading-relaxed">
              Ask your adviser for a section code and join your capstone group to get started.
            </p>
            <Button onClick={() => setShowJoin(true)}>
              <Plus size={15} />
              Join a Workspace
            </Button>
          </Card>
        </div>

        {showJoin && (
          <JoinModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />
        )}
      </Layout>
    );
  }

  /* Has groups → overview */
  const totalArtifacts = groups.reduce((acc, g) => acc + g.artifacts.length, 0);
  const auditedGroups = groups.filter((g) => g.auditResults.length > 0);
  const avgScore = auditedGroups.length > 0
    ? auditedGroups.reduce((acc, g) => acc + (g.auditResults[0]?.overallScore ?? 0), 0) / auditedGroups.length
    : null;

  return (
    <Layout
      title="Workspace"
      subtitle="Your capstone projects and team overview"
      headerAction={
        <Button onClick={() => setShowJoin(true)} className="hover:scale-105 active:scale-95 transition-transform duration-150">
          <Plus size={15} />
          Join Another
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Welcome greeting banner card */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0f172a] text-white p-6 shadow-xl border border-slate-800">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_70%_10%,rgba(245,158,11,0.15)_0%,transparent_60%)]" />
            <div className="absolute -bottom-10 left-10 w-60 h-60 bg-[radial-gradient(circle_at_30%_90%,rgba(14,165,233,0.1)_0%,transparent_60%)]" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '30px 40px' }} />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-white/[0.07] border border-white/[0.1] rounded-full px-3 py-1">
                <Sparkles size={12} className="text-amber-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Continuous Assessment Active</span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
                Welcome back to <span className="text-amber-400">SyncTrace</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Your sequence auditing progress is continually monitored. Submit matching artifacts and target all gap analyses to maximize capstone readiness scores!
              </p>
            </div>

            {/* Quick Stat indicators */}
            <div className="grid grid-cols-3 gap-3 md:w-auto w-full shrink-0">
              <div className="bg-white/[0.04] border border-white/[0.06] p-3 rounded-2xl text-center min-w-[90px] backdrop-blur-sm">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-1.5">
                  <Activity size={13} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspaces</p>
                <p className="text-md font-extrabold text-white mt-0.5">{groups.length}</p>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] p-3 rounded-2xl text-center min-w-[90px] backdrop-blur-sm">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-1.5">
                  <Files size={13} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Artifacts</p>
                <p className="text-md font-extrabold text-white mt-0.5">{totalArtifacts}</p>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] p-3 rounded-2xl text-center min-w-[90px] backdrop-blur-sm">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-1.5">
                  <Trophy size={13} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Score</p>
                <p className="text-md font-extrabold text-white mt-0.5">
                  {typeof avgScore === 'number' ? `${avgScore.toFixed(0)}%` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {groups.map((group) => (
            <WorkspaceCard key={group.id} group={group} />
          ))}
        </div>
      </div>

      {showJoin && (
        <JoinModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />
      )}
    </Layout>
  );
};
