import React, { useState, useEffect, useCallback } from 'react';
import { FileText, GitBranch, Loader2, ExternalLink, Play, ChevronDown, Save, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Layout } from '../components/shared/Layout';
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
    icon: <FileText />,
    description: 'Initial project proposal document',
  },
  {
    key: 'SRS',
    label: 'Software Requirements Specification',
    placeholder: 'https://docs.google.com/document/d/…',
    icon: <FileText />,
    description: 'Functional and non-functional requirements',
  },
  {
    key: 'SDD',
    label: 'Software Design Document',
    placeholder: 'https://docs.google.com/document/d/…',
    icon: <FileText />,
    description: 'System architecture and design decisions',
  },
  {
    key: 'SPMP',
    label: 'Software Project Management Plan',
    placeholder: 'https://docs.google.com/document/d/…',
    icon: <FileText />,
    description: 'Project schedule, resources, and risk management',
  },
  {
    key: 'STD',
    label: 'Software Test Document',
    placeholder: 'https://docs.google.com/document/d/…',
    icon: <FileText />,
    description: 'Test cases, plans, and expected results',
  },
  {
    key: 'SOURCE_CODE',
    label: 'GitHub Repository',
    placeholder: 'https://github.com/org/repository',
    icon: <GitBranch />,
    description: 'Link to the project source code repository',
  },
];

// Ordered processing pipeline steps that match the use case flow
function cardBorderColor(hasError: boolean, hasUrl: boolean): string {
  if (hasError) return '#fca5a5';
  if (hasUrl) return '#D4AF37';
  return '#e2e8f0';
}
function cardIconBg(hasError: boolean, hasUrl: boolean): string {
  if (hasError) return '#fef2f2';
  if (hasUrl) return '#D4AF37';
  return '#f1f5f9';
}
function cardIconColor(hasError: boolean, hasUrl: boolean): string {
  if (hasError) return '#ef4444';
  if (hasUrl) return '#ffffff';
  return '#94a3b8';
}
function cardTopBar(hasError: boolean, hasUrl: boolean): string {
  if (hasUrl && !hasError) return 'linear-gradient(90deg,#1E3A5F,#D4AF37)';
  if (hasError) return '#ef4444';
  return '#f1f5f9';
}
function stepBg(isCurrent: boolean, isDone: boolean): string {
  if (isCurrent) return '#ffffff';
  if (isDone) return 'rgba(5,150,105,0.08)';
  return 'rgba(255,255,255,0.04)';
}
function stepBorder(isCurrent: boolean, isDone: boolean): string {
  if (isCurrent) return '#ffffff';
  if (isDone) return 'rgba(5,150,105,0.2)';
  return 'rgba(255,255,255,0.07)';
}
function stepIconBg(isCurrent: boolean, isDone: boolean): string {
  if (isDone) return '#059669';
  if (isCurrent) return '#1E3A5F';
  return 'rgba(255,255,255,0.08)';
}
function stepTextColor(isCurrent: boolean, isDone: boolean): string {
  if (isCurrent) return '#0f172a';
  if (isDone) return '#6ee7b7';
  return '#64748b';
}

const PIPELINE_STEPS = [
  'Saving artifact sources',
  'Retrieving and extracting document text',
  'Analyzing traceability pairs with Large Language Model',
  'Generating comprehensive audit report',
] as const;

// Returns an error message if the URL is not a supported format, null if valid
function validateArtifactUrl(url: string): string | null {
  if (!url.trim()) return null;
  if (!url.startsWith('http://') && !url.startsWith('https://'))
    return 'URL must start with https://';
  const ok =
    url.includes('docs.google.com/document/d/') ||
    url.includes('drive.google.com/') ||
    url.includes('github.com/');
  return ok ? null : 'Unsupported URL — use a Google Docs, Google Drive, or GitHub link';
}

interface ArtifactCardProps {
  field: ArtifactField;
  val: string;
  error: string | undefined;
  running: boolean;
  onChange: (key: ArtifactType, value: string) => void;
  onClear: (key: ArtifactType) => void;
}

function ArtifactCard({ field, val, error, running, onChange, onClear }: Readonly<ArtifactCardProps>) {
  const hasUrl = val.trim() !== '';
  const hasError = !!error;
  const borderColor = cardBorderColor(hasError, hasUrl);
  const iconBg = cardIconBg(hasError, hasUrl);
  const iconColor = cardIconColor(hasError, hasUrl);

  return (
    <div style={{
      backgroundColor: '#ffffff', borderRadius: '16px',
      border: `1.5px solid ${borderColor}`,
      boxShadow: hasUrl && !hasError ? '0 4px 16px rgba(212,175,55,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: '3px', background: cardTopBar(hasError, hasUrl), transition: 'background 0.3s' }} />
      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
            backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}>
            {React.cloneElement(field.icon as React.ReactElement<{ size?: number; color?: string }>, { size: 16, color: iconColor })}
          </div>
          {hasUrl && !hasError && (
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Linked</span>
          )}
          {hasError && (
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invalid</span>
          )}
        </div>
        {/* Label + description */}
        <div>
          <p style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', margin: '0 0 3px', letterSpacing: '-0.01em' }}>{field.label}</p>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{field.description}</p>
        </div>
        {/* URL input */}
        <div style={{ position: 'relative' }}>
          <input
            type="url"
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            disabled={running}
            style={{
              width: '100%', boxSizing: 'border-box',
              backgroundColor: '#f8fafc', border: `1px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
              borderRadius: '10px', padding: '9px 70px 9px 12px',
              fontSize: '11px', fontWeight: 500, color: '#0f172a',
              outline: 'none', transition: 'border-color 0.2s',
            }}
          />
          {hasUrl && (
            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '2px' }}>
              <a href={val} target="_blank" rel="noopener noreferrer" style={{ padding: '4px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <ExternalLink size={12} />
              </a>
              <button type="button" onClick={() => onClear(field.key)} style={{ padding: '4px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={12} />
              </button>
            </div>
          )}
        </div>
        {hasError && <p style={{ fontSize: '10px', fontWeight: 600, color: '#ef4444', margin: 0 }}>{error}</p>}
      </div>
    </div>
  );
}

function RunningAnalysisPanel({ pipelineStep }: Readonly<{ pipelineStep: number }>) {
  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 260px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        backgroundColor: '#0B1521',
        padding: '48px 20px',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(212,175,55,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.8) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'linear-gradient(135deg,#D4AF37,#c9a227)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: '0 0 40px rgba(212,175,55,0.4)',
        }}>
          <Loader2 size={36} color="#0B1521" style={{ animation: 'spin 1s linear infinite' }} />
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
          Running Analysis
        </h2>
        <p style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 36px' }}>
          Step {Math.min(pipelineStep + 1, PIPELINE_STEPS.length)} of {PIPELINE_STEPS.length}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
          {PIPELINE_STEPS.map((step, i) => {
            const isCurrent = i === pipelineStep;
            const isDone = i < pipelineStep;

            return (
              <div key={step} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 18px', borderRadius: '14px',
                backgroundColor: stepBg(isCurrent, isDone),
                border: `1px solid ${stepBorder(isCurrent, isDone)}`,
                opacity: isDone || isCurrent ? 1 : 0.35,
                transition: 'all 0.4s',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: stepIconBg(isCurrent, isDone),
                  fontSize: '12px', fontWeight: 800,
                  color: isDone || isCurrent ? '#ffffff' : '#64748b',
                }}>
                  {isDone ? <CheckCircle2 size={18} /> : <span>0{i + 1}</span>}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: stepTextColor(isCurrent, isDone) }}>{step}</p>
                  {isCurrent && (
                    <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Processing...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function collectUrlErrors(urls: Record<ArtifactType, string>): Partial<Record<ArtifactType, string>> {
  const errors: Partial<Record<ArtifactType, string>> = {};
  for (const field of ARTIFACT_FIELDS) {
    const err = validateArtifactUrl(urls[field.key]);
    if (err) errors[field.key] = err;
  }
  return errors;
}

interface WorkspaceOption {
  id: string;
  name: string;
  projectTitle: string;
}

export const ArtifactsPage: React.FC = () => {
  const navigate = useNavigate();
  const { groupId, setGroupId } = useAuthStore();
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
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Track which types currently exist in the DB so we can delete on removal
  const [savedTypes, setSavedTypes] = useState<Set<ArtifactType>>(new Set());
  // Per-field URL validation errors
  const [urlErrors, setUrlErrors] = useState<Partial<Record<ArtifactType, string>>>({});
  // Which pipeline step is currently active (-1 = idle, ≥ PIPELINE_STEPS.length = all done)
  const [pipelineStep, setPipelineStep] = useState(-1);

  // Fetch all workspaces the student belongs to
  useEffect(() => {
    api.get('/api/projects')
      .then((res) => {
        const groups: Array<{ id: string; name: string; projectTitle: string }> = res.data.groups ?? [];
        setWorkspaces(groups);
        if (!selectedGroupId) setSelectedGroupId(groups[0]?.id ?? '');
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload artifacts when the selected workspace changes
  const resetUrls = useCallback(() => {
    setUrls({ PROPOSAL: '', SRS: '', SDD: '', SPMP: '', STD: '', SOURCE_CODE: '' });
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
        saved.forEach((a) => { newUrls[a.type] = a.url; types.add(a.type); });
        setUrls((prev) => ({ ...prev, ...newUrls }));
        setSavedTypes(types);
      })
      .catch(() => {/* no existing artifacts */});
  }, [selectedGroupId, resetUrls]);

  const buildFilledArtifacts = () =>
    ARTIFACT_FIELDS
      .filter((f) => urls[f.key].trim() !== '')
      .map((f) => ({ type: f.key, url: urls[f.key].trim() }));

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

  const waitForCompletedAudit = async (gid: string, startedAt: number): Promise<boolean> => {
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const res = await api.get(`/api/audit/${gid}/latest`, { timeout: 15000 });
        const audit = res.data.auditResult as { auditedAt?: string } | null;
        const auditedAt = audit?.auditedAt ? new Date(audit.auditedAt).getTime() : 0;
        if (audit && (!auditedAt || auditedAt >= startedAt - 5000)) {
          return true;
        }
      } catch {
        // The audit may still be finishing; retry briefly before surfacing an error.
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    return false;
  };

  const handleRunTraceability = async () => {
    if (!selectedGroupId) {
      setSaveError('No workspace selected. Please select a workspace above.');
      return;
    }

    // Validate all filled URLs before proceeding (Alternative Flow)
    const newErrors = collectUrlErrors(urls);
    if (Object.keys(newErrors).length > 0) {
      setUrlErrors(newErrors);
      setSaveError('Please fix the invalid URLs before running traceability.');
      return;
    }

    setRunning(true);
    const auditStartedAt = Date.now();
    setPipelineStep(0); // Step 0: Saving
    setSaveError(null);
    setSaveSuccess(false);
    setGroupId(selectedGroupId);

    // Save artifacts
    await deleteRemovedTypes(selectedGroupId);
    const filledArtifacts = buildFilledArtifacts();
    try {
      await api.post('/api/artifacts', { groupId: selectedGroupId, artifacts: filledArtifacts });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setSaveError(axiosErr.response?.data?.error ?? 'Failed to save artifacts.');
      setRunning(false);
      setPipelineStep(-1);
      return;
    }

    // Advance through pipeline steps while the audit API runs in the background
    setPipelineStep(1);
    const stepInterval = setInterval(() => {
      setPipelineStep((prev) => Math.min(prev + 1, PIPELINE_STEPS.length - 1));
    }, 8000); // 8s per step to better match real AI processing time

    try {
      await api.post(`/api/audit/${selectedGroupId}`, undefined, { timeout: 180000 });
    } catch (err: unknown) {
      const axiosErr = err as { code?: string; message?: string; response?: { status?: number; data?: { error?: string; details?: string } } };
      const hasBackendResponse = Boolean(axiosErr.response);
      if (!hasBackendResponse || axiosErr.code === 'ECONNABORTED') {
        const completedLater = await waitForCompletedAudit(selectedGroupId, auditStartedAt);
        clearInterval(stepInterval);
        if (completedLater) {
          setPipelineStep(PIPELINE_STEPS.length);
          await new Promise((r) => setTimeout(r, 400));
          setRunning(false);
          setGroupId(selectedGroupId);
          navigate('/matrix');
          return;
        }
        setSaveError('Analysis is still processing on the server. Open the Audit page in a moment to view the result.');
        setRunning(false);
        setPipelineStep(-1);
        return;
      }

      clearInterval(stepInterval);
      const completedAnyway = await waitForCompletedAudit(selectedGroupId, auditStartedAt);
      if (completedAnyway) {
        setPipelineStep(PIPELINE_STEPS.length);
        await new Promise((r) => setTimeout(r, 400));
        setRunning(false);
        setGroupId(selectedGroupId);
        navigate('/matrix');
        return;
      }
      const msg = axiosErr.response?.data?.error || 'Analysis failed.';
      const sub = axiosErr.response?.data?.details;
      const status = axiosErr.response?.status;
      const prefix = status ? `HTTP ${status}: ` : '';
      setSaveError(prefix + msg + (sub ? ` ${sub}` : ''));
      setRunning(false);
      setPipelineStep(-1);
      return;
    }

    clearInterval(stepInterval);
    setPipelineStep(PIPELINE_STEPS.length); // mark all steps complete

    await new Promise((r) => setTimeout(r, 400));
    setRunning(false);
    setGroupId(selectedGroupId);
    navigate('/matrix');
  };

  const filledCount = ARTIFACT_FIELDS.filter((f) => urls[f.key].trim() !== '').length;
  const anyFilled = filledCount > 0;
  const hasUrlErrors = Object.values(urlErrors).some(Boolean);
  const workspaceSelector = workspaces.length > 1 ? (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={selectedGroupId}
        onChange={(e) => setSelectedGroupId(e.target.value)}
        disabled={running}
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
          cursor: running ? 'not-allowed' : 'pointer',
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

  const handleUrlChange = useCallback((key: ArtifactType, value: string) => {
    setUrls((u) => ({ ...u, [key]: value }));
    const err = validateArtifactUrl(value);
    setUrlErrors((prev) => {
      const next = { ...prev };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });
  }, []);

  const handleClear = useCallback((key: ArtifactType) => {
    setUrls((u) => ({ ...u, [key]: '' }));
  }, []);

  const canRunAudit = filledCount >= 2 && !hasUrlErrors;
  const auditDisabled = running || !canRunAudit;
  const saveDisabled = !anyFilled || saving || running;

  if (running) {
    return (
      <Layout
        title="Running Analysis"
        subtitle="Processing your artifacts for AI traceability review"
        badge="AI Protocol"
        heroIcon={<Loader2 size={26} className="animate-spin" />}
      >
        <RunningAnalysisPanel pipelineStep={pipelineStep} />
      </Layout>
    );
  }

  return (
    <Layout
      title="Artifact Registry"
      subtitle="Connect your project documents for AI traceability analysis"
      badge="Documents"
      heroIcon={<FileText size={26} />}
      headerAction={workspaceSelector}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Artifact cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
            {ARTIFACT_FIELDS.map((field) => (
              <ArtifactCard
                key={field.key}
                field={field}
                val={urls[field.key]}
                error={urlErrors[field.key]}
                running={running}
                onChange={handleUrlChange}
                onClear={handleClear}
              />
            ))}
          </div>

        {/* ── Action bar ──────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Progress card */}
            <div style={{
              backgroundColor: '#ffffff', borderRadius: '16px',
              border: '1px solid #e2e8f0', padding: '20px',
              boxShadow: '0 2px 8px rgba(30,58,95,0.06)',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Progress</p>

              {/* Segment dots */}
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                {ARTIFACT_FIELDS.map(({ key }) => {
                  const linked = urls[key].trim() !== '';
                  return (
                    <div key={key} style={{
                      flex: 1, height: '6px', borderRadius: '3px',
                      background: linked ? 'linear-gradient(90deg,#1E3A5F,#D4AF37)' : '#e9eef5',
                      transition: 'background 0.3s',
                    }} />
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E3A5F' }}>{filledCount} / {ARTIFACT_FIELDS.length} linked</span>
                {filledCount >= 2 && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', borderRadius: '6px', padding: '2px 8px' }}>
                    Ready to audit
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-2.5">
              {/* Run Audit — primary CTA */}
              <button
                type="button"
                onClick={handleRunTraceability}
                disabled={auditDisabled}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[13px] font-extrabold text-white border-0 transition-all disabled:cursor-not-allowed"
                style={{
                  background: auditDisabled
                    ? 'linear-gradient(135deg,#94a3b8,#cbd5e1)'
                    : 'linear-gradient(135deg,#1E3A5F,#2d5a9e)',
                  boxShadow: auditDisabled ? 'none' : '0 6px 20px rgba(30,58,95,0.3)',
                }}
              >
                {running
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Play size={16} style={{ fill: 'currentColor' }} />}
                {running ? 'Analyzing…' : 'Run Traceability Audit'}
              </button>

              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saveDisabled}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold border border-slate-200 transition-colors disabled:cursor-not-allowed"
                style={{
                  backgroundColor: saveDisabled ? '#f1f5f9' : '#f8fafc',
                  color: saveDisabled ? '#94a3b8' : '#1E3A5F',
                }}
              >
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save Artifacts'}
              </button>
            </div>

            {/* Error message */}
            {saveError && (
              <div style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: '12px', padding: '14px',
              }}>
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#ef4444', margin: 0, lineHeight: 1.5 }}>{saveError}</p>
              </div>
            )}

            {/* Success message */}
            {saveSuccess && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0',
                borderRadius: '12px', padding: '12px 14px',
              }}>
                <CheckCircle2 size={15} color="#059669" />
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#059669', margin: 0 }}>Artifacts saved successfully</p>
              </div>
            )}
        </div>
      </div>

      {/* ── Audit pipeline modal ─────────────────────────────── */}
      {running && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#0B1521', padding: '24px',
        }}>
          {/* Grid overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
            backgroundImage: 'linear-gradient(rgba(212,175,55,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.8) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            {/* Spinner */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '24px',
              background: 'linear-gradient(135deg,#D4AF37,#c9a227)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px',
              boxShadow: '0 0 40px rgba(212,175,55,0.4)',
            }}>
              <Loader2 size={36} color="#0B1521" style={{ animation: 'spin 1s linear infinite' }} />
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
              Running Analysis
            </h2>
            <p style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 36px' }}>
              Step {pipelineStep + 1} of {PIPELINE_STEPS.length}
            </p>

            {/* Pipeline steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              {PIPELINE_STEPS.map((step, i) => {
                const isCurrent = i === pipelineStep;
                const isDone = i < pipelineStep;

                return (
                  <div key={step} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 18px', borderRadius: '14px',
                    backgroundColor: stepBg(isCurrent, isDone),
                    border: `1px solid ${stepBorder(isCurrent, isDone)}`,
                    opacity: isDone || isCurrent ? 1 : 0.35,
                    transition: 'all 0.4s',
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: stepIconBg(isCurrent, isDone),
                      fontSize: '12px', fontWeight: 800,
                      color: isDone || isCurrent ? '#ffffff' : '#64748b',
                    }}>
                      {isDone ? <CheckCircle2 size={18} /> : <span>0{i + 1}</span>}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: stepTextColor(isCurrent, isDone) }}>{step}</p>
                      {isCurrent && (
                        <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Processing…</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
