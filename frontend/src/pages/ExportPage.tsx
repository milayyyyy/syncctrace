import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Download, FileText, HardDrive, RefreshCw } from 'lucide-react';
import { Layout } from '../components/shared/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ExportModal } from '../components/shared/ExportModal';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { ExportFormat, ReadinessStatus } from '../types';
import type { ExportAudit } from '../services/export';

interface ApiAudit extends ExportAudit {
  id: string;
  readinessStatus: ReadinessStatus;
  auditedAt: string;
}

interface ApiGroup {
  id: string;
  name: string;
  projectTitle: string;
  auditResults: ApiAudit[];
}

interface ExportJob {
  id: string;
  auditResultId: string;
  format: ExportFormat;
  fileUrl: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  auditResult?: {
    group?: {
      projectTitle: string;
      name: string;
    };
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusLabel(status: ReadinessStatus): string {
  return status.replaceAll('_', ' ').toLowerCase().replace(/^\w|\s\w/g, (m) => m.toUpperCase());
}

export const ExportPage: React.FC = () => {
  const { groupId, setGroupId } = useAuthStore();
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(groupId ?? '');
  const [history, setHistory] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/api/export');
      setHistory(res.data.jobs ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/projects');
        const fetched: ApiGroup[] = res.data.groups ?? [];
        setGroups(fetched);
        const nextGroupId = selectedGroupId || groupId || fetched[0]?.id || '';
        setSelectedGroupId(nextGroupId);
        if (nextGroupId) setGroupId(nextGroupId);
      } catch {
        setError('Could not load audit data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [groupId, selectedGroupId, setGroupId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId],
  );
  const latestAudit = selectedGroup?.auditResults[0] ?? null;
  const projectTitle = selectedGroup?.projectTitle || selectedGroup?.name || 'Untitled Project';

  const handleExportComplete = async (format: ExportFormat) => {
    if (!latestAudit) return;
    await api.post('/api/export', { auditResultId: latestAudit.id, format });
    await fetchHistory();
  };

  const handleSelectGroup = (id: string) => {
    setSelectedGroupId(id);
    setGroupId(id);
  };

  return (
    <Layout
      title="Export Report"
      subtitle="Generate audit reports from the latest saved traceability analysis"
      badge="Report Generator"
      heroIcon={<Download size={26} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl items-start">
        <div className="lg:col-span-2 space-y-4">
          {loading && (
            <Card className="py-16 text-center">
              <Spinner size="lg" label="Loading export data..." className="mx-auto" />
            </Card>
          )}

          {!loading && error && (
            <Card className="p-6 border border-red-100 bg-red-50">
              <div className="flex gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-700">{error}</p>
              </div>
            </Card>
          )}

          {!loading && !error && !latestAudit && (
            <Card className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-5">
                <FileText size={28} className="text-slate-300" />
              </div>
              <h2 className="text-[16px] font-bold text-gray-800 mb-2">No audit available</h2>
              <p className="text-[13px] text-gray-400 mb-6 leading-relaxed max-w-sm mx-auto">
                Run a traceability audit first. The export page uses the latest saved audit result for each workspace.
              </p>
            </Card>
          )}

          {!loading && !error && latestAudit && (
            <>
              <Card className="p-6 border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Current Audit</p>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{projectTitle}</h2>
                    <p className="text-[12px] text-slate-400 font-medium mt-1">
                      Audited {formatDate(latestAudit.auditedAt)}
                    </p>
                  </div>
                  {groups.length > 1 && (
                    <select
                      value={selectedGroup?.id ?? ''}
                      onChange={(e) => handleSelectGroup(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-600 outline-none"
                    >
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>{group.projectTitle || group.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                    <p className="text-3xl font-black text-brand-navy mt-1">{latestAudit.overallScore.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                    <p className="text-[13px] font-extrabold text-slate-800 mt-2">{statusLabel(latestAudit.readinessStatus)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidence</p>
                    <p className="text-[13px] font-extrabold text-slate-800 mt-2">
                      {latestAudit.traceLinks.length} links, {latestAudit.gaps.length} gaps
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-50/60 border border-slate-100/90 p-5">
                <h3 className="text-[11.5px] font-extrabold text-slate-500 uppercase tracking-widest mb-3.5">Report includes</h3>
                <ul className="space-y-2.5">
                  {[
                    'Project metadata and audit timestamp',
                    'Full alignment matrix with status per artifact pair',
                    'Critical and high severity gap logs',
                    'Root cause details and AI recommendations',
                    'JSON, CSV, and printable PDF output options',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[12.5px] text-gray-600 font-medium">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Button size="lg" className="w-full text-sm py-3.5 text-white" onClick={() => setShowExport(true)}>
                <Download size={16} />
                Generate Report
              </Button>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 border border-slate-100/90 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-gray-400" />
                <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">Recent Downloads</h4>
              </div>
              <button type="button" onClick={fetchHistory} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
                <RefreshCw size={11} />
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="py-8"><Spinner size="sm" label="Loading history..." className="mx-auto" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/40 rounded-xl border border-dashed border-slate-100 text-gray-400">
                <HardDrive size={24} className="mx-auto mb-2 opacity-40 text-slate-300" />
                <p className="text-[11px] font-semibold uppercase tracking-wider">No export history</p>
                <p className="text-[10px] text-gray-300 mt-1">Generated files appear here</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div key={item.id} className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-100/80 text-slate-500 flex items-center justify-center font-bold text-xs select-none">
                        {item.format}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">
                          {item.auditResult?.group?.projectTitle || item.auditResult?.group?.name || 'Audit Report'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">{formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                    <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showExport && latestAudit && (
        <ExportModal
          onClose={() => setShowExport(false)}
          auditData={latestAudit}
          projectTitle={projectTitle}
          onExportComplete={handleExportComplete}
        />
      )}
    </Layout>
  );
};
