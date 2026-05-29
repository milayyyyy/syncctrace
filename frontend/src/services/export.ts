import type { ExportFormat } from '../types';
import type { ApiAudit } from '../types/api';

export interface ExportAudit {
  id?: string;
  overallScore: number;
  readinessStatus: string;
  auditedAt?: string;
  traceLinks: Array<{
    upstream: { type: string };
    downstream: { type: string };
    alignmentScore: number;
    status: string;
  }>;
  gaps: Array<{
    severity: string;
    description?: string;
    rootCause?: string;
    recommendation?: string;
    aiConfidence?: number;
  }>;
}

export function toExportAudit(audit: ApiAudit): ExportAudit {
  return {
    id: audit.id,
    overallScore: audit.overallScore,
    readinessStatus: audit.readinessStatus,
    auditedAt: audit.auditedAt,
    traceLinks: (audit.traceLinks ?? []).map((link) => ({
      upstream: link.upstream,
      downstream: link.downstream,
      alignmentScore: link.alignmentScore,
      status: link.status,
    })),
    gaps: (audit.gaps ?? []).map((gap) => ({
      severity: gap.severity,
      description: gap.description,
      rootCause: gap.rootCause,
      recommendation: gap.recommendation,
      aiConfidence: gap.aiConfidence,
    })),
  };
}

export function exportFilename(projectTitle: string, format: ExportFormat): string {
  const slug = (projectTitle || 'audit').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'audit';
  const dateStr = new Date().toISOString().slice(0, 10);
  return `audit-${slug}-${dateStr}.${format.toLowerCase()}`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildJsonBlob(auditData: ExportAudit, projectTitle: string): Blob {
  const payload = {
    exportedAt: new Date().toISOString(),
    projectTitle,
    overallScore: auditData.overallScore,
    readinessStatus: auditData.readinessStatus,
    traceLinks: auditData.traceLinks,
    gaps: auditData.gaps,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export function buildCsvBlob(auditData: ExportAudit, projectTitle: string): Blob {
  const q = (s: string) => `"${String(s ?? '').replaceAll('"', '""')}"`;
  const rows: string[] = [
    'SyncTrace Audit Report',
    `Project: ${projectTitle}`,
    `Exported: ${new Date().toLocaleString()}`,
    `Overall Score: ${auditData.overallScore.toFixed(1)}%`,
    `Status: ${auditData.readinessStatus}`,
    '',
    'TRACEABILITY MATRIX',
    'Upstream,Downstream,Alignment Score,Status',
    ...auditData.traceLinks.map((l) =>
      `${l.upstream.type},${l.downstream.type},${l.alignmentScore.toFixed(1)},${l.status}`,
    ),
    '',
    'GAPS',
    'Severity,Description,Root Cause,Recommendation,AI Confidence',
    ...auditData.gaps.map((g) =>
      [
        g.severity,
        q(g.description ?? ''),
        q(g.rootCause ?? ''),
        q(g.recommendation ?? ''),
        g.aiConfidence == null ? '' : `${(g.aiConfidence * 100).toFixed(0)}%`,
      ].join(','),
    ),
  ];
  return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function openPdfReport(auditData: ExportAudit, projectTitle: string): void {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const linkRows = auditData.traceLinks
    .map((l) => {
      let c: string;
      if (l.status === 'PASS') c = '#059669';
      else if (l.status === 'WARN') c = '#D4AF37';
      else c = '#B91C1C';
      return `<tr><td>${escapeHtml(l.upstream.type)}</td><td>${escapeHtml(l.downstream.type)}</td><td>${l.alignmentScore.toFixed(1)}%</td><td style="color:${c};font-weight:700">${escapeHtml(l.status)}</td></tr>`;
    })
    .join('');
  const gapRows = auditData.gaps
    .map((g) => {
      let c: string;
      if (g.severity === 'CRITICAL') c = '#B91C1C';
      else if (g.severity === 'HIGH') c = '#D97706';
      else if (g.severity === 'MEDIUM') c = '#0284C7';
      else c = '#059669';
      return `<tr><td style="color:${c};font-weight:700">${escapeHtml(g.severity)}</td><td>${escapeHtml(g.description ?? '-')}</td><td>${escapeHtml(g.rootCause ?? '-')}</td></tr>`;
    })
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Audit Report - ${escapeHtml(projectTitle)}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a}h1{color:#1E3A5F}h2{color:#1E3A5F;border-bottom:2px solid #D4AF37;padding-bottom:6px;margin-top:32px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#1E3A5F;color:#fff;padding:10px;text-align:left}td{padding:8px 10px;border-bottom:1px solid #E2E8F0}tr:nth-child(even) td{background:#F8FAFC}.meta{background:#F1F5F9;padding:16px;border-radius:8px;margin-bottom:24px}.score{font-size:48px;font-weight:900;color:#1E3A5F;margin:8px 0}@media print{.no-print{display:none}}</style>
</head><body>
<h1>SyncTrace Audit Report</h1>
<div class="meta"><p><strong>Project:</strong> ${escapeHtml(projectTitle)}</p><p><strong>Exported:</strong> ${date}</p><p><strong>Status:</strong> ${escapeHtml(auditData.readinessStatus.replaceAll('_', ' '))}</p><div class="score">${auditData.overallScore.toFixed(1)}%</div><p style="color:#64748B;margin:0">Overall Alignment Score</p></div>
<h2>Traceability Matrix</h2><table><thead><tr><th>Upstream</th><th>Downstream</th><th>Alignment Score</th><th>Status</th></tr></thead><tbody>${linkRows}</tbody></table>
<h2>Identified Gaps</h2><table><thead><tr><th>Severity</th><th>Description</th><th>Root Cause</th></tr></thead><tbody>${gapRows}</tbody></table>
<script>window.onload=function(){window.print();}</` + `script>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function exportAuditReport(auditData: ExportAudit, projectTitle: string, format: ExportFormat): void {
  if (format === 'JSON') {
    triggerBlobDownload(buildJsonBlob(auditData, projectTitle), exportFilename(projectTitle, format));
  } else if (format === 'CSV') {
    triggerBlobDownload(buildCsvBlob(auditData, projectTitle), exportFilename(projectTitle, format));
  } else {
    openPdfReport(auditData, projectTitle);
  }
}
