import React, { useState, useEffect, useCallback } from 'react';
import { FileText, GitBranch, Loader2, ExternalLink, Play, ChevronDown, Layers, Save, CheckCircle2, X } from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import type { ArtifactType } from '../types';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

interface ArtifactField {
  key: ArtifactType;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  description: string;
}

const ARTIFACT_FIELDS: ArtifactField[] = [
  {
    key: 'PROPOSAL',
    label: 'Project Proposal',
    placeholder: 'https://docs.google.com/document/d/…',
    icon: <FileText size={16} />,
    description: 'Initial project proposal document',
  },
  {
    key: 'SRS',
    label: 'Software Requirements Specification',
    placeholder: 'https://docs.google.com/document/d/…',
    icon: <FileText size={16} />,
    description: 'Functional and non-functional requirements',
  },
  {
    key: 'SDD',
    label: 'Software Design Document',
    placeholder: 'https://docs.google.com/document/d/…',
    icon: <FileText size={16} />,
    description: 'System architecture and design decisions',
  },
  {
    key: 'SPMP',
    label: 'Software Project Management Plan',
    placeholder: 'https://docs.google.com/document/d/…',
    icon: <FileText size={16} />,
    description: 'Project schedule, resources, and risk management',
  },
  {
    key: 'STD',
    label: 'Software Test Document',
    placeholder: 'https://docs.google.com/document/d/…',
    icon: <FileText size={16} />,
    description: 'Test cases, plans, and expected results',
  },
  {
    key: 'SOURCE_CODE',
    label: 'GitHub Repository',
    placeholder: 'https://github.com/org/repository',
    icon: <GitBranch size={16} />,
    description: 'Link to the project source code repository',
  },
];

const PREFILLED: Record<ArtifactType, string> = {
  PROPOSAL: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
  SRS: 'https://docs.google.com/document/d/1EvSuRikGHtCQmm5PF_XHEJcjSVrj4lANlnR6J1aMi44',
  SDD: 'https://docs.google.com/document/d/2CrVjhXpnMuE5aXQ3fmtF7KZDRLzR5e8e3Yck9M_X1Eo',
  SPMP: 'https://docs.google.com/document/d/3DsWkYqoNvUF6bYR4gnUG8LZESMzS6f9f4Zdl0N_Y2Fp',
  STD: 'https://docs.google.com/document/d/4EtXlZrpOwVG7cZS5hoVH9MAFTNaT7g0g5Ael1O_Z3Gq',
  SOURCE_CODE: 'https://github.com/team-synctrace/synctrace-app',
};

type Status = 'idle' | 'processing' | 'completed';

interface WorkspaceOption {
  id: string;
  name: string;
  projectTitle: string;
}

export const ArtifactsPage: React.FC = () => {
  const navigate = useNavigate();
  const { groupId } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupId ?? '');
  const [urls, setUrls] = useState<Record<ArtifactType, string>>({
    PROPOSAL: '',
    SRS: '',
    SDD: '',
    SPMP: '',
    STD: '',
    SOURCE_CODE: '',
  });
  const [statuses, setStatuses] = useState<Record<ArtifactType, Status>>({
    PROPOSAL: 'idle',
    SRS: 'idle',
    SDD: 'idle',
    SPMP: 'idle',
    STD: 'idle',
    SOURCE_CODE: 'idle',
  });
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Track which types currently exist in the DB so we can delete on removal
  const [savedTypes, setSavedTypes] = useState<Set<ArtifactType>>(new Set());

  // Fetch all workspaces the student belongs to
  useEffect(() => {
    api.get('/api/projects')
      .then((res) => {
        const groups: Array<{ id: string; name: string; projectTitle: string }> = res.data.groups ?? [];
        setWorkspaces(groups);
        if (!selectedGroupId && groups.length > 0) {
          setSelectedGroupId(groups[0].id);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload artifacts when the selected workspace changes
  const resetUrls = useCallback(() => {
    setUrls({ PROPOSAL: '', SRS: '', SDD: '', SPMP: '', STD: '', SOURCE_CODE: '' });
    setStatuses({ PROPOSAL: 'idle', SRS: 'idle', SDD: 'idle', SPMP: 'idle', STD: 'idle', SOURCE_CODE: 'idle' });
    setSavedTypes(new Set());
  }, []);

  // Load existing artifacts for this group
  useEffect(() => {
    if (!selectedGroupId) return;
    resetUrls();
    api.get(`/api/artifacts/${selectedGroupId}`)
      .then((res) => {
        const saved: Array<{ type: ArtifactType; url: string }> = res.data.artifacts ?? [];
        if (saved.length === 0) return;
        const newUrls: Partial<Record<ArtifactType, string>> = {};
        const types = new Set<ArtifactType>();
        for (const a of saved) {
          newUrls[a.type] = a.url;
          types.add(a.type);
        }
        setUrls((prev) => ({ ...prev, ...newUrls }));
        setSavedTypes(types);
      })
      .catch(() => {/* no existing artifacts */});
  }, [selectedGroupId, resetUrls]);

  const prefill = () => {
    setUrls({ ...PREFILLED });
  };

  const buildFilledArtifacts = () =>
    ARTIFACT_FIELDS
      .filter((f) => urls[f.key].trim() !== '')
      .map((f) => ({ type: f.key, url: urls[f.key].trim() }));

  // Delete types that were in DB but are now empty
  const deleteRemovedTypes = async (gid: string) => {
    const toDelete = ARTIFACT_FIELDS
      .filter((f) => savedTypes.has(f.key) && urls[f.key].trim() === '')
      .map((f) => f.key);
    await Promise.all(
      toDelete.map((type) => api.delete(`/api/artifacts/${gid}/${type}`).catch(() => {})),
    );
    if (toDelete.length > 0) {
      setSavedTypes((prev) => {
        const next = new Set(prev);
        toDelete.forEach((t) => next.delete(t));
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (!selectedGroupId) { setSaveError('No workspace selected.'); return; }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await deleteRemovedTypes(selectedGroupId);
      const filled = buildFilledArtifacts();
      if (filled.length > 0) {
        await api.post('/api/artifacts', { groupId: selectedGroupId, artifacts: filled });
        setSavedTypes(new Set(filled.map((a) => a.type)));
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setSaveError(axiosErr.response?.data?.error ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunTraceability = async () => {
    if (!selectedGroupId) {
      setSaveError('No workspace selected. Please select a workspace above.');
      return;
    }
    setRunning(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Delete removed types then save filled artifacts
    await deleteRemovedTypes(selectedGroupId);
    const filledArtifacts = buildFilledArtifacts();

    try {
      await api.post('/api/artifacts', { groupId: selectedGroupId, artifacts: filledArtifacts });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setSaveError(axiosErr.response?.data?.error ?? 'Failed to save artifacts.');
      setRunning(false);
      return;
    }

    // Run audit
    try {
      await api.post(`/api/audit/${selectedGroupId}`);
    } catch {
      // audit may fail if content extraction not available; proceed to matrix anyway
    }

    const keys = ARTIFACT_FIELDS.map((f) => f.key);
    for (const key of keys) {
      setStatuses((s) => ({ ...s, [key]: 'processing' }));
      await new Promise((r) => setTimeout(r, 400));
      setStatuses((s) => ({ ...s, [key]: 'completed' }));
    }

    await new Promise((r) => setTimeout(r, 300));
    setRunning(false);
    navigate('/matrix');
  };

  const anyFilled = ARTIFACT_FIELDS.some((f) => urls[f.key].trim() !== '');
  const allFilled = ARTIFACT_FIELDS.every((f) => urls[f.key].trim() !== '');
  const completedCount = Object.values(statuses).filter((s) => s === 'completed').length;

  return (
    <Layout
      title="Artifact Submission"
      subtitle="Submit document URLs for AI-powered traceability analysis"
      headerAction={
        <Button variant="outline" size="sm" onClick={prefill}>
          Load Demo Data
        </Button>
      }
    >
      <div className="max-w-2xl space-y-4">
        {/* Visual progress steps */}
        <div className="grid grid-cols-4 gap-2 border-b border-gray-100 pb-3 mb-1">
          {[
            { step: 1, name: 'Select Group', desc: 'Choose workspace', active: true },
            { step: 2, name: 'Submit Links', desc: 'Paste document URLs', active: true },
            { step: 3, name: 'Save Work', desc: 'Save progress anytime', active: anyFilled },
            { step: 4, name: 'Run Audit', desc: 'AI sequential analysis', active: allFilled || running },
          ].map((s) => (
            <div key={s.step} className="flex flex-col border-t-2 pt-2 transition-all duration-300" style={{ borderColor: s.active ? '#fbbf24' : '#e2e8f0' }}>
              <span className={`text-[10px] font-extrabold ${s.active ? 'text-primary' : 'text-gray-400'}`}>0{s.step}</span>
              <span className={`text-[11.5px] font-bold mt-0.5 ${s.active ? 'text-gray-950 font-extrabold' : 'text-gray-400 font-medium'}`}>{s.name}</span>
              <span className="text-[10px] text-gray-400 leading-none">{s.desc}</span>
            </div>
          ))}
        </div>

        {/* Workspace selector */}
        {workspaces.length > 1 && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Layers size={15} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.06em] mb-1">Workspace</p>
              <div className="relative">
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  disabled={running}
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

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100 ring-1 ring-blue-100/50">
          <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-white text-[11px] font-bold">i</span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-blue-900">Google Docs & GitHub URLs supported</p>
            <p className="text-[12px] text-blue-500 mt-0.5 leading-relaxed">
              Paste shareable Google Docs links or GitHub repository URLs. Documents are analyzed via AI embedding.
            </p>
          </div>
        </div>

        {/* Artifact inputs */}
        <Card>
          <h2 className="text-[15px] font-bold text-gray-900 mb-5 tracking-tight">Document URLs</h2>
          <div className="space-y-5">
            {ARTIFACT_FIELDS.map((field, idx) => {
              const status = statuses[field.key];
              return (
                <div key={field.key} className="animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
                      <span className={status === 'completed' ? 'text-emerald-500' : 'text-gray-400'}>{field.icon}</span>
                      {field.label}
                    </label>
                    {status === 'processing' && (
                      <span className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold">
                        <Loader2 size={11} className="animate-spin" />
                        Analyzing…
                      </span>
                    )}
                    {status === 'completed' && (
                      <Badge variant="completed" dot>Analyzed</Badge>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="url"
                      value={urls[field.key]}
                      onChange={(e) => setUrls((u) => ({ ...u, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      disabled={running}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-150 disabled:opacity-60 ${
                        urls[field.key] ? 'pr-16' : 'pr-10'
                      } ${
                        status === 'completed'
                          ? 'border-emerald-200 bg-emerald-50/50 text-gray-700 ring-1 ring-emerald-100'
                          : 'border-gray-200 bg-white text-gray-900 shadow-inner-sm hover:border-gray-300'
                      }`}
                    />
                    {urls[field.key] && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <a
                          href={urls[field.key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-300 hover:text-primary transition-colors"
                          tabIndex={-1}
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => setUrls((u) => ({ ...u, [field.key]: '' }))}
                          disabled={running}
                          className="text-gray-300 hover:text-critical transition-colors disabled:opacity-40"
                          title="Remove link"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Dynamic link visual feedback */}
                  {urls[field.key] && (
                    <div className="flex flex-col">
                      {urls[field.key].includes('docs.google.com/document/d/') && (
                        <span className="inline-flex max-w-fit items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-full mt-1.5 transition-all animate-fade-in uppercase tracking-wider">
                          <Sparkles size={10} className="text-emerald-500 animate-pulse animate-bounce" />
                          Google Doc detected (AI Extraction ready)
                        </span>
                      )}
                      {urls[field.key].includes('github.com/') && (
                        <span className="inline-flex max-w-fit items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-full mt-1.5 transition-all animate-fade-in uppercase tracking-wider">
                          <Sparkles size={10} className="text-blue-500 animate-pulse animate-bounce" />
                          GitHub Repo detected (Auto-README Review ready)
                        </span>
                      )}
                      {(urls[field.key].startsWith('http://') || urls[field.key].startsWith('https://')) && !urls[field.key].includes('docs.google.com/document/d/') && !urls[field.key].includes('github.com/') && (
                        <span className="inline-flex max-w-fit items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-150 px-2 py-0.5 rounded-full mt-1.5 transition-all animate-fade-in uppercase tracking-wider">
                          Web standard link (Raw Indexing active)
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1 font-medium">{field.description}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Progress bar */}
        {running && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/[0.04] border border-primary/10 ring-1 ring-primary/10">
            <Loader2 size={17} className="animate-spin text-primary shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="font-semibold text-gray-700">Running AI Traceability Analysis…</span>
                <span className="text-gray-400 font-medium">{completedCount}/{ARTIFACT_FIELDS.length}</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / ARTIFACT_FIELDS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-semibold animate-fade-in">
              <CheckCircle2 size={13} />
              Saved
            </span>
          )}
          {saveError && <p className="text-[12.5px] text-critical">{saveError}</p>}
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!anyFilled || saving || running}
            loading={saving}
          >
            <Save size={14} />
            Save Progress
          </Button>
          <Button
            size="lg"
            onClick={handleRunTraceability}
            disabled={!allFilled || running || saving}
            loading={running}
          >
            <Play size={16} />
            {running ? 'Running Analysis…' : 'Run Traceability'}
          </Button>
        </div>
      </div>
    </Layout>
  );
};
