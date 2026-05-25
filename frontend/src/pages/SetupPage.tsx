import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hash, AlertCircle, Plus, X,
  FolderOpen, Activity
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

/* ─── helpers ─────────────────────────────────────────────── */
function auditScoreColor(n: number): string {
  if (n >= 80) return '#059669';
  if (n >= 60) return '#D97706';
  return '#DC2626';
}

/* ─── workspace card ─────────────────────────────────────── */
function WorkspaceCard({ group }: { readonly group: ApiGroup }) {
  const navigate = useNavigate();
  const uploadedTypes = new Set(group.artifacts.map((a) => a.type));
  const uploadedCount = uploadedTypes.size;
  const latest   = group.auditResults[0];
  const students = group.members.filter((m) => m.role === 'STUDENT');

  return (
    <article style={{
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 24px rgba(30,58,95,0.09)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Dark header ─────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0B1521 0%, #1E3A5F 100%)',
        padding: '20px 22px 18px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.9) 1px,transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        {/* Gold glow orb */}
        <div style={{
          position: 'absolute', top: '-24px', right: '-24px', width: '100px', height: '100px',
          background: 'radial-gradient(circle,rgba(212,175,55,0.28) 0%,transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.projectTitle || <em style={{ color: '#475569', fontStyle: 'italic', fontWeight: 500 }}>Untitled Project</em>}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '8px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 700, color: '#D4AF37',
                backgroundColor: 'rgba(212,175,55,0.13)', border: '1px solid rgba(212,175,55,0.28)',
                borderRadius: '6px', padding: '2px 8px', letterSpacing: '0.03em',
              }}>{group.name}</span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                {students.length} member{students.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Score badge */}
          {latest ? (
            <div style={{
              textAlign: 'center', flexShrink: 0,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px', padding: '10px 16px',
              backdropFilter: 'blur(8px)',
            }}>
              <p style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: auditScoreColor(latest.overallScore), lineHeight: 1, letterSpacing: '-0.03em' }}>
                {latest.overallScore.toFixed(0)}<span style={{ fontSize: '13px', fontWeight: 700 }}>%</span>
              </p>
              <p style={{ fontSize: '8px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '5px 0 0' }}>Score</p>
            </div>
          ) : (
            <span style={{
              fontSize: '10px', fontWeight: 600, color: '#475569',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '6px 12px', flexShrink: 0, alignSelf: 'flex-start',
            }}>No audit</span>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────── */}
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>

        {/* Artifact segments */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Artifacts</span>
            <span style={{
              fontSize: '11px', fontWeight: 800, color: '#1E3A5F',
              backgroundColor: '#eff6ff', borderRadius: '6px', padding: '2px 9px',
            }}>{uploadedCount} / {ARTIFACTS.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {ARTIFACTS.map(({ key, short }) => {
              const done = uploadedTypes.has(key);
              return (
                <div key={key} title={short} style={{
                  flex: 1, height: '8px', borderRadius: '4px',
                  background: done ? 'linear-gradient(90deg,#c9a227,#D4AF37)' : '#e9eef5',
                  boxShadow: done ? '0 1px 6px rgba(212,175,55,0.45)' : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }} />
              );
            })}
          </div>
          <div style={{ height: '3px', borderRadius: '99px', overflow: 'hidden', backgroundColor: '#f1f5f9', marginTop: '8px' }}>
            <div style={{
              height: '100%', borderRadius: '99px', transition: 'width 0.5s',
              width: `${(uploadedCount / ARTIFACTS.length) * 100}%`,
              background: 'linear-gradient(90deg,#1E3A5F,#D4AF37)',
            }} />
          </div>
        </div>

        {/* Footer: avatars + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
          {/* Avatar stack */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex' }}>
              {students.slice(0, 4).map((m, i) => (
                <div key={m.id} title={m.name} style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,#1E3A5F,#2d5a9e)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 800, color: '#D4AF37',
                  border: '2px solid #fff', marginLeft: i === 0 ? 0 : '-8px',
                  boxShadow: '0 1px 4px rgba(30,58,95,0.2)',
                }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            {students.length > 4 && (
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginLeft: '2px' }}>+{students.length - 4}</span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {([
              { label: 'Artifacts', path: '/artifacts' },
              { label: 'Audit',     path: '/matrix'    },
              { label: 'Export',    path: '/export'    },
            ] as const).map(({ label, path }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(path)}
                style={{
                  fontSize: '11px', fontWeight: 700, color: '#1E3A5F',
                  backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '8px', padding: '5px 11px', cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ─── init workspace modal ───────────────────────────────── */
function InitModal({
  onClose,
  onCreated,
}: {
  readonly onClose: () => void;
  readonly onCreated: (group: ApiGroup) => void;
}) {
  const { setGroupId } = useAuthStore();
  const [projectTitle, setProjectTitle] = useState('');
  const [teamCode, setTeamCode]         = useState('');
  const [adviserId, setAdviserId]       = useState('');
  const emailKeyRef = React.useRef(1);
  const [memberEmails, setMemberEmails] = useState<{ key: number; value: string }[]>([{ key: 0, value: '' }]);
  const [faculty, setFaculty]           = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading]           = useState(false);
  const [errors, setErrors]             = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/api/users/faculty')
      .then((res) => setFaculty(res.data.faculty ?? []))
      .catch(() => {});
  }, []);

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!projectTitle.trim())
      e.projectTitle = 'Project title is required.';
    if (!teamCode.trim())
      e.teamCode = 'Team code is required.';
    else if (!/^[A-Z0-9-]+$/i.test(teamCode.trim()))
      e.teamCode = 'Only letters, numbers, and hyphens allowed.';
    if (!adviserId)
      e.adviserId = 'Please select a faculty adviser.';
    const bad = memberEmails.filter((item) => item.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.value.trim()));
    if (bad.length > 0)
      e.memberEmails = 'One or more email addresses are invalid.';
    return e;
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});
    try {
      const res = await api.post('/api/projects/init', {
        projectTitle: projectTitle.trim(),
        teamCode:     teamCode.trim().toUpperCase(),
        adviserId,
        memberEmails: memberEmails.filter((item) => item.value.trim()).map((item) => item.value.trim()),
      });
      setGroupId(res.data.group.id);
      onCreated(res.data.group as ApiGroup);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setErrors({ form: axErr.response?.data?.error ?? 'Failed to create workspace.' });
    } finally {
      setLoading(false);
    }
  };

  const addEmail    = () => {
    const key = emailKeyRef.current++;
    setMemberEmails((prev) => [...prev, { key, value: '' }]);
  };
  const updateEmail = (key: number, val: string) =>
    setMemberEmails((prev) => prev.map((item) => (item.key === key ? { ...item, value: val } : item)));
  const removeEmail = (key: number) =>
    setMemberEmails((prev) => prev.filter((item) => item.key !== key));

  const steps = [
    { n: 1, label: 'Project' },
    { n: 2, label: 'Team Code' },
    { n: 3, label: 'Adviser' },
    { n: 4, label: 'Members' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <dialog
        className="relative w-full max-w-lg flex flex-col max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl bg-transparent p-0 m-auto"
        open
        aria-modal="true"
      >
        {/* Dark hero header */}
        <div
          className="px-7 py-6 shrink-0"
          style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 60%, #1E3A5F 100%)' }}
        >
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-gold/15 border border-brand-gold/25 flex items-center justify-center shrink-0">
                <FolderOpen size={22} className="text-brand-gold" />
              </div>
              <div>
                <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.25em] mb-1">New Workspace</p>
                <h2 className="text-[18px] font-black text-white tracking-tight">Initialize Project Workspace</h2>
                <p className="text-[11px] text-white/35 font-semibold mt-0.5">Create your capstone group from scratch</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-all shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          {/* Step track */}
          <div className="flex items-center gap-1">
            {steps.map(({ n, label }, idx) => (
              <React.Fragment key={n}>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-black text-white/70">{n}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white/45 whitespace-nowrap">{label}</span>
                </div>
                {idx < steps.length - 1 && <div className="flex-1 h-px bg-white/10" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="bg-white px-7 py-5 space-y-4 overflow-y-auto flex-1">

          {/* 1 · Project Title */}
          <div>
            <label htmlFor="init-title" className="block text-[11px] font-black text-brand-navy/40 uppercase tracking-[0.12em] mb-1.5">
              Project Title <span className="text-red-400">*</span>
            </label>
            <input
              id="init-title"
              value={projectTitle}
              onChange={(e) => { setProjectTitle(e.target.value); setErrors((p) => ({ ...p, projectTitle: '' })); }}
              placeholder="e.g. AI-Powered Traceability System"
              className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white ${errors.projectTitle ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errors.projectTitle && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} />{errors.projectTitle}
              </p>
            )}
          </div>

          {/* 2 · Team Code */}
          <div>
            <label htmlFor="init-code" className="block text-[11px] font-black text-brand-navy/40 uppercase tracking-[0.12em] mb-1.5">
              Team Code <span className="text-red-400">*</span>
            </label>
            <input
              id="init-code"
              value={teamCode}
              onChange={(e) => { setTeamCode(e.target.value.toUpperCase()); setErrors((p) => ({ ...p, teamCode: '' })); }}
              placeholder="e.g. G4-2025A"
              className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] font-mono text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white tracking-wider ${errors.teamCode ? 'border-red-300' : 'border-gray-200'}`}
            />
            <p className="text-[11px] text-gray-400 mt-1">A unique identifier your teammates will use to join (e.g. G4-2025A).</p>
            {errors.teamCode && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} />{errors.teamCode}
              </p>
            )}
          </div>

          {/* 3 · Faculty Adviser */}
          <div>
            <label htmlFor="init-adviser" className="block text-[11px] font-black text-brand-navy/40 uppercase tracking-[0.12em] mb-1.5">
              Faculty Adviser <span className="text-red-400">*</span>
            </label>
            {faculty.length === 0 ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-100 rounded-xl bg-gray-50">
                <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                <span className="text-[12px] text-gray-400">Loading advisers…</span>
              </div>
            ) : (
              <select
                id="init-adviser"
                value={adviserId}
                onChange={(e) => { setAdviserId(e.target.value); setErrors((p) => ({ ...p, adviserId: '' })); }}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white ${errors.adviserId ? 'border-red-300' : 'border-gray-200'}`}
              >
                <option value="">Select an adviser…</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
            {errors.adviserId && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} />{errors.adviserId}
              </p>
            )}
          </div>

          {/* 4 · Team Member Emails */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black text-brand-navy/40 uppercase tracking-[0.12em]">
                Team Members{' '}
                <span className="text-gray-300 normal-case font-normal">(Google emails)</span>
              </label>
              <button
                type="button"
                onClick={addEmail}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-dark transition-colors"
              >
                <Plus size={11} />Add
              </button>
            </div>
            <div className="space-y-2">
              {memberEmails.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <input
                    type="email"
                    value={item.value}
                    onChange={(e) => { updateEmail(item.key, e.target.value); setErrors((p) => ({ ...p, memberEmails: '' })); }}
                    placeholder="member@gmail.com"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-[12.5px] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white"
                  />
                  {memberEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(item.key)}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.memberEmails && (
              <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                <AlertCircle size={10} />{errors.memberEmails}
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1.5">
              Only registered Google accounts will be added; unknown emails are skipped gracefully.
            </p>
          </div>

          {/* Form-level error */}
          {errors.form && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{errors.form}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1 pb-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">
              <FolderOpen size={14} />
              Create Workspace
            </Button>
          </div>
        </form>
      </dialog>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <dialog
        className="relative w-full max-w-md flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-transparent p-0 m-auto"
        open
        aria-modal="true"
      >
        {/* Dark hero header */}
        <div
          className="px-7 pt-7 pb-6 shrink-0"
          style={{ background: 'linear-gradient(135deg, #0B1521 0%, #162D4A 60%, #1E3A5F 100%)' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-gold/15 border border-brand-gold/25 flex items-center justify-center shrink-0">
                <Hash size={22} className="text-brand-gold" />
              </div>
              <div>
                <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.25em] mb-1">Team Code</p>
                <h2 className="text-[18px] font-black text-white tracking-tight">Join a Workspace</h2>
                <p className="text-[11px] text-white/35 font-semibold mt-0.5">Enter your section code to connect</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-all shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleJoin} className="bg-white px-7 py-6 space-y-4">
          <div>
            <label htmlFor="jm-code" className="block text-[11px] font-black text-brand-navy/40 uppercase tracking-[0.12em] mb-1.5">
              Section Code <span className="text-red-400">*</span>
            </label>
            <input
              id="jm-code"
              required
              value={teamCode}
              onChange={(e) => { setTeamCode(e.target.value); setError(null); }}
              placeholder="e.g. G1-X4K2AB"
              className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-[15px] font-mono text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white tracking-widest"
            />
          </div>

          <div>
            <label htmlFor="jm-title" className="block text-[11px] font-black text-brand-navy/40 uppercase tracking-[0.12em] mb-1.5">
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
              Only applied if the group does not have a title yet — the first member to join sets it.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1 pb-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">Join Workspace</Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────── */
export const SetupPage: React.FC = () => {
  const { setGroupId } = useAuthStore();
  const [groups, setGroups]           = useState<ApiGroup[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showJoin, setShowJoin]       = useState(false);
  const [showInit, setShowInit]       = useState(false);

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

  const handleCreated = (group: ApiGroup) => {
    setGroups((prev) => {
      const exists = prev.some((g) => g.id === group.id);
      return exists ? prev.map((g) => g.id === group.id ? group : g) : [group, ...prev];
    });
    setShowInit(false);
  };

  /* Loading */
  if (pageLoading) {
    return (
      <Layout title="My Workspaces" subtitle="All your capstone projects and team groups" badge="Workspaces" heroIcon={<FolderOpen size={26} />}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading workspace…</p>
          </div>
      </Layout>
    );
  }

  /* No groups → inline join prompt */
  if (groups.length === 0) {
    return (
      <Layout title="My Workspaces" subtitle="All your capstone projects and team groups" badge="Workspaces" heroIcon={<FolderOpen size={26} />}>
          <Card className="text-center py-14">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-5">
              <Activity size={28} className="text-slate-300" />
            </div>
            <h2 className="text-[16px] font-bold text-gray-800 mb-2">No workspace yet</h2>
            <p className="text-[13px] text-gray-400 mb-7 leading-relaxed">
              Set up your capstone project workspace as team leader, or join an existing group with a team code.
            </p>
            <div className="flex flex-col items-center gap-3 w-full">
              <Button onClick={() => setShowInit(true)} className="w-full">
                <FolderOpen size={15} />
                Initialize Workspace
              </Button>
              <button
                type="button"
                onClick={() => setShowJoin(true)}
                className="text-[12.5px] font-semibold text-gray-500 hover:text-primary transition-colors"
              >
                Already have a team code? Join existing →
              </button>
            </div>
          </Card>

        {showInit && (
          <InitModal onClose={() => setShowInit(false)} onCreated={handleCreated} />
        )}
        {showJoin && (
          <JoinModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />
        )}
      </Layout>
    );
  }

  /* Has groups → overview */

  return (
    <Layout
      title="My Workspaces"
      subtitle="All your capstone projects and team groups"
      badge="Workspaces"
      heroIcon={<FolderOpen size={26} />}
      headerAction={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowInit(true)} className="hover:scale-105 active:scale-95 transition-transform duration-150">
            <FolderOpen size={15} />
            New Workspace
          </Button>
          <Button onClick={() => setShowJoin(true)} className="hover:scale-105 active:scale-95 transition-transform duration-150">
            <Plus size={15} />
            Join Another
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {groups.map((group) => (
            <WorkspaceCard key={group.id} group={group} />
          ))}
        </div>
      </div>

      {showInit && (
        <InitModal onClose={() => setShowInit(false)} onCreated={handleCreated} />
      )}
      {showJoin && (
        <JoinModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />
      )}
    </Layout>
  );
};
